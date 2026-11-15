import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { useCallback, useEffect, useRef } from "react";
import {
  captureTextAnchor,
  createReviewAnchorPlugin,
  reviewAnchorKey,
  type ReviewVersion,
  type TextReviewAnchor,
} from "./delegation-review-poc";

type DelegationReviewDocumentProps = {
  markdown: string;
  editable: boolean;
  anchors: readonly TextReviewAnchor[];
  version: ReviewVersion;
  onChange: (markdown: string) => void;
  onSelection: (anchor: TextReviewAnchor) => void;
  onAnchorsChange: (anchors: TextReviewAnchor[]) => void;
  onOpenAnchor: (id: string) => void;
  onReady: (view: EditorView | null) => void;
};

function sameAnchors(a: readonly TextReviewAnchor[], b: readonly TextReviewAnchor[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function ReviewEditor({
  markdown,
  editable,
  anchors,
  version,
  onChange,
  onSelection,
  onAnchorsChange,
  onOpenAnchor,
  onReady,
}: DelegationReviewDocumentProps) {
  const crepeRef = useRef<Crepe | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialMarkdownRef = useRef(markdown);
  const initialAnchorsRef = useRef(anchors);
  const callbacksRef = useRef({ onChange, onSelection, onAnchorsChange, onOpenAnchor, onReady });
  const versionRef = useRef(version);
  const editableRef = useRef(editable);
  callbacksRef.current = { onChange, onSelection, onAnchorsChange, onOpenAnchor, onReady };
  versionRef.current = version;
  editableRef.current = editable;

  const captureSelection = useCallback(() => {
    if (editableRef.current || !viewRef.current) return;
    const view = viewRef.current;
    let anchor = captureTextAnchor(view.state, "pending", versionRef.current);
    if (!anchor) {
      // Readonly ProseMirror may not yet have synchronized the browser's long-press
      // selection. Translate the real DOM Range through the editor's position map.
      const selection = window.getSelection();
      if (
        !selection ||
        selection.isCollapsed ||
        !selection.anchorNode ||
        !selection.focusNode ||
        !view.dom.contains(selection.anchorNode) ||
        !view.dom.contains(selection.focusNode)
      )
        return;
      try {
        const a = view.posAtDOM(selection.anchorNode, selection.anchorOffset);
        const b = view.posAtDOM(selection.focusNode, selection.focusOffset);
        const from = Math.min(a, b);
        const to = Math.max(a, b);
        if (from === to || to > view.state.doc.content.size) return;
        const excerpt = view.state.doc.textBetween(from, to, " ");
        if (excerpt.trim().length < 2) return;
        anchor = {
          id: "pending",
          version: versionRef.current,
          from,
          to,
          excerpt,
          status: "active",
        };
      } catch {
        return; // The selection did not resolve to this document; never guess a position.
      }
    }
    if (anchor.excerpt.trim().length >= 2) callbacksRef.current.onSelection(anchor);
  }, []);

  useEffect(() => {
    crepeRef.current?.setReadonly(!editable);
  }, [editable]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = reviewAnchorKey.getState(view.state)?.anchors ?? [];
    if (!sameAnchors(current, anchors)) {
      view.dispatch(
        view.state.tr.setMeta(reviewAnchorKey, { kind: "replace", anchors: [...anchors] }),
      );
    }
  }, [anchors]);

  useEffect(
    () => () => {
      viewRef.current = null;
      callbacksRef.current.onReady(null);
    },
    [],
  );

  useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: initialMarkdownRef.current,
      features: {
        [CrepeFeature.Cursor]: false,
        [CrepeFeature.BlockEdit]: false,
        [CrepeFeature.Toolbar]: false,
        [CrepeFeature.TopBar]: false,
        [CrepeFeature.LinkTooltip]: false,
      },
    });
    crepeRef.current = crepe;
    crepe.setReadonly(!editableRef.current);
    crepe.editor.use($prose(() => createReviewAnchorPlugin(initialAnchorsRef.current)));
    crepe.on((listener) => {
      listener.mounted((ctx) => {
        const view = ctx.get(editorViewCtx);
        viewRef.current = view;
        callbacksRef.current.onReady(view);
        const loaded = reviewAnchorKey.getState(view.state)?.anchors ?? [];
        if (!sameAnchors(loaded, initialAnchorsRef.current))
          callbacksRef.current.onAnchorsChange(loaded);
      });
      listener.updated((ctx, doc, previous) => {
        if (previous && !previous.eq(doc)) {
          const view = ctx.get(editorViewCtx);
          callbacksRef.current.onAnchorsChange(reviewAnchorKey.getState(view.state)?.anchors ?? []);
        }
      });
      listener.markdownUpdated((_ctx, value, previous) => {
        if (value !== previous && editableRef.current) callbacksRef.current.onChange(value);
      });
      listener.selectionUpdated(() => {
        // Preserves the selected range even if a subsequent toolbar click moves focus.
        captureSelection();
      });
    });
    return crepe;
  }, []);

  return (
    <div
      className={editable ? "delegation-review-editor is-editing" : "delegation-review-editor"}
      onMouseUp={captureSelection}
      onTouchEnd={() => window.requestAnimationFrame(captureSelection)}
      onClickCapture={(event) => {
        if (editableRef.current) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const id = target.closest("[data-anchor-id]")?.getAttribute("data-anchor-id");
        if (id) callbacksRef.current.onOpenAnchor(id);
      }}
      onKeyDownCapture={(event) => {
        if (editableRef.current || !["Enter", " "].includes(event.key)) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const id = target.closest("[data-anchor-id]")?.getAttribute("data-anchor-id");
        if (!id) return;
        event.preventDefault();
        callbacksRef.current.onOpenAnchor(id);
      }}
    >
      <Milkdown />
    </div>
  );
}

export default function DelegationReviewDocument(props: DelegationReviewDocumentProps) {
  return (
    <MilkdownProvider>
      <ReviewEditor {...props} />
    </MilkdownProvider>
  );
}

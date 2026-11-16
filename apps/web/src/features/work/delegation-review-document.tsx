import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { editorViewCtx } from "@milkdown/kit/core";
import type { EditorView } from "@milkdown/kit/prose/view";
import { $prose } from "@milkdown/kit/utils";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { useCallback, useEffect, useRef } from "react";
import {
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
  onSelectionCleared: () => void;
  onAnchorsChange: (anchors: TextReviewAnchor[]) => void;
  onOpenAnchor: (id: string) => void;
  onReady: (view: EditorView | null) => void;
};

// An annotation affordance should follow a settled selection, not a dragging finger.
const SELECTION_SETTLE_MS = 180;

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
  onSelectionCleared,
  onAnchorsChange,
  onOpenAnchor,
  onReady,
}: DelegationReviewDocumentProps) {
  const crepeRef = useRef<Crepe | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const selectingRef = useRef(false);
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMarkdownRef = useRef(markdown);
  const initialAnchorsRef = useRef(anchors);
  const callbacksRef = useRef({
    onChange,
    onSelection,
    onSelectionCleared,
    onAnchorsChange,
    onOpenAnchor,
    onReady,
  });
  const versionRef = useRef(version);
  const editableRef = useRef(editable);
  callbacksRef.current = {
    onChange,
    onSelection,
    onSelectionCleared,
    onAnchorsChange,
    onOpenAnchor,
    onReady,
  };
  versionRef.current = version;
  editableRef.current = editable;

  // A readonly ProseMirror selection can lag behind the native browser selection.
  // Use only a live DOM selection to offer a *new* annotation; never resurrect a
  // stale editor range after the browser selection has collapsed.
  const captureSelection = useCallback(() => {
    if (editableRef.current || !viewRef.current) return;
    const view = viewRef.current;
    const selection = window.getSelection();
    if (
      !selection ||
      selection.isCollapsed ||
      !selection.anchorNode ||
      !selection.focusNode ||
      !view.dom.contains(selection.anchorNode) ||
      !view.dom.contains(selection.focusNode)
    ) {
      callbacksRef.current.onSelectionCleared();
      return;
    }
    try {
      const a = view.posAtDOM(selection.anchorNode, selection.anchorOffset);
      const b = view.posAtDOM(selection.focusNode, selection.focusOffset);
      const from = Math.min(a, b);
      const to = Math.max(a, b);
      const excerpt = from < to ? view.state.doc.textBetween(from, to, " ") : "";
      if (excerpt.trim().length < 2 || to > view.state.doc.content.size) {
        callbacksRef.current.onSelectionCleared();
        return;
      }
      callbacksRef.current.onSelection({
        id: "pending",
        version: versionRef.current,
        from,
        to,
        excerpt,
        status: "active",
      });
    } catch {
      callbacksRef.current.onSelectionCleared();
    }
  }, []);

  const cancelSelectionTimer = useCallback(() => {
    if (selectionTimerRef.current !== null) {
      clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
    }
  }, []);

  const queueSelection = useCallback(() => {
    cancelSelectionTimer();
    if (editableRef.current) return;
    const selection = window.getSelection();
    const view = viewRef.current;
    if (
      selectingRef.current ||
      !selection ||
      selection.isCollapsed ||
      !view ||
      !selection.anchorNode ||
      !selection.focusNode ||
      !view.dom.contains(selection.anchorNode) ||
      !view.dom.contains(selection.focusNode)
    ) {
      callbacksRef.current.onSelectionCleared();
      return;
    }

    // Reset on every selectionchange: a range isn't actionable until it stops
    // moving. Invalid/collapsed selections still clear immediately.
    callbacksRef.current.onSelectionCleared();
    selectionTimerRef.current = setTimeout(() => {
      selectionTimerRef.current = null;
      if (!selectingRef.current) captureSelection();
    }, SELECTION_SETTLE_MS);
  }, [cancelSelectionTimer, captureSelection]);

  useEffect(() => {
    const handlePointerEnd = () => {
      if (!selectingRef.current) return;
      selectingRef.current = false;
      queueSelection();
    };
    const handlePointerCancel = () => {
      selectingRef.current = false;
      cancelSelectionTimer();
      callbacksRef.current.onSelectionCleared();
    };
    const handleOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest(".delegation-review-editor") ||
        target.closest(".delegation-selected-comment")
      )
        return;
      selectingRef.current = false;
      cancelSelectionTimer();
      callbacksRef.current.onSelectionCleared();
    };
    document.addEventListener("selectionchange", queueSelection);
    document.addEventListener("pointerup", handlePointerEnd);
    document.addEventListener("pointercancel", handlePointerCancel);
    document.addEventListener("pointerdown", handleOutsidePointer, true);
    return () => {
      cancelSelectionTimer();
      document.removeEventListener("selectionchange", queueSelection);
      document.removeEventListener("pointerup", handlePointerEnd);
      document.removeEventListener("pointercancel", handlePointerCancel);
      document.removeEventListener("pointerdown", handleOutsidePointer, true);
    };
  }, [cancelSelectionTimer, queueSelection]);

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
        // The unused LaTeX feature mounted a hidden confirmation popup whose
        // checkmark was visible below the otherwise read-only work description.
        [CrepeFeature.Latex]: false,
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
        queueSelection();
      });
    });
    return crepe;
  }, []);

  return (
    <div
      className={editable ? "delegation-review-editor is-editing" : "delegation-review-editor"}
      onPointerDownCapture={() => {
        if (editableRef.current) return;
        selectingRef.current = true;
        cancelSelectionTimer();
        callbacksRef.current.onSelectionCleared();
      }}
      onMouseUp={queueSelection}
      onTouchEnd={() => window.requestAnimationFrame(queueSelection)}
      onKeyUp={queueSelection}
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

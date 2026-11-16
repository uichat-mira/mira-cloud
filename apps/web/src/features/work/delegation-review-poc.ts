import { computeDocDiff } from "@milkdown/kit/plugin/diff";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@milkdown/kit/prose/state";
import { Decoration, DecorationSet } from "@milkdown/kit/prose/view";

// Shared by the /new review prototype and POC-B; no cross-version migration or cloud persistence.
export type ReviewVersion = { stage: number; revision: number };
export type TextReviewAnchor = {
  id: string;
  version: ReviewVersion;
  from: number;
  to: number;
  excerpt: string;
  status: "active" | "lost";
};
export type TextReviewState = { anchors: TextReviewAnchor[] };

type AnchorAction =
  | { kind: "add"; anchor: TextReviewAnchor }
  | { kind: "remove"; id: string }
  | { kind: "replace"; anchors: TextReviewAnchor[] }
  | { kind: "reset" };

export const reviewAnchorKey = new PluginKey<TextReviewState>("delegation-review-poc-b");

function excerptAt(doc: ProseNode, from: number, to: number): string {
  return doc.textBetween(from, to, " ");
}

export function captureTextAnchor(
  state: EditorState,
  id: string,
  version: ReviewVersion,
): TextReviewAnchor | null {
  const { from, to } = state.selection;
  if (from === to || to > state.doc.content.size) return null;
  const excerpt = excerptAt(state.doc, from, to);
  if (!excerpt.trim()) return null;
  return { id, version, from, to, excerpt, status: "active" };
}

export function mapTextAnchor(anchor: TextReviewAnchor, tr: Transaction): TextReviewAnchor {
  if (anchor.status === "lost" || !tr.docChanged) return anchor;
  // A live edit can remap positions; a new version must retain the old anchor instead.
  // Invalid mappings never search for the same excerpt elsewhere (duplicate text).
  const start = tr.mapping.mapResult(anchor.from, 1);
  const end = tr.mapping.mapResult(anchor.to, -1);
  if (
    start.deleted ||
    end.deleted ||
    start.pos >= end.pos ||
    end.pos > tr.doc.content.size ||
    excerptAt(tr.doc, start.pos, end.pos) !== anchor.excerpt
  ) {
    return { ...anchor, status: "lost" };
  }
  return { ...anchor, from: start.pos, to: end.pos };
}

export function createReviewAnchorPlugin(initialAnchors: readonly TextReviewAnchor[] = []) {
  return new Plugin<TextReviewState>({
    key: reviewAnchorKey,
    state: {
      init: (_config, state) => ({
        anchors: initialAnchors.map((anchor) => {
          if (
            anchor.status !== "active" ||
            anchor.from < 0 ||
            anchor.from >= anchor.to ||
            anchor.to > state.doc.content.size ||
            excerptAt(state.doc, anchor.from, anchor.to) !== anchor.excerpt
          ) {
            return { ...anchor, status: "lost" as const };
          }
          return anchor;
        }),
      }),
      apply(tr, previous) {
        let anchors = previous.anchors.map((anchor) => mapTextAnchor(anchor, tr));
        const action = tr.getMeta(reviewAnchorKey) as AnchorAction | undefined;
        if (action?.kind === "add") {
          anchors = [...anchors.filter((item) => item.id !== action.anchor.id), action.anchor];
        } else if (action?.kind === "remove") {
          anchors = anchors.filter((item) => item.id !== action.id);
        } else if (action?.kind === "replace") {
          anchors = action.anchors.map((anchor) => {
            if (
              anchor.status === "lost" ||
              anchor.from < 0 ||
              anchor.from >= anchor.to ||
              anchor.to > tr.doc.content.size ||
              excerptAt(tr.doc, anchor.from, anchor.to) !== anchor.excerpt
            ) {
              return { ...anchor, status: "lost" as const };
            }
            return anchor;
          });
        } else if (action?.kind === "reset") {
          anchors = [];
        }
        return { anchors };
      },
    },
    props: {
      decorations(state) {
        const anchors = reviewAnchorKey.getState(state)?.anchors ?? [];
        return DecorationSet.create(
          state.doc,
          anchors
            .filter((a) => a.status === "active")
            .map((a) =>
              Decoration.inline(
                a.from,
                a.to,
                {
                  class: "delegation-review-poc-anchor",
                  "data-anchor-id": a.id,
                  role: "button",
                  tabindex: "0",
                  "aria-label": "打开此处批注",
                },
                { id: a.id },
              ),
            ),
        );
      },
    },
  });
}

export const reviewAnchorPlugin = createReviewAnchorPlugin();

export function textDiff(
  before: ProseNode,
  after: ProseNode,
): Array<{ before: string; after: string; from: number; to: number; kind: string }> {
  const changes = computeDocDiff(before, after);
  return changes.map((change) => {
    const beforeText = excerptAt(before, change.fromA, change.toA);
    const afterText = excerptAt(after, change.fromB, change.toB);
    const kind =
      beforeText === afterText
        ? "格式/结构变化"
        : !beforeText
          ? "新增"
          : !afterText
            ? "删除"
            : "修改";
    return {
      before: beforeText || (kind === "格式/结构变化" ? "（结构变化）" : ""),
      after: afterText || (kind === "格式/结构变化" ? "（结构变化）" : ""),
      from: change.fromB,
      to: change.toB,
      kind,
    };
  });
}

export type ReviewField = {
  id?: string;
  kind: "choice" | "toggle";
  label: string;
  value: string | boolean;
};

export type FieldDiff = {
  id: string;
  label: string;
  kind: "新增" | "移除" | "值变化" | "重新生成";
  before?: string | boolean;
  after?: string | boolean;
};

// The catalog ID, not visual position or label, is the identity of a dynamic field.
export function componentDiff(
  before: readonly ReviewField[],
  after: readonly ReviewField[],
): FieldDiff[] {
  const oldIds = new Set<string>();
  const unstable = (list: readonly ReviewField[]) => {
    const seen = new Set<string>();
    for (const field of list) {
      if (!field.id || seen.has(field.id)) return true;
      seen.add(field.id);
    }
    return false;
  };
  if (unstable(before) || unstable(after)) {
    return [
      {
        id: "(unknown)",
        label: "结构化字段",
        kind: "重新生成",
      },
    ];
  }
  const newById = new Map(after.map((f) => [f.id!, f]));
  const changes: FieldDiff[] = [];
  for (const previous of before) {
    const id = previous.id!;
    oldIds.add(id);
    const current = newById.get(id);
    if (!current) {
      changes.push({ id, label: previous.label, kind: "移除", before: previous.value });
    } else if (current.kind !== previous.kind) {
      changes.push({ id, label: current.label, kind: "重新生成" });
    } else if (current.value !== previous.value) {
      changes.push({
        id,
        label: current.label,
        kind: "值变化",
        before: previous.value,
        after: current.value,
      });
    }
  }
  for (const current of after) {
    const id = current.id!;
    if (!oldIds.has(id)) {
      changes.push({ id, label: current.label, kind: "新增", after: current.value });
    }
  }
  return changes;
}

export function resolveComponentAnchor(
  target: { id: string; kind: ReviewField["kind"]; version: ReviewVersion },
  viewVersion: ReviewVersion,
  fields: readonly ReviewField[],
): ReviewField | null {
  if (
    target.version.stage !== viewVersion.stage ||
    target.version.revision !== viewVersion.revision
  ) {
    return null;
  }
  // Stable ID alone is insufficient: regenerated UI can reuse an ID for a different type.
  // In that case the old annotation must not follow the new component.
  const matches = fields.filter((field) => field.id === target.id);
  return matches.length === 1 && matches[0]?.kind === target.kind ? matches[0] : null;
}

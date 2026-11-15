import { describe, expect, it } from "vitest";
import { Schema } from "@milkdown/kit/prose/model";
import { EditorState, TextSelection } from "@milkdown/kit/prose/state";
import {
  captureTextAnchor,
  componentDiff,
  resolveComponentAnchor,
  reviewAnchorKey,
  reviewAnchorPlugin,
  textDiff,
} from "../src/features/work/delegation-review-poc";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "text*",
      toDOM: () => ["p", 0],
      parseDOM: [{ tag: "p" }],
    },
    text: { group: "inline" },
  },
});

const doc = (...paragraphs: string[]) =>
  schema.nodes.doc!.create(
    null,
    paragraphs.map((text) => schema.nodes.paragraph!.create(null, schema.text(text))),
  );

describe("POC-B real ProseMirror anchors", () => {
  it("keeps the correct occurrence when duplicate text precedes the selection", () => {
    const initial = doc("重复句子", "中间文本", "重复句子");
    const secondStart = 1 + "重复句子".length + 2 + "中间文本".length + 2;
    let state = EditorState.create({
      doc: initial,
      plugins: [reviewAnchorPlugin],
      selection: TextSelection.create(initial, secondStart, secondStart + "重复句子".length),
    });
    const anchor = captureTextAnchor(state, "c1", { stage: 0, revision: 1 })!;
    expect(anchor.excerpt).toBe("重复句子");
    state = state.apply(state.tr.setMeta(reviewAnchorKey, { kind: "add", anchor }));
    const tr = state.tr.insertText("前置", 1);
    state = state.apply(tr);
    const mapped = reviewAnchorKey.getState(state)!.anchors[0]!;
    expect(mapped.status).toBe("active");
    expect(mapped.from).toBe(secondStart + 2);
    expect(state.doc.textBetween(mapped.from, mapped.to, " ")).toBe("重复句子");
  });

  it("preserves cross-paragraph anchors on an unrelated insertion", () => {
    const initial = doc("甲乙", "丙丁");
    let state = EditorState.create({
      doc: initial,
      plugins: [reviewAnchorPlugin],
      selection: TextSelection.create(initial, 2, 7),
    });
    const anchor = captureTextAnchor(state, "cross", { stage: 0, revision: 5 })!;
    expect(anchor.excerpt).toContain(" ");
    state = state.apply(state.tr.setMeta(reviewAnchorKey, { kind: "add", anchor }));
    state = state.apply(state.tr.insertText("序言", 1));
    const mapped = reviewAnchorKey.getState(state)!.anchors[0]!;
    expect(mapped.status).toBe("active");
    expect(mapped.excerpt).toBe(anchor.excerpt);
  });

  it("fails closed if selected text is deleted, never guesses a duplicate", () => {
    const initial = doc("重复", "重复");
    const anchor = {
      id: "c1",
      version: { stage: 0, revision: 1 },
      from: 5,
      to: 7,
      excerpt: "重复",
      status: "active" as const,
    };
    let state = EditorState.create({ doc: initial, plugins: [reviewAnchorPlugin] });
    state = state.apply(state.tr.setMeta(reviewAnchorKey, { kind: "add", anchor }));
    state = state.apply(state.tr.delete(5, 7));
    expect(reviewAnchorKey.getState(state)!.anchors[0]!.status).toBe("lost");
    expect(reviewAnchorKey.getState(state)!.anchors[0]!.from).toBe(5);
  });

  it("does not silently resurrect lost anchors after a new matching phrase appears", () => {
    const initial = doc("重要发现");
    const anchor = {
      id: "c1",
      version: { stage: 0, revision: 1 },
      from: 1,
      to: 5,
      excerpt: "重要发现",
      status: "active" as const,
    };
    let state = EditorState.create({ doc: initial, plugins: [reviewAnchorPlugin] });
    state = state.apply(state.tr.setMeta(reviewAnchorKey, { kind: "add", anchor }));
    state = state.apply(state.tr.delete(1, 5));
    state = state.apply(state.tr.insertText("重要发现", 1));
    expect(reviewAnchorKey.getState(state)!.anchors[0]!.status).toBe("lost");
  });
});

describe("POC-B Milkdown diff and semantic component identity", () => {
  it("reports multiple real ProseMirror text changes", () => {
    const before = doc("第一段", "第二段", "第三段");
    const after = doc("第一段修改", "第二段", "第三段追加");
    const changes = textDiff(before, after);
    expect(changes.length).toBeGreaterThanOrEqual(2);
    expect(changes.some((c) => c.after.includes("修改"))).toBe(true);
    expect(changes.some((c) => c.after.includes("追加"))).toBe(true);
  });

  it("does not mistake reordered stable-id fields for a changed value", () => {
    const a = [
      { id: "focus", kind: "choice" as const, label: "重点", value: "models" },
      { id: "makers", kind: "toggle" as const, label: "独立开发者", value: true },
    ];
    expect(componentDiff(a, [a[1]!, a[0]!])).toEqual([]);
    expect(componentDiff(a, [a[1]!, { ...a[0]!, value: "products" }])).toMatchObject([
      { id: "focus", kind: "值变化", before: "models", after: "products" },
    ]);
  });

  it("handles removed, added, missing and collided semantic IDs without false matches", () => {
    const old = [{ id: "focus", kind: "choice" as const, label: "关注重点", value: "models" }];
    expect(
      componentDiff(old, [{ id: "fresh", kind: "choice", label: "新字段", value: "x" }]),
    ).toHaveLength(2);
    expect(
      componentDiff(old, [{ kind: "choice", label: "关注重点", value: "models" }])[0]?.kind,
    ).toBe("重新生成");
    expect(componentDiff(old, [old[0]!, old[0]!])[0]?.kind).toBe("重新生成");
    expect(componentDiff(old, [{ ...old[0]!, kind: "toggle", value: true }])[0]?.kind).toBe(
      "重新生成",
    );
  });

  it("refuses to move a component comment into a newer revision implicitly", () => {
    const fields = [{ id: "focus", kind: "choice" as const, label: "重点", value: "models" }];
    const target = { id: "focus", kind: "choice" as const, version: { stage: 0, revision: 3 } };
    expect(resolveComponentAnchor(target, { stage: 0, revision: 3 }, fields)?.label).toBe("重点");
    expect(resolveComponentAnchor(target, { stage: 0, revision: 4 }, fields)).toBeNull();
    expect(
      resolveComponentAnchor(target, { stage: 0, revision: 3 }, [
        { id: "focus", kind: "toggle", label: "复用 ID 的新开关", value: true },
      ]),
    ).toBeNull();
    expect(
      resolveComponentAnchor(target, { stage: 0, revision: 3 }, [fields[0]!, fields[0]!]),
    ).toBeNull();
  });
});

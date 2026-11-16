import { describe, expect, it } from "vitest";
import { Schema } from "@milkdown/kit/prose/model";
import {
  acceptDocumentStage,
  createDelegationDraft,
  isAgreementConsistent,
  updateReviewComments,
  type DelegationDraft,
  type ReviewComment,
} from "../src/features/work/delegation-document";
import {
  commitRevision,
  prepareRevision,
  type RevisionCandidate,
} from "../src/features/work/delegation-revision-poc";
import { resolveComponentAnchor, textDiff } from "../src/features/work/delegation-review-poc";

const comments: ReviewComment[] = [
  {
    id: 11,
    stage: 0,
    excerpt: "持续观察",
    text: "突出一手证据",
    status: "open",
    anchor: {
      version: { stage: 0, revision: 0 },
      from: 1,
      to: 5,
      status: "active",
    },
  },
  { id: 12, stage: 0, excerpt: "", text: "研究重点改为模型动态", status: "open" },
  { id: 13, stage: 0, excerpt: "", text: "保留必要的人工判断", status: "open" },
];

const draftWithComments = (): DelegationDraft =>
  updateReviewComments(createDelegationDraft("radar"), () => structuredClone(comments));

const proposal = () => ({
  protocol: "mira.delegation.revision_proposal",
  version: "0.1.0",
  stage: 0,
  baseRevision: 0,
  operations: [
    { kind: "replace-description", text: "请追踪模型变化，优先一手资料，保留人工判断。" },
    { kind: "set-field", field: "focus", value: "research" },
    { kind: "set-field", field: "makers", value: false },
  ],
  commentResponses: [
    { commentId: 11, proposedHandling: "addressed", reason: "增加一手资料要求" },
    { commentId: 12, proposedHandling: "addressed", reason: "变更研究重点" },
    { commentId: 13, proposedHandling: "not_addressed", reason: "还需核实人工复核边界" },
  ],
});

const prepared = (draft: DelegationDraft = draftWithComments()): RevisionCandidate => {
  const result = prepareRevision(draft, proposal());
  if (!result.ok) throw new Error("Fixture proposal did not prepare: " + result.reason);
  return result;
};

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
const doc = (text: string) =>
  schema.nodes.doc!.create(
    null,
    text.split("\n\n").map((part) => schema.nodes.paragraph!.create(null, schema.text(part))),
  );

describe("Diff review research — D04/D05/D06 proposal vs canonical draft", () => {
  it("prepares three comment responses and real document+two field diffs without editing the source", () => {
    const before = draftWithComments();
    const serialized = JSON.stringify(before);
    const candidate = prepared(before);
    expect(JSON.stringify(before)).toBe(serialized);
    expect(candidate.baseline.revision).toBe(0);
    expect(candidate.preview.revision).toBeGreaterThan(0);
    expect(candidate.preview.markdown).toContain("请追踪模型变化");
    expect(candidate.preview.markdown).toContain("## 当前约定");
    expect(isAgreementConsistent(candidate.proposedDraft, 0)).toBe(true);
    expect(candidate.fieldChanges).toMatchObject([
      { id: "focus", kind: "值变化", before: "products", after: "research" },
      { id: "makers", kind: "值变化", before: true, after: false },
    ]);
    // Reuse the real Milkdown/ProseMirror diff kernel already proved by POC-B.
    const changes = textDiff(doc(candidate.baseline.markdown), doc(candidate.preview.markdown));
    expect(changes.some((c) => c.kind === "修改" && c.after.includes("模型"))).toBe(true);
    expect(candidate.proposedDraft.comments).toEqual(before.comments);
    expect(candidate.proposedDraft.acceptedCount).toBe(0);
  });

  it("commits only the reviewed candidate and leaves all user decisions pending", () => {
    const before = draftWithComments();
    const candidate = prepared(before);
    const result = commitRevision(before, candidate);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposedDraft.comments.map((c) => c.status)).toEqual([
      "suggested",
      "suggested",
      "open",
    ]);
    expect(result.proposedDraft.comments[0]!.anchor).toEqual(before.comments[0]!.anchor);
    expect(result.proposedDraft.acceptedCount).toBe(0);
    expect(result.proposedDraft.stages[0].accepted).toBeNull();
    expect(before.stages[0].revision).toBe(0);
    // User must explicitly resolve or abandon — neither proposal nor commit does it.
    const decided = updateReviewComments(result.proposedDraft, (items) =>
      items.map((c) =>
        c.id === 13
          ? { ...c, status: "abandoned" as const }
          : { ...c, status: "resolved" as const },
      ),
    );
    expect(decided.comments.every((c) => c.status === "resolved" || c.status === "abandoned")).toBe(
      true,
    );
    expect(acceptDocumentStage(decided, 0).acceptedCount).toBe(1);
  });

  it("can abandon the uncommitted candidate without mutating the baseline", () => {
    const before = draftWithComments();
    const original = JSON.stringify(before);
    const candidate = prepared(before);
    expect(candidate.preview.markdown).not.toBe(before.stages[0].markdown);
    expect(JSON.stringify(before)).toBe(original);
  });

  it("rejects stale base revision and cannot commit after the stage changed", () => {
    const before = draftWithComments();
    expect(prepareRevision(before, { ...proposal(), baseRevision: 2 })).toEqual({
      ok: false,
      reason: "stale-base",
    });
    const candidate = prepared(before);
    const changed = {
      ...before,
      stages: [
        { ...before.stages[0], revision: 1 },
        before.stages[1],
        before.stages[2],
      ] as DelegationDraft["stages"],
    };
    expect(commitRevision(changed, candidate)).toEqual({ ok: false, reason: "stale-base" });
  });

  it("refuses a prepared candidate after any other-stage change to avoid lost updates", () => {
    const before = draftWithComments();
    const candidate = prepared(before);
    const unrelatedStage = {
      ...before,
      stages: [
        before.stages[0],
        { ...before.stages[1], markdown: before.stages[1].markdown + "\n新说明" },
        before.stages[2],
      ] as DelegationDraft["stages"],
    };
    expect(commitRevision(unrelatedStage, candidate)).toEqual({
      ok: false,
      reason: "stale-base",
    });
    const anotherStageComment = updateReviewComments(before, (items) => [
      ...items,
      { id: 76, stage: 1, excerpt: "", text: "后续阶段的新意见", status: "open" },
    ]);
    expect(commitRevision(anotherStageComment, candidate)).toEqual({
      ok: false,
      reason: "stale-base",
    });
  });

  it("prevents stale commit after added/changed comment and duplicate commit after use", () => {
    const before = draftWithComments();
    const candidate = prepared(before);
    const mutated = updateReviewComments(before, (items) => [
      ...items,
      { id: 99, stage: 0, excerpt: "", text: "另一条新意见", status: "open" },
    ]);
    expect(commitRevision(mutated, candidate)).toEqual({ ok: false, reason: "stale-base" });
    const first = commitRevision(before, candidate);
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(commitRevision(first.proposedDraft, candidate)).toEqual({
        ok: false,
        reason: "stale-base",
      });
    }
  });

  it("rejects missing, duplicated, unknown and already closed comment references", () => {
    const before = draftWithComments();
    const base = proposal();
    const variants = [
      { ...base, commentResponses: base.commentResponses.slice(0, 2) },
      {
        ...base,
        commentResponses: [
          base.commentResponses[0],
          base.commentResponses[0],
          base.commentResponses[2],
        ],
      },
      {
        ...base,
        commentResponses: [
          { ...base.commentResponses[0], commentId: 98 },
          ...base.commentResponses.slice(1),
        ],
      },
    ];
    for (const item of variants) {
      expect(prepareRevision(before, item)).toEqual({ ok: false, reason: "comment-mismatch" });
    }
    const closed = updateReviewComments(before, (items) =>
      items.map((c) => (c.id === 11 ? { ...c, status: "abandoned" as const } : c)),
    );
    expect(prepareRevision(closed, base)).toEqual({
      ok: false,
      reason: "comment-mismatch",
    });
  });

  it("cannot revise an accepted stage or a stage undergoing historical edit", () => {
    const before = draftWithComments();
    const accepted = acceptDocumentStage(before, 0);
    expect(prepareRevision(accepted, proposal())).toEqual({ ok: false, reason: "invalid-stage" });
    expect(prepareRevision({ ...before, editingHistorical: 0 }, proposal())).toEqual({
      ok: false,
      reason: "invalid-stage",
    });
    expect(prepareRevision(before, { ...proposal(), stage: 1 })).toEqual({
      ok: false,
      reason: "invalid-stage",
    });
  });

  it("rejects duplicate comment IDs even when they share the same status", () => {
    const duplicated = updateReviewComments(draftWithComments(), (items) => [
      ...items,
      { ...items[0]! },
    ]);
    expect(prepareRevision(duplicated, proposal())).toEqual({
      ok: false,
      reason: "comment-mismatch",
    });
  });

  it("blocks other catalog-backed permissions, including booking and outreach", () => {
    for (const [scenario, protectedField] of [
      ["journey", "booking"],
      ["venture", "outreach"],
    ] as const) {
      let draft = createDelegationDraft(scenario);
      draft = acceptDocumentStage(draft, 0);
      draft = acceptDocumentStage(draft, 1);
      draft = updateReviewComments(draft, () => [
        { id: 33, stage: 2, excerpt: "", text: "请确认边界", status: "open" },
      ]);
      expect(
        prepareRevision(draft, {
          protocol: "mira.delegation.revision_proposal",
          version: "0.1.0",
          stage: 2,
          baseRevision: draft.stages[2].revision,
          operations: [{ kind: "set-field", field: protectedField, value: true }],
          commentResponses: [{ commentId: 33, proposedHandling: "addressed", reason: "建议更改" }],
        }),
      ).toEqual({ ok: false, reason: "invalid-operation" });
    }
  });

  it("rejects fake acceptance, authorization, task creation and unknown wire fields", () => {
    const before = draftWithComments();
    for (const illicit of [
      { acceptedCount: 3 },
      { authorization: "approved" },
      { taskCreated: true },
      { runStarted: true },
      { commentResponses: proposal().commentResponses.map((x) => ({ ...x, status: "resolved" })) },
    ]) {
      expect(prepareRevision(before, { ...proposal(), ...illicit })).toEqual({
        ok: false,
        reason: "invalid-proposal",
      });
    }
  });

  it("rejects invalid/hidden/unsafe field edits instead of silently ignoring them", () => {
    const before = draftWithComments();
    for (const operation of [
      { kind: "set-field", field: "focus", value: "not-a-choice" },
      { kind: "set-field", field: "focus", value: true },
      { kind: "set-field", field: "not-a-field", value: "research" },
      { kind: "set-field", field: "focus", value: "products" },
      { kind: "set-field", field: "externalActions", value: true },
    ]) {
      expect(prepareRevision(before, { ...proposal(), operations: [operation] })).toEqual({
        ok: false,
        reason: "invalid-operation",
      });
    }
  });

  it("rejects duplicate operations and attempts to forge the protected agreement", () => {
    const before = draftWithComments();
    const op = { kind: "set-field", field: "focus", value: "research" };
    expect(prepareRevision(before, { ...proposal(), operations: [op, op] })).toEqual({
      ok: false,
      reason: "invalid-operation",
    });
    const fake = { kind: "replace-description", text: "序言\n## 当前约定\n每15分钟" };
    expect(prepareRevision(before, { ...proposal(), operations: [fake] })).toEqual({
      ok: false,
      reason: "invalid-operation",
    });
  });

  it("documents the existing model-level acceptance gap without changing production code", () => {
    // The current /new UI checks unresolved comments, but this domain function
    // does not. Fix before exposing proposal commit as a production action.
    const draft = draftWithComments();
    expect(draft.comments.some((c) => c.status === "open")).toBe(true);
    expect(acceptDocumentStage(draft, 0).acceptedCount).toBe(1);
  });

  it("refuses proposals against an inconsistent handwritten agreement", () => {
    const before = draftWithComments();
    const corrupt = {
      ...before,
      stages: [
        {
          ...before.stages[0],
          markdown: before.stages[0].markdown.replace("## 当前约定", "## 错误标题"),
        },
        before.stages[1],
        before.stages[2],
      ] as DelegationDraft["stages"],
    };
    expect(prepareRevision(corrupt, proposal())).toEqual({
      ok: false,
      reason: "unresolved-agreement",
    });
  });

  it("retains old-version text anchors and refuses component-anchor migration by label/order", () => {
    const before = draftWithComments();
    const candidate = prepared(before);
    expect(candidate.proposedDraft.comments[0]!.anchor?.version).toEqual({
      stage: 0,
      revision: 0,
    });
    expect(
      resolveComponentAnchor(
        { id: "focus", kind: "choice", version: { stage: 0, revision: 0 } },
        { stage: 0, revision: candidate.preview.revision },
        [{ id: "focus", kind: "choice", label: "新的重点", value: "research" }],
      ),
    ).toBeNull();
  });
});

// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  acceptDocumentStage,
  alignDocumentAgreement,
  beginHistoricalEdit,
  cancelHistoricalEdit,
  changeDocumentConfig,
  changeDocumentMarkdown,
  createDelegationDraft,
  isAgreementConsistent,
  parseDelegationDraft,
  submitHistoricalRevision,
  updateReviewComments,
} from "../src/features/work/delegation-document";

describe("single authority for delegation document, JSON UI and acceptance", () => {
  it("creates three readable Markdown documents with matching agreement projections", () => {
    for (const scenarioId of ["radar", "journey", "venture"] as const) {
      const draft = createDelegationDraft(scenarioId);
      expect(draft.stages).toHaveLength(3);
      expect(
        draft.stages.every((_, stage) => isAgreementConsistent(draft, stage as 0 | 1 | 2)),
      ).toBe(true);
      expect(draft.stages[0].markdown).toContain("## 当前约定");
      expect(draft.stages[0].config).toEqual(draft.stages[1].config);
    }
  });

  it("preserves arbitrary custom intent without mistaking user Markdown for an agreement header", () => {
    const input = "帮我跟进一项长期工作\n## 当前约定\n先核实再行动";
    const draft = createDelegationDraft("custom", input);
    expect(draft.intent).toBe(input);
    expect(draft.stages[0].markdown).toContain("> ## 当前约定");
    expect(draft.stages[0].markdown).toContain("先核实再行动");
    expect(draft.stages.every((_, i) => isAgreementConsistent(draft, i as 0 | 1 | 2))).toBe(true);
    expect(parseDelegationDraft(JSON.stringify(draft))).toEqual(draft);
    const updated = changeDocumentConfig(draft, 0, "approach", "evidence");
    expect(updated.stages[0].markdown).toContain("核查资料与证据");
    expect(updated.stages[0].markdown).toContain("> ## 当前约定");
  });

  it("editing a json-render field updates the same document and preserves prose", () => {
    const before = createDelegationDraft("radar");
    const after = changeDocumentConfig(before, 0, "focus", "business");
    expect(after.stages[0].config["focus"]).toBe("business");
    expect(after.stages[0].markdown).toContain("研究重点：创业与商业化");
    expect(after.stages[0].markdown).toContain("请持续观察 AI 行业");
    expect(isAgreementConsistent(after, 0)).toBe(true);
    expect(before.stages[0].config["focus"]).toBe("products");
    expect(after.stages[0].revision).toBeGreaterThan(before.stages[0].revision);
    expect(changeDocumentConfig(before, 0, "unknown", true)).toBe(before);
    expect(changeDocumentConfig(before, 0, "focus", "__invalid__")).toBe(before);
  });

  it("manual Markdown conflict remains visible and stops acceptance until reconciled", () => {
    let draft = createDelegationDraft();
    const edited = draft.stages[1].markdown.replace("按每小时检查", "按每天检查");
    draft = changeDocumentMarkdown(draft, 1, edited);
    expect(isAgreementConsistent(draft, 1)).toBe(false);
    const stage0Accepted = acceptDocumentStage(draft, 0);
    expect(stage0Accepted.acceptedCount).toBe(1);
    expect(acceptDocumentStage(stage0Accepted, 1)).toBe(stage0Accepted);
    const restored = alignDocumentAgreement(stage0Accepted, 1);
    expect(restored.stages[1].markdown).toContain("按每小时检查");
    expect(isAgreementConsistent(restored, 1)).toBe(true);
    expect(acceptDocumentStage(restored, 1).acceptedCount).toBe(2);
  });

  it("rejects a second conflicting paragraph after the agreement", () => {
    const draft = createDelegationDraft();
    const modified = changeDocumentMarkdown(
      draft,
      0,
      draft.stages[0].markdown + "\n但是每天检查一次。\n",
    );
    expect(isAgreementConsistent(modified, 0)).toBe(false);
    expect(acceptDocumentStage(modified, 0)).toBe(modified);
    const fixed = alignDocumentAgreement(modified, 0);
    expect(isAgreementConsistent(fixed, 0)).toBe(true);
    expect(fixed.stages[0].markdown).not.toContain("但是每天检查一次");
  });

  it("a conflicting field edit never silently overwrites manually edited agreement", () => {
    const base = createDelegationDraft();
    const changed = changeDocumentMarkdown(
      base,
      0,
      base.stages[0].markdown.replace("模型、产品与开源", "每天执行"),
    );
    expect(isAgreementConsistent(changed, 0)).toBe(false);
    const fieldChange = changeDocumentConfig(changed, 0, "focus", "business");
    expect(fieldChange.stages[0].markdown).toContain("每天执行");
    expect(fieldChange.stages[0].config["focus"]).toBe("business");
    expect(isAgreementConsistent(fieldChange, 0)).toBe(false);
    const reconciled = alignDocumentAgreement(fieldChange, 0);
    expect(reconciled.stages[0].markdown).toContain("创业与商业化");
  });

  it("accepted stages have immutable history and forward only their agreed config", () => {
    let draft = changeDocumentConfig(createDelegationDraft(), 0, "focus", "business");
    draft = acceptDocumentStage(draft, 0);
    const snapshot = draft.stages[0].accepted;
    expect(snapshot).toBeTruthy();
    expect(draft.stages[1].config["focus"]).toBe("business");
    expect(changeDocumentMarkdown(draft, 0, "mutated")).toBe(draft);
    expect(changeDocumentConfig(draft, 0, "focus", "research")).toBe(draft);
    draft = acceptDocumentStage(draft, 1);
    expect(draft.stages[0].accepted).toEqual(snapshot);
    expect(draft.stages[0].history).toHaveLength(1);
    expect(draft.stages[1].accepted?.config["focus"]).toBe("business");
  });

  it("historical draft does not invalidate acceptance until explicitly submitted", () => {
    let draft = createDelegationDraft();
    draft = acceptDocumentStage(draft, 0);
    draft = acceptDocumentStage(draft, 1);
    const original = draft.stages[0].accepted;
    draft = beginHistoricalEdit(draft, 0);
    draft = changeDocumentConfig(draft, 0, "focus", "business");
    expect(draft.acceptedCount).toBe(2);
    expect(draft.stages[0].accepted).toEqual(original);
    expect(draft.stages[1].accepted).not.toBeNull();
    const submitted = submitHistoricalRevision(draft);
    expect(submitted.acceptedCount).toBe(0);
    expect(submitted.stages[0].accepted).toBeNull();
    expect(submitted.stages[1].accepted).toBeNull();
    expect(submitted.stages[0].history[0]).toEqual(original);
    expect(submitted.stages[1].history).toHaveLength(1);
    expect(submitted.stages[0].config["focus"]).toBe("business");
    expect(acceptDocumentStage(submitted, 0).acceptedCount).toBe(1);
  });

  it("historical edit may be cancelled with the prior accepted version intact", () => {
    let draft = acceptDocumentStage(createDelegationDraft(), 0);
    draft = beginHistoricalEdit(draft, 0);
    draft = changeDocumentConfig(draft, 0, "focus", "research");
    const cancelled = cancelHistoricalEdit(draft);
    expect(cancelled.acceptedCount).toBe(1);
    expect(cancelled.editingHistorical).toBeNull();
    expect(cancelled.stages[0].config["focus"]).toBe("products");
    expect(cancelled.stages[0].accepted).toEqual(draft.stages[0].accepted);
  });

  it("cancelled historical edits restore the comment draft as well as controls", () => {
    let draft = acceptDocumentStage(createDelegationDraft(), 0);
    draft = beginHistoricalEdit(draft, 0);
    draft = updateReviewComments(draft, (items) => [
      ...items,
      { id: 7, stage: 0, excerpt: "原文", text: "草稿批注", status: "open" },
    ]);
    expect(draft.comments).toHaveLength(1);
    const cancelled = cancelHistoricalEdit(draft);
    expect(cancelled.comments).toHaveLength(0);
    expect(cancelled.historicalCommentBackup).toBeNull();
    expect(cancelled.stages[0].accepted).not.toBeNull();
  });

  it("persists precise text anchors alongside existing stage-wide comments", () => {
    let draft = createDelegationDraft();
    draft = updateReviewComments(draft, (items) => [
      ...items,
      { id: 1, stage: 0, excerpt: "全文", text: "整体意见", status: "open" },
      {
        id: 2,
        stage: 0,
        excerpt: "请持续观察",
        text: "补充来源",
        status: "open",
        anchor: {
          from: 1,
          to: 7,
          version: { stage: 0, revision: 0 },
          status: "active",
        },
      },
    ]);
    const recovered = parseDelegationDraft(JSON.stringify(draft));
    expect(recovered?.comments[0]?.anchor).toBeUndefined();
    expect(recovered?.comments[1]?.anchor).toEqual(draft.comments[1]?.anchor);
    expect(recovered?.comments[1]?.text).toBe("补充来源");
  });

  it("fails closed on tampered anchor metadata without trusting stored ranges", () => {
    let draft = createDelegationDraft();
    draft = updateReviewComments(draft, (items) => [
      ...items,
      {
        id: 4,
        stage: 0,
        excerpt: "文字",
        text: "批注",
        status: "open",
        anchor: { from: 1, to: 3, version: { stage: 0, revision: 0 }, status: "active" },
      },
    ]);
    const tampered = JSON.parse(JSON.stringify(draft));
    tampered.comments[0].anchor.from = 99;
    tampered.comments[0].anchor.to = 98;
    expect(parseDelegationDraft(JSON.stringify(tampered))).toBeNull();
    tampered.comments[0].anchor.from = 1;
    tampered.comments[0].anchor.to = 3;
    tampered.comments[0].anchor.version.stage = 1;
    expect(parseDelegationDraft(JSON.stringify(tampered))).toBeNull();
    tampered.comments[0].anchor.version.stage = 0;
    tampered.comments[0].anchor.version.revision = 100;
    expect(parseDelegationDraft(JSON.stringify(tampered))).toBeNull();
  });

  it("comments and snapshots survive typed session serialization without treating it as server proof", () => {
    let draft = createDelegationDraft();
    draft = updateReviewComments(draft, (items) => [
      ...items,
      { id: 1, stage: 0, excerpt: "研究目标", text: "证据来源", status: "open" },
    ]);
    draft = acceptDocumentStage(draft, 0);
    expect(parseDelegationDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parseDelegationDraft("{not valid JSON")).toBeNull();
    expect(parseDelegationDraft(JSON.stringify({ ...draft, schemaVersion: 99 }))).toBeNull();
    expect(parseDelegationDraft(JSON.stringify({ ...draft, acceptedCount: 3 }))).toBeNull();
  });
});

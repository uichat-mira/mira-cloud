import type { DelegationDraft } from "./delegation-document";
import { delegationScenarios, type DelegationStage } from "./delegation-fixtures";
import type { RevisionProposal } from "./delegation-revision-poc";

// Deliberately pre-authored changes, not natural-language understanding.
// The fixture leaves safety and notification preferences untouched; this is a
// demo-selection rule, not the proposal engine's authorization boundary.
const FIXTURE_UNCHANGED_FIELDS = new Set([
  "externalActions",
  "booking",
  "outreach",
  "askOnDecisions",
  "importantOnly",
]);

export function createFixtureRevisionProposal(
  draft: DelegationDraft,
  stage: DelegationStage,
): RevisionProposal {
  const record = draft.stages[stage];
  const description = record.markdown.split("\n\n## 当前约定\n\n")[0]?.trim() ?? "";
  const operations: RevisionProposal["operations"] = [];

  if (
    description.length >= 3 &&
    description.length < 3600 &&
    !/(?:^|\n)## 当前约定\s*\n/.test(description)
  ) {
    operations.push({
      kind: "replace-description",
      text: description + "\n\n这是一段预设演示修订：先核实资料来源，区分已知事实和待确认的事项。",
    });
  }

  const descriptors = delegationScenarios[draft.scenarioId].sections[stage].fields;
  let changedFieldCount = 0;
  for (const field of descriptors) {
    if (changedFieldCount >= 2) break;
    if (FIXTURE_UNCHANGED_FIELDS.has(field.id)) continue;
    const previous = record.config[field.id];
    if (field.kind === "choice" && typeof previous === "string") {
      const position = field.options.findIndex((option) => option.value === previous);
      if (field.options.length < 2 || position < 0) continue;
      operations.push({
        kind: "set-field",
        field: field.id,
        value: field.options[(position + 1) % field.options.length]!.value,
      });
      changedFieldCount += 1;
    } else if (field.kind === "toggle" && typeof previous === "boolean") {
      operations.push({ kind: "set-field", field: field.id, value: !previous });
      changedFieldCount += 1;
    }
  }

  const comments = draft.comments.filter(
    (comment) =>
      comment.stage === stage && (comment.status === "open" || comment.status === "suggested"),
  );
  return {
    protocol: "mira.delegation.revision_proposal",
    version: "0.1.0",
    stage,
    baseRevision: record.revision,
    operations,
    commentResponses: comments.map((comment, index) => ({
      commentId: comment.id,
      proposedHandling: index < 2 ? "addressed" : "not_addressed",
      reason:
        index < 2
          ? "预设演示将这条意见列为待核对；不代表已理解或解决原意见。"
          : "示例不替这条意见作判断，仍需用户核实与处理。",
    })),
  };
}

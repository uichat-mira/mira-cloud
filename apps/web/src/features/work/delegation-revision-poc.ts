import { z } from "zod";
import {
  changeDocumentConfig,
  changeDocumentMarkdown,
  isAgreementConsistent,
  updateReviewComments,
  type DelegationDraft,
  type DocumentSnapshot,
} from "./delegation-document";
import { delegationScenarios, type DelegationStage } from "./delegation-fixtures";
import { componentDiff, type FieldDiff, type ReviewField } from "./delegation-review-poc";

// Isolated T1 research prototype. No UI, storage, network or model execution.
// The existing DelegationDraft remains the sole owner of review state.
const operationSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("replace-description"),
    text: z.string().trim().min(1).max(4000),
  }),
  z.strictObject({
    kind: z.literal("set-field"),
    field: z.string().min(1).max(80),
    value: z.union([z.string().max(160), z.boolean()]),
  }),
]);
const responseSchema = z.strictObject({
  commentId: z.number().int().nonnegative(),
  proposedHandling: z.enum(["addressed", "not_addressed"]),
  reason: z.string().trim().min(1).max(600),
});
const revisionProposalSchema = z.strictObject({
  protocol: z.literal("mira.delegation.revision_proposal"),
  version: z.literal("0.1.0"),
  stage: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  baseRevision: z.number().int().nonnegative(),
  operations: z.array(operationSchema).min(1).max(12),
  // An independent demonstration may have zero notes. If notes exist, every
  // unresolved ID must still be answered exactly once below.
  commentResponses: z.array(responseSchema).max(40),
});

export type RevisionProposal = z.infer<typeof revisionProposalSchema>;
export type RevisionFailure = {
  ok: false;
  reason:
    | "invalid-proposal"
    | "stale-base"
    | "invalid-stage"
    | "unresolved-agreement"
    | "comment-mismatch"
    | "invalid-operation";
};
export type RevisionCandidate = {
  ok: true;
  stage: DelegationStage;
  baseRevision: number;
  sourceFingerprint: string;
  baseline: DocumentSnapshot;
  preview: DocumentSnapshot;
  proposedDraft: DelegationDraft;
  fieldChanges: FieldDiff[];
  commentResponses: RevisionProposal["commentResponses"];
};
export type RevisionPreparation = RevisionFailure | RevisionCandidate;

const reject = (reason: RevisionFailure["reason"]): RevisionFailure => ({ ok: false, reason });

function fingerprint(draft: DelegationDraft): string {
  // An old proposal must not overwrite unrelated changes in another stage or
  // comment list. This is a whole-draft in-memory comparison, not server CAS.
  return JSON.stringify(draft);
}

function fields(draft: DelegationDraft, stage: DelegationStage): ReviewField[] | null {
  const specs = delegationScenarios[draft.scenarioId].sections[stage].fields;
  const result: ReviewField[] = [];
  for (const descriptor of specs) {
    const value = draft.stages[stage].config[descriptor.id];
    if (
      (descriptor.kind === "choice" && typeof value !== "string") ||
      (descriptor.kind === "toggle" && typeof value !== "boolean")
    ) {
      return null;
    }
    if (value === undefined) return null;
    result.push({ id: descriptor.id, kind: descriptor.kind, label: descriptor.label, value });
  }
  return result;
}

function updateDescription(markdown: string, text: string): string | null {
  const marker = "\n\n## 当前约定\n\n";
  const index = markdown.indexOf(marker);
  if (
    index < 0 ||
    markdown.indexOf(marker, index + marker.length) >= 0 ||
    /(?:^|\n)## 当前约定\s*\n/.test(text)
  ) {
    return null;
  }
  // Keep the agreement generated from the same config, never copy one from AI.
  return text + "\n\n## 当前约定\n\n" + markdown.slice(index + marker.length).trim() + "\n";
}

export function prepareRevision(draft: DelegationDraft, payload: unknown): RevisionPreparation {
  const parsed = revisionProposalSchema.safeParse(payload);
  if (!parsed.success) return reject("invalid-proposal");
  const proposal = parsed.data;
  const stage = proposal.stage;
  if (stage !== draft.acceptedCount || draft.editingHistorical !== null) {
    return reject("invalid-stage");
  }
  if (draft.stages[stage].revision !== proposal.baseRevision) return reject("stale-base");
  if (!isAgreementConsistent(draft, stage)) return reject("unresolved-agreement");

  const unresolved = draft.comments.filter(
    (c) => c.stage === stage && (c.status === "open" || c.status === "suggested"),
  );
  const stageComments = draft.comments.filter((c) => c.stage === stage);
  if (new Set(stageComments.map((c) => c.id)).size !== stageComments.length) {
    return reject("comment-mismatch");
  }
  const knownIds = new Set(unresolved.map((c) => c.id));
  const respondedIds = new Set(proposal.commentResponses.map((c) => c.commentId));
  // One response for every unresolved comment; no omissions, duplicates or
  // responses to abandoned/resolved/other-stage comments.
  if (
    respondedIds.size !== proposal.commentResponses.length ||
    respondedIds.size !== knownIds.size ||
    [...respondedIds].some((id) => !knownIds.has(id))
  ) {
    return reject("comment-mismatch");
  }

  const originalFields = fields(draft, stage);
  if (!originalFields) return reject("invalid-operation");
  let next = draft;
  const seen = new Set<string>();
  for (const operation of proposal.operations) {
    const identity =
      operation.kind === "replace-description" ? "description" : "field:" + operation.field;
    if (seen.has(identity)) return reject("invalid-operation");
    seen.add(identity);

    if (operation.kind === "replace-description") {
      const result = updateDescription(next.stages[stage].markdown, operation.text);
      if (result === null || result === next.stages[stage].markdown) {
        return reject("invalid-operation");
      }
      next = changeDocumentMarkdown(next, stage, result);
    } else {
      // A model cannot change an external-action flag, even in a Fixture.
      if (["externalActions", "booking", "outreach"].includes(operation.field)) {
        return reject("invalid-operation");
      }
      const descriptor = delegationScenarios[draft.scenarioId].sections[stage].fields.find(
        (field) => field.id === operation.field,
      );
      if (!descriptor) return reject("invalid-operation");
      if (
        (descriptor.kind === "toggle" && typeof operation.value !== "boolean") ||
        (descriptor.kind === "choice" &&
          (typeof operation.value !== "string" ||
            !descriptor.options.some((option) => option.value === operation.value)))
      ) {
        return reject("invalid-operation");
      }
      if (next.stages[stage].config[operation.field] === operation.value) {
        return reject("invalid-operation");
      }
      next = changeDocumentConfig(next, stage, operation.field, operation.value);
    }
    if (next.stages[stage].markdown.length > 20_000) return reject("invalid-operation");
  }
  if (!isAgreementConsistent(next, stage)) return reject("unresolved-agreement");

  // A proposal is one reviewable revision, regardless of how many operations
  // it contains. Intermediate pure operations above must not leak into the
  // user-facing revision number or create fictitious source versions.
  const revisedStages = [...next.stages] as DelegationDraft["stages"];
  revisedStages[stage] = {
    ...revisedStages[stage],
    revision: draft.stages[stage].revision + 1,
  };
  next = { ...next, stages: revisedStages };

  const updatedFields = fields(next, stage);
  if (!updatedFields) return reject("invalid-operation");

  const original = draft.stages[stage];
  const modified = next.stages[stage];
  return {
    ok: true,
    stage,
    baseRevision: proposal.baseRevision,
    sourceFingerprint: fingerprint(draft),
    baseline: {
      markdown: original.markdown,
      config: { ...original.config },
      revision: original.revision,
    },
    preview: {
      markdown: modified.markdown,
      config: { ...modified.config },
      revision: modified.revision,
    },
    proposedDraft: next,
    fieldChanges: componentDiff(originalFields, updatedFields),
    commentResponses: proposal.commentResponses,
  };
}

/** Explicitly committing a reviewed candidate is NOT accepting its comments or stage. */
export function commitRevision(
  current: DelegationDraft,
  prepared: RevisionPreparation,
): RevisionPreparation {
  if (!prepared.ok) return prepared;
  if (fingerprint(current) !== prepared.sourceFingerprint) {
    return reject("stale-base");
  }
  if (
    current.stages[prepared.stage].revision !== prepared.baseRevision ||
    current.acceptedCount !== prepared.stage
  ) {
    return reject("stale-base");
  }
  const outcomes = new Map(prepared.commentResponses.map((item) => [item.commentId, item]));
  const draft = updateReviewComments(prepared.proposedDraft, (items) =>
    items.map((comment) => {
      if (comment.stage !== prepared.stage) return comment;
      const response = outcomes.get(comment.id);
      if (!response) return comment;
      return {
        ...comment,
        status: response.proposedHandling === "addressed" ? "suggested" : "open",
        suggestedReason: response.reason,
      };
    }),
  );
  const stages = [...draft.stages] as DelegationDraft["stages"];
  const currentStage = stages[prepared.stage];
  const reviewHistory = currentStage.reviewHistory ?? [];
  stages[prepared.stage] = {
    ...currentStage,
    // Keep the original review source separate from accepted history. A former
    // revision can be opened for provenance but must never be auto-reanchored.
    reviewHistory: (reviewHistory.some(
      (snapshot) => snapshot.revision === prepared.baseline.revision,
    )
      ? reviewHistory
      : [...reviewHistory, prepared.baseline]
    ).slice(-60),
  };
  return { ...prepared, proposedDraft: { ...draft, stages } };
}

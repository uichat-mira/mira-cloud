import { z } from "zod";
import {
  delegationScenarios,
  delegationSummary,
  type DelegationScenario,
  type DelegationScenarioId,
  type DelegationStage,
} from "./delegation-fixtures";

// One prototype document owns both editable prose and every JSON UI bound field.
// The renderer receives a projection; it is not a second source of business truth.
const configSchema = z.record(z.string(), z.union([z.string(), z.boolean()]));
const snapshotSchema = z.object({
  markdown: z.string(),
  config: configSchema,
  revision: z.number().int().nonnegative(),
});
const stageSchema = snapshotSchema.extend({
  accepted: snapshotSchema.nullable(),
  history: z.array(snapshotSchema),
  // Superseded draft revisions are not accepted snapshots. Keep them distinct
  // so old-version annotations can be read without inventing a new anchor.
  reviewHistory: z.array(snapshotSchema).optional(),
});
const commentAnchorSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().positive(),
  version: z.object({
    stage: z.number().int().min(0).max(2),
    revision: z.number().int().nonnegative(),
  }),
  status: z.enum(["active", "lost"]),
});

const commentSchema = z.object({
  id: z.number().int().nonnegative(),
  stage: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  excerpt: z.string(),
  // Absent for stage-wide notes created before or without a text selection.
  anchor: commentAnchorSchema.optional(),
  text: z.string(),
  status: z.enum(["open", "suggested", "resolved", "abandoned"]),
  suggestedReason: z.string().max(600).optional(),
});
const draftSchema = z.object({
  schemaVersion: z.literal(1),
  scenarioId: z.enum(["radar", "journey", "venture", "custom"]),
  intent: z.string().max(500),
  stages: z.tuple([stageSchema, stageSchema, stageSchema]),
  acceptedCount: z.number().int().min(0).max(3),
  editingHistorical: z.union([z.literal(0), z.literal(1), z.literal(2)]).nullable(),
  comments: z.array(commentSchema),
  historicalCommentBackup: z.array(commentSchema).nullable().optional(),
});

export type ReviewComment = z.infer<typeof commentSchema>;
export type DocumentSnapshot = z.infer<typeof snapshotSchema>;
export type StageDocument = z.infer<typeof stageSchema>;
export type DelegationDraft = z.infer<typeof draftSchema>;

export const DRAFT_STORAGE_KEY = "mira-cloud-delegation-fixture-v1";
const AGREEMENT_HEADER = "## 当前约定";

function buildMarkdown(description: string, agreement: string): string {
  return `${description.trim()}\n\n${AGREEMENT_HEADER}\n\n${agreement}\n`;
}

function extractAgreements(markdown: string): string[] {
  const sections = [...markdown.matchAll(/(?:^|\n)## 当前约定\s*\n+/g)];
  if (sections.length !== 1) return [];
  const only = sections[0];
  if (!only) return [];
  return [markdown.slice((only.index ?? 0) + only[0].length).trim()];
}

export function isAgreementConsistent(draft: DelegationDraft, stage: DelegationStage): boolean {
  const record = draft.stages[stage];
  const expected = delegationSummary(draft.scenarioId, stage, record.config);
  const found = extractAgreements(record.markdown);
  return found.length === 1 && found[0] === expected;
}

function updateAgreement(markdown: string, agreement: string): string {
  const count = (markdown.match(/(?:^|\n)## 当前约定\s*\n/g) ?? []).length;
  if (count !== 1) return markdown;
  return markdown.replace(
    /(^|\n)## 当前约定\s*\n+[^\n]*/m,
    (_match, prefix: string) => `${prefix}${AGREEMENT_HEADER}\n\n${agreement}`,
  );
}

export function createDelegationDraft(
  scenarioId: DelegationScenarioId = "radar",
  intentOverride?: string,
): DelegationDraft {
  const scenario = delegationScenarios[scenarioId];
  const config = { ...scenario.initialConfig };
  const normalizedIntent = (intentOverride?.trim() || scenario.intent).slice(0, 500);
  const makeStage = (stage: DelegationStage): StageDocument => ({
    markdown: buildMarkdown(
      stage === 0 && scenarioId === "custom"
        ? `你交代的目标：\n\n${normalizedIntent
            .split(/\r?\n/)
            .map((line) => `> ${line}`)
            .join("\n")}\n\n先确认这件事的范围与关键前提；资料、权限和执行条件仍需逐步核实。`
        : stage === 0
          ? scenario.text
          : scenario.sections[stage].description,
      delegationSummary(scenarioId, stage, config),
    ),
    config: { ...config },
    revision: 0,
    accepted: null,
    history: [],
    reviewHistory: [],
  });
  const stages: DelegationDraft["stages"] = [makeStage(0), makeStage(1), makeStage(2)];
  return {
    schemaVersion: 1,
    scenarioId,
    intent: normalizedIntent,
    stages,
    acceptedCount: 0,
    editingHistorical: null,
    comments: [],
    historicalCommentBackup: null,
  };
}

export function parseDelegationDraft(raw: string | null): DelegationDraft | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = draftSchema.safeParse(parsed);
    if (!result.success) return null;
    const draft = result.data;
    // Refuse inconsistent revision metadata from tampered/stale session data.
    if (
      draft.comments.some(
        (item) =>
          item.anchor !== undefined &&
          (item.anchor.version.stage !== item.stage ||
            item.anchor.from >= item.anchor.to ||
            item.anchor.to > 50000 ||
            item.anchor.version.revision > draft.stages[item.stage].revision),
      ) ||
      draft.stages.some(
        (entry, i) =>
          (i < draft.acceptedCount && entry.accepted === null) ||
          entry.history.length > 60 ||
          (entry.reviewHistory?.length ?? 0) > 60 ||
          entry.reviewHistory?.some(
            (item) => item.revision > entry.revision || item.markdown.length > 20000,
          ) ||
          entry.markdown.length > 20000,
      )
    )
      return null;
    return draft;
  } catch {
    return null;
  }
}

function reviewHistoryBeforeMutation(
  draft: DelegationDraft,
  stage: DelegationStage,
): DocumentSnapshot[] {
  const current = draft.stages[stage];
  const referenced = draft.comments.some(
    (comment) => comment.stage === stage && comment.anchor?.version.revision === current.revision,
  );
  const history = current.reviewHistory ?? [];
  if (!referenced || history.some((snapshot) => snapshot.revision === current.revision)) {
    return history;
  }
  return [
    ...history,
    {
      markdown: current.markdown,
      config: { ...current.config },
      revision: current.revision,
    },
  ].slice(-60);
}

export function changeDocumentMarkdown(
  draft: DelegationDraft,
  stage: DelegationStage,
  markdown: string,
): DelegationDraft {
  const current = draft.stages[stage];
  if (markdown === current.markdown || markdown.length > 20000) return draft;
  if (stage < draft.acceptedCount && draft.editingHistorical !== stage) return draft;
  const stages = [...draft.stages] as DelegationDraft["stages"];
  stages[stage] = {
    ...current,
    markdown,
    revision: current.revision + 1,
    reviewHistory: reviewHistoryBeforeMutation(draft, stage),
  };
  return { ...draft, stages };
}

export function changeDocumentConfig(
  draft: DelegationDraft,
  stage: DelegationStage,
  field: string,
  value: unknown,
): DelegationDraft {
  if (stage < draft.acceptedCount && draft.editingHistorical !== stage) return draft;
  const scenario: DelegationScenario = delegationScenarios[draft.scenarioId];
  const descriptor = scenario.sections[stage].fields.find((item) => item.id === field);
  if (!descriptor) return draft;
  const valid =
    descriptor.kind === "toggle"
      ? typeof value === "boolean"
      : typeof value === "string" && descriptor.options.some((option) => option.value === value);
  if (!valid || (typeof value !== "string" && typeof value !== "boolean")) return draft;
  const current = draft.stages[stage];
  if (current.config[field] === value) return draft;
  const config = { ...current.config, [field]: value };
  const agreement = delegationSummary(draft.scenarioId, stage, config);
  // Never overwrite an intentionally edited/conflicting agreement silently.
  const markdown = isAgreementConsistent(draft, stage)
    ? updateAgreement(current.markdown, agreement)
    : current.markdown;
  const stages = [...draft.stages] as DelegationDraft["stages"];
  stages[stage] = {
    ...current,
    config,
    markdown,
    revision: current.revision + 1,
    reviewHistory: reviewHistoryBeforeMutation(draft, stage),
  };
  return { ...draft, stages };
}

export function alignDocumentAgreement(
  draft: DelegationDraft,
  stage: DelegationStage,
): DelegationDraft {
  const current = draft.stages[stage];
  if (stage < draft.acceptedCount && draft.editingHistorical !== stage) return draft;
  const expected = delegationSummary(draft.scenarioId, stage, current.config);
  const firstHeader = current.markdown.indexOf(AGREEMENT_HEADER);
  // Explicit reconciliation discards text after the agreement heading.
  const prose = (
    firstHeader < 0 ? current.markdown : current.markdown.slice(0, firstHeader)
  ).trimEnd();
  return changeDocumentMarkdown(draft, stage, buildMarkdown(prose, expected));
}

export function acceptDocumentStage(
  draft: DelegationDraft,
  stage: DelegationStage,
): DelegationDraft {
  // Acceptance is a domain invariant; a caller must not bypass the UI guard.
  if (
    stage !== draft.acceptedCount ||
    draft.editingHistorical !== null ||
    draft.comments.some(
      (comment) =>
        comment.stage === stage && (comment.status === "open" || comment.status === "suggested"),
    ) ||
    !isAgreementConsistent(draft, stage)
  ) {
    return draft;
  }
  const stages = [...draft.stages] as DelegationDraft["stages"];
  const current = stages[stage];
  const accepted: DocumentSnapshot = {
    markdown: current.markdown,
    config: { ...current.config },
    revision: current.revision,
  };
  stages[stage] = { ...current, accepted, history: [...current.history, accepted] };
  if (stage < 2) {
    const next = (stage + 1) as DelegationStage;
    const nextCurrent = stages[next];
    const config = { ...current.config, ...nextCurrent.config };
    // Only fields from the accepted stage should flow into the next-stage config.
    for (const field of delegationScenarios[draft.scenarioId].sections[stage].fields) {
      config[field.id] = current.config[field.id]!;
    }
    const updatedAgreement = delegationSummary(draft.scenarioId, next, config);
    // A user-authored disagreement in a later stage must never be silently repaired.
    const nextWasConsistent = isAgreementConsistent(draft, next);
    stages[next] = {
      ...nextCurrent,
      config,
      markdown: nextWasConsistent
        ? updateAgreement(nextCurrent.markdown, updatedAgreement)
        : nextCurrent.markdown,
    };
  }
  return { ...draft, acceptedCount: stage + 1, stages };
}

export function beginHistoricalEdit(
  draft: DelegationDraft,
  stage: DelegationStage,
): DelegationDraft {
  if (stage >= draft.acceptedCount) return draft;
  const accepted = draft.stages[stage].accepted;
  if (!accepted) return draft;
  const stages = [...draft.stages] as DelegationDraft["stages"];
  stages[stage] = {
    ...stages[stage],
    markdown: accepted.markdown,
    config: { ...accepted.config },
    revision: accepted.revision,
  };
  return {
    ...draft,
    stages,
    editingHistorical: stage,
    historicalCommentBackup: draft.comments.map((item) => ({ ...item })),
  };
}

export function cancelHistoricalEdit(draft: DelegationDraft): DelegationDraft {
  const stage = draft.editingHistorical;
  if (stage === null) return draft;
  const snapshot = draft.stages[stage].accepted;
  if (!snapshot) return draft;
  const stages = [...draft.stages] as DelegationDraft["stages"];
  stages[stage] = {
    ...stages[stage],
    markdown: snapshot.markdown,
    config: { ...snapshot.config },
    revision: snapshot.revision,
  };
  return {
    ...draft,
    stages,
    comments: draft.historicalCommentBackup ?? draft.comments,
    editingHistorical: null,
    historicalCommentBackup: null,
  };
}

export function submitHistoricalRevision(draft: DelegationDraft): DelegationDraft {
  const stage = draft.editingHistorical;
  if (stage === null || !isAgreementConsistent(draft, stage)) return draft;
  const stages = [...draft.stages] as DelegationDraft["stages"];
  for (let i = stage; i < stages.length; i++) {
    const idx = i as DelegationStage;
    stages[idx] = { ...stages[idx], accepted: null };
  }
  return {
    ...draft,
    stages,
    acceptedCount: stage,
    editingHistorical: null,
    historicalCommentBackup: null,
  };
}

export function updateReviewComments(
  draft: DelegationDraft,
  update: (comments: ReviewComment[]) => ReviewComment[],
): DelegationDraft {
  return { ...draft, comments: update(draft.comments) };
}

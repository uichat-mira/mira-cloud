import "./delegation.css";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CornerUpLeft,
  MessageSquare,
  PenLine,
  Plus,
  Square,
  WandSparkles,
  X,
} from "lucide-react";
import { Renderer, JSONUIProvider } from "@json-render/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import type { TextReviewAnchor } from "./delegation-review-poc";
import DelegationIntentEntry from "./delegation-intent-entry";
import ConfirmDialog from "../../components/mira-design/ConfirmDialog";
import { StepIndicator } from "../../components/mira-design/StepIndicator";
import { ModalShell } from "../../components/mira-design/Modal";
import { useLocation, useNavigate } from "react-router";
import { delegationRegistry } from "./delegation-catalog";
import { findPreviewArtifact } from "./fixture-data";
import { createFixtureRevisionProposal } from "./delegation-revision-fixture";
import type { RevisionCandidate } from "./delegation-revision-poc";
import {
  DRAFT_STORAGE_KEY,
  acceptDocumentStage,
  alignDocumentAgreement,
  beginHistoricalEdit,
  cancelHistoricalEdit,
  changeDocumentConfig,
  changeDocumentMarkdown,
  createDelegationDraft,
  isAgreementConsistent,
  parseDelegationDraft,
  type DocumentSnapshot,
  resolveSelectedSuggestedComments,
  submitHistoricalRevision,
  updateReviewComments,
} from "./delegation-document";
import {
  buildDelegationSpec,
  delegationScenarios,
  type DelegationScenario,
  type DelegationScenarioId,
  type DelegationStage,
} from "./delegation-fixtures";

const DelegationReviewDocument = lazy(() => import("./delegation-review-document"));
const DelegationDiffReview = lazy(() => import("./delegation-diff-review"));
const MarkdownText = lazy(async () => {
  const { loadMarkdownText } = await import("../../components/mira-design/content");
  return loadMarkdownText();
});

type CommentStatus = "open" | "suggested" | "resolved" | "abandoned";
const statusLabels: Record<CommentStatus, string> = {
  open: "待处理",
  suggested: "已建议处理（演示）",
  resolved: "已解决",
  abandoned: "已放弃",
};

function LiveReviewCanvas({
  scenario,
  stage,
  revision,
  streamStep,
  readonly,
}: {
  scenario: DelegationScenario;
  stage: DelegationStage;
  revision: number;
  streamStep: number;
  readonly: boolean;
}) {
  const spec = useMemo(
    () => buildDelegationSpec(scenario, stage, revision, streamStep),
    [scenario, stage, revision, streamStep],
  );
  return (
    <div className="delegation-generated" aria-label="动态需求确认">
      <div className="delegation-section-caption">
        <span>确认与调整</span>
        <span>与正文共用一份草稿</span>
      </div>
      <div
        className={readonly ? "delegation-generated-readonly" : ""}
        aria-readonly={readonly}
        inert={readonly}
      >
        <Renderer spec={spec} registry={delegationRegistry} />
      </div>
    </div>
  );
}

function ReviewSurface({
  scenario,
  stage,
  revision,
  streamStep,
  readonly,
  config,
  onConfigChange,
}: {
  scenario: DelegationScenario;
  stage: DelegationStage;
  revision: number;
  streamStep: number;
  readonly: boolean;
  config: Record<string, string | boolean>;
  onConfigChange: (changes: Array<{ path: string; value: unknown }>) => void;
}) {
  return (
    <JSONUIProvider
      registry={delegationRegistry}
      initialState={{ config }}
      onStateChange={onConfigChange}
    >
      <LiveReviewCanvas
        scenario={scenario}
        stage={stage}
        revision={revision}
        streamStep={streamStep}
        readonly={readonly}
      />
    </JSONUIProvider>
  );
}

function parseReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/new")) return "/";
  return value;
}

export default function DelegationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [storedDraft] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      return parseDelegationDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY));
    } catch {
      return null;
    }
  });
  // Old review CDP scripts use a dev-only fixture shortcut. A shipped build
  // must never bypass D02 just because a query parameter was supplied.
  const fixtureQuery = import.meta.env.DEV
    ? new URLSearchParams(location.search).get("fixture")
    : null;
  const fixtureScenario =
    fixtureQuery === "radar" || fixtureQuery === "journey" || fixtureQuery === "venture"
      ? fixtureQuery
      : null;
  const [entryPhase, setEntryPhase] = useState<"entry" | "drafting" | "error" | "review">(() =>
    storedDraft || fixtureScenario ? "review" : "entry",
  );
  const [pendingStart, setPendingStart] = useState<{
    scenario: DelegationScenarioId;
    intent: string;
  } | null>(null);
  const [restartRequested, setRestartRequested] = useState(false);
  const [draft, setDraft] = useState(
    () => storedDraft ?? createDelegationDraft(fixtureScenario ?? "radar"),
  );
  const [saveStatus, setSaveStatus] = useState<"saved" | "failed">("saved");
  const scenarioId = draft.scenarioId;
  const [stage, setStage] = useState<DelegationStage>(
    () =>
      draft.editingHistorical ??
      (draft.acceptedCount === 3 ? 2 : (draft.acceptedCount as DelegationStage)),
  );
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [pendingAnchor, setPendingAnchor] = useState<TextReviewAnchor | null>(null);
  const [wholeStageComment, setWholeStageComment] = useState(false);
  const [selectionPosition, setSelectionPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const [selectedCommentIds, setSelectedCommentIds] = useState<number[]>([]);
  const documentViewRef = useRef<EditorView | null>(null);
  const sheetScrollRef = useRef(0);
  const commentIntentRef = useRef(false);
  const [revision, setRevision] = useState(0);
  const [streamStep, setStreamStep] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [preparingRevision, setPreparingRevision] = useState(false);
  const [candidate, setCandidate] = useState<RevisionCandidate | null>(null);
  const pendingRevisionRef = useRef<RevisionCandidate | null>(null);
  const revisionEngineRef = useRef<typeof import("./delegation-revision-poc") | null>(null);
  const revisionRequestRef = useRef(0);
  const [sourceCommentId, setSourceCommentId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(
    () => () => {
      revisionRequestRef.current += 1;
    },
    [],
  );
  useEffect(() => {
    setSelectedCommentIds([]);
  }, [scenarioId, stage]);
  const [editingBody, setEditingBody] = useState(false);
  const [providerEpoch, setProviderEpoch] = useState(0);
  const [demoFinished, setDemoFinished] = useState(draft.acceptedCount === draft.stages.length);
  const [pendingScenario, setPendingScenario] = useState<DelegationScenarioId | null>(null);
  const scenario = delegationScenarios[scenarioId];
  const returnTo = parseReturnTo((location.state as { returnTo?: unknown } | null)?.returnTo);
  // Only a known, explicitly opened Fixture artifact may seed this local demo.
  // The title is not the artifact's body, and this grants no access rights.
  const artifactMatch = returnTo.split("?")[0]?.match(/^\/artifacts\/([^/]+)$/);
  const exampleArtifact = artifactMatch ? findPreviewArtifact(artifactMatch[1]) : undefined;
  const comments = draft.comments;
  const acceptedCount = draft.acceptedCount;
  const record = draft.stages[stage];
  // Abandoning closes a review item. Retain its status in the session draft
  // for version provenance, but never show it as active work or a text mark.
  const currentComments = comments.filter(
    (comment) => comment.stage === stage && comment.status !== "abandoned",
  );
  const suggestedComments = currentComments.filter((comment) => comment.status === "suggested");
  const selectedSuggestedCommentIds = suggestedComments
    .filter((comment) => selectedCommentIds.includes(comment.id))
    .map((comment) => comment.id);
  const documentAnchors = useMemo(
    () =>
      comments.flatMap((comment): TextReviewAnchor[] =>
        comment.stage === stage &&
        comment.status !== "abandoned" &&
        comment.anchor &&
        comment.anchor.version.revision === record.revision
          ? [
              {
                id: String(comment.id),
                version: comment.anchor.version,
                from: comment.anchor.from,
                to: comment.anchor.to,
                excerpt: comment.excerpt,
                status: comment.anchor.status,
              },
            ]
          : [],
      ),
    [comments, stage, record.revision],
  );
  const unresolved = currentComments.filter(
    (comment) => comment.status === "open" || comment.status === "suggested",
  ).length;
  const historicStage = stage < acceptedCount;
  const historical = historicStage && draft.editingHistorical !== stage;
  const revisingHistory = draft.editingHistorical === stage;
  const consistent = isAgreementConsistent(draft, stage);
  const renderedBody = candidate?.preview.markdown ?? record.markdown;
  const latestReviewSource = record.reviewHistory?.at(-1) ?? null;
  const diffSource =
    candidate?.baseline ?? (streaming || preparingRevision ? null : latestReviewSource);
  const diffResult = candidate?.preview ?? record;
  const sourceComment = currentComments.find((item) => item.id === sourceCommentId);
  const sourceVersion = sourceComment?.anchor?.version.revision;
  const sourceSnapshot: DocumentSnapshot | null =
    sourceVersion === undefined
      ? null
      : sourceVersion === record.revision
        ? record
        : ((candidate?.baseline.revision === sourceVersion
            ? candidate.baseline
            : record.reviewHistory?.find((item) => item.revision === sourceVersion)) ?? null);
  const hasDraftProgress =
    streaming ||
    preparingRevision ||
    candidate !== null ||
    acceptedCount > 0 ||
    comments.length > 0 ||
    draft.editingHistorical !== null ||
    draft.stages.some((item) => item.revision > 0);

  const stageCount = scenario.stages.length;
  const finalStageIndex = stageCount - 1;
  const currentStageState =
    preparingRevision || streaming
      ? "正在准备演示修订"
      : candidate
        ? "修订候选 · 待你核对"
        : revisingHistory
          ? "正在修改历史阶段"
          : historical
            ? "已接受 · 只读"
            : "待你审阅";
  const timelineSteps = [
    ...scenario.stages.map((label, index) => ({
      step: index,
      label,
      marker: String(index + 1).padStart(2, "0"),
      description:
        index === stage ? currentStageState : index < acceptedCount ? "已接受" : "等待前一阶段",
      completed: index < acceptedCount,
      disabled: index > acceptedCount || streaming || preparingRevision || candidate !== null,
    })),
    {
      step: stageCount,
      label: "长期托管",
      marker: "∞",
      description: demoFinished ? "演示流程已完成" : "最终确认后成立",
      completed: false,
      disabled: true,
    },
  ];

  // The entry is not a created task or a saved draft. Only commit the
  // document to browser session storage once the user explicitly asks to draft.
  useEffect(() => {
    if (entryPhase !== "review") return;
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("failed");
    }
  }, [draft, entryPhase]);

  useEffect(() => {
    if (entryPhase !== "drafting" || !pendingStart) return;
    // This is a local template demonstration, not a fake AI request.
    const timer = window.setTimeout(() => {
      try {
        const next = createDelegationDraft(pendingStart.scenario, pendingStart.intent);
        window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
        setDraft(next);
        setStage(0);
        setCommentsOpen(false);
        setCommentText("");
        setPendingAnchor(null);
        setWholeStageComment(false);
        setRevision(0);
        setStreamStep(0);
        setStreaming(false);
        setEditingBody(false);
        setMessage("");
        setDemoFinished(false);
        setEntryPhase("review");
        if (window.scrollY > 0) window.scrollTo(0, 0);
      } catch {
        setEntryPhase("error");
      }
    }, 520);
    return () => window.clearTimeout(timer);
  }, [entryPhase, pendingStart]);

  useEffect(() => {
    if (!streaming) return;
    let next = 0;
    const timer = window.setInterval(() => {
      next += 1;
      setStreamStep(next);
      if (next >= 3) {
        window.clearInterval(timer);
        setCandidate(pendingRevisionRef.current);
        pendingRevisionRef.current = null;
        setStreaming(false);
        setMessage("本地 Fixture 修订候选已生成。先查看差异，再决定采用或放弃。");
      }
    }, 740);
    return () => window.clearInterval(timer);
  }, [streaming, stage]);

  const setScenario = (next: DelegationScenarioId) => {
    revisionRequestRef.current += 1;
    setPreparingRevision(false);
    setStreaming(false);
    setCandidate(null);
    pendingRevisionRef.current = null;
    setSourceCommentId(null);
    setDraft(createDelegationDraft(next));
    setStage(0);
    setTimelineOpen(false);
    setCommentsOpen(false);
    setCommentText("");
    setPendingAnchor(null);
    setWholeStageComment(false);
    commentIntentRef.current = false;
    setActiveCommentId(null);
    setRevision(0);
    setStreamStep(0);
    setEditingBody(false);
    setMessage("");
    setDemoFinished(false);
    setPendingScenario(null);
  };

  const requestScenario = (next: DelegationScenarioId) => {
    if (next === scenarioId) return;
    if (hasDraftProgress) {
      setPendingScenario(next);
      return;
    }
    setScenario(next);
  };

  const startFromIntent = (scenario: DelegationScenarioId, intent: string) => {
    if (entryPhase === "drafting" || intent.trim().length < 2) return;
    setPendingStart({ scenario, intent: intent.trim().slice(0, 500) });
    setEntryPhase("drafting");
  };

  const returnToIntent = () => {
    // A denied storage operation must not pretend that this draft was cleared.
    try {
      window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      setSaveStatus("failed");
      return;
    }
    setDraft(createDelegationDraft());
    setPendingStart(null);
    setEntryPhase("entry");
    setRestartRequested(false);
    revisionRequestRef.current += 1;
    setPreparingRevision(false);
    setStreaming(false);
    setCandidate(null);
    pendingRevisionRef.current = null;
    setSourceCommentId(null);
    setCommentsOpen(false);
    setPendingAnchor(null);
    setWholeStageComment(false);
    setMessage("");
  };

  const handleConfigChanges = (changes: Array<{ path: string; value: unknown }>) => {
    if (streaming || preparingRevision || candidate || historical || editingBody) return;
    setDraft((previous) =>
      changes.reduce((next, change) => {
        if (!change.path.startsWith("/config/")) return next;
        return changeDocumentConfig(
          next,
          stage,
          change.path.slice("/config/".length),
          change.value,
        );
      }, previous),
    );
  };

  const openComments = () => {
    if (!commentsOpen) sheetScrollRef.current = window.scrollY;
    setCommentsOpen(true);
  };

  const closeComments = (restoreReadingPosition = true) => {
    setCommentsOpen(false);
    commentIntentRef.current = false;
    setWholeStageComment(false);
    setCommentText("");
    setPendingAnchor(null);
    setSelectionPosition(null);
    if (restoreReadingPosition && window.matchMedia?.("(max-width: 700px)").matches) {
      window.requestAnimationFrame(() => window.scrollTo(0, sheetScrollRef.current));
    }
  };

  useEffect(() => {
    if (!commentsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeComments();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commentsOpen]);

  const addComment = () => {
    const text = commentText.trim();
    // Opening the review list alone never authorizes a new comment. Even a
    // programmatic submit needs either a proven text anchor or explicit
    // whole-stage intent, not an implicit fallthrough to "本阶段整体".
    if (
      !text ||
      (!pendingAnchor && !wholeStageComment) ||
      streaming ||
      preparingRevision ||
      candidate ||
      historical
    )
      return;
    const view = documentViewRef.current;
    if (
      pendingAnchor &&
      (!view ||
        pendingAnchor.status !== "active" ||
        pendingAnchor.version.stage !== stage ||
        pendingAnchor.version.revision !== record.revision ||
        pendingAnchor.from >= pendingAnchor.to ||
        pendingAnchor.to > view.state.doc.content.size ||
        view.state.doc.textBetween(pendingAnchor.from, pendingAnchor.to, " ") !==
          pendingAnchor.excerpt)
    ) {
      setMessage("所选原文已发生变化，请重新框选后再批注。不会猜测新位置。");
      setPendingAnchor(null);
      return;
    }
    setDraft((previous) =>
      updateReviewComments(previous, (items) => {
        const id = Math.max(0, ...items.map((item) => item.id)) + 1;
        return [
          ...items,
          {
            id,
            stage,
            excerpt: pendingAnchor ? pendingAnchor.excerpt : "本阶段整体",
            ...(pendingAnchor
              ? {
                  anchor: {
                    from: pendingAnchor.from,
                    to: pendingAnchor.to,
                    version: pendingAnchor.version,
                    status: "active" as const,
                  },
                }
              : {}),
            text,
            status: "open" as const,
          },
        ];
      }),
    );
    setCommentText("");
    setPendingAnchor(null);
    setWholeStageComment(false);
    commentIntentRef.current = false;
    openComments();
    setMessage("批注已加入本次演示草稿。还没有提交给真实 Agent。");
  };

  const loadDemoComments = () => {
    if (
      streaming ||
      preparingRevision ||
      candidate ||
      historical ||
      editingBody ||
      currentComments.length > 0
    )
      return;
    const examples = [
      "请先说明如何核实资料来源。",
      "研究重点需要更具体。",
      "保留尚未确认的范围和风险。",
    ];
    setDraft((previous) =>
      updateReviewComments(previous, (items) => {
        const firstId = Math.max(0, ...items.map((item) => item.id)) + 1;
        return [
          ...items,
          ...examples.map((text, offset) => ({
            id: firstId + offset,
            stage,
            excerpt: "本阶段整体",
            text,
            status: "open" as const,
          })),
        ];
      }),
    );
    setMessage("已加入三条演示批注，供集中修订体验；并未提交给 AI。");
  };

  const updateAnchors = (nextAnchors: TextReviewAnchor[]) => {
    setDraft((previous) => {
      let changed = false;
      const byId = new Map(nextAnchors.map((anchor) => [anchor.id, anchor]));
      const updated = previous.comments.map((comment) => {
        if (comment.stage !== stage || !comment.anchor) return comment;
        const next = byId.get(String(comment.id));
        if (
          !next ||
          (next.from === comment.anchor.from &&
            next.to === comment.anchor.to &&
            next.status === comment.anchor.status)
        )
          return comment;
        changed = true;
        return {
          ...comment,
          anchor: {
            ...comment.anchor,
            from: next.from,
            to: next.to,
            status: next.status,
          },
        };
      });
      return changed ? { ...previous, comments: updated } : previous;
    });
  };

  const openAnchoredComment = (id: string) => {
    const index = Number(id);
    if (!Number.isSafeInteger(index)) return;
    setActiveCommentId(index);
    openComments();
    window.requestAnimationFrame(() =>
      document.getElementById("delegation-comment-" + id)?.scrollIntoView({ block: "nearest" }),
    );
  };

  const jumpToCommentSource = (commentId: number) => {
    const entry = currentComments.find((item) => item.id === commentId);
    const anchor = entry?.anchor;
    if (!anchor) return;
    // Old anchors always belong to the source revision, not matching text in
    // the new document. Never attempt implicit cross-version relocation.
    if (candidate || anchor.version.revision !== record.revision) {
      if (
        !record.reviewHistory?.some((item) => item.revision === anchor.version.revision) &&
        candidate?.baseline.revision !== anchor.version.revision
      ) {
        setMessage("批注来源版本未保存，不能猜测在新版中的位置。");
        return;
      }
      setSourceCommentId(commentId);
      return;
    }
    const view = documentViewRef.current;
    if (anchor.status !== "active" || !view) return;
    if (
      anchor.to > view.state.doc.content.size ||
      view.state.doc.textBetween(anchor.from, anchor.to, " ") !== entry.excerpt
    ) {
      setMessage("原文定位已失效，无法安全跳转。");
      return;
    }
    setActiveCommentId(commentId);
    closeComments(false);
    window.requestAnimationFrame(() => {
      view.focus();
      view.dispatch(
        view.state.tr
          .setSelection(TextSelection.create(view.state.doc, anchor.from, anchor.to))
          .scrollIntoView(),
      );
      // The read-only editor may not paint its internal selection into the native
      // browser Selection. Resolve it via ProseMirror DOM coordinates, not text search.
      const start = view.domAtPos(anchor.from);
      const end = view.domAtPos(anchor.to);
      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      view.dom
        .querySelector('[data-anchor-id="' + commentId + '"]')
        ?.scrollIntoView({ block: "center" });
    });
  };

  const updateComment = (id: number, status: "resolved" | "abandoned") => {
    if (streaming || preparingRevision || candidate) return;
    setDraft((previous) =>
      updateReviewComments(previous, (items) =>
        items.map((comment) => (comment.id === id ? { ...comment, status } : comment)),
      ),
    );
    setSelectedCommentIds((previous) => previous.filter((selectedId) => selectedId !== id));
  };

  const toggleSuggestedCommentSelection = (id: number, checked: boolean) => {
    if (streaming || preparingRevision || candidate || historical) return;
    if (!suggestedComments.some((comment) => comment.id === id)) return;
    setSelectedCommentIds((previous) =>
      checked
        ? previous.includes(id)
          ? previous
          : [...previous, id]
        : previous.filter((selectedId) => selectedId !== id),
    );
  };

  const confirmSelectedComments = () => {
    if (streaming || preparingRevision || candidate || historical) return;
    const selectedIds = selectedSuggestedCommentIds;
    if (selectedIds.length === 0) return;
    setDraft((previous) => resolveSelectedSuggestedComments(previous, stage, selectedIds));
    setSelectedCommentIds((previous) =>
      previous.filter((selectedId) => !selectedIds.includes(selectedId)),
    );
  };

  const clearDocumentSelection = () => {
    // Once the user explicitly opens the composer, preserve the chosen excerpt
    // until they submit or dismiss it; focusing the textarea collapses Selection.
    if (commentsOpen || commentIntentRef.current) return;
    setPendingAnchor(null);
    setSelectionPosition(null);
  };

  const selectDocumentText = (anchor: TextReviewAnchor) => {
    // A visible review rail must continue accepting new source selections.
    // The sidebar composer uses the latest stable range; the floating entry
    // is only needed while the review rail is closed.
    if (streaming || preparingRevision || candidate || historical || editingBody) return;
    if (anchor.excerpt.length > 600) {
      setMessage("选区过长，请选择不超过 600 字的段落。");
      return;
    }
    setPendingAnchor(anchor);
    setWholeStageComment(false);
    const view = documentViewRef.current;
    const container = view?.dom.closest(".delegation-document-text");
    if (view && container) {
      try {
        const pos = view.coordsAtPos(anchor.to);
        const box = container.getBoundingClientRect();
        setSelectionPosition({
          left: Math.max(0, Math.min(box.width - 155, pos.left - box.left)),
          top: Math.max(0, Math.min(box.height - 12, pos.bottom - box.top + 8)),
        });
      } catch {
        // Browser-less unit runners have no text geometry; the entry stays in flow.
        setSelectionPosition(null);
      }
    }
  };

  const beginRevision = async () => {
    if (
      streaming ||
      preparingRevision ||
      candidate ||
      historical ||
      editingBody ||
      !consistent ||
      saveStatus === "failed"
    )
      return;
    const request = ++revisionRequestRef.current;
    setPreparingRevision(true);
    setMessage("");
    // On narrow screens, the bottom review sheet otherwise covers the actual
    // proposed document. Preserve desktop's side-by-side review rail.
    if (window.matchMedia?.("(max-width: 700px)").matches) closeComments(false);
    setEditingBody(false);
    setPendingAnchor(null);
    setWholeStageComment(false);
    setCommentText("");
    commentIntentRef.current = false;
    setStreamStep(0);
    try {
      // Keep the ProseMirror proposal engine out of /new's first-load bundle.
      const engine = await import("./delegation-revision-poc");
      if (revisionRequestRef.current !== request) return;
      revisionEngineRef.current = engine;
      const prepared = engine.prepareRevision(draft, createFixtureRevisionProposal(draft, stage));
      setPreparingRevision(false);
      if (!prepared.ok) {
        setMessage("无法准备修订候选：" + prepared.reason + "。请核实当前草稿。");
        return;
      }
      pendingRevisionRef.current = prepared;
      setStreaming(true);
    } catch {
      if (revisionRequestRef.current !== request) return;
      setPreparingRevision(false);
      setMessage("本地演示修订模块加载失败；原稿和批注均未改变。");
    }
  };

  const stopRevision = () => {
    revisionRequestRef.current += 1;
    pendingRevisionRef.current = null;
    setPreparingRevision(false);
    setStreaming(false);
    setStreamStep(0);
    setCandidate(null);
    setMessage("生成已中止；保留此前正文和批注，未接受不完整版本。");
  };

  const discardRevision = () => {
    setCandidate(null);
    setStreamStep(0);
    setMessage("已放弃修订候选；原稿和批注均未修改。");
  };

  const adoptRevision = () => {
    // Retrying a failed save is allowed; the source draft stays unmodified
    // until sessionStorage accepts the new revision.
    if (!candidate || streaming || preparingRevision || !revisionEngineRef.current) return;
    const result = revisionEngineRef.current.commitRevision(draft, candidate);
    if (!result.ok) {
      setCandidate(null);
      setMessage("草稿或批注已发生变化（" + result.reason + "），请重新生成候选。");
      return;
    }
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(result.proposedDraft));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("failed");
      setMessage("无法保存修订。原稿保持不变，请检查浏览器存储状态。");
      return;
    }
    setDraft(result.proposedDraft);
    setCandidate(null);
    setStreamStep(0);
    setRevision((previous) => previous + 1);
    setProviderEpoch((previous) => previous + 1);
    setPendingAnchor(null);
    setSelectionPosition(null);
    setMessage("已采用本地演示修订，旧版本已保留。批注仍须由你逐条确认。");
  };

  const accept = () => {
    if (
      streaming ||
      preparingRevision ||
      candidate !== null ||
      unresolved > 0 ||
      historicStage ||
      stage !== acceptedCount ||
      !consistent ||
      saveStatus === "failed" ||
      editingBody
    )
      return;
    setDraft((previous) => acceptDocumentStage(previous, stage));
    setPendingAnchor(null);
    setWholeStageComment(false);
    setCommentText("");
    commentIntentRef.current = false;
    if (stage === finalStageIndex) {
      setDemoFinished(true);
      setMessage(`${stageCount} 个阶段已经验收（演示），没有创建真实任务，也没有启动执行。`);
      return;
    }
    setStage((stage + 1) as DelegationStage);
    setPendingAnchor(null);
    setRevision(0);
    setStreamStep(0);
    setEditingBody(false);
    setMessage("");
  };

  const reviewStage = (target: DelegationStage) => {
    if (
      candidate ||
      streaming ||
      preparingRevision ||
      target > acceptedCount ||
      draft.editingHistorical !== null
    )
      return;
    setStage(target);
    setRevision(0);
    setStreamStep(0);
    setEditingBody(false);
    setPendingAnchor(null);
    setWholeStageComment(false);
    setCommentText("");
    commentIntentRef.current = false;
    setCommentsOpen(false);
    setActiveCommentId(null);
    setTimelineOpen(false);
    setMessage("");
  };

  const startHistoricalRevision = () => {
    if (streaming || preparingRevision || candidate || !historical) return;
    setDraft((previous) => beginHistoricalEdit(previous, stage));
    setMessage("历史验收仍然有效。只有提交修改才会要求本阶段及后续阶段重新验收。");
  };

  const cancelHistoricalRevision = () => {
    setDraft(cancelHistoricalEdit);
    setProviderEpoch((value) => value + 1);
    setEditingBody(false);
    setMessage("已放弃本次历史修改草稿，原验收版本保持不变。");
  };

  const submitHistorical = () => {
    if (!revisingHistory || !consistent || saveStatus === "failed" || streaming || editingBody)
      return;
    setDraft(submitHistoricalRevision);
    setEditingBody(false);
    setDemoFinished(false);
    setMessage("历史修改已提交，本阶段与后续阶段需要依次重新验收。旧版本仍可追溯。");
  };

  if (entryPhase !== "review") {
    return (
      <section
        className="workspace-page-body delegation-page delegation-entry-page"
        aria-label="交代工作原型"
      >
        <header className="delegation-header">
          <button type="button" className="delegation-back" onClick={() => navigate(returnTo)}>
            <ArrowLeft size={16} aria-hidden="true" /> 返回
          </button>
          <span className="delegation-prototype-label">交代工作 · 交互原型</span>
        </header>
        <DelegationIntentEntry
          phase={entryPhase}
          onStart={startFromIntent}
          onCancel={() => setEntryPhase("entry")}
          exampleArtifact={exampleArtifact}
        />
      </section>
    );
  }

  return (
    <section className="workspace-page-body delegation-page" aria-label="交代工作原型">
      <header className="delegation-header">
        <button type="button" className="delegation-back" onClick={() => navigate(returnTo)}>
          <ArrowLeft size={16} aria-hidden="true" /> 返回
        </button>
        <div className="delegation-header-actions">
          <button
            type="button"
            className="delegation-text-action"
            onClick={() => setRestartRequested(true)}
          >
            <Plus size={14} aria-hidden="true" /> 新交代
          </button>
          <span className="delegation-prototype-label">交代工作 · 交互原型</span>
        </div>
      </header>

      <div className="delegation-introduction">
        <div>
          <p className="delegation-eyebrow">Make room for what matters.</p>
          <h1>交代一件值得持续完成的事</h1>
          <p>从你的意图开始。Mira 先整理需求，你再审阅、批注和决定。</p>
        </div>
      </div>

      {scenarioId !== "custom" ? (
        <div className="delegation-scenarios" aria-label="试用不同委托情境">
          <span>体验一种工作</span>
          {(["radar", "journey", "venture"] as const).map((id) => (
            <button
              type="button"
              key={id}
              className={
                id === scenarioId ? "delegation-scenario is-active" : "delegation-scenario"
              }
              aria-pressed={id === scenarioId}
              onClick={() => requestScenario(id)}
            >
              {delegationScenarios[id].label}
            </button>
          ))}
        </div>
      ) : null}

      <div className={commentsOpen ? "delegation-layout has-comments" : "delegation-layout"}>
        <article className="delegation-paper" aria-label="需求审阅画布">
          <button
            type="button"
            className="delegation-compact-progress"
            onClick={() => setTimelineOpen(!timelineOpen)}
            aria-expanded={timelineOpen}
          >
            <span>
              阶段 {stage + 1} / {stageCount} · {scenario.stages[stage]}
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {timelineOpen ? (
            <nav className="delegation-compact-steps" aria-label="需求阶段">
              {scenario.stages.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  disabled={
                    index > acceptedCount || streaming || preparingRevision || candidate !== null
                  }
                  onClick={() => reviewStage(index as DelegationStage)}
                >
                  {index + 1}. {label} {index < acceptedCount ? "✓" : ""}
                </button>
              ))}
            </nav>
          ) : null}
          <div className="delegation-paper-topline">
            <StepIndicator
              className="delegation-paper-stage-viewport"
              ariaLabel="工作主时间轴"
              connectorWidth="clamp(52px, 6.8vw, 116px)"
              currentStep={demoFinished ? stageCount : stage}
              steps={timelineSteps}
              onStepChange={(nextStep) => {
                if (nextStep >= stageCount) return;
                reviewStage(nextStep as DelegationStage);
              }}
            />
            <div className="delegation-topline-actions">
              {saveStatus === "failed" ? <span role="status">会话保存失败</span> : null}
              <button
                type="button"
                className="delegation-comment-trigger"
                onClick={() => (commentsOpen ? closeComments() : openComments())}
                aria-label={currentComments.length ? "批注 · " + currentComments.length : "批注"}
                aria-expanded={commentsOpen}
                aria-controls="delegation-comments-panel"
                title={
                  currentComments.length ? "查看批注（" + currentComments.length + "）" : "查看批注"
                }
              >
                <MessageSquare size={16} aria-hidden="true" />
                {currentComments.length > 0 ? (
                  <span className="delegation-comment-count" aria-hidden="true">
                    {currentComments.length}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
          <div className="delegation-paper-content">
            <h2 className="delegation-stage-context-title">{scenario.title}</h2>

            {diffSource ? (
              <Suspense
                fallback={
                  <p className="delegation-loading" role="status">
                    正在载入修订差异…
                  </p>
                }
              >
                <DelegationDiffReview
                  key={
                    scenarioId +
                    "-" +
                    stage +
                    "-" +
                    diffSource.revision +
                    "-" +
                    diffResult.revision +
                    "-" +
                    Boolean(candidate)
                  }
                  before={diffSource}
                  after={diffResult}
                  stage={stage}
                  scenarioId={scenarioId}
                  adopted={!candidate}
                  autoScroll={Boolean(candidate)}
                />
              </Suspense>
            ) : null}
            <div className="delegation-document-heading">
              <h3>工作说明</h3>
              {historical && !streaming ? (
                <button
                  type="button"
                  onClick={startHistoricalRevision}
                  className="delegation-text-action"
                >
                  <PenLine size={13} aria-hidden="true" /> 修改本阶段
                </button>
              ) : null}
              {!streaming && !preparingRevision && !candidate && !historical ? (
                <button
                  type="button"
                  onClick={() => {
                    setPendingAnchor(null);
                    setEditingBody(!editingBody);
                  }}
                  className="delegation-text-action"
                >
                  <PenLine size={13} aria-hidden="true" />
                  {editingBody ? "完成编辑" : "修改正文"}
                </button>
              ) : null}
            </div>
            <Suspense fallback={<p className="delegation-loading">正在准备文档…</p>}>
              <div
                className="delegation-document-text"
                data-editing={editingBody}
                data-has-selection={pendingAnchor !== null && !commentsOpen}
              >
                <DelegationReviewDocument
                  key={
                    scenarioId +
                    "-" +
                    stage +
                    "-" +
                    (editingBody
                      ? "edit"
                      : "read-" +
                        (candidate?.preview.revision ?? record.revision) +
                        "-" +
                        (candidate ? "preview" : "live") +
                        "-" +
                        historical)
                  }
                  markdown={renderedBody}
                  editable={
                    editingBody && !preparingRevision && !streaming && !candidate && !historical
                  }
                  anchors={candidate ? [] : documentAnchors}
                  version={{ stage, revision: candidate?.preview.revision ?? record.revision }}
                  onReady={(view) => {
                    documentViewRef.current = candidate ? null : view;
                  }}
                  onChange={(value) =>
                    !candidate &&
                    setDraft((previous) => changeDocumentMarkdown(previous, stage, value))
                  }
                  onSelection={(selection) => {
                    if (!candidate) selectDocumentText(selection);
                  }}
                  onSelectionCleared={clearDocumentSelection}
                  onAnchorsChange={(anchors) => {
                    if (!preparingRevision && !candidate) updateAnchors(anchors);
                  }}
                  onOpenAnchor={(id) => {
                    if (!preparingRevision && !candidate) openAnchoredComment(id);
                  }}
                />
                {pendingAnchor &&
                !commentsOpen &&
                !editingBody &&
                !preparingRevision &&
                !streaming &&
                !candidate &&
                !historical ? (
                  <button
                    type="button"
                    className={
                      selectionPosition
                        ? "delegation-selected-comment is-floating"
                        : "delegation-selected-comment"
                    }
                    style={
                      selectionPosition
                        ? { left: selectionPosition.left, top: selectionPosition.top }
                        : undefined
                    }
                    onPointerDown={(event) => {
                      commentIntentRef.current = true;
                      if (event.pointerType === "mouse") event.preventDefault();
                    }}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={openComments}
                  >
                    <MessageSquare size={14} aria-hidden="true" /> 批注所选文字
                  </button>
                ) : null}
              </div>
            </Suspense>
            {record.history.length > 0 ? (
              <Suspense
                fallback={
                  <p className="delegation-loading" role="status">
                    正在载入历史正文…
                  </p>
                }
              >
                <details className="delegation-history">
                  <summary>历史验收版本 · {record.history.length}</summary>
                  {record.history.map((snapshot, index) => (
                    <div className="delegation-history-version" key={index}>
                      <span>
                        已接受版本 {index + 1} · 修订 {snapshot.revision}
                      </span>
                      <MarkdownText features="basic">{snapshot.markdown}</MarkdownText>
                    </div>
                  ))}
                </details>
              </Suspense>
            ) : null}
            {!consistent && !streaming ? (
              <div className="delegation-consistency-warning" role="alert">
                正文中的「当前约定」与动态控件不一致，暂时不能接受本阶段。
                {!historical ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((previous) => alignDocumentAgreement(previous, stage));
                      setEditingBody(false);
                    }}
                  >
                    按控件同步约定
                  </button>
                ) : null}
              </div>
            ) : null}
            <ReviewSurface
              key={
                scenarioId +
                "-" +
                stage +
                "-" +
                providerEpoch +
                "-" +
                (candidate?.preview.revision ?? record.revision)
              }
              scenario={scenario}
              stage={stage}
              revision={revision}
              streamStep={streamStep}
              readonly={
                preparingRevision || streaming || candidate !== null || historical || editingBody
              }
              config={candidate?.preview.config ?? record.config}
              onConfigChange={handleConfigChanges}
            />

            {preparingRevision || streaming ? (
              <div className="delegation-streaming" role="status">
                <WandSparkles size={15} aria-hidden="true" />
                <span>
                  {preparingRevision
                    ? "正在载入本地演示修订模块…"
                    : "正在准备正文与字段的演示差异 · " + Math.min(streamStep + 1, 3) + "/3"}
                </span>
                <button type="button" onClick={stopRevision}>
                  <Square size={12} aria-hidden="true" /> 中止
                </button>
              </div>
            ) : null}
            {message ? (
              <p className="delegation-inline-message" role="status">
                {message}
              </p>
            ) : null}
            {demoFinished ? (
              <div className="delegation-demo-result" role="status">
                <CheckCircle2 size={20} aria-hidden="true" />
                <div>
                  <strong>三个阶段已经完成演示验收</strong>
                  <p>这是一份产品原型，没有发送工作请求，也没有启动 Agent。</p>
                </div>
              </div>
            ) : null}
          </div>
          <footer className="delegation-paper-footer">
            <div className="delegation-paper-actions">
              {revisingHistory ? (
                <>
                  <button
                    type="button"
                    className="delegation-quiet-action"
                    onClick={cancelHistoricalRevision}
                  >
                    放弃修改
                  </button>
                  <button
                    type="button"
                    className="delegation-accept"
                    disabled={!consistent || streaming || saveStatus === "failed" || editingBody}
                    onClick={submitHistorical}
                  >
                    提交修改并重新验收
                  </button>
                </>
              ) : null}
              {!historicStage && !demoFinished && !candidate ? (
                <button
                  type="button"
                  className="delegation-quiet-action"
                  onClick={beginRevision}
                  disabled={
                    preparingRevision ||
                    streaming ||
                    editingBody ||
                    !consistent ||
                    saveStatus === "failed"
                  }
                >
                  <WandSparkles size={16} aria-hidden="true" />
                  {unresolved > 0 ? "根据批注修订" : "演示流式修订"}
                </button>
              ) : null}
              {candidate ? (
                <>
                  <button
                    type="button"
                    className="delegation-quiet-action"
                    onClick={discardRevision}
                  >
                    放弃修订
                  </button>
                  <button type="button" className="delegation-accept" onClick={adoptRevision}>
                    <Check size={15} aria-hidden="true" /> 采用这版
                  </button>
                </>
              ) : null}
              {!revisingHistory && !candidate ? (
                <button
                  type="button"
                  className="delegation-accept"
                  onClick={accept}
                  disabled={
                    streaming ||
                    preparingRevision ||
                    candidate !== null ||
                    unresolved > 0 ||
                    historicStage ||
                    !consistent ||
                    saveStatus === "failed" ||
                    editingBody ||
                    demoFinished
                  }
                >
                  {stage === finalStageIndex ? "接受并交代（演示）" : "接受本阶段"}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </footer>
          {editingBody && !historical ? (
            <p className="delegation-accept-hint">请先完成正文编辑，再接受这一阶段。</p>
          ) : null}
        </article>

        {commentsOpen ? (
          <div className="delegation-comment-overlay">
            <button
              type="button"
              className="delegation-comment-backdrop"
              aria-label="关闭批注"
              onClick={() => closeComments()}
            />
            <aside
              id="delegation-comments-panel"
              className="delegation-comments"
              aria-label="随文批注"
            >
              <div className="delegation-comments-header">
                <div>
                  <small>Review notes</small>
                  <h3>
                    随文批注 <span>{currentComments.length}</span>
                  </h3>
                </div>
                <button type="button" aria-label="收起批注" onClick={() => closeComments()}>
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
              <p className="delegation-comment-caption">
                批注属于当前阶段。预设修订不等于真正理解意见，仍由你逐条确认。
              </p>
              {suggestedComments.length > 0 &&
              !streaming &&
              !preparingRevision &&
              !candidate &&
              !historical ? (
                <div className="delegation-comment-batch">
                  <span>只确认已勾选且已有处理建议的批注</span>
                  <button
                    type="button"
                    disabled={selectedSuggestedCommentIds.length === 0}
                    onClick={confirmSelectedComments}
                  >
                    <CheckCircle2 size={13} aria-hidden="true" />
                    确认选中（{selectedSuggestedCommentIds.length}）
                  </button>
                </div>
              ) : null}
              <div
                className="delegation-comment-list"
                role="region"
                aria-label="批注列表"
                tabIndex={0}
              >
                {currentComments.length ? (
                  currentComments.map((comment) => (
                    <article
                      key={comment.id}
                      id={"delegation-comment-" + comment.id}
                      className="delegation-comment-item"
                      data-selected={activeCommentId === comment.id}
                    >
                      <span className="delegation-comment-status">
                        {statusLabels[comment.status]}
                      </span>
                      {comment.anchor &&
                      (comment.anchor.status === "active" ||
                        comment.anchor.version.revision !== record.revision) ? (
                        <button
                          type="button"
                          className="delegation-comment-source"
                          onClick={() => jumpToCommentSource(comment.id)}
                        >
                          <blockquote>{comment.excerpt}</blockquote>
                          <span>
                            {candidate || comment.anchor.version.revision !== record.revision
                              ? "查看来源版本 r" + comment.anchor.version.revision
                              : "返回原文"}
                          </span>
                        </button>
                      ) : (
                        <blockquote>
                          {comment.excerpt}
                          {comment.anchor?.status === "lost" ? (
                            <small> · 定位失效，原版本保留</small>
                          ) : null}
                        </blockquote>
                      )}
                      <p>{comment.text}</p>
                      {(() => {
                        const reason =
                          candidate?.commentResponses.find(
                            (response) => response.commentId === comment.id,
                          )?.reason ?? comment.suggestedReason;
                        return reason ? (
                          <p className="delegation-comment-proposal">
                            <span>处理建议：</span>
                            {reason}
                          </p>
                        ) : null;
                      })()}
                      {comment.status === "suggested" &&
                      !streaming &&
                      !preparingRevision &&
                      !candidate &&
                      !historical ? (
                        <>
                          <label className="delegation-comment-select">
                            <input
                              type="checkbox"
                              aria-label={`选择批注 ${comment.id} 进行批量确认`}
                              checked={selectedSuggestedCommentIds.includes(comment.id)}
                              onChange={(event) =>
                                toggleSuggestedCommentSelection(
                                  comment.id,
                                  event.currentTarget.checked,
                                )
                              }
                            />
                            <span>纳入批量确认</span>
                          </label>
                          <div className="delegation-comment-actions">
                            <button
                              type="button"
                              onClick={() => updateComment(comment.id, "resolved")}
                            >
                              <Check size={13} aria-hidden="true" /> 确认解决
                            </button>
                            <button
                              type="button"
                              onClick={() => updateComment(comment.id, "abandoned")}
                            >
                              放弃
                            </button>
                          </div>
                        </>
                      ) : comment.status === "open" &&
                        !streaming &&
                        !preparingRevision &&
                        !candidate &&
                        !historical ? (
                        <button
                          type="button"
                          className="delegation-comment-abandon"
                          onClick={() => updateComment(comment.id, "abandoned")}
                        >
                          放弃此批注
                        </button>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="delegation-comment-empty">
                    <p>当前没有需要查看的批注。请先框选正文；也可以明确选择批注整个阶段。</p>
                    {!historical && !candidate && !streaming && !preparingRevision ? (
                      <button
                        type="button"
                        className="delegation-comment-demo"
                        onClick={loadDemoComments}
                      >
                        载入三条演示批注
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
              {!streaming && !preparingRevision && !candidate && !historical ? (
                pendingAnchor || wholeStageComment ? (
                  <div className="delegation-comment-compose">
                    <label htmlFor="delegation-comment-input">
                      {pendingAnchor ? "批注所选文字" : "批注整个阶段"}
                    </label>
                    {pendingAnchor ? <blockquote>{pendingAnchor.excerpt}</blockquote> : null}
                    <button
                      type="button"
                      className="delegation-comment-clear-selection"
                      onClick={() => {
                        setWholeStageComment(!wholeStageComment);
                        setPendingAnchor(null);
                        setSelectionPosition(null);
                        setCommentText("");
                      }}
                    >
                      {pendingAnchor ? "改为批注整个阶段" : "取消全文批注"}
                    </button>
                    <textarea
                      id="delegation-comment-input"
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="例如：只关注有用户或商业证据的变化…"
                      rows={3}
                    />
                    <button type="button" disabled={!commentText.trim()} onClick={addComment}>
                      <Plus size={14} aria-hidden="true" /> 添加批注
                    </button>
                  </div>
                ) : (
                  <div className="delegation-comment-compose delegation-comment-compose-empty">
                    <p>先选中正文中的文字，才能添加随文批注。</p>
                    <button
                      type="button"
                      className="delegation-comment-stage-target"
                      onClick={() => {
                        setWholeStageComment(true);
                        setCommentText("");
                      }}
                    >
                      批注整个阶段
                    </button>
                  </div>
                )
              ) : null}
            </aside>
          </div>
        ) : null}
      </div>
      <p className="delegation-bottom-note">
        <CornerUpLeft size={13} aria-hidden="true" />
        交互演示 · 仅在当前浏览器标签页保存，不会创建或运行真实任务。
      </p>
      <ModalShell
        open={sourceCommentId !== null}
        title="批注来源版本"
        width={640}
        footer={null}
        onClose={() => setSourceCommentId(null)}
      >
        <div className="delegation-diff-source" aria-label="批注来源正文">
          <p>
            这条批注属于修订 r{sourceVersion ?? "—"}。只展示来源版本，不会把旧锚点猜测映射到新版。
          </p>
          {sourceComment ? <blockquote>{sourceComment.excerpt}</blockquote> : null}
          {sourceSnapshot ? (
            <Suspense
              fallback={
                <p className="delegation-loading" role="status">
                  正在载入来源正文…
                </p>
              }
            >
              <MarkdownText features="basic">{sourceSnapshot.markdown}</MarkdownText>
            </Suspense>
          ) : (
            <p>来源版本未保留完整正文，无法安全定位。</p>
          )}
        </div>
      </ModalShell>
      <ModalShell
        open={restartRequested}
        title="重新交代工作"
        width={440}
        footer={null}
        onClose={() => setRestartRequested(false)}
      >
        <ConfirmDialog
          title="放弃这份演示草稿？"
          description="重新开始将清空当前标签页中的正文、批注与阶段验收记录，无法撤销。"
          tone="warning"
          cancelText="继续审阅"
          confirmText="放弃并重新交代"
          onCancel={() => setRestartRequested(false)}
          onConfirm={returnToIntent}
        />
      </ModalShell>
      <ModalShell
        open={pendingScenario !== null}
        title="切换体验情境"
        width={440}
        footer={null}
        onClose={() => setPendingScenario(null)}
      >
        <ConfirmDialog
          title="放弃当前草稿？"
          description="切换情境会清空本标签页中的正文、批注与阶段验收记录，无法撤销。"
          tone="warning"
          cancelText="继续审阅"
          confirmText="放弃并切换"
          onCancel={() => setPendingScenario(null)}
          onConfirm={() => {
            if (pendingScenario !== null) setScenario(pendingScenario);
          }}
        />
      </ModalShell>
    </section>
  );
}

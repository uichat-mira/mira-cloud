import "./delegation.css";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  CornerUpLeft,
  FileText,
  MessageSquare,
  PenLine,
  Plus,
  Sparkles,
  Square,
  WandSparkles,
  X,
} from "lucide-react";
import { Renderer, JSONUIProvider } from "@json-render/react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { TextSelection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import type { TextReviewAnchor } from "./delegation-review-poc";
import MarkdownText from "../../components/mira-design/MarkdownText";
import ConfirmDialog from "../../components/mira-design/ConfirmDialog";
import { ModalShell } from "../../components/mira-design/Modal";
import { useLocation, useNavigate } from "react-router";
import { delegationRegistry } from "./delegation-catalog";
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

type CommentStatus = "open" | "suggested" | "resolved" | "abandoned";
const statusLabels: Record<CommentStatus, string> = {
  open: "待处理",
  suggested: "AI 已建议处理",
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
  const [draft, setDraft] = useState(() => {
    if (typeof window === "undefined") return createDelegationDraft();
    try {
      return (
        parseDelegationDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)) ??
        createDelegationDraft()
      );
    } catch {
      return createDelegationDraft();
    }
  });
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
  const [selectedExcerpt, setSelectedExcerpt] = useState("");
  const [pendingAnchor, setPendingAnchor] = useState<TextReviewAnchor | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);
  const documentViewRef = useRef<EditorView | null>(null);
  const sheetScrollRef = useRef(0);
  const [revision, setRevision] = useState(0);
  const [streamStep, setStreamStep] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [message, setMessage] = useState("");
  const [editingBody, setEditingBody] = useState(false);
  const [providerEpoch, setProviderEpoch] = useState(0);
  const [demoFinished, setDemoFinished] = useState(draft.acceptedCount === 3);
  const [pendingScenario, setPendingScenario] = useState<DelegationScenarioId | null>(null);
  const scenario = delegationScenarios[scenarioId];
  const returnTo = parseReturnTo((location.state as { returnTo?: unknown } | null)?.returnTo);
  const comments = draft.comments;
  const acceptedCount = draft.acceptedCount;
  const record = draft.stages[stage];
  const currentComments = comments.filter((comment) => comment.stage === stage);
  const documentAnchors = useMemo(
    () =>
      comments.flatMap((comment): TextReviewAnchor[] =>
        comment.stage === stage && comment.anchor
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
    [comments, stage],
  );
  const unresolved = currentComments.filter(
    (comment) => comment.status === "open" || comment.status === "suggested",
  ).length;
  const historicStage = stage < acceptedCount;
  const historical = historicStage && draft.editingHistorical !== stage;
  const revisingHistory = draft.editingHistorical === stage;
  const consistent = isAgreementConsistent(draft, stage);
  const renderedBody =
    streaming && streamStep > 0
      ? record.markdown + "\n\n*正在演示修订过程，当前约定尚未改变。*"
      : record.markdown;
  const hasDraftProgress =
    streaming ||
    acceptedCount > 0 ||
    comments.length > 0 ||
    draft.editingHistorical !== null ||
    draft.stages.some((item) => item.revision > 0);

  // Prototype-only session storage, never a Cloud save receipt.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setSaveStatus("saved");
    } catch {
      setSaveStatus("failed");
    }
  }, [draft]);

  useEffect(() => {
    if (!streaming) return;
    let next = 0;
    const timer = window.setInterval(() => {
      next += 1;
      setStreamStep(next);
      if (next >= 3) {
        window.clearInterval(timer);
        setRevision((previous) => previous + 1);
        setDraft((previous) =>
          updateReviewComments(previous, (items) =>
            items.map((comment) =>
              comment.stage === stage && comment.status === "open"
                ? { ...comment, status: "suggested" }
                : comment,
            ),
          ),
        );
        setStreaming(false);
        setMessage("修订草稿已经生成。请确认每一条批注，最终决定仍由你作出。");
      }
    }, 740);
    return () => window.clearInterval(timer);
  }, [streaming, stage]);

  const setScenario = (next: DelegationScenarioId) => {
    setStreaming(false);
    setDraft(createDelegationDraft(next));
    setStage(0);
    setTimelineOpen(false);
    setCommentsOpen(false);
    setCommentText("");
    setSelectedExcerpt("");
    setPendingAnchor(null);
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

  const handleConfigChanges = (changes: Array<{ path: string; value: unknown }>) => {
    if (streaming || historical || editingBody) return;
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
    if (!text || streaming || historical) return;
    const view = documentViewRef.current;
    if (
      pendingAnchor &&
      (!view ||
        pendingAnchor.version.stage !== stage ||
        view.state.doc.textBetween(pendingAnchor.from, pendingAnchor.to, " ") !==
          pendingAnchor.excerpt)
    ) {
      setMessage("所选原文已发生变化，请重新框选后再批注。不会猜测新位置。");
      setPendingAnchor(null);
      setSelectedExcerpt("");
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
            excerpt: pendingAnchor?.excerpt ?? "本阶段整体",
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
    setSelectedExcerpt("");
    setPendingAnchor(null);
    openComments();
    setMessage("批注已加入本次演示草稿。还没有提交给真实 Agent。");
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
    const view = documentViewRef.current;
    if (!anchor || anchor.status !== "active" || !view) return;
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
    if (streaming) return;
    setDraft((previous) =>
      updateReviewComments(previous, (items) =>
        items.map((comment) => (comment.id === id ? { ...comment, status } : comment)),
      ),
    );
  };

  const selectDocumentText = (anchor: TextReviewAnchor) => {
    if (streaming || historical || editingBody) return;
    if (anchor.excerpt.length > 600) {
      setMessage("选区过长，请选择不超过 600 字的段落。");
      return;
    }
    setPendingAnchor(anchor);
    setSelectedExcerpt(anchor.excerpt.slice(0, 140));
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

  const beginRevision = () => {
    if (streaming || historical) return;
    setEditingBody(false);
    setPendingAnchor(null);
    setSelectedExcerpt("");
    setStreamStep(0);
    setMessage("");
    setStreaming(true);
  };

  const stopRevision = () => {
    setStreaming(false);
    setStreamStep(0);
    setMessage("生成已中止；保留此前正文和批注，未接受不完整版本。");
  };

  const accept = () => {
    if (
      streaming ||
      unresolved > 0 ||
      historicStage ||
      stage !== acceptedCount ||
      !consistent ||
      saveStatus === "failed" ||
      editingBody
    )
      return;
    setDraft((previous) => acceptDocumentStage(previous, stage));
    if (stage === 2) {
      setDemoFinished(true);
      setMessage("三个阶段已经验收（演示），没有创建真实任务，也没有启动执行。");
      return;
    }
    setStage((stage + 1) as DelegationStage);
    setSelectedExcerpt("");
    setPendingAnchor(null);
    setRevision(0);
    setStreamStep(0);
    setEditingBody(false);
    setMessage("");
  };

  const reviewStage = (target: DelegationStage) => {
    if (target > acceptedCount || draft.editingHistorical !== null) return;
    setStage(target);
    setRevision(0);
    setStreamStep(0);
    setEditingBody(false);
    setSelectedExcerpt("");
    setPendingAnchor(null);
    setCommentsOpen(false);
    setActiveCommentId(null);
    setTimelineOpen(false);
    setMessage("");
  };

  const startHistoricalRevision = () => {
    if (streaming || !historical) return;
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

  return (
    <section className="workspace-page-body delegation-page" aria-label="交代工作原型">
      <header className="delegation-header">
        <button type="button" className="delegation-back" onClick={() => navigate(returnTo)}>
          <ArrowLeft size={16} aria-hidden="true" /> 返回
        </button>
        <span className="delegation-prototype-label">交代工作 · 交互原型</span>
      </header>

      <div className="delegation-introduction">
        <div>
          <p className="delegation-eyebrow">Make room for what matters.</p>
          <h1>交代一件值得持续完成的事</h1>
          <p>从你的意图开始。Mira 先整理需求，你再审阅、批注和决定。</p>
        </div>
      </div>

      <div className="delegation-scenarios" aria-label="试用不同委托情境">
        <span>体验一种工作</span>
        {Object.values(delegationScenarios).map((item) => (
          <button
            type="button"
            key={item.id}
            className={
              item.id === scenarioId ? "delegation-scenario is-active" : "delegation-scenario"
            }
            aria-pressed={item.id === scenarioId}
            onClick={() => requestScenario(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className={commentsOpen ? "delegation-layout has-comments" : "delegation-layout"}>
        <aside className="delegation-timeline" aria-label="工作主时间轴">
          <div className="delegation-timeline-kicker">需求主线</div>
          <ol>
            {scenario.stages.map((label, index) => {
              const available = index <= acceptedCount;
              const current = index === stage;
              const completed = index < acceptedCount;
              return (
                <li key={label} className={current ? "is-current" : ""}>
                  <button
                    type="button"
                    onClick={() => reviewStage(index as DelegationStage)}
                    disabled={!available || streaming}
                    aria-current={current ? "step" : undefined}
                  >
                    <span className="delegation-step-icon">
                      {completed ? (
                        <Check size={13} aria-hidden="true" />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <span className="delegation-step-copy">
                      <strong>{label}</strong>
                      <small>{completed ? "已接受" : current ? "正在审阅" : "等待前一阶段"}</small>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="delegation-timeline-footer">
            <span className="delegation-timeline-line" />
            <span>长期托管</span>
            <small>通过最终确认后才成立</small>
          </div>
        </aside>

        <article className="delegation-paper" aria-label="需求审阅画布">
          <button
            type="button"
            className="delegation-compact-progress"
            onClick={() => setTimelineOpen(!timelineOpen)}
            aria-expanded={timelineOpen}
          >
            <span>
              阶段 {stage + 1} / 3 · {scenario.stages[stage]}
            </span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          {timelineOpen ? (
            <nav className="delegation-compact-steps" aria-label="需求阶段">
              {scenario.stages.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  disabled={index > acceptedCount || streaming}
                  onClick={() => reviewStage(index as DelegationStage)}
                >
                  {index + 1}. {label} {index < acceptedCount ? "✓" : ""}
                </button>
              ))}
            </nav>
          ) : null}
          <div className="delegation-paper-topline">
            <span>
              <FileText size={14} aria-hidden="true" /> 需求草稿 / {scenario.label}
            </span>
            <span>{saveStatus === "failed" ? "会话保存失败" : "仅在此标签页保存"}</span>
          </div>
          <div className="delegation-paper-content">
            <div className="delegation-paper-title">
              <div className="delegation-paper-title-meta">
                <span className="delegation-paper-index">0{stage + 1} / 03</span>
                <span className="delegation-stage-state">
                  {streaming
                    ? "正在演示修订"
                    : revisingHistory
                      ? "正在修改历史阶段"
                      : historical
                        ? "已接受 · 只读"
                        : demoFinished
                          ? "全部阶段已接受"
                          : "待你审阅"}
                </span>
              </div>
              <h2>{scenario.title}</h2>
              <p>{scenario.tagline}</p>
            </div>
            <blockquote className="delegation-intent">
              <Sparkles size={16} aria-hidden="true" />
              <span>{draft.intent}</span>
            </blockquote>

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
              {!streaming && !historical ? (
                <button
                  type="button"
                  onClick={() => {
                    setPendingAnchor(null);
                    setSelectedExcerpt("");
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
                data-has-selection={pendingAnchor !== null}
              >
                <DelegationReviewDocument
                  key={
                    scenarioId +
                    "-" +
                    stage +
                    "-" +
                    (editingBody
                      ? "edit"
                      : "read-" + record.revision + "-" + streamStep + "-" + historical)
                  }
                  markdown={renderedBody}
                  editable={editingBody && !streaming && !historical}
                  anchors={documentAnchors}
                  version={{ stage, revision: record.revision }}
                  onReady={(view) => {
                    documentViewRef.current = view;
                  }}
                  onChange={(value) =>
                    setDraft((previous) => changeDocumentMarkdown(previous, stage, value))
                  }
                  onSelection={selectDocumentText}
                  onAnchorsChange={updateAnchors}
                  onOpenAnchor={openAnchoredComment}
                />
                {pendingAnchor && !editingBody && !streaming && !historical ? (
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
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={openComments}
                  >
                    <MessageSquare size={14} aria-hidden="true" /> 批注所选文字
                  </button>
                ) : null}
              </div>
            </Suspense>
            {record.history.length > 0 ? (
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
              key={`${scenarioId}-${stage}-${providerEpoch}`}
              scenario={scenario}
              stage={stage}
              revision={revision}
              streamStep={streamStep}
              readonly={streaming || historical || editingBody}
              config={record.config}
              onConfigChange={handleConfigChanges}
            />

            {streaming ? (
              <div className="delegation-streaming" role="status">
                <WandSparkles size={15} aria-hidden="true" />
                <span>
                  Mira 正在同时更新正文与确认组件（演示） · {Math.min(streamStep + 1, 3)}/3
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
            <button type="button" className="delegation-quiet-action" onClick={openComments}>
              <MessageSquare size={16} aria-hidden="true" />
              批注 {currentComments.length ? "· " + currentComments.length : ""}
            </button>
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
              {!historicStage && !demoFinished ? (
                <button
                  type="button"
                  className="delegation-quiet-action"
                  onClick={beginRevision}
                  disabled={streaming}
                >
                  <WandSparkles size={16} aria-hidden="true" />
                  {unresolved > 0 ? "根据批注修订" : "演示流式修订"}
                </button>
              ) : null}
              {!revisingHistory ? (
                <button
                  type="button"
                  className="delegation-accept"
                  onClick={accept}
                  disabled={
                    streaming ||
                    unresolved > 0 ||
                    historicStage ||
                    !consistent ||
                    saveStatus === "failed" ||
                    editingBody ||
                    demoFinished
                  }
                >
                  {stage === 2 ? "接受并交代（演示）" : "接受本阶段"}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          </footer>
          {editingBody && !historical ? (
            <p className="delegation-accept-hint">请先完成正文编辑，再接受这一阶段。</p>
          ) : null}
          {unresolved > 0 ? (
            <p className="delegation-accept-hint">
              <CircleHelp size={13} aria-hidden="true" /> 还有 {unresolved}{" "}
              条批注需要你确认解决或放弃。
            </p>
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
            <aside className="delegation-comments" aria-label="随文批注">
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
                批注属于当前阶段。Mira 提出处理建议后，仍由你确认是否解决。
              </p>
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
                      {comment.anchor?.status === "active" ? (
                        <button
                          type="button"
                          className="delegation-comment-source"
                          onClick={() => jumpToCommentSource(comment.id)}
                        >
                          <blockquote>{comment.excerpt}</blockquote>
                          <span>返回原文</span>
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
                      {comment.status === "suggested" ? (
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
                      ) : comment.status === "open" ? (
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
                  <p className="delegation-comment-empty">
                    还没有批注。框选正文或在这里添加一条整体意见。
                  </p>
                )}
              </div>
              {!streaming && !historical ? (
                <div className="delegation-comment-compose">
                  <label htmlFor="delegation-comment-input">
                    {pendingAnchor ? "批注所选文字" : "对当前阶段提出意见"}
                  </label>
                  {selectedExcerpt ? <blockquote>{selectedExcerpt}</blockquote> : null}
                  {pendingAnchor ? (
                    <button
                      type="button"
                      className="delegation-comment-clear-selection"
                      onClick={() => {
                        setPendingAnchor(null);
                        setSelectedExcerpt("");
                        setSelectionPosition(null);
                      }}
                    >
                      改为本阶段整体意见
                    </button>
                  ) : null}
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

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
import { Renderer, JSONUIProvider, useStateValue } from "@json-render/react";
import { lazy, Suspense, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { delegationRegistry } from "./delegation-catalog";
import {
  buildDelegationSpec,
  delegationScenarios,
  delegationSummary,
  type DelegationScenario,
  type DelegationScenarioId,
  type DelegationStage,
} from "./delegation-fixtures";

const MarkdownEditor = lazy(() => import("../../components/mira-design/MarkdownEditor"));

type CommentStatus = "open" | "suggested" | "resolved" | "abandoned";
interface ReviewComment {
  id: number;
  stage: DelegationStage;
  excerpt: string;
  text: string;
  status: CommentStatus;
}

const statusLabels: Record<CommentStatus, string> = {
  open: "待处理",
  suggested: "AI 已建议处理",
  resolved: "已解决",
  abandoned: "已放弃",
};

function DynamicSummary({
  scenario,
  stage,
}: {
  scenario: DelegationScenarioId;
  stage: DelegationStage;
}) {
  const config = useStateValue<Record<string, unknown>>("/config") ?? {};
  return (
    <p className="delegation-live-summary">
      <CheckCircle2 size={15} aria-hidden="true" />
      <span>{delegationSummary(scenario, stage, config)}</span>
    </p>
  );
}

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
        <span>结构化确认</span>
        <span>可直接调整</span>
      </div>
      <div
        className={readonly ? "delegation-generated-readonly" : ""}
        aria-readonly={readonly}
        inert={readonly}
      >
        <Renderer spec={spec} registry={delegationRegistry} />
      </div>
      <DynamicSummary scenario={scenario.id} stage={stage} />
    </div>
  );
}

function ReviewSurface({
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
  return (
    <JSONUIProvider
      key={scenario.id}
      registry={delegationRegistry}
      initialState={{ config: scenario.initialConfig }}
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
  const [scenarioId, setScenarioId] = useState<DelegationScenarioId>("radar");
  const [stage, setStage] = useState<DelegationStage>(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [selectedExcerpt, setSelectedExcerpt] = useState("");
  const [revision, setRevision] = useState(0);
  const [streamStep, setStreamStep] = useState(0);
  const [streaming, setStreaming] = useState(false);
  const [message, setMessage] = useState("");
  const [editedBody, setEditedBody] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState(false);
  const [demoFinished, setDemoFinished] = useState(false);
  const scenario = delegationScenarios[scenarioId];
  const returnTo = parseReturnTo((location.state as { returnTo?: unknown } | null)?.returnTo);
  const currentComments = comments.filter((comment) => comment.stage === stage);
  const unresolved = currentComments.filter(
    (comment) => comment.status === "open" || comment.status === "suggested",
  ).length;
  const historical = stage < acceptedCount;
  const body = editedBody ?? scenario.text;
  const renderedBody =
    revision > 0 || streamStep >= 1
      ? body + "\n\n这一版已经整理本轮反馈。需要你逐条确认批注后，才可以接受当前阶段。"
      : body;

  useEffect(() => {
    if (!streaming) return;
    let next = 0;
    const timer = window.setInterval(() => {
      next += 1;
      setStreamStep(next);
      if (next >= 3) {
        window.clearInterval(timer);
        setRevision((previous) => previous + 1);
        setComments((previous) =>
          previous.map((comment) =>
            comment.stage === stage && comment.status === "open"
              ? { ...comment, status: "suggested" }
              : comment,
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
    setScenarioId(next);
    setStage(0);
    setAcceptedCount(0);
    setTimelineOpen(false);
    setCommentsOpen(false);
    setComments([]);
    setCommentText("");
    setSelectedExcerpt("");
    setRevision(0);
    setStreamStep(0);
    setEditedBody(null);
    setEditingBody(false);
    setMessage("");
    setDemoFinished(false);
  };

  const addComment = () => {
    const text = commentText.trim();
    if (!text || streaming || historical) return;
    setComments((previous) => [
      ...previous,
      {
        id: Math.max(0, ...previous.map((item) => item.id)) + 1,
        stage,
        excerpt: selectedExcerpt || "本阶段整体",
        text,
        status: "open",
      },
    ]);
    setCommentText("");
    setSelectedExcerpt("");
    setCommentsOpen(true);
    setMessage("批注已加入本次演示草稿。还没有提交给真实 Agent。");
  };

  const updateComment = (id: number, status: "resolved" | "abandoned") => {
    if (streaming) return;
    setComments((previous) =>
      previous.map((comment) => (comment.id === id ? { ...comment, status } : comment)),
    );
  };

  const selectText = (event: MouseEvent<HTMLElement>) => {
    if (streaming || editingBody || historical) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !event.currentTarget.contains(selection.anchorNode))
      return;
    const text = selection.toString().trim().slice(0, 140);
    if (text.length >= 2) setSelectedExcerpt(text);
  };

  const beginRevision = () => {
    if (streaming || historical) return;
    setEditingBody(false);
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
    if (streaming || unresolved > 0 || historical) return;
    if (stage === 2) {
      setAcceptedCount(3);
      setDemoFinished(true);
      setMessage("这是原型中的审阅完成状态。没有创建真实任务，也没有启动执行。");
      return;
    }
    setAcceptedCount(stage + 1);
    setStage((stage + 1) as DelegationStage);
    setSelectedExcerpt("");
    setEditedBody(null);
    setRevision(0);
    setStreamStep(0);
    setEditingBody(false);
    setMessage("");
  };

  const reviewStage = (target: DelegationStage) => {
    if (target > acceptedCount) return;
    setStage(target);
    setEditedBody(null);
    setRevision(0);
    setStreamStep(0);
    setEditingBody(false);
    setSelectedExcerpt("");
    setTimelineOpen(false);
    setMessage("");
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
            onClick={() => setScenario(item.id)}
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
            <span>
              {streaming ? "Mira 正在修订…" : historical ? "已接受 · 只读" : "本次会话草稿"}
            </span>
          </div>
          <div className="delegation-paper-content">
            <div className="delegation-paper-title">
              <span className="delegation-paper-index">0{stage + 1} / 03</span>
              <h2>{scenario.title}</h2>
              <p>{scenario.tagline}</p>
            </div>
            <blockquote className="delegation-intent">
              <Sparkles size={16} aria-hidden="true" />
              <span>{scenario.intent}</span>
            </blockquote>

            <div className="delegation-document-heading">
              <h3>工作说明</h3>
              {!streaming && !historical ? (
                <button
                  type="button"
                  onClick={() => setEditingBody(!editingBody)}
                  className="delegation-text-action"
                >
                  <PenLine size={13} aria-hidden="true" />
                  {editingBody ? "完成编辑" : "修改正文"}
                </button>
              ) : null}
            </div>
            {editingBody && !streaming ? (
              <Suspense fallback={<p className="delegation-loading">正在准备编辑器…</p>}>
                <div className="delegation-editor">
                  <MarkdownEditor
                    initialValue={body}
                    onChange={(value) => setEditedBody(value)}
                    disabled={historical}
                  />
                </div>
              </Suspense>
            ) : (
              <div className="delegation-document-text" onMouseUp={selectText}>
                {renderedBody
                  .split("\n")
                  .filter(Boolean)
                  .map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            )}
            {selectedExcerpt && !editingBody ? (
              <button
                type="button"
                className="delegation-selected-comment"
                onClick={() => setCommentsOpen(true)}
              >
                <MessageSquare size={14} aria-hidden="true" /> 批注所选文字
              </button>
            ) : null}

            <ReviewSurface
              key={scenarioId}
              scenario={scenario}
              stage={stage}
              revision={revision}
              streamStep={streamStep}
              readonly={streaming || historical}
            />

            {streaming ? (
              <div className="delegation-streaming" role="status">
                <WandSparkles size={15} aria-hidden="true" />
                <span>Mira 正在同时更新正文与确认组件 · {streamStep + 1}/4</span>
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
            <button
              type="button"
              className="delegation-quiet-action"
              onClick={() => setCommentsOpen(true)}
            >
              <MessageSquare size={16} aria-hidden="true" />
              批注 {currentComments.length ? "· " + currentComments.length : ""}
            </button>
            <div className="delegation-paper-actions">
              {!historical && !demoFinished ? (
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
              <button
                type="button"
                className="delegation-accept"
                onClick={accept}
                disabled={streaming || unresolved > 0 || historical || demoFinished}
              >
                {stage === 2 ? "接受并交代（演示）" : "接受本阶段"}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </footer>
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
              onClick={() => setCommentsOpen(false)}
            />
            <aside className="delegation-comments" aria-label="随文批注">
              <div className="delegation-comments-header">
                <div>
                  <small>Review notes</small>
                  <h3>
                    随文批注 <span>{currentComments.length}</span>
                  </h3>
                </div>
                <button type="button" aria-label="收起批注" onClick={() => setCommentsOpen(false)}>
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
              <p className="delegation-comment-caption">
                批注属于当前阶段。Mira 提出处理建议后，仍由你确认是否解决。
              </p>
              <div className="delegation-comment-list">
                {currentComments.length ? (
                  currentComments.map((comment) => (
                    <article key={comment.id} className="delegation-comment-item">
                      <span className="delegation-comment-status">
                        {statusLabels[comment.status]}
                      </span>
                      <blockquote>{comment.excerpt}</blockquote>
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
                    {selectedExcerpt ? "批注所选文字" : "对当前阶段提出意见"}
                  </label>
                  {selectedExcerpt ? <blockquote>{selectedExcerpt}</blockquote> : null}
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
        交互演示 · 当前内容仅在此会话生效，不会真实提交工作。
      </p>
    </section>
  );
}

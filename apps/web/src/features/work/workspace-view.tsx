import "./work.css";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Cloud,
  FileText,
  Layers3,
  Plug,
  Plus,
  Settings2,
  Sparkles,
  WifiOff,
  Workflow,
} from "lucide-react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { Badge, ExpandableSection, ModalShell } from "../../components/mira-design/index.ts";
import { ConnectionPanel } from "../connection/connection-panel";
import { GeneralSettingsPage } from "../settings/general-settings";
import { MiraBrandLogo } from "../workspace-shell/mira-brand";
import { WorkspaceShellFrame } from "../workspace-shell/workspace-shell-frame";
import { PreviewDebugBall } from "../preview-debug/preview-debug-ball";
import {
  findPreviewArtifact,
  findPreviewArtifacts,
  findPreviewAttentions,
  findPreviewRuns,
  findPreviewTask,
  parsePreviewScenario,
  previewArtifacts,
  previewAttentions,
  previewTasks,
  type PreviewArtifact,
  type PreviewAttention,
  type PreviewRun,
  type PreviewScenario,
  type PreviewTask,
} from "./fixture-data";

type PreviewLink = (path: string) => string;
type TaskTopic = "overview" | "progress" | "artifacts";
type ArtifactTopic = "preview" | "source" | "versions";

function withScenario(path: string, scenario: PreviewScenario): string {
  if (scenario === "active") return path;
  const [pathname, rawQuery = ""] = path.split("?");
  const query = new URLSearchParams(rawQuery);
  query.set("scenario", scenario);
  return pathname + "?" + query.toString();
}

function taskTopic(value: string | null): TaskTopic {
  if (value === "artifacts") return "artifacts";
  if (value === "progress" || value === "runs" || value === "history") return "progress";
  return "overview";
}

function artifactTopic(value: string | null): ArtifactTopic {
  if (value === "source" || value === "versions") return value;
  return "preview";
}

function TaskStatus({ status }: { status: PreviewTask["status"] }) {
  if (status === "running") return <Badge variant="primary">正在进行</Badge>;
  if (status === "requested") return <Badge>等待开始</Badge>;
  return <Badge variant="warning">等待补充材料</Badge>;
}

function RunStatus({ status }: { status: PreviewRun["status"] }) {
  if (status === "running") {
    return (
      <span className="workbench-run-state workbench-run-state-running">
        <span aria-hidden="true" />
        正在进行
      </span>
    );
  }
  if (status === "requested") {
    return (
      <span className="workbench-run-state">
        <span aria-hidden="true" />
        已交代 · 等待开始
      </span>
    );
  }
  return (
    <span className="workbench-run-state">
      <CheckCircle2 size={13} aria-hidden="true" />
      本次执行完成
    </span>
  );
}

function EmptyWorkspace({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="workbench-empty">
      <span className="workbench-empty-icon">
        <Sparkles size={24} aria-hidden="true" />
      </span>
      <h1>从第一件工作开始</h1>
      <p>交代过的工作会在这里持续积累，未来的进展、决定和成果都会留在同一个上下文里。</p>
      <button type="button" className="workbench-primary-link" onClick={onCreate}>
        <Plus size={15} aria-hidden="true" />
        交代第一件工作
      </button>
      <small>演示空态，暂未连接真实工作服务</small>
    </div>
  );
}

function UnavailableWorkspace({ to }: { to: PreviewLink }) {
  return (
    <div className="workbench-empty workbench-unavailable">
      <span className="workbench-empty-icon">
        <WifiOff size={22} aria-hidden="true" />
      </span>
      <h1>工作数据暂时无法更新</h1>
      <p>
        当前状态未知，不代表没有工作，也不代表执行已完成。这是来源不可达情境，不会访问生产任务服务。
      </p>
      <Link to={to("/diagnostics")} className="workbench-secondary-link">
        查看连接诊断 <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

function WorkRow({ task, to }: { task: PreviewTask; to: PreviewLink }) {
  const artifacts = findPreviewArtifacts(task.id);
  const runs = findPreviewRuns(task.id);
  const activeRun = runs.find((run) => run.status === "running");
  const statusClass =
    task.status === "running"
      ? "workbench-work-row-running"
      : task.status === "requested"
        ? "workbench-work-row-requested"
        : "workbench-work-row-waiting-input";

  return (
    <article className={"workbench-work-row " + statusClass}>
      <div className="workbench-work-main">
        <div className="workbench-work-kicker">
          <TaskStatus status={task.status} />
          <span>{task.location}</span>
          <span>{task.update}</span>
        </div>
        <Link to={to("/tasks/" + task.id)} className="workbench-work-title">
          {task.title}
        </Link>
        <p>{task.description}</p>
        {artifacts.length > 0 ? (
          <div className="workbench-work-artifacts" aria-label={task.title + " 的成果"}>
            {artifacts.map((artifact) => (
              <Link key={artifact.id} to={to("/artifacts/" + artifact.id)}>
                <FileText size={12} aria-hidden="true" />
                {artifact.title}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
      <div className="workbench-work-side">
        {activeRun ? <RunStatus status={activeRun.status} /> : null}
        <Link to={to("/tasks/" + task.id)} className="workbench-row-link">
          查看工作 <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function AttentionRow({ attention, to }: { attention: PreviewAttention; to: PreviewLink }) {
  const source = findPreviewTask(attention.taskId);
  return (
    <Link to={to("/tasks/" + attention.taskId)} className="workbench-attention-row">
      <div className="workbench-attention-meta">
        <span className={attention.tone === "warning" ? "is-warning" : ""}>{attention.hint}</span>
        <span>Fixture</span>
      </div>
      <h3>{attention.title}</h3>
      <p>{attention.context}</p>
      <div className="workbench-attention-source">
        <span>{source?.title ?? "来源工作不可用"}</span>
        <ArrowRight size={14} aria-hidden="true" />
      </div>
    </Link>
  );
}

function ArtifactRow({ artifact, to }: { artifact: PreviewArtifact; to: PreviewLink }) {
  const source = findPreviewTask(artifact.taskId);
  return (
    <Link to={to("/artifacts/" + artifact.id)} className="workbench-artifact-row">
      <span className="workbench-artifact-icon">
        <FileText size={17} aria-hidden="true" />
      </span>
      <span className="workbench-artifact-copy">
        <strong>{artifact.title}</strong>
        <small>
          {artifact.type} · {artifact.version} · 来源：{source?.title ?? "未知"}
        </small>
      </span>
      <span className="workbench-artifact-time">{artifact.updated}</span>
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

function WorkStack({ tasks, to }: { tasks: readonly PreviewTask[]; to: PreviewLink }) {
  return (
    <div className="workbench-work-stack">
      {tasks.map((task) => (
        <WorkRow key={task.id} task={task} to={to} />
      ))}
    </div>
  );
}

function AttentionQueue({ items, to }: { items: readonly PreviewAttention[]; to: PreviewLink }) {
  if (items.length === 0) {
    return <p className="workbench-inline-empty">当前没有需要你处理的事项。</p>;
  }
  return (
    <div className="workbench-attention-list">
      {items.map((attention) => (
        <AttentionRow key={attention.id} attention={attention} to={to} />
      ))}
    </div>
  );
}

function ArtifactLedger({
  artifacts,
  to,
}: {
  artifacts: readonly PreviewArtifact[];
  to: PreviewLink;
}) {
  if (artifacts.length === 0) {
    return <p className="workbench-inline-empty">当前没有可访问的示例成果。</p>;
  }
  return (
    <div className="workbench-artifact-ledger">
      {artifacts.map((artifact) => (
        <ArtifactRow key={artifact.id} artifact={artifact} to={to} />
      ))}
    </div>
  );
}

function WorkbenchHeader({
  eyebrow,
  title,
  summary,
  action,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="workbench-page-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{summary}</span>
      </div>
      {action ? <div>{action}</div> : null}
    </header>
  );
}

function HomePage({
  scenario,
  to,
  onCreate,
}: {
  scenario: PreviewScenario;
  to: PreviewLink;
  onCreate: () => void;
}) {
  return (
    <>
      <WorkbenchHeader
        eyebrow="Work / Overview"
        title="工作台"
        summary={
          scenario === "active"
            ? "有 " +
              previewAttentions.length +
              " 件事需要你处理，" +
              previewTasks.length +
              " 件工作在手边。"
            : scenario === "empty"
              ? "还没有交代过工作，从第一件开始。"
              : "工作数据暂时不可用，无法确认当前任务。"
        }
        action={
          <button type="button" className="workbench-primary-link" onClick={onCreate}>
            <Plus size={15} aria-hidden="true" /> 交代工作
          </button>
        }
      />
      {scenario === "empty" ? (
        <EmptyWorkspace onCreate={onCreate} />
      ) : scenario === "unavailable" ? (
        <UnavailableWorkspace to={to} />
      ) : (
        <div className="workbench-overview-grid">
          {previewAttentions.length > 0 ? (
            <aside className="workbench-attention-zone" aria-label="等你决定">
              <div className="workbench-zone-heading">
                <span>等你决定</span>
                <Link to={to("/attention")}>全部待处理 · {previewAttentions.length} 项</Link>
              </div>
              <AttentionQueue items={previewAttentions} to={to} />
            </aside>
          ) : null}
          <section className="workbench-primary-zone" aria-label="正在推进">
            <div className="workbench-zone-heading">
              <span>正在推进</span>
              <small>{previewTasks.length} 件 · 按活动排序</small>
            </div>
            <WorkStack tasks={previewTasks} to={to} />
            <section className="workbench-recent-output" aria-label="最近成果">
              <div className="workbench-zone-heading">
                <span>最近成果</span>
                <Link to={to("/artifacts")}>全部成果</Link>
              </div>
              <ArtifactLedger artifacts={previewArtifacts} to={to} />
            </section>
          </section>
        </div>
      )}
    </>
  );
}

type ListView = "attention" | "tasks" | "artifacts";

function PreviewList({
  view,
  scenario,
  to,
  onCreate,
}: {
  view: ListView;
  scenario: PreviewScenario;
  to: PreviewLink;
  onCreate: () => void;
}) {
  const headings = {
    attention: ["Work / Attention", "待处理", "需要你决定、补充或核对的事情。"],
    tasks: ["Work / All", "全部工作", "工作目标是主对象；运行记录留在工作内部。"],
    artifacts: ["Work / Artifacts", "成果", "独立查找成果，同时保留它来自哪项工作。"],
  } as const;
  const [eyebrow, title, summary] = headings[view];

  return (
    <>
      <WorkbenchHeader eyebrow={eyebrow} title={title} summary={summary} />
      {scenario === "unavailable" ? (
        <UnavailableWorkspace to={to} />
      ) : scenario === "empty" ? (
        <EmptyWorkspace onCreate={onCreate} />
      ) : view === "attention" ? (
        <section className="workbench-full-ledger" aria-label="待处理列表">
          <AttentionQueue items={previewAttentions} to={to} />
        </section>
      ) : view === "tasks" ? (
        <section className="workbench-full-ledger" aria-label="全部工作列表">
          <WorkStack tasks={previewTasks} to={to} />
        </section>
      ) : (
        <section className="workbench-full-ledger" aria-label="成果列表">
          <ArtifactLedger artifacts={previewArtifacts} to={to} />
        </section>
      )}
    </>
  );
}

function TaskRunRow({ run }: { run: PreviewRun }) {
  return (
    <div className="workbench-run-row">
      <div>
        <strong>{run.label}</strong>
        <RunStatus status={run.status} />
      </div>
      <p>{run.summary}</p>
      <small>{run.updated}</small>
    </div>
  );
}

function taskStatusLabel(status: PreviewTask["status"]): string {
  if (status === "running") return "正在进行";
  if (status === "requested") return "已交代 · 等待开始";
  return "等待补充材料";
}

function progressLabel(status: PreviewRun["status"]): string {
  if (status === "running") return "正在进行";
  if (status === "requested") return "等待开始";
  return "本次执行完成";
}

function TaskProgressFeed({
  runs,
  artifacts,
  to,
  limit,
}: {
  runs: readonly PreviewRun[];
  artifacts: readonly PreviewArtifact[];
  to: PreviewLink;
  limit?: number;
}) {
  const items = [
    ...runs.map((run, index) => ({
      id: "run:" + run.id,
      rank: index * 2,
      icon: <Clock3 size={14} aria-hidden="true" />,
      time: run.updated,
      meta: run.label + " · " + progressLabel(run.status),
      content: <span>{run.summary}</span>,
    })),
    ...artifacts.map((artifact, index) => ({
      id: "artifact:" + artifact.id,
      rank: index * 2 + 1,
      icon: <FileText size={14} aria-hidden="true" />,
      time: artifact.updated,
      meta: "留下成果 · " + artifact.version,
      content: <Link to={to("/artifacts/" + artifact.id)}>{artifact.title}</Link>,
    })),
  ]
    .sort((left, right) => left.rank - right.rank)
    .slice(0, limit ?? Number.POSITIVE_INFINITY);

  if (items.length === 0) {
    return <p className="workbench-inline-empty">这项工作还没有可展示的进展。</p>;
  }

  return (
    <div className="workbench-progress-list">
      {items.map((item) => (
        <div key={item.id} className="workbench-progress-row">
          <span className="workbench-progress-icon">{item.icon}</span>
          <div className="workbench-progress-copy">
            <div>
              <strong>{item.meta}</strong>
              <small>{item.time}</small>
            </div>
            <p>{item.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskOverview({
  task,
  attentions,
  runs,
  artifacts,
  to,
}: {
  task: PreviewTask;
  attentions: readonly PreviewAttention[];
  runs: readonly PreviewRun[];
  artifacts: readonly PreviewArtifact[];
  to: PreviewLink;
}) {
  return (
    <div className="workbench-task-overview">
      <section className="workbench-task-now" aria-label="当前状态与下一步">
        <div className="workbench-task-now-main">
          <div className="workbench-zone-heading">
            <span>现在</span>
            <TaskStatus status={task.status} />
          </div>
          <p className="workbench-next-step">{task.description}</p>
          <div className="workbench-task-next">
            <small>下一步</small>
            <strong>{task.next}</strong>
            <span>真实执行动作尚未接入，本页只展示工作上下文。</span>
          </div>
        </div>

        <dl className="workbench-fact-list workbench-task-facts">
          <div>
            <dt>状态</dt>
            <dd>{taskStatusLabel(task.status)}</dd>
          </div>
          <div>
            <dt>执行位置</dt>
            <dd>{task.location}</dd>
          </div>
          <div>
            <dt>最近更新</dt>
            <dd>{task.update}</dd>
          </div>
        </dl>
      </section>

      {attentions.length > 0 ? (
        <section className="workbench-task-section" aria-label="需要你处理">
          <div className="workbench-zone-heading">
            <span>需要你处理</span>
            <small>{attentions.length} 项</small>
          </div>
          <AttentionQueue items={attentions} to={to} />
        </section>
      ) : null}

      <section className="workbench-task-section" aria-label="近期进展">
        <div className="workbench-zone-heading">
          <span>近期进展</span>
          <Link to={to("/tasks/" + task.id + "?view=progress")}>查看全部</Link>
        </div>
        <TaskProgressFeed runs={runs} artifacts={artifacts} to={to} limit={3} />
      </section>

      {artifacts.length > 0 ? (
        <section className="workbench-task-section" aria-label="相关成果">
          <div className="workbench-zone-heading">
            <span>相关成果</span>
            <Link to={to("/tasks/" + task.id + "?view=artifacts")}>全部成果</Link>
          </div>
          <ArtifactLedger artifacts={artifacts} to={to} />
        </section>
      ) : null}
    </div>
  );
}

function TaskProgress({
  task,
  runs,
  artifacts,
  to,
}: {
  task: PreviewTask;
  runs: readonly PreviewRun[];
  artifacts: readonly PreviewArtifact[];
  to: PreviewLink;
}) {
  return (
    <div className="workbench-task-progress">
      <section aria-label={task.title + " 的进展"}>
        <div className="workbench-zone-heading">
          <span>工作进展</span>
          <small>按 Fixture 记录展示，不推断真实执行阶段</small>
        </div>
        <TaskProgressFeed runs={runs} artifacts={artifacts} to={to} />
      </section>

      {runs.length > 0 ? (
        <ExpandableSection
          collapsedLabel={"查看执行详情（" + runs.length + " 次）"}
          expandedLabel="收起执行详情"
          className="workbench-run-details"
          contentClassName="pt-3"
        >
          <div className="workbench-run-list">
            {runs.map((run) => (
              <TaskRunRow key={run.id} run={run} />
            ))}
          </div>
          <p className="workbench-boundary-note">
            Fixture Run 只保留 requested / running / completed 的来源事实；它是工作进展的执行证据，
            不是 Task 的一级产品对象。
          </p>
        </ExpandableSection>
      ) : null}
    </div>
  );
}

function TaskDetail({ task, view, to }: { task: PreviewTask; view: TaskTopic; to: PreviewLink }) {
  const attentions = findPreviewAttentions(task.id);
  const runs = findPreviewRuns(task.id);
  const artifacts = findPreviewArtifacts(task.id);

  return (
    <>
      <WorkbenchHeader
        eyebrow="Work / Task"
        title={task.title}
        summary={task.description}
        action={<TaskStatus status={task.status} />}
      />

      {view !== "overview" ? (
        <Link to={to("/tasks/" + task.id)} className="workbench-inline-return">
          <ArrowLeft size={15} aria-hidden="true" /> 返回工作概览
        </Link>
      ) : null}

      {view === "overview" ? (
        <TaskOverview
          task={task}
          attentions={attentions}
          runs={runs}
          artifacts={artifacts}
          to={to}
        />
      ) : null}

      {view === "progress" ? (
        <TaskProgress task={task} runs={runs} artifacts={artifacts} to={to} />
      ) : null}

      {view === "artifacts" ? (
        <section className="workbench-full-ledger" aria-label={task.title + " 的成果"}>
          <ArtifactLedger artifacts={artifacts} to={to} />
        </section>
      ) : null}
    </>
  );
}

function ArtifactDetail({
  artifact,
  view,
  to,
}: {
  artifact: PreviewArtifact;
  view: ArtifactTopic;
  to: PreviewLink;
}) {
  const source = findPreviewTask(artifact.taskId);
  const sourceRun = findPreviewRuns(artifact.taskId).find((run) => run.id === artifact.runId);

  return (
    <>
      <WorkbenchHeader
        eyebrow="Work / Artifact"
        title={artifact.title}
        summary={artifact.type + " · " + artifact.version + " · " + artifact.updated}
      />

      {view === "preview" ? (
        <section className="workbench-artifact-preview" aria-label="成果预览">
          <div className="workbench-artifact-preview-mark">
            <FileText size={24} aria-hidden="true" />
          </div>
          <div>
            <small>Fixture 预览</small>
            <h2>{artifact.title}</h2>
            <p>这里保留真正的成果阅读区域。文件内容、下载权限与版本读取尚未接入。</p>
            <p className="workbench-artifact-context-links">
              <Link to={to("/artifacts/" + artifact.id + "?view=source")}>查看来源信息</Link>
              <span aria-hidden="true"> · </span>
              <Link to={to("/artifacts/" + artifact.id + "?view=versions")}>查看版本记录</Link>
            </p>
          </div>
        </section>
      ) : null}

      {view !== "preview" ? (
        <Link to={to("/artifacts/" + artifact.id)} className="workbench-inline-return">
          <ArrowLeft size={15} aria-hidden="true" /> 返回成果预览
        </Link>
      ) : null}

      {view === "source" ? (
        <section className="workbench-full-ledger" aria-label="成果来源">
          <dl className="workbench-fact-list workbench-fact-list-wide">
            <div>
              <dt>来源工作</dt>
              <dd>
                {source ? <Link to={to("/tasks/" + source.id)}>{source.title}</Link> : "来源不可用"}
              </dd>
            </div>
            <div>
              <dt>来源运行</dt>
              <dd>{sourceRun ? sourceRun.label + " · " + sourceRun.summary : "未提供来源运行"}</dd>
            </div>
            <div>
              <dt>版本</dt>
              <dd>
                <Link to={to("/artifacts/" + artifact.id + "?view=versions")}>
                  {artifact.version} · 查看版本记录
                </Link>
              </dd>
            </div>
            <div>
              <dt>访问状态</dt>
              <dd>Fixture 可读；不代表真实 ACL</dd>
            </div>
          </dl>
        </section>
      ) : null}

      {view === "versions" ? (
        <section className="workbench-full-ledger" aria-label="成果版本">
          <div className="workbench-version-row">
            <span>{artifact.version}</span>
            <strong>当前示例版本</strong>
            <small>{artifact.updated}</small>
          </div>
          <p className="workbench-boundary-note">本轮只演示版本入口，不制造不存在的历史版本。</p>
          <p className="workbench-artifact-context-links">
            <Link to={to("/artifacts/" + artifact.id + "?view=source")}>查看成果来源</Link>
          </p>
        </section>
      ) : null}
    </>
  );
}

function DetailPreview({
  kind,
  scenario,
  to,
}: {
  kind: "task" | "artifact";
  scenario: PreviewScenario;
  to: PreviewLink;
}) {
  const { taskId, artifactId } = useParams();
  const [params] = useSearchParams();
  const task = kind === "task" ? findPreviewTask(taskId) : undefined;
  const artifact = kind === "artifact" ? findPreviewArtifact(artifactId) : undefined;

  if (scenario === "unavailable") return <UnavailableWorkspace to={to} />;
  if (scenario === "empty") {
    return (
      <div className="workbench-empty">
        <h1>这个情境还没有工作</h1>
        <p>当前正在预览首次使用的空账户，不包含任何示例任务或成果。</p>
        <Link to={to("/")} className="workbench-secondary-link">
          返回工作台
        </Link>
      </div>
    );
  }

  if (!task && !artifact) {
    return (
      <div className="workbench-empty">
        <CircleHelp size={24} aria-hidden="true" />
        <h1>示例对象不存在</h1>
        <Link to={to("/")} className="workbench-secondary-link">
          返回工作台
        </Link>
      </div>
    );
  }

  if (task) {
    return <TaskDetail task={task} view={taskTopic(params.get("view"))} to={to} />;
  }

  return (
    <ArtifactDetail
      artifact={artifact as PreviewArtifact}
      view={artifactTopic(params.get("view"))}
      to={to}
    />
  );
}

function ComposerOutline() {
  return (
    <>
      <p className="workbench-composer-summary">先说清目标与边界，再决定交给谁做。</p>
      <div className="workbench-composer-outline">
        {[
          ["01", "目标", "希望完成什么，怎样才算有结果"],
          ["02", "材料", "明确允许使用的上下文与附件"],
          ["03", "执行", "执行方、时机与可能的费用"],
          ["04", "边界", "工具权限、外部发送与必要确认"],
        ].map(([number, title, description]) => (
          <section key={number}>
            <small>{number}</small>
            <h2>{title}</h2>
            <p>{description}</p>
          </section>
        ))}
      </div>
      <p className="workbench-boundary-note">Composer 结构预览，未接通任务提交或执行服务。</p>
    </>
  );
}

function ComposerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell
      open={open}
      title="交代工作"
      width={720}
      maxHeight="calc(100dvh - 2rem)"
      closeLabel="关闭交代工作"
      closeText="取消"
      onClose={onClose}
    >
      <ComposerOutline />
    </ModalShell>
  );
}

function getContextTitle(pathname: string, scenario: PreviewScenario): string {
  if (
    scenario !== "active" &&
    (pathname.startsWith("/tasks/") || pathname.startsWith("/artifacts/"))
  ) {
    return scenario === "empty" ? "尚无工作" : "工作数据不可用";
  }
  const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch) return findPreviewTask(taskMatch[1])?.title ?? "工作";
  const artifactMatch = pathname.match(/^\/artifacts\/([^/]+)$/);
  if (artifactMatch) return findPreviewArtifact(artifactMatch[1])?.title ?? "成果";
  if (pathname === "/attention") return "待处理";
  if (pathname === "/artifacts") return "成果";
  if (pathname === "/tasks") return "全部工作";
  if (pathname === "/diagnostics") return "连接诊断";
  if (pathname === "/settings/general") return "通用";
  return "概览";
}

function getContextGroup(pathname: string): string {
  if (pathname.startsWith("/settings/")) return "设置";
  if (pathname === "/diagnostics") return "系统";
  return "工作";
}

const WorkPreviewDebugPanel = lazy(() => import("./work-preview-debug-panel"));

function hasWorkPreviewDebug(pathname: string): boolean {
  const pathSegments = pathname.split("/").filter(Boolean);
  return (
    ["/", "/new", "/attention", "/tasks", "/artifacts"].includes(pathname) ||
    (pathSegments.length === 2 && ["tasks", "artifacts"].includes(pathSegments[0] ?? ""))
  );
}

export function WorkspaceShell() {
  const [params, setParams] = useSearchParams();
  const [composerOpen, setComposerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const scenario = parsePreviewScenario(params.get("scenario"));
  const to: PreviewLink = (path) => withScenario(path, scenario);
  const openComposer = () => setComposerOpen(true);
  const closeComposer = () => setComposerOpen(false);

  useEffect(() => {
    if (location.pathname !== "/new") {
      return;
    }
    setComposerOpen(true);
    navigate(withScenario("/", scenario), { replace: true });
  }, [location.pathname, navigate, scenario]);

  const changeScenario = (next: PreviewScenario) => {
    const updated = new URLSearchParams(params);
    if (next === "active") updated.delete("scenario");
    else updated.set("scenario", next);
    setParams(updated);
  };

  const visibleTasks = scenario === "active" ? previewTasks : [];

  const railItems = [
    {
      id: "work",
      label: "工作",
      icon: <Briefcase size={19} aria-hidden="true" />,
      active: true,
      to: to("/"),
    },
    {
      id: "knowledge",
      label: "知识",
      icon: <BookOpen size={19} aria-hidden="true" />,
      disabled: true,
    },
    {
      id: "automation",
      label: "自动化",
      icon: <Workflow size={19} aria-hidden="true" />,
      disabled: true,
    },
    {
      id: "connections",
      label: "连接",
      icon: <Plug size={19} aria-hidden="true" />,
      disabled: true,
    },
  ] as const;

  const workSidebarSections = [
    {
      id: "actions",
      items: [
        {
          id: "new-work",
          label: "交代工作",
          onSelect: openComposer,
          icon: <Plus size={15} aria-hidden="true" />,
        },
        {
          id: "all-work",
          label: "全部工作",
          to: to("/tasks"),
          icon: <Layers3 size={15} aria-hidden="true" />,
          end: true,
        },
        {
          id: "attention",
          label: "待处理",
          to: to("/attention"),
          icon: <CheckCircle2 size={15} aria-hidden="true" />,
          end: true,
        },
        {
          id: "artifacts",
          label: "成果",
          to: to("/artifacts"),
          icon: <FileText size={15} aria-hidden="true" />,
          end: true,
        },
      ],
    },
    ...(visibleTasks.length > 0
      ? [
          {
            id: "pinned",
            label: "置顶",
            items: visibleTasks.slice(0, 2).map((task) => ({
              id: task.id,
              label: task.title,
              to: to("/tasks/" + task.id),
              meta:
                task.status === "running"
                  ? "进行中"
                  : task.status === "requested"
                    ? "等待开始"
                    : "待补充",
            })),
          },
          {
            id: "recent",
            label: "最近",
            items: visibleTasks.slice(2).map((task) => ({
              id: task.id,
              label: task.title,
              to: to("/tasks/" + task.id),
              meta: "示例",
            })),
          },
        ]
      : []),
  ];

  // Mobile uses one collapsible object index instead of repeating each Task
  // in three separate focus/navigation lists.
  const mobileWorkSidebarSections = [
    {
      id: "work",
      label: "工作",
      items: [
        {
          id: "new-work",
          label: "交代工作",
          onSelect: openComposer,
          icon: <Plus size={15} aria-hidden="true" />,
        },
        {
          id: "all-work",
          label: "全部工作",
          to: to("/tasks"),
          icon: <Layers3 size={15} aria-hidden="true" />,
          end: true,
        },
        {
          id: "attention",
          label: "待处理",
          to: to("/attention"),
          icon: <CheckCircle2 size={15} aria-hidden="true" />,
          end: true,
        },
        {
          id: "artifacts",
          label: "成果",
          to: to("/artifacts"),
          icon: <FileText size={15} aria-hidden="true" />,
          end: true,
        },
      ],
    },
    ...(visibleTasks.length > 0
      ? [
          {
            id: "projects",
            label: "项目",
            meta: visibleTasks.length + " 项",
            collapsible: true as const,
            items: visibleTasks.map((task, index) => ({
              id: "project-" + task.id,
              label: task.title,
              to: to("/tasks/" + task.id),
              meta:
                (index < 2 ? "置顶" : "最近") +
                " · " +
                (task.status === "running"
                  ? "进行中"
                  : task.status === "requested"
                    ? "等待开始"
                    : "待补充"),
            })),
          },
        ]
      : []),
  ];

  const settingsSidebarSections = [
    {
      id: "settings",
      items: [
        {
          id: "general-settings",
          label: "通用",
          to: to("/settings/general"),
          icon: <Settings2 size={15} aria-hidden="true" />,
          end: true,
        },
      ],
    },
  ] as const;

  const isSettings = location.pathname.startsWith("/settings/");
  const sidebarSections = isSettings ? settingsSidebarSections : workSidebarSections;
  const mobileSidebarSections = isSettings ? settingsSidebarSections : mobileWorkSidebarSections;

  return (
    <WorkspaceShellFrame
      brand={
        <Link
          to={to("/")}
          className="workspace-brand-mark"
          aria-label="Mira Cloud"
          title="Mira Cloud"
        >
          <MiraBrandLogo />
        </Link>
      }
      mobileBrand={<MiraBrandLogo />}
      railItems={railItems}
      sidebarTitle={isSettings ? "设置" : "工作"}
      sidebarSubtitle={isSettings ? "Preferences" : "Personal Workspace"}
      sidebarSections={sidebarSections}
      mobileSidebarSections={mobileSidebarSections}
      sidebarFooter={
        <div className="space-y-4">
          {isSettings ? (
            <Link to={to("/")} className="workspace-sidebar-utility">
              <Briefcase size={15} aria-hidden="true" /> 返回工作
            </Link>
          ) : (
            <Link to={to("/settings/general")} className="workspace-sidebar-utility">
              <Settings2 size={15} aria-hidden="true" /> 设置
            </Link>
          )}
          <Link to={to("/diagnostics")} className="workspace-sidebar-utility">
            <Cloud size={15} aria-hidden="true" /> 连接诊断
          </Link>
        </div>
      }
      topbarLeading={
        <div className="flex min-w-0 items-center gap-2 text-sm text-text-secondary">
          <Cloud size={15} aria-hidden="true" />
          <span className="truncate">{getContextGroup(location.pathname)}</span>
          <span className="text-text-tertiary">/</span>
          <span className="truncate text-text-primary">
            {getContextTitle(location.pathname, scenario)}
          </span>
        </div>
      }
      mobileContextTitle={getContextTitle(location.pathname, scenario)}
    >
      {!isSettings && location.pathname !== "/diagnostics" ? (
        <div className="workbench-mobile-utility">
          <button type="button" className="workbench-primary-link" onClick={openComposer}>
            <Plus size={15} aria-hidden="true" />
            交代工作
          </button>
        </div>
      ) : null}
      <Routes>
        <Route
          path="/"
          element={<HomePage scenario={scenario} to={to} onCreate={openComposer} />}
        />
        <Route
          path="/attention"
          element={
            <PreviewList view="attention" scenario={scenario} to={to} onCreate={openComposer} />
          }
        />
        <Route
          path="/tasks"
          element={<PreviewList view="tasks" scenario={scenario} to={to} onCreate={openComposer} />}
        />
        <Route
          path="/artifacts"
          element={
            <PreviewList view="artifacts" scenario={scenario} to={to} onCreate={openComposer} />
          }
        />
        <Route
          path="/tasks/:taskId"
          element={<DetailPreview kind="task" scenario={scenario} to={to} />}
        />
        <Route
          path="/artifacts/:artifactId"
          element={<DetailPreview kind="artifact" scenario={scenario} to={to} />}
        />
        <Route
          path="/new"
          element={<HomePage scenario={scenario} to={to} onCreate={openComposer} />}
        />
        <Route path="/settings/general" element={<GeneralSettingsPage />} />
        <Route
          path="/diagnostics"
          element={
            <>
              <WorkbenchHeader
                eyebrow="System"
                title="连接诊断"
                summary="只检查真实基础服务，不代表账号登录和 Agent 执行。"
              />
              <ConnectionPanel />
              <Link to={to("/")} className="workbench-secondary-link mt-5">
                <ArrowLeft size={15} aria-hidden="true" /> 返回工作台
              </Link>
            </>
          }
        />
        <Route
          path="*"
          element={
            <div className="workbench-empty">
              <CircleHelp size={24} aria-hidden="true" />
              <h1>没有找到这个页面</h1>
              <Link to={to("/")} className="workbench-secondary-link">
                返回工作台
              </Link>
            </div>
          }
        />
      </Routes>
      <PreviewDebugBall
        scope={hasWorkPreviewDebug(location.pathname) ? "work-fixtures" : null}
        contextKey={location.pathname}
        title="工作原型调试"
      >
        {(close) => (
          <Suspense fallback={<p className="preview-debug-help">正在加载调试项…</p>}>
            <WorkPreviewDebugPanel scenario={scenario} onChange={changeScenario} onClose={close} />
          </Suspense>
        )}
      </PreviewDebugBall>
      <ComposerModal open={composerOpen} onClose={closeComposer} />
    </WorkspaceShellFrame>
  );
}

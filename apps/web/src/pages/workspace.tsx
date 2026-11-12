import { useState } from "react";
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
  FolderOpen,
  History,
  Home,
  Inbox,
  Layers3,
  Moon,
  PlayCircle,
  Plug,
  Plus,
  Settings2,
  Sparkles,
  Sun,
  WifiOff,
  Workflow,
} from "lucide-react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import { Badge, Card, IconButton, NavItem } from "../components/mira-design/index.ts";
import { ConnectionPanel } from "../features/connection/connection-panel";
import { WorkspaceShellFrame } from "../features/workspace/workspace-shell-frame";
import {
  findPreviewArtifact,
  findPreviewArtifacts,
  findPreviewAttentions,
  findPreviewRuns,
  findPreviewTask,
  parsePreviewScenario,
  previewArtifacts,
  previewAttentions,
  previewScenarios,
  previewTasks,
  type PreviewArtifact,
  type PreviewAttention,
  type PreviewRun,
  type PreviewScenario,
  type PreviewTask,
} from "../features/workspace/fixture-data";
import {
  presetIds,
  themePresetMap,
  type Appearance,
  type ThemePresetId,
} from "../theme/mira-design/index.ts";
import { applyTheme, currentTheme } from "../theme/mira-design/theme-preference.ts";

const mobileNavigation = [
  { to: "/", label: "首页", icon: Home, end: true },
  { to: "/attention", label: "待处理", icon: Inbox, end: true },
  { to: "/tasks", label: "我的工作", icon: Layers3, end: true },
  { to: "/artifacts", label: "成果", icon: FolderOpen, end: true },
] as const;

type PreviewLink = (path: string) => string;
type TaskTopic = "overview" | "attention" | "runs" | "artifacts" | "history";
type ArtifactTopic = "preview" | "source" | "versions";

interface ShellTopic {
  value: string;
  label: string;
  to?: string;
}

function withScenario(path: string, scenario: PreviewScenario): string {
  if (scenario === "active") return path;
  const [pathname, rawQuery = ""] = path.split("?");
  const query = new URLSearchParams(rawQuery);
  query.set("scenario", scenario);
  return pathname + "?" + query.toString();
}

function taskTopic(value: string | null): TaskTopic {
  if (
    value === "attention" ||
    value === "runs" ||
    value === "artifacts" ||
    value === "history"
  ) {
    return value;
  }
  return "overview";
}

function artifactTopic(value: string | null): ArtifactTopic {
  if (value === "source" || value === "versions") return value;
  return "preview";
}

function resolveShellTopics(
  pathname: string,
  searchParams: URLSearchParams,
): { tabs: readonly ShellTopic[]; value: string } {
  if (pathname === "/" || pathname === "/attention" || pathname === "/artifacts") {
    const tabs = [
      { value: "overview", label: "概览", to: "/" },
      { value: "attention", label: "待处理", to: "/attention" },
      { value: "artifacts", label: "成果", to: "/artifacts" },
    ] as const;
    if (pathname === "/attention") return { tabs, value: "attention" };
    if (pathname === "/artifacts") return { tabs, value: "artifacts" };
    return { tabs, value: "overview" };
  }

  if (pathname === "/tasks") {
    return { tabs: [{ value: "tasks", label: "全部工作" }], value: "tasks" };
  }

  if (pathname.startsWith("/tasks/")) {
    const tabs = [
      { value: "overview", label: "概览", to: pathname },
      { value: "attention", label: "待处理", to: pathname + "?view=attention" },
      { value: "runs", label: "运行", to: pathname + "?view=runs" },
      { value: "artifacts", label: "成果", to: pathname + "?view=artifacts" },
      { value: "history", label: "历史", to: pathname + "?view=history" },
    ] as const;
    return { tabs, value: taskTopic(searchParams.get("view")) };
  }

  if (pathname.startsWith("/artifacts/")) {
    const tabs = [
      { value: "preview", label: "预览", to: pathname },
      { value: "source", label: "来源", to: pathname + "?view=source" },
      { value: "versions", label: "版本", to: pathname + "?view=versions" },
    ] as const;
    return { tabs, value: artifactTopic(searchParams.get("view")) };
  }

  if (pathname === "/new") {
    return { tabs: [{ value: "new", label: "交代工作" }], value: "new" };
  }

  if (pathname === "/diagnostics") {
    return { tabs: [{ value: "diagnostics", label: "连接诊断" }], value: "diagnostics" };
  }

  return { tabs: [{ value: "unknown", label: "工作" }], value: "unknown" };
}

function ThemeControls() {
  const [theme, setTheme] = useState(currentTheme);

  function change(preset: ThemePresetId, appearance: Appearance) {
    const next = { preset, appearance };
    applyTheme(next);
    setTheme(next);
  }

  return (
    <div className="flex items-center gap-2" aria-label="外观偏好">
      <label className="sr-only" htmlFor="mira-theme-preset">
        主题预设
      </label>
      <select
        id="mira-theme-preset"
        className="min-h-9 max-w-[130px] rounded-ui-control border border-border bg-surface-primary px-2 text-xs text-text-primary"
        value={theme.preset}
        onChange={(event) => {
          if (presetIds.some((preset) => preset === event.target.value)) {
            change(event.target.value as ThemePresetId, theme.appearance);
          }
        }}
      >
        {presetIds.map((preset) => (
          <option key={preset} value={preset}>
            {themePresetMap[preset]?.label ?? preset}
          </option>
        ))}
      </select>
      <IconButton
        styleType="ghost"
        size="md"
        ariaLabel={theme.appearance === "light" ? "切换深色模式" : "切换浅色模式"}
        onClick={() => change(theme.preset, theme.appearance === "light" ? "dark" : "light")}
      >
        {theme.appearance === "light" ? (
          <Moon size={17} aria-hidden="true" />
        ) : (
          <Sun size={17} aria-hidden="true" />
        )}
      </IconButton>
    </div>
  );
}

function PreviewNotice() {
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
      <span>UI 原型 · 工作、时间、运行及成果均为 Fixture 示例</span>
    </div>
  );
}

function TaskStatus({ status }: { status: PreviewTask["status"] }) {
  if (status === "running") return <Badge variant="primary">正在进行</Badge>;
  if (status === "requested") return <Badge>等待开始</Badge>;
  return <Badge variant="success">可继续</Badge>;
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

function FixtureScenarioBar({
  scenario,
  changeScenario,
}: {
  scenario: PreviewScenario;
  changeScenario: (scenario: PreviewScenario) => void;
}) {
  return (
    <div className="workbench-fixture-bar">
      <span className="workbench-fixture-label">预览情境</span>
      <div className="workbench-fixture-options" aria-label="选择原型情境">
        {previewScenarios.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={scenario === item.value}
            onClick={() => changeScenario(item.value)}
            className={scenario === item.value ? "is-active" : ""}
          >
            {item.label}
          </button>
        ))}
      </div>
      <span className="workbench-fixture-hint">只改变 Fixture，不产生执行请求</span>
    </div>
  );
}

function EmptyWorkspace({ to }: { to: PreviewLink }) {
  return (
    <div className="workbench-empty">
      <span className="workbench-empty-icon">
        <Sparkles size={24} aria-hidden="true" />
      </span>
      <h1>从第一件工作开始</h1>
      <p>交代过的工作会在这里持续积累，未来的进展、决定和成果都会留在同一个上下文里。</p>
      <Link to={to("/new")} className="workbench-primary-link">
        <Plus size={15} aria-hidden="true" />
        交代第一件工作
      </Link>
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
      <p>当前状态未知，不代表没有工作，也不代表执行已完成。这是来源不可达情境，不会访问生产任务服务。</p>
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
        : "workbench-work-row-ready";

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
          {task.next} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function AttentionRow({
  attention,
  to,
}: {
  attention: PreviewAttention;
  to: PreviewLink;
}) {
  const source = findPreviewTask(attention.taskId);
  return (
    <Link to={to("/tasks/" + attention.taskId + "?view=attention")} className="workbench-attention-row">
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

function ArtifactRow({
  artifact,
  to,
}: {
  artifact: PreviewArtifact;
  to: PreviewLink;
}) {
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

function AttentionQueue({
  items,
  to,
}: {
  items: readonly PreviewAttention[];
  to: PreviewLink;
}) {
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
  changeScenario,
  to,
}: {
  scenario: PreviewScenario;
  changeScenario: (next: PreviewScenario) => void;
  to: PreviewLink;
}) {
  return (
    <>
      <WorkbenchHeader
        eyebrow="Work / Overview"
        title="工作台"
        summary="两件事等你处理，三件工作在手边。"
        action={
          <Link to={to("/new")} className="workbench-primary-link">
            <Plus size={15} aria-hidden="true" /> 交代工作
          </Link>
        }
      />
      <FixtureScenarioBar scenario={scenario} changeScenario={changeScenario} />
      {scenario === "empty" ? (
        <EmptyWorkspace to={to} />
      ) : scenario === "unavailable" ? (
        <UnavailableWorkspace to={to} />
      ) : (
        <div className="workbench-overview-grid">
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

          <aside className="workbench-attention-zone" aria-label="等你决定">
            <div className="workbench-zone-heading">
              <span>等你决定</span>
              <small>{previewAttentions.length} 项</small>
            </div>
            <AttentionQueue items={previewAttentions} to={to} />
            <p className="workbench-attention-note">
              这里只出现真正需要你决定、确认或补充的事情。处理后，对应工作继续。
            </p>
          </aside>
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
}: {
  view: ListView;
  scenario: PreviewScenario;
  to: PreviewLink;
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
        <EmptyWorkspace to={to} />
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

function TaskDetail({
  task,
  view,
  to,
}: {
  task: PreviewTask;
  view: TaskTopic;
  to: PreviewLink;
}) {
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

      {view === "overview" ? (
        <div className="workbench-detail-grid">
          <section aria-label="下一步">
            <div className="workbench-zone-heading">
              <span>下一步</span>
            </div>
            <p className="workbench-next-step">{task.next}。真实执行动作尚未接入，本页只展示工作上下文。</p>
          </section>
          <section aria-label="工作摘要">
            <div className="workbench-zone-heading">
              <span>工作摘要</span>
            </div>
            <dl className="workbench-fact-list">
              <div>
                <dt>状态</dt>
                <dd>{task.status === "running" ? "进行中" : task.status === "requested" ? "等待开始" : "可继续"}</dd>
              </div>
              <div>
                <dt>执行位置</dt>
                <dd>{task.location}</dd>
              </div>
              <div>
                <dt>最近更新</dt>
                <dd>{task.update}</dd>
              </div>
              <div>
                <dt>成果</dt>
                <dd>{artifacts.length} 份 Fixture</dd>
              </div>
            </dl>
          </section>
          <section className="workbench-detail-span" aria-label="最近运行">
            <div className="workbench-zone-heading">
              <span>最近运行</span>
            </div>
            <div className="workbench-run-list">
              {runs.slice(0, 2).map((run) => (
                <TaskRunRow key={run.id} run={run} />
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {view === "attention" ? (
        <section className="workbench-full-ledger" aria-label={task.title + " 的待处理"}>
          <AttentionQueue items={attentions} to={to} />
        </section>
      ) : null}

      {view === "runs" ? (
        <section className="workbench-full-ledger" aria-label={task.title + " 的运行"}>
          <div className="workbench-run-list">
            {runs.map((run) => (
              <TaskRunRow key={run.id} run={run} />
            ))}
          </div>
          <p className="workbench-boundary-note">
            Fixture Run 只演示 requested / running / completed 的阅读层级，不代表 Cloud Pi 或 Desktop 实际执行。
          </p>
        </section>
      ) : null}

      {view === "artifacts" ? (
        <section className="workbench-full-ledger" aria-label={task.title + " 的成果"}>
          <ArtifactLedger artifacts={artifacts} to={to} />
        </section>
      ) : null}

      {view === "history" ? (
        <section className="workbench-full-ledger" aria-label={task.title + " 的历史"}>
          <div className="workbench-history-list">
            {runs.map((run) => (
              <div key={run.id} className="workbench-history-row">
                <Clock3 size={14} aria-hidden="true" />
                <span>{run.updated}</span>
                <strong>{run.label}</strong>
                <span>{run.summary}</span>
              </div>
            ))}
            {artifacts.map((artifact) => (
              <div key={artifact.id} className="workbench-history-row">
                <FileText size={14} aria-hidden="true" />
                <span>{artifact.updated}</span>
                <strong>{artifact.version}</strong>
                <Link to={to("/artifacts/" + artifact.id)}>{artifact.title}</Link>
              </div>
            ))}
          </div>
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
          </div>
        </section>
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
              <dd>{artifact.version}</dd>
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

  if (scenario !== "active") return <UnavailableWorkspace to={to} />;

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

function ComposerPreview({ to }: { to: PreviewLink }) {
  return (
    <>
      <WorkbenchHeader
        eyebrow="Work / Delegation"
        title="交代工作"
        summary="先说清目标与边界，再决定交给谁做。"
      />
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
      <Link to={to("/")} className="workbench-secondary-link">
        <ArrowLeft size={15} aria-hidden="true" /> 返回工作台
      </Link>
    </>
  );
}

function getContextTitle(pathname: string): string {
  const taskMatch = pathname.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch) return findPreviewTask(taskMatch[1])?.title ?? "工作";
  const artifactMatch = pathname.match(/^\/artifacts\/([^/]+)$/);
  if (artifactMatch) return findPreviewArtifact(artifactMatch[1])?.title ?? "成果";
  if (pathname === "/attention") return "待处理";
  if (pathname === "/artifacts") return "成果";
  if (pathname === "/tasks") return "全部工作";
  if (pathname === "/new") return "交代工作";
  if (pathname === "/diagnostics") return "连接诊断";
  return "概览";
}

export function WorkspaceShell() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const scenario = parsePreviewScenario(params.get("scenario"));
  const to: PreviewLink = (path) => withScenario(path, scenario);

  const changeScenario = (next: PreviewScenario) => {
    const updated = new URLSearchParams(params);
    if (next === "active") updated.delete("scenario");
    else updated.set("scenario", next);
    setParams(updated);
  };

  const topics = resolveShellTopics(location.pathname, params);
  const changeTopic = (value: string) => {
    const target = topics.tabs.find((tab) => tab.value === value)?.to;
    if (target) navigate(to(target));
  };

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

  const sidebarSections = [
    {
      id: "actions",
      items: [
        {
          id: "new-work",
          label: "交代工作",
          to: to("/new"),
          icon: <Plus size={15} aria-hidden="true" />,
          end: true,
        },
        {
          id: "all-work",
          label: "全部工作",
          to: to("/tasks"),
          icon: <Layers3 size={15} aria-hidden="true" />,
          end: true,
        },
      ],
    },
    {
      id: "pinned",
      label: "置顶",
      items: previewTasks.slice(0, 2).map((task) => ({
        id: task.id,
        label: task.title,
        to: to("/tasks/" + task.id),
        meta: task.status === "running" ? "进行中" : "待续",
      })),
    },
    {
      id: "recent",
      label: "最近",
      items: previewTasks.slice(2).map((task) => ({
        id: task.id,
        label: task.title,
        to: to("/tasks/" + task.id),
        meta: "示例",
      })),
    },
  ] as const;

  const mobileHeader = (
    <>
      <NavLink
        to={to("/")}
        className="flex items-center gap-2 text-sm font-semibold text-text-primary no-underline"
        aria-label="Mira Cloud 首页"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-ui-control bg-primary font-bold text-text-inverted">
          M
        </span>
        Mira Cloud
      </NavLink>
      <Link
        to={to("/new")}
        className="mira-touch-target inline-flex items-center gap-1 rounded-ui-control bg-primary px-3 py-2 text-xs font-medium text-text-inverted no-underline"
      >
        <Plus size={16} aria-hidden="true" /> 交代工作
      </Link>
    </>
  );

  const mobileNav = mobileNavigation.map(({ to: path, label, icon: Icon, end }) => (
    <NavItem
      key={path}
      to={to(path)}
      end={end}
      icon={<Icon size={19} aria-hidden="true" />}
      className="mira-workspace-nav-item mira-touch-target"
    >
      {label}
    </NavItem>
  ));

  return (
    <WorkspaceShellFrame
      brand={
        <Link to={to("/")} className="workspace-brand-mark" aria-label="Mira Cloud" title="Mira Cloud">
          M
        </Link>
      }
      railItems={railItems}
      sidebarTitle="工作"
      sidebarSubtitle="Personal Workspace"
      sidebarSections={sidebarSections}
      sidebarFooter={
        <div className="space-y-4">
          <Link to={to("/diagnostics")} className="workspace-sidebar-utility">
            <Settings2 size={15} aria-hidden="true" /> 连接诊断
          </Link>
          <PreviewNotice />
        </div>
      }
      topicTabs={topics.tabs}
      topicValue={topics.value}
      onTopicChange={changeTopic}
      topbarLeading={
        <div className="flex min-w-0 items-center gap-2 text-sm text-text-secondary">
          <Cloud size={15} aria-hidden="true" />
          <span className="truncate">工作</span>
          <span className="text-text-tertiary">/</span>
          <span className="truncate text-text-primary">{getContextTitle(location.pathname)}</span>
        </div>
      }
      topbarActions={<ThemeControls />}
      mobileHeader={mobileHeader}
      mobileNavigation={mobileNav}
    >
      <div className="mb-5 lg:hidden">
        <PreviewNotice />
      </div>
      <Routes>
        <Route
          path="/"
          element={<HomePage scenario={scenario} changeScenario={changeScenario} to={to} />}
        />
        <Route
          path="/attention"
          element={<PreviewList view="attention" scenario={scenario} to={to} />}
        />
        <Route path="/tasks" element={<PreviewList view="tasks" scenario={scenario} to={to} />} />
        <Route
          path="/artifacts"
          element={<PreviewList view="artifacts" scenario={scenario} to={to} />}
        />
        <Route
          path="/tasks/:taskId"
          element={<DetailPreview kind="task" scenario={scenario} to={to} />}
        />
        <Route
          path="/artifacts/:artifactId"
          element={<DetailPreview kind="artifact" scenario={scenario} to={to} />}
        />
        <Route path="/new" element={<ComposerPreview to={to} />} />
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
    </WorkspaceShellFrame>
  );
}

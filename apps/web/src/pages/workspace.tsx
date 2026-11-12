import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  ChevronRight,
  CircleHelp,
  Cloud,
  FileText,
  FolderOpen,
  Home,
  Inbox,
  Layers3,
  Moon,
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
  findPreviewTask,
  parsePreviewScenario,
  previewArtifacts,
  previewAttentions,
  previewScenarios,
  previewTasks,
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

interface ShellTopic {
  value: string;
  label: string;
  to?: string;
}

function resolveShellTopics(pathname: string): { tabs: readonly ShellTopic[]; value: string } {
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
    return { tabs: [{ value: "task", label: "工作详情" }], value: "task" };
  }
  if (pathname.startsWith("/artifacts/")) {
    return { tabs: [{ value: "artifact", label: "成果详情" }], value: "artifact" };
  }
  if (pathname === "/new") {
    return { tabs: [{ value: "new", label: "交代工作" }], value: "new" };
  }
  if (pathname === "/diagnostics") {
    return { tabs: [{ value: "diagnostics", label: "连接诊断" }], value: "diagnostics" };
  }
  return { tabs: [{ value: "unknown", label: "工作" }], value: "unknown" };
}

type PreviewLink = (path: string) => string;

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
        className="min-h-11 max-w-[130px] rounded-ui-control border border-border bg-surface-primary px-2 text-xs text-text-primary"
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
        styleType="outline"
        size="lg"
        className="h-11 w-11 shrink-0"
        ariaLabel={theme.appearance === "light" ? "切换深色模式" : "切换浅色模式"}
        onClick={() => change(theme.preset, theme.appearance === "light" ? "dark" : "light")}
      >
        {theme.appearance === "light" ? (
          <Moon size={18} aria-hidden="true" />
        ) : (
          <Sun size={18} aria-hidden="true" />
        )}
      </IconButton>
    </div>
  );
}

function PreviewNotice() {
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
      <span>UI 原型 · 工作、时间及成果均为 Fixture 示例</span>
    </div>
  );
}

function SectionHeading({ title, link, to }: { title: string; link: string; to: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-heading-1 font-semibold text-text-primary">{title}</h2>
      <Link
        to={to}
        className="mira-touch-target inline-flex items-center gap-1 px-2 py-2 text-sm text-text-secondary no-underline hover:text-text-primary"
      >
        {link} <ChevronRight size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

function TaskStatus({ status }: { status: PreviewTask["status"] }) {
  if (status === "running") return <Badge variant="primary">正在进行</Badge>;
  if (status === "requested") return <Badge>等待开始</Badge>;
  return <Badge variant="success">可继续</Badge>;
}

function AttentionItem({ item, to }: { item: (typeof previewAttentions)[number]; to: string }) {
  return (
    <Link
      to={to}
      className="group flex min-h-44 flex-col justify-between rounded-ui-panel border border-border bg-surface-primary p-5 no-underline shadow-shadow-sm transition-colors hover:border-primary/30 hover:bg-surface-soft"
    >
      <div>
        <Badge variant={item.tone === "warning" ? "warning" : "neutral"}>{item.hint}</Badge>
        <h3 className="mt-4 text-base font-semibold text-text-primary">{item.title}</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{item.context}</p>
      </div>
      <span className="mt-4 inline-flex items-center gap-1 self-end text-sm font-medium text-primary">
        查看并处理 <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}

function TaskItem({ task, to }: { task: PreviewTask; to: string }) {
  return (
    <Link
      to={to}
      className="group flex min-h-48 flex-col rounded-ui-panel border border-border bg-surface-primary p-5 no-underline shadow-shadow-sm transition-colors hover:border-primary/30 hover:bg-surface-soft"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-ui-control bg-surface-soft text-primary">
          <Layers3 size={20} aria-hidden="true" />
        </span>
        <TaskStatus status={task.status} />
      </div>
      <h3 className="text-base font-semibold text-text-primary">{task.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-text-secondary">{task.description}</p>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-xs text-text-tertiary">{task.location}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-text-secondary">{task.update}</span>
          <ArrowRight size={17} className="shrink-0 text-primary" aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
}

function ArtifactItem({ item, to }: { item: (typeof previewArtifacts)[number]; to: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-20 items-center gap-3 rounded-ui-control px-2 py-3 no-underline hover:bg-surface-soft sm:px-3"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-ui-control bg-surface-secondary text-primary">
        <FileText size={20} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">{item.title}</span>
        <span className="mt-1 block text-xs text-text-secondary">
          {item.type} · {item.version} · {item.updated}
        </span>
      </span>
      <ChevronRight size={17} className="shrink-0 text-icon-tertiary" aria-hidden="true" />
    </Link>
  );
}

function EmptyWorkspace({ to }: { to: PreviewLink }) {
  return (
    <Card className="px-6 py-12 text-center sm:py-16">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-ui-panel bg-surface-soft text-primary">
        <Sparkles size={28} aria-hidden="true" />
      </span>
      <h2 className="mt-6 text-xl font-semibold text-text-primary">从第一件工作开始</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-text-secondary">
        交代过的工作会在这里持续积累，未来的进展和成果也能接着用。
      </p>
      <Link
        to={to("/new")}
        className="mira-touch-target mx-auto mt-6 inline-flex items-center gap-2 rounded-ui-control bg-primary px-5 py-3 text-sm font-medium text-text-inverted no-underline hover:bg-primary-hover"
      >
        <Plus size={16} aria-hidden="true" /> 交代第一件工作
      </Link>
      <p className="mt-5 text-xs text-text-tertiary">演示空态，暂未连接真实工作服务</p>
    </Card>
  );
}

function UnavailableWorkspace({ to }: { to: PreviewLink }) {
  return (
    <Card className="px-6 py-10 sm:py-12">
      <span className="flex h-12 w-12 items-center justify-center rounded-ui-panel bg-warning-soft text-warning-text">
        <WifiOff size={23} aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold text-text-primary">工作数据暂时无法更新</h2>
      <p className="mt-3 max-w-lg text-sm leading-7 text-text-secondary">
        当前状态未知，不代表没有工作，也不代表执行已完成。这是断连情境模拟，不会访问生产任务服务。
      </p>
      <Link
        to={to("/diagnostics")}
        className="mira-touch-target mt-6 inline-flex items-center gap-2 rounded-ui-control border border-border px-4 py-2 text-sm font-medium text-text-primary no-underline hover:bg-surface-soft"
      >
        查看连接诊断 <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </Card>
  );
}

function PageHeading({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-xs font-medium tracking-widest text-text-tertiary uppercase">
        {label}
      </p>
      <h1 className="text-display font-semibold tracking-tight text-text-primary">{title}</h1>
      <p className="mt-2 text-sm leading-7 text-text-secondary">{subtitle}</p>
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
      <div className="flex items-start justify-between gap-4">
        <PageHeading
          label="Personal Workspace"
          title="你的工作"
          subtitle="重要的事放在眼前，没做完的事接着做。"
        />
        <Link
          to={to("/new")}
          className="mira-touch-target hidden items-center gap-2 rounded-ui-control bg-primary px-4 py-2.5 text-sm font-medium text-text-inverted no-underline hover:bg-primary-hover lg:inline-flex"
        >
          <Plus size={17} aria-hidden="true" /> 交代工作
        </Link>
      </div>
      <div className="mb-8 flex flex-col gap-2 rounded-ui-panel border border-border bg-surface-soft p-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1" aria-label="选择原型情境">
          {previewScenarios.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={scenario === item.value}
              onClick={() => changeScenario(item.value)}
              className={
                "mira-touch-target rounded-ui-control px-3 py-2 text-xs font-medium " +
                (scenario === item.value
                  ? "bg-surface-primary text-text-primary shadow-shadow-sm"
                  : "text-text-secondary hover:text-text-primary")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="px-2 text-xs text-text-tertiary">仅切换 UI 情境</span>
      </div>
      {scenario === "empty" ? (
        <EmptyWorkspace to={to} />
      ) : scenario === "unavailable" ? (
        <UnavailableWorkspace to={to} />
      ) : (
        <div className="space-y-9">
          <section aria-label="需要你处理">
            <SectionHeading title="需要你处理" link="查看全部" to={to("/attention")} />
            <div className="grid gap-4 md:grid-cols-2">
              {previewAttentions.map((item) => (
                <AttentionItem key={item.id} item={item} to={to("/tasks/" + item.taskId)} />
              ))}
            </div>
          </section>
          <section aria-label="接着做">
            <SectionHeading title="接着做" link="我的工作" to={to("/tasks")} />
            <div className="grid gap-4 md:grid-cols-2">
              {previewTasks.slice(0, 2).map((task) => (
                <TaskItem key={task.id} task={task} to={to("/tasks/" + task.id)} />
              ))}
            </div>
          </section>
          <section aria-label="最近成果">
            <SectionHeading title="最近成果" link="成果库" to={to("/artifacts")} />
            <Card className="divide-y divide-border p-2 sm:p-3">
              {previewArtifacts.map((item) => (
                <ArtifactItem key={item.id} item={item} to={to("/artifacts/" + item.id)} />
              ))}
            </Card>
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
}: {
  view: ListView;
  scenario: PreviewScenario;
  to: PreviewLink;
}) {
  const headings = {
    attention: ["Attention", "待处理", "需要你决定、补充或核对的事情。"],
    tasks: ["Continuity", "我的工作", "以工作目标为中心，而不是运行记录列表。"],
    artifacts: ["Artifacts", "成果", "每份成果都能追溯到它来自的工作。"],
  } as const;
  const [label, title, subtitle] = headings[view];
  return (
    <>
      <PageHeading label={label} title={title} subtitle={subtitle} />
      {scenario === "unavailable" ? (
        <UnavailableWorkspace to={to} />
      ) : scenario === "empty" ? (
        <EmptyWorkspace to={to} />
      ) : view === "attention" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {previewAttentions.map((item) => (
            <AttentionItem key={item.id} item={item} to={to("/tasks/" + item.taskId)} />
          ))}
        </div>
      ) : view === "tasks" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {previewTasks.map((task) => (
            <TaskItem key={task.id} task={task} to={to("/tasks/" + task.id)} />
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-border p-3">
          {previewArtifacts.map((item) => (
            <ArtifactItem key={item.id} item={item} to={to("/artifacts/" + item.id)} />
          ))}
        </Card>
      )}
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
  const task = kind === "task" ? findPreviewTask(taskId) : undefined;
  const artifact = kind === "artifact" ? findPreviewArtifact(artifactId) : undefined;
  if (scenario !== "active") return <UnavailableWorkspace to={to} />;
  if (!task && !artifact) {
    return (
      <Card className="p-8">
        <h1 className="text-xl font-semibold text-text-primary">示例对象不存在</h1>
        <Link to={to("/")} className="mt-4 inline-flex text-sm text-primary">
          返回首页
        </Link>
      </Card>
    );
  }

  const origin = artifact ? findPreviewTask(artifact.taskId) : undefined;
  return (
    <>
      <Link
        to={to(kind === "task" ? "/tasks" : "/artifacts")}
        className="mira-touch-target mb-5 inline-flex items-center gap-2 text-sm text-text-secondary no-underline"
      >
        <ArrowLeft size={16} aria-hidden="true" /> 返回{kind === "task" ? "我的工作" : "成果"}
      </Link>
      <PageHeading
        label={kind === "task" ? "Task · 示例详情" : "Artifact · 示例详情"}
        title={task?.title ?? artifact?.title ?? ""}
        subtitle={task?.description ?? "阅读成果、追溯来源和继续委托的入口。"}
      />
      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            {task ? "当前工作摘要" : "成果信息"}
          </h2>
          {task ? <TaskStatus status={task.status} /> : <Badge>{artifact?.version}</Badge>}
        </div>
        <div className="mt-5 space-y-3 text-sm text-text-secondary">
          {task ? (
            <>
              <p>{task.location}</p>
              <p>{task.update}</p>
              <p>查看只读示例；本页不会开始执行或批准。</p>
            </>
          ) : (
            <>
              <p>类型：{artifact?.type}</p>
              <p>来源工作：{origin?.title ?? "来源不可用"}</p>
              {origin ? (
                <Link
                  to={to("/tasks/" + origin.id)}
                  className="inline-flex items-center gap-2 text-primary"
                >
                  查看来源工作 <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : null}
            </>
          )}
        </div>
        <p className="mt-7 rounded-ui-control bg-surface-secondary p-4 text-xs leading-6 text-text-secondary">
          只读 Fixture。真实 Task/Artifact 详情、权限、执行、批准与交接另行实现。
        </p>
      </Card>
    </>
  );
}

function ComposerPreview({ to }: { to: PreviewLink }) {
  return (
    <>
      <PageHeading
        label="Delegation"
        title="交代工作"
        subtitle="先说清目标与边界，再决定交给谁做。"
      />
      <Card className="p-6 sm:p-8">
        <div className="grid gap-6 sm:grid-cols-2">
          {[
            ["01", "目标", "希望完成什么，怎样才算有结果"],
            ["02", "材料", "明确允许使用的上下文与附件"],
            ["03", "执行", "执行方、时机与可能的费用"],
            ["04", "边界", "工具权限、外部发送与必要确认"],
          ].map(([number, title, description]) => (
            <div key={number} className="border-b border-border pb-5">
              <span className="text-xs font-medium text-primary">{number}</span>
              <h2 className="mt-2 font-semibold text-text-primary">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
            </div>
          ))}
        </div>
        <p className="mt-7 rounded-ui-control bg-surface-secondary p-4 text-sm text-text-secondary">
          Composer 结构预览，未接通任务提交或执行服务。
        </p>
        <Link
          to={to("/")}
          className="mira-touch-target mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          <ArrowLeft size={16} aria-hidden="true" /> 返回首页
        </Link>
      </Card>
    </>
  );
}

export function WorkspaceShell() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const scenario = parsePreviewScenario(params.get("scenario"));
  const to: PreviewLink = (path) => path + (scenario === "active" ? "" : "?scenario=" + scenario);
  const changeScenario = (next: PreviewScenario) => {
    const updated = new URLSearchParams(params);
    if (next === "active") updated.delete("scenario");
    else updated.set("scenario", next);
    setParams(updated);
  };

  const topics = resolveShellTopics(location.pathname);
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
      id: "workspace",
      label: "工作",
      items: [
        {
          id: "all-work",
          label: "全部工作",
          to: to("/tasks"),
          icon: <Layers3 size={16} aria-hidden="true" />,
          end: true,
        },
      ],
    },
    {
      id: "recent",
      label: "最近",
      items: previewTasks.map((task) => ({
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
        <Link
          to={to("/")}
          className="workspace-brand-mark"
          aria-label="Mira Cloud"
          title="Mira Cloud"
        >
          M
        </Link>
      }
      railItems={railItems}
      sidebarTitle="工作"
      sidebarSubtitle="Personal Workspace"
      sidebarAction={
        <Link
          to={to("/new")}
          className="workspace-sidebar-create"
          aria-label="交代工作"
          title="交代工作"
        >
          <Plus size={16} aria-hidden="true" />
        </Link>
      }
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
          <Cloud size={16} aria-hidden="true" />
          <span className="truncate">工作 / 个人持续工作空间</span>
        </div>
      }
      topbarActions={<ThemeControls />}
      mobileHeader={mobileHeader}
      mobileNavigation={mobileNav}
    >
      <div className="mb-6 lg:hidden">
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
              <PageHeading
                label="System"
                title="连接诊断"
                subtitle="只检查真实基础服务，不代表账号登录和 Agent 执行。"
              />
              <ConnectionPanel />
              <Link
                to={to("/")}
                className="mira-touch-target mt-5 inline-flex gap-2 text-sm text-primary"
              >
                <ArrowLeft size={16} aria-hidden="true" /> 返回首页
              </Link>
            </>
          }
        />
        <Route
          path="*"
          element={
            <Card className="p-8">
              <CircleHelp size={26} className="mb-4 text-icon-secondary" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-text-primary">没有找到这个页面</h1>
              <Link to={to("/")} className="mt-4 inline-flex text-sm text-primary">
                返回首页
              </Link>
            </Card>
          }
        />
      </Routes>
    </WorkspaceShellFrame>
  );
}

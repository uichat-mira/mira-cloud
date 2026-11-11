import { useState } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
  Cloud,
  FileText,
  LayoutDashboard,
  Moon,
  Plus,
  Sun,
  WifiOff,
} from "lucide-react";
import { NavLink, Route, Routes } from "react-router";
import { themePresets, type ThemePresetId } from "../theme/upstream/palette";
import { presetIds, type Appearance } from "../theme/token-contract";
import { applyTheme, currentTheme } from "../theme/theme-preference";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { IconButton } from "../components/ui/icon-button";
import { FormField } from "../components/ui/form-field";
import { Input } from "../components/ui/input";
import { ConnectionPanel } from "../features/connection/connection-panel";

const nav = [
  { to: "/", label: "工作台", icon: LayoutDashboard, end: true },
  { to: "/tasks", label: "任务", icon: CalendarDays, end: false },
  { to: "/artifacts", label: "成果", icon: FileText, end: false },
] as const;

function ThemeControls() {
  const [theme, setTheme] = useState(currentTheme);
  function change(preset: ThemePresetId, appearance: Appearance) {
    const next = { preset, appearance };
    applyTheme(next);
    setTheme(next);
  }
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="外观偏好">
      <label className="sr-only" htmlFor="mira-theme-preset">
        主题预设
      </label>
      <select
        id="mira-theme-preset"
        className="mira-input max-w-[140px] text-sm"
        value={theme.preset}
        onChange={(event) => {
          if (presetIds.some((p) => p === event.target.value)) {
            change(event.target.value as ThemePresetId, theme.appearance);
          }
        }}
      >
        {presetIds.map((preset) => (
          <option key={preset} value={preset}>
            {themePresets[preset].label}
          </option>
        ))}
      </select>
      <IconButton
        variant="secondary"
        label={theme.appearance === "light" ? "切换深色模式" : "切换浅色模式"}
        icon={
          theme.appearance === "light" ? (
            <Moon aria-hidden="true" size={18} />
          ) : (
            <Sun aria-hidden="true" size={18} />
          )
        }
        onClick={() => change(theme.preset, theme.appearance === "light" ? "dark" : "light")}
      />
    </div>
  );
}

function MainWorkbench() {
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[.16em] text-mira-muted uppercase">
            Your cloud workspace
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-mira-ink md:text-4xl">
            早上好，欢迎来到 Mira Cloud
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-mira-muted">
            这里将连接你的任务、执行进度与成果。目前是可运行的界面底座，尚未绑定云端服务。
          </p>
        </div>
      </div>
      <div className="hero-grid">
        <Card className="p-6 md:p-8" aria-labelledby="begin-title">
          <div className="mb-7 flex items-center gap-3 text-mira-primary">
            <span className="rounded-xl bg-mira-soft p-3">
              <Cloud size={22} aria-hidden="true" />
            </span>
            <span className="text-xs font-semibold tracking-widest uppercase">Mira Cloud</span>
          </div>
          <h2
            id="begin-title"
            className="max-w-lg text-2xl leading-snug font-semibold text-mira-ink"
          >
            把每一个想法，变成可以持续推进的工作。
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-mira-muted">
            任务、运行、记忆与成果将在完成身份与执行服务接入后开放。现在不创建虚构的运行记录。
          </p>
          <Button className="mt-8" disabled aria-describedby="task-not-ready">
            <Plus size={16} aria-hidden="true" />
            创建云端任务
          </Button>
          <p className="mt-3 text-xs text-mira-muted" id="task-not-ready">
            等待 Cloud Auth 与 Cloud Pi 正式接入
          </p>
        </Card>
        <ConnectionPanel />
      </div>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <Card className="p-6" aria-labelledby="search-title">
          <h2 id="search-title" className="text-lg font-semibold text-mira-ink">
            寻找已完成的工作
          </h2>
          <p className="mt-2 mb-5 text-sm text-mira-muted">Artifact 索引尚未接入，搜索暂不可用。</p>
          <FormField id="artifact-search" label="成果搜索" description="等待真实成果库接入">
            <Input id="artifact-search" placeholder="搜索报告、文件或来源" disabled />
          </FormField>
        </Card>
        <Card className="p-6" aria-labelledby="next-title">
          <h2 id="next-title" className="text-lg font-semibold text-mira-ink">
            接下来
          </h2>
          <p className="mt-2 text-sm text-mira-muted">这是一份工程状态说明，不是虚构的任务动态。</p>
          <div className="mt-6 flex items-start gap-3 text-sm">
            <CircleHelp aria-hidden="true" size={18} className="mt-1 shrink-0 text-mira-primary" />
            <span className="leading-6">
              工作台现已真实检查 Hono API 和 PostgreSQL；用户授权及任务链路仍未接入。
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}

function NotConnected({ title }: { title: string }) {
  return (
    <Card className="p-8" aria-labelledby="not-connected-title">
      <div className="mb-4 text-mira-muted">
        <WifiOff size={28} aria-hidden="true" />
      </div>
      <h1 id="not-connected-title" className="text-2xl font-semibold text-mira-ink">
        {title}暂不可用
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-mira-muted">
        当前没有真实的 Cloud Auth 会话或 Cloud Pi 任务数据。此处不会展示演示结果冒充实际执行。
      </p>
    </Card>
  );
}

export function WorkspaceShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Mira Cloud 导航">
        <NavLink to="/" className="flex shrink-0 items-center gap-3 no-underline text-mira-ink">
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-mira-action text-lg font-bold text-mira-on-primary">
            M
          </span>
          <span className="mobile-hide text-base font-semibold">Mira Cloud</span>
        </NavLink>
        <nav className="flex min-w-0 flex-1 flex-col gap-1" aria-label="主导航">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink to={to} end={end} key={to} className="nav-link">
              <Icon aria-hidden="true" size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mobile-hide mt-auto px-3 text-xs leading-6 text-mira-muted">
          Mira Cloud · 初始工作台
          <br />
          工程预览 · 未连接服务
        </p>
      </aside>
      <main className="page-content" id="main-content">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-mira-border pb-5">
          <div className="flex items-center gap-2 text-sm text-mira-muted">
            <Cloud size={17} aria-hidden="true" />
            工作空间 <ArrowUpRight size={14} aria-hidden="true" />
          </div>
          <ThemeControls />
        </div>
        <Routes>
          <Route path="/" element={<MainWorkbench />} />
          <Route path="/tasks" element={<NotConnected title="任务" />} />
          <Route path="/artifacts" element={<NotConnected title="成果" />} />
          <Route path="*" element={<NotConnected title="页面" />} />
        </Routes>
      </main>
    </div>
  );
}

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { resolveWorkspaceTabsWindow } from "../src/components/mira-design/index.ts";
import { WorkspaceShell } from "../src/pages/workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-mira-color-theme");
  document.documentElement.removeAttribute("data-mira-theme-mode");
  document.documentElement.classList.remove("dark");
  localStorage.clear();
});

function renderWorkspace(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceShell />
    </MemoryRouter>,
  );
}

describe("AGT-054 Work workspace migration", () => {
  it("keeps durable business workspaces in the rail and Work objects in the sidebar", () => {
    renderWorkspace("/tasks");

    const globalRail = screen.getByRole("navigation", { name: "业务工作台" });
    expect(within(globalRail).getByRole("link", { name: "工作" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(globalRail).queryByRole("link", { name: "待处理" })).toBeNull();
    expect(within(globalRail).queryByRole("link", { name: "成果" })).toBeNull();

    const allWork = screen.getByRole("complementary", { name: "当前业务" });
    expect(within(allWork).getByRole("link", { name: "全部工作" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(allWork).getByRole("link", { name: /东南亚市场进入研究/ })).toBeInTheDocument();
    expect(within(allWork).getByRole("link", { name: /新品牌定位与故事/ })).toBeInTheDocument();
    expect(within(allWork).getByRole("button", { name: "交代工作" })).toBeInTheDocument();
  });

  it("opens the Composer as a modal without leaving the current Task route", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    renderWorkspace("/tasks/market-research");

    const workSidebar = screen.getByRole("complementary", { name: "当前业务" });
    const trigger = within(workSidebar).getByRole("button", { name: "交代工作" });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "交代工作" });
    expect(within(dialog).getByText("先说清目标与边界，再决定交给谁做。")).toBeInTheDocument();
    expect(
      within(dialog).getByText("未接通任务提交或执行服务", { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "东南亚市场进入研究" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "概览" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: "提交委托" })).toBeNull();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "交代工作" })).not.toBeInTheDocument(),
    );

    expect(trigger).toHaveFocus();
    expect(
      screen.getByRole("heading", { level: 1, name: "东南亚市场进入研究" }),
    ).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps Home and Artifact context when the Composer modal closes", async () => {
    const user = userEvent.setup();
    const homeView = renderWorkspace("/");
    const homeHeader = screen.getByRole("heading", { name: "工作台" }).closest("header");
    expect(homeHeader).not.toBeNull();
    await user.click(within(homeHeader as HTMLElement).getByRole("button", { name: "交代工作" }));
    await screen.findByRole("dialog", { name: "交代工作" });
    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "交代工作" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { level: 1, name: "工作台" })).toBeInTheDocument();
    homeView.unmount();

    renderWorkspace("/artifacts/market-note");
    await user.click(
      within(document.getElementById("main-content") as HTMLElement).getByRole("button", {
        name: "交代工作",
      }),
    );
    await screen.findByRole("dialog", { name: "交代工作" });
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "交代工作" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { level: 1, name: "市场机会研究摘要" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "预览" })).toHaveAttribute("aria-selected", "true");
  });

  it("maps the legacy /new entry to the Composer modal instead of a page", async () => {
    const user = userEvent.setup();
    renderWorkspace("/new");

    expect(await screen.findByRole("dialog", { name: "交代工作" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "工作台" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /返回工作台/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "交代工作" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("heading", { level: 1, name: "工作台" })).toBeInTheDocument();
  });

  it("moves the mobile create action out of the workspace header into Work content", () => {
    renderWorkspace("/tasks/market-research");

    const mobileHeader = document.querySelector('[data-workspace-region="mobile-header"]');
    expect(mobileHeader).not.toBeNull();
    expect(
      within(mobileHeader as HTMLElement).queryByRole("button", { name: "交代工作" }),
    ).toBeNull();
    expect(
      within(mobileHeader as HTMLElement).queryByRole("link", { name: "交代工作" }),
    ).toBeNull();
    expect(mobileHeader?.querySelector(".workspace-mobile-create")).toBeNull();

    const main = document.getElementById("main-content");
    expect(main).not.toBeNull();
    expect(
      within(main as HTMLElement).getByRole("button", { name: "交代工作" }),
    ).toBeInTheDocument();
  });

  it("uses the canonical Mira logo on desktop and mobile shell surfaces", () => {
    renderWorkspace();

    const logos = Array.from(
      document.querySelectorAll<HTMLImageElement>(
        'img[src="https://assets.tomz.io/images/mira-logo.png"]',
      ),
    );
    expect(logos).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Mira Cloud" })).toContainElement(logos[0] ?? null);
    expect(screen.getByRole("button", { name: "切换业务工作台" })).toContainElement(
      logos[1] ?? null,
    );
  });

  it("moves visual preferences from the Topbar into Settings General and persists changes", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.queryByLabelText("外观偏好")).toBeNull();
    const workSidebar = screen.getByRole("complementary", { name: "当前业务" });
    await user.click(within(workSidebar).getByRole("link", { name: "设置" }));

    expect(screen.getByRole("heading", { level: 1, name: "通用" })).toBeInTheDocument();
    const settingsSidebar = screen.getByRole("complementary", { name: "当前业务" });
    expect(within(settingsSidebar).getByText("设置")).toBeInTheDocument();
    expect(within(settingsSidebar).getByRole("link", { name: "通用" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    const themePreset = screen.getByRole("combobox", { name: "主题预设" });
    await user.click(themePreset);
    await user.click(await screen.findByRole("option", { name: "海石灰蓝" }));

    expect(document.documentElement.dataset["miraColorTheme"]).toBe("slate-ocean");
    expect(JSON.parse(localStorage.getItem("mira-cloud-theme-v1") ?? "null")).toMatchObject({
      preset: "slate-ocean",
    });

    await user.click(screen.getByRole("switch", { name: "深色模式" }));
    expect(document.documentElement.dataset["miraThemeMode"]).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("renders Home as a continuous work stack plus Attention queue without fetching APIs", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    renderWorkspace();

    const main = document.getElementById("main-content");
    expect(main).not.toBeNull();
    expect(
      within(main as HTMLElement).getByRole("heading", { name: "工作台" }),
    ).toBeInTheDocument();
    const workZone = within(main as HTMLElement).getByRole("region", { name: "正在推进" });
    const attentionZone = within(main as HTMLElement).getByRole("complementary", {
      name: "等你决定",
    });
    expect(within(workZone).getByRole("link", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(within(workZone).getByRole("link", { name: "新品牌定位与故事" })).toBeInTheDocument();
    expect(
      within(attentionZone).getByRole("link", { name: /研究摘要，等待你的确认/ }),
    ).toBeInTheDocument();
    expect(within(workZone).getByRole("region", { name: "最近成果" })).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps overview, Attention and Artifacts as topic views instead of global destinations", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole("tab", { name: "待处理" }));
    expect(screen.getByRole("heading", { name: "待处理" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "待处理列表" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "成果" }));
    expect(screen.getByRole("heading", { name: "成果" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "成果列表" })).toBeInTheDocument();
  });

  it("keeps the Shell stable while Task Detail tells a continuous-work story", async () => {
    const user = userEvent.setup();
    renderWorkspace("/tasks/market-research");

    expect(screen.getByRole("heading", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "业务工作台" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "当前业务" })).toBeInTheDocument();

    expect(screen.getAllByRole("tab")).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "概览" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "待处理" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "运行" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "历史" })).toBeNull();

    const now = screen.getByRole("region", { name: "当前状态与下一步" });
    expect(within(now).getAllByText("正在进行")).toHaveLength(2);
    expect(within(now).getByText("查看工作进展")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "需要你处理" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "近期进展" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "相关成果" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "市场机会研究摘要" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "进展" }));
    expect(screen.getByRole("region", { name: "东南亚市场进入研究 的进展" })).toBeInTheDocument();
    const executionDetails = screen.getByRole("button", { name: "查看执行详情（2 次）" });
    expect(executionDetails).toHaveAttribute("aria-expanded", "false");
    await user.click(executionDetails);
    expect(screen.getByRole("button", { name: "收起执行详情" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("R04")).toBeInTheDocument();
    expect(screen.getByText("本次执行完成")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "成果" }));
    const artifactRegion = screen.getByRole("region", { name: "东南亚市场进入研究 的成果" });
    expect(
      within(artifactRegion).getByRole("link", { name: /市场机会研究摘要/ }),
    ).toBeInTheDocument();
  });

  it("does not manufacture Attention or Artifact sections when a Task has none", () => {
    renderWorkspace("/tasks/research-followup");

    expect(screen.getByRole("tab", { name: "概览" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "当前状态与下一步" })).toHaveTextContent(
      "已交代 · 等待开始",
    );
    expect(screen.queryByRole("region", { name: "需要你处理" })).toBeNull();
    expect(screen.queryByRole("region", { name: "相关成果" })).toBeNull();
    expect(screen.getByRole("region", { name: "近期进展" })).toHaveTextContent(
      "工作请求已接收，尚未观察到执行开始",
    );
  });

  it("maps legacy Task view links into the smaller narrative without blank states", () => {
    const runsView = renderWorkspace("/tasks/market-research?view=runs");
    expect(screen.getByRole("tab", { name: "进展" })).toHaveAttribute("aria-selected", "true");
    runsView.unmount();

    const historyView = renderWorkspace("/tasks/market-research?view=history");
    expect(screen.getByRole("tab", { name: "进展" })).toHaveAttribute("aria-selected", "true");
    historyView.unmount();

    renderWorkspace("/tasks/market-research?view=attention");
    expect(screen.getByRole("tab", { name: "概览" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "需要你处理" })).toBeInTheDocument();
  });

  it("gives an Artifact stable preview, source and version topic views", async () => {
    const user = userEvent.setup();
    renderWorkspace("/artifacts/market-note");

    expect(screen.getByRole("heading", { level: 1, name: "市场机会研究摘要" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "预览" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "成果预览" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "来源" }));
    const source = screen.getByRole("region", { name: "成果来源" });
    expect(within(source).getByRole("link", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(within(source).getByText(/R04/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "版本" }));
    expect(screen.getByRole("region", { name: "成果版本" })).toBeInTheDocument();
    expect(screen.getByText("当前示例版本")).toBeInTheDocument();
  });

  it("keeps empty and unavailable fixture states distinct from real absence", () => {
    renderWorkspace("/?scenario=empty");
    expect(screen.getByRole("heading", { name: "从第一件工作开始" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "等你决定" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "数据不可用" }));
    expect(screen.getByRole("heading", { name: "工作数据暂时无法更新" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "从第一件工作开始" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "工作进行中" }));
    expect(screen.getByRole("heading", { name: "工作台" })).toBeInTheDocument();
  });

  it("replaces the legacy mobile bottom navigation with an explicit workspace drawer", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.queryByRole("navigation", { name: "手机主导航" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "切换业务工作台" }));

    const drawer = await screen.findByRole("navigation", { name: "移动业务工作台" });
    expect(within(drawer).getByRole("link", { name: /工作/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(drawer).getByRole("button", { name: "知识（尚未开放）" })).toBeDisabled();
    const workspaceCloseButtons = screen.getAllByRole("button", { name: "关闭工作台导航" });
    expect(workspaceCloseButtons).toHaveLength(2);
    expect(workspaceCloseButtons.some((button) => button.closest("aside") !== null)).toBe(true);
  });

  it("opens current Work objects in a separate mobile drawer and preserves route context", async () => {
    const user = userEvent.setup();
    renderWorkspace("/tasks/market-research?view=runs");

    const objectTrigger = screen.getByRole("button", { name: "切换工作对象" });
    expect(objectTrigger).toHaveTextContent("东南亚市场进入研究");
    expect(screen.getByRole("tab", { name: "进展" })).toHaveAttribute("aria-selected", "true");

    await user.click(objectTrigger);
    const objectCloseButtons = await screen.findAllByRole("button", { name: "关闭工作对象导航" });
    const objectDrawer = objectCloseButtons
      .find((button) => button.closest("aside"))
      ?.closest("aside");
    expect(objectDrawer).not.toBeNull();
    const pinned = within(objectDrawer as HTMLElement).getByRole("navigation", { name: "置顶" });
    await user.click(within(pinned).getByRole("link", { name: /新品牌定位与故事/ }));

    expect(screen.getByRole("heading", { name: "新品牌定位与故事" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "概览" })).toHaveAttribute("aria-selected", "true");
  });

  it.each([360, 390, 430, 600, 820])(
    "keeps the selected topic reachable without horizontal navigation at %ipx",
    (viewportWidth) => {
      const availableWidth = viewportWidth - 32;
      const tabWidths = [92, 92, 92, 92, 92];
      const window = resolveWorkspaceTabsWindow({
        availableWidth,
        tabWidths,
        selectedIndex: 4,
      });

      expect(window.start).toBeLessThanOrEqual(4);
      expect(window.end).toBeGreaterThan(4);
      const fullWidth =
        tabWidths.reduce((total, width) => total + width, 0) + (tabWidths.length - 1) * 2;
      expect(window.hasOverflow).toBe(fullWidth > availableWidth);
    },
  );
});

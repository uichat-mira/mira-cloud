// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

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
    expect(screen.queryByRole("tab")).toBeNull();
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
    const homeTrigger = within(homeHeader as HTMLElement).getByRole("button", {
      name: "交代工作",
    });
    await user.click(homeTrigger);
    await screen.findByRole("dialog", { name: "交代工作" });
    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "交代工作" })).not.toBeInTheDocument(),
    );
    expect(homeTrigger).toHaveFocus();
    expect(screen.getByRole("heading", { level: 1, name: "工作台" })).toBeInTheDocument();
    homeView.unmount();

    renderWorkspace("/artifacts/market-note");
    const artifactTrigger = within(
      document.getElementById("main-content") as HTMLElement,
    ).getByRole("button", { name: "交代工作" });
    await user.click(artifactTrigger);
    await screen.findByRole("dialog", { name: "交代工作" });
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "交代工作" })).not.toBeInTheDocument(),
    );
    expect(artifactTrigger).toHaveFocus();
    expect(screen.getByRole("heading", { level: 1, name: "市场机会研究摘要" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
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
    expect(
      attentionZone.compareDocumentPosition(workZone) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("有 2 件事需要你处理，3 件工作在手边。")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reaches Work pages through the business sidebar without a Shell topic bar", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const sidebar = screen.getByRole("complementary", { name: "当前业务" });
    expect(document.querySelector('[data-workspace-region="topicbar"]')).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();

    await user.click(within(sidebar).getByRole("link", { name: "待处理" }));
    expect(screen.getByRole("heading", { name: "待处理" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "待处理列表" })).toBeInTheDocument();

    await user.click(within(sidebar).getByRole("link", { name: "成果" }));
    expect(screen.getByRole("heading", { name: "成果" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "成果列表" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("keeps the Shell stable while Task Detail tells a continuous-work story", async () => {
    const user = userEvent.setup();
    renderWorkspace("/tasks/market-research");

    expect(screen.getByRole("heading", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "业务工作台" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "当前业务" })).toBeInTheDocument();

    expect(screen.queryByRole("tab")).toBeNull();
    expect(document.querySelector(".workspace-topicbar")).toBeNull();

    const now = screen.getByRole("region", { name: "当前状态与下一步" });
    expect(within(now).getAllByText("正在进行")).toHaveLength(2);
    expect(within(now).getByText("继续核对重点市场的准入条件与资料来源")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "需要你处理" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "近期进展" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "相关成果" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "市场机会研究摘要" })).toBeInTheDocument();

    await user.click(
      within(screen.getByRole("region", { name: "近期进展" })).getByRole("link", {
        name: "查看全部",
      }),
    );
    expect(screen.getByRole("region", { name: "东南亚市场进入研究 的进展" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回工作概览" })).toBeInTheDocument();
    const executionDetails = screen.getByRole("button", { name: "查看执行详情（2 次）" });
    expect(executionDetails).toHaveAttribute("aria-expanded", "false");
    await user.click(executionDetails);
    expect(screen.getByRole("button", { name: "收起执行详情" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByText("R04")).toBeInTheDocument();
    expect(screen.getByText("本次执行完成")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "返回工作概览" }));
    await user.click(
      within(screen.getByRole("region", { name: "相关成果" })).getByRole("link", {
        name: "全部成果",
      }),
    );
    const artifactRegion = screen.getByRole("region", { name: "东南亚市场进入研究 的成果" });
    expect(
      within(artifactRegion).getByRole("link", { name: /市场机会研究摘要/ }),
    ).toBeInTheDocument();
  });

  it("does not manufacture Attention or Artifact sections when a Task has none", () => {
    renderWorkspace("/tasks/research-followup");

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("region", { name: "当前状态与下一步" })).toHaveTextContent(
      "已交代 · 等待开始",
    );
    expect(screen.queryByRole("region", { name: "需要你处理" })).toBeNull();
    expect(screen.queryByRole("region", { name: "相关成果" })).toBeNull();
    expect(screen.getByRole("region", { name: "近期进展" })).toHaveTextContent(
      "工作请求已接收，尚未观察到执行开始",
    );
  });

  it("preserves legacy Task deep links as content journeys without Shell tabs", async () => {
    const runsView = renderWorkspace("/tasks/market-research?view=runs");
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("region", { name: "东南亚市场进入研究 的进展" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回工作概览" })).toBeInTheDocument();
    runsView.unmount();

    const historyView = renderWorkspace("/tasks/market-research?view=history");
    expect(screen.getByRole("region", { name: "东南亚市场进入研究 的进展" })).toBeInTheDocument();
    historyView.unmount();

    renderWorkspace("/tasks/market-research?view=attention");
    expect(screen.getByRole("region", { name: "需要你处理" })).toBeInTheDocument();
  });

  it("keeps Artifact preview, source and version journeys reachable through content links", async () => {
    const user = userEvent.setup();
    renderWorkspace("/artifacts/market-note");

    expect(screen.getByRole("heading", { level: 1, name: "市场机会研究摘要" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
    const preview = screen.getByRole("region", { name: "成果预览" });
    await user.click(within(preview).getByRole("link", { name: "查看来源信息" }));

    const source = screen.getByRole("region", { name: "成果来源" });
    expect(within(source).getByRole("link", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(within(source).getByText(/R04/)).toBeInTheDocument();
    await user.click(within(source).getByRole("link", { name: /查看版本记录/ }));
    expect(screen.getByRole("region", { name: "成果版本" })).toBeInTheDocument();
    expect(screen.getByText("当前示例版本")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "返回成果预览" }));
    expect(screen.getByRole("region", { name: "成果预览" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("keeps empty and unavailable fixture states distinct from real absence", async () => {
    const user = userEvent.setup();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    renderWorkspace("/?scenario=empty");
    expect(screen.getByRole("heading", { name: "从第一件工作开始" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "等你决定" })).toBeNull();
    expect(screen.getByText("还没有交代过工作，从第一件开始。")).toBeInTheDocument();
    const sidebar = screen.getByRole("complementary", { name: "当前业务" });
    expect(within(sidebar).queryByRole("link", { name: /东南亚市场进入研究/ })).toBeNull();
    expect(within(sidebar).queryByRole("link", { name: /新品牌定位与故事/ })).toBeNull();

    expect(screen.queryByRole("group", { name: "选择原型情境" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "原型调试（拖动移动位置）" }));
    const debugMenu = await screen.findByRole("group", { name: "选择原型情境" });
    await user.click(within(debugMenu).getByRole("button", { name: "数据不可用" }));
    expect(screen.getByRole("heading", { name: "工作数据暂时无法更新" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "从第一件工作开始" })).toBeNull();
    expect(screen.getByText("工作数据暂时不可用，无法确认当前任务。")).toBeInTheDocument();
    expect(within(sidebar).queryByRole("link", { name: /东南亚市场进入研究/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "原型调试（拖动移动位置）" }));
    await user.click(await screen.findByRole("button", { name: "工作进行中" }));
    expect(screen.getByRole("heading", { name: "工作台" })).toBeInTheDocument();
    expect(within(sidebar).getByRole("link", { name: /东南亚市场进入研究/ })).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("opens a contextual lazy debug menu only on Work preview routes", async () => {
    const user = userEvent.setup();
    const work = renderWorkspace("/tasks/market-research");
    const launcher = screen.getByRole("button", { name: "原型调试（拖动移动位置）" });
    expect(launcher).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("group", { name: "选择原型情境" })).toBeNull();
    expect(document.querySelector(".workbench-fixture-bar")).toBeNull();

    await user.click(launcher);
    expect(await screen.findByRole("group", { name: "选择原型情境" })).toBeInTheDocument();
    expect(launcher).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("group", { name: "选择原型情境" })).toBeNull());
    expect(launcher).toHaveFocus();
    work.unmount();

    renderWorkspace("/settings/general");
    expect(screen.queryByRole("button", { name: "原型调试（拖动移动位置）" })).toBeNull();
  });

  it("drags the debug ball without opening its menu, and supports keyboard repositioning", async () => {
    const user = userEvent.setup();
    renderWorkspace("/");
    const launcher = screen.getByRole("button", { name: "原型调试（拖动移动位置）" });
    const rect = {
      x: 800,
      y: 600,
      left: 800,
      top: 600,
      width: 48,
      height: 48,
      right: 848,
      bottom: 648,
      toJSON: () => ({}),
    };
    vi.spyOn(launcher, "getBoundingClientRect").mockReturnValue(rect);

    fireEvent.pointerDown(launcher, { pointerId: 1, button: 0, clientX: 810, clientY: 610 });
    fireEvent.pointerMove(launcher, { pointerId: 1, clientX: 690, clientY: 530 });
    fireEvent.pointerUp(launcher, { pointerId: 1, clientX: 690, clientY: 530 });
    fireEvent.click(launcher);
    expect(launcher).toHaveAttribute("aria-expanded", "false");
    const floating = launcher.closest(".preview-debug-float");
    expect(floating).toHaveAttribute("data-placed", "true");
    expect(floating?.getAttribute("style")).toContain("safe-area-inset-left");
    expect(floating?.getAttribute("style")).toContain("safe-area-inset-right");
    expect(floating?.getAttribute("style")).toContain("safe-area-inset-top");
    expect(floating?.getAttribute("style")).toContain("safe-area-inset-bottom");

    launcher.focus();
    fireEvent.keyDown(launcher, { key: "ArrowLeft" });
    expect(launcher.closest(".preview-debug-float")).toHaveAttribute("data-placed", "true");

    await user.click(launcher);
    expect(await screen.findByRole("group", { name: "选择原型情境" })).toBeInTheDocument();
  });

  it("does not show stale demo object data on empty or unavailable deep links", () => {
    const empty = renderWorkspace("/tasks/brand-direction?scenario=empty");
    expect(screen.getByRole("heading", { name: "这个情境还没有工作" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "工作数据暂时无法更新" })).toBeNull();
    expect(screen.queryByText("新品牌定位与故事")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(document.querySelector(".workspace-topicbar")).toBeNull();
    empty.unmount();

    renderWorkspace("/tasks/brand-direction?scenario=unavailable");
    expect(screen.getByRole("heading", { name: "工作数据暂时无法更新" })).toBeInTheDocument();
    expect(screen.queryByText("新品牌定位与故事")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(document.querySelector(".workspace-topicbar")).toBeNull();
  });

  it("labels waiting-for-input work honestly instead of implying it can proceed", () => {
    renderWorkspace("/tasks/brand-direction");
    const now = screen.getByRole("region", { name: "当前状态与下一步" });
    expect(now).toHaveTextContent("等待补充材料");
    expect(now).toHaveTextContent("补充目标受众参考资料后继续");
    expect(now).not.toHaveTextContent("可继续");
  });

  it("opens the workspace switcher from the left without mixing in Work tasks", async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.queryByRole("navigation", { name: "手机主导航" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "切换业务工作台" }));

    const drawer = await screen.findByRole("navigation", { name: "移动业务工作台" });
    const panel = drawer.closest("aside");
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("data-side", "left");
    expect(within(drawer).getByRole("link", { name: /工作/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(drawer).getByRole("button", { name: "知识（尚未开放）" })).toBeDisabled();
    expect(within(drawer).queryByRole("link", { name: "东南亚市场进入研究" })).toBeNull();

    const workspaceCloseButtons = screen.getAllByRole("button", { name: "关闭工作台导航" });
    expect(workspaceCloseButtons).toHaveLength(2);
    expect(workspaceCloseButtons.some((button) => button.closest("aside") !== null)).toBe(true);
  });

  it("nests each Work task once under one collapsible mobile project group", async () => {
    const user = userEvent.setup();
    renderWorkspace("/tasks/market-research?view=runs");

    const objectTrigger = screen.getByRole("button", { name: "切换工作对象" });
    expect(objectTrigger).toHaveTextContent("东南亚市场进入研究");
    expect(screen.getByRole("region", { name: "东南亚市场进入研究 的进展" })).toBeInTheDocument();

    await user.click(objectTrigger);
    const objectCloseButtons = await screen.findAllByRole("button", { name: "关闭工作对象导航" });
    const objectDrawer = objectCloseButtons
      .find((button) => button.closest("aside"))
      ?.closest("aside");
    expect(objectDrawer).not.toBeNull();
    expect(objectDrawer).toHaveAttribute("data-side", "left");

    const workNavigation = within(objectDrawer as HTMLElement).getByRole("navigation", {
      name: "工作",
    });
    expect(within(workNavigation).getByRole("button", { name: "交代工作" })).toBeInTheDocument();
    expect(within(workNavigation).getByRole("link", { name: "全部工作" })).toBeInTheDocument();

    const projects = within(objectDrawer as HTMLElement).getByRole("button", { name: /项目/ });
    expect(projects).toHaveAttribute("aria-expanded", "false");
    expect(within(objectDrawer as HTMLElement).queryByRole("button", { name: /置顶/ })).toBeNull();
    expect(within(objectDrawer as HTMLElement).queryByRole("button", { name: /最近/ })).toBeNull();
    expect(
      within(objectDrawer as HTMLElement).queryByRole("link", { name: "新品牌定位与故事" }),
    ).toBeNull();

    await user.click(projects);
    expect(projects).toHaveAttribute("aria-expanded", "true");
    const projectNavigation = within(objectDrawer as HTMLElement).getByRole("navigation", {
      name: "项目",
    });
    expect(within(projectNavigation).getAllByRole("link")).toHaveLength(3);
    expect(
      within(projectNavigation).getByRole("link", { name: /东南亚市场进入研究/ }),
    ).toHaveTextContent("置顶");
    expect(
      within(projectNavigation).getByRole("link", { name: /新品牌定位与故事/ }),
    ).toHaveTextContent("待补充");
    await user.click(within(projectNavigation).getByRole("link", { name: /新品牌定位与故事/ }));

    expect(screen.getByRole("heading", { name: "新品牌定位与故事" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it.each([
    "/",
    "/attention",
    "/tasks",
    "/artifacts",
    "/tasks/market-research",
    "/artifacts/market-note",
    "/settings/general",
    "/diagnostics",
  ])("keeps route %s free of the extra Shell tab layer", (path) => {
    renderWorkspace(path);
    expect(document.querySelector('[data-workspace-region="topicbar"]')).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(document.getElementById("main-content")).not.toBeNull();
  });
});

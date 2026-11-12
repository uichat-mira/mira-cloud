// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";

import { WorkspaceShell } from "../src/pages/workspace";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
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

    const allWork = screen.getByRole("navigation", { name: "当前业务" });
    expect(within(allWork).getByRole("link", { name: "全部工作" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(allWork).getByRole("link", { name: /东南亚市场进入研究/ })).toBeInTheDocument();
    expect(within(allWork).getByRole("link", { name: /新品牌定位与故事/ })).toBeInTheDocument();
    expect(within(allWork).getByRole("link", { name: "交代工作" })).toBeInTheDocument();
  });

  it("renders Home as a continuous work stack plus Attention queue without fetching APIs", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    renderWorkspace();

    const main = document.getElementById("main-content");
    expect(main).not.toBeNull();
    expect(within(main as HTMLElement).getByRole("heading", { name: "工作台" })).toBeInTheDocument();
    const workZone = within(main as HTMLElement).getByRole("region", { name: "正在推进" });
    const attentionZone = within(main as HTMLElement).getByRole("complementary", {
      name: "等你决定",
    });
    expect(within(workZone).getByRole("link", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(within(workZone).getByRole("link", { name: "新品牌定位与故事" })).toBeInTheDocument();
    expect(within(attentionZone).getByRole("link", { name: /研究摘要，等待你的确认/ })).toBeInTheDocument();
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

  it("keeps the Shell stable while a Task owns overview, Attention, runs, artifacts and history tabs", async () => {
    const user = userEvent.setup();
    renderWorkspace("/tasks/market-research");

    expect(screen.getByRole("heading", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "业务工作台" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "当前业务" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: "概览" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "运行" }));
    expect(screen.getByRole("region", { name: "东南亚市场进入研究 的运行" })).toBeInTheDocument();
    expect(screen.getByText("R04")).toBeInTheDocument();
    expect(screen.getByText("已交代 · 等待开始")).not.toBeInTheDocument();
    expect(screen.getByText("本次执行完成")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "成果" }));
    const artifactRegion = screen.getByRole("region", { name: "东南亚市场进入研究 的成果" });
    expect(within(artifactRegion).getByRole("link", { name: /市场机会研究摘要/ })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "历史" }));
    expect(screen.getByRole("region", { name: "东南亚市场进入研究 的历史" })).toBeInTheDocument();
  });

  it("gives an Artifact stable preview, source and version topic views", async () => {
    const user = userEvent.setup();
    renderWorkspace("/artifacts/market-note");

    expect(screen.getByRole("heading", { name: "市场机会研究摘要" })).toBeInTheDocument();
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

  it("retains the temporary mobile navigation only until AGT-055 replaces the collapse model", () => {
    renderWorkspace();
    expect(screen.getByRole("navigation", { name: "手机主导航" })).toBeInTheDocument();
  });
});

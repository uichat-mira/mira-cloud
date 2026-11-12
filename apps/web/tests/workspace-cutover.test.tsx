// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

describe("AGT-053 workspace shell foundation", () => {
  it("separates global workspaces, business sidebar, topic tabs and content canvas", () => {
    renderWorkspace("/tasks");

    const globalRail = screen.getByRole("navigation", { name: "业务工作台" });
    expect(within(globalRail).getByRole("link", { name: "工作" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(globalRail).getByRole("button", { name: "知识（尚未开放）" })).toBeDisabled();
    expect(
      within(globalRail).getByRole("button", { name: "自动化（尚未开放）" }),
    ).toBeDisabled();
    expect(within(globalRail).getByRole("button", { name: "连接（尚未开放）" })).toBeDisabled();

    const workSidebar = screen.getByRole("navigation", { name: "工作" });
    expect(within(workSidebar).getByRole("link", { name: "全部工作" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("tab", { name: "全部工作" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("heading", { name: "我的工作" })).toBeInTheDocument();
    expect(document.getElementById("main-content")).not.toBeNull();
  });

  it("keeps work overview views in topic tabs rather than the global rail", () => {
    renderWorkspace();

    const globalRail = screen.getByRole("navigation", { name: "业务工作台" });
    expect(within(globalRail).queryByRole("link", { name: "待处理" })).toBeNull();
    expect(within(globalRail).queryByRole("link", { name: "成果" })).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: "待处理" }));
    expect(screen.getByRole("heading", { name: "待处理" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "成果" }));
    expect(screen.getByRole("heading", { name: "成果" })).toBeInTheDocument();
  });

  it("puts actionable Attention before Task continuity and artifacts without fetching APIs", () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    renderWorkspace();
    const main = document.getElementById("main-content");
    expect(main).not.toBeNull();
    const headings = within(main as HTMLElement)
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual(["需要你处理", "接着做", "最近成果"]);
    expect(screen.getAllByText(/Fixture/).length).toBeGreaterThan(0);
    expect(within(main as HTMLElement).getAllByText("东南亚市场进入研究")).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: /交代工作/ }).length).toBeGreaterThan(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("switches among new-user, normal and unknown states without treating unknown as empty", () => {
    renderWorkspace("/?scenario=empty");
    expect(screen.getByRole("heading", { name: "从第一件工作开始" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "需要你处理" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "数据不可用" }));
    expect(screen.getByRole("heading", { name: "工作数据暂时无法更新" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "从第一件工作开始" })).toBeNull();
    expect(screen.getByRole("link", { name: /查看连接诊断/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "工作进行中" }));
    expect(screen.getByRole("heading", { name: "需要你处理" })).toBeInTheDocument();
  });

  it("keeps the shell stable while opening Task and Artifact fixture detail", () => {
    renderWorkspace();

    fireEvent.click(screen.getAllByRole("link", { name: /研究摘要，等待你的确认/ })[0]!);
    expect(screen.getByRole("heading", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "工作详情" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("navigation", { name: "业务工作台" })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("link", { name: "Mira Cloud" })[0]!);
    fireEvent.click(screen.getByRole("tab", { name: "成果" }));
    fireEvent.click(screen.getByRole("link", { name: /市场机会研究摘要/ }));

    expect(screen.getByRole("heading", { name: "市场机会研究摘要" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "成果详情" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("link", { name: "查看来源工作" })).toBeInTheDocument();
  });

  it("retains the temporary mobile fallback until the dedicated responsive card", () => {
    renderWorkspace();
    expect(screen.getByRole("navigation", { name: "手机主导航" })).toBeInTheDocument();
  });
});

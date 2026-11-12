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

describe("AGT-052 personal workspace preview", () => {
  it("preserves four top-level routes, with shared MiraDesign navigation", () => {
    renderWorkspace("/tasks");
    const nav = screen.getByRole("navigation", { name: "桌面主导航" });
    expect(within(nav).getByRole("link", { name: "我的工作" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "首页" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", { name: "我的工作" })).toBeInTheDocument();
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
    expect(screen.getByRole("navigation", { name: "手机主导航" })).toBeInTheDocument();
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
    expect(screen.getAllByText("东南亚市场进入研究")).toHaveLength(1);
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

  it("navigates from a work card and an Artifact to read-only contextual detail", () => {
    renderWorkspace();
    fireEvent.click(screen.getAllByRole("link", { name: /研究摘要，等待你的确认/ })[0]!);
    expect(screen.getByRole("heading", { name: "东南亚市场进入研究" })).toBeInTheDocument();
    expect(screen.getByText(/本页不会开始执行或批准/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "返回我的工作" }));
    expect(screen.getByRole("heading", { name: "我的工作" })).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "桌面主导航" })).getByRole("link", {
        name: "成果",
      }),
    );
    expect(screen.getByRole("heading", { name: "成果" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: /市场机会研究摘要/ }));
    expect(screen.getByRole("heading", { name: "市场机会研究摘要" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "查看来源工作" })).toBeInTheDocument();
  });
});

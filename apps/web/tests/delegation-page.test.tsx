// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import DelegationPage from "../src/features/work/delegation-page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPage() {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const view = render(
    <MemoryRouter initialEntries={["/new"]}>
      <DelegationPage />
    </MemoryRouter>,
  );
  return { ...view, fetcher };
}

describe("delegation Intelligent UI fixture / json-render integration", () => {
  it("renders actual catalog components and three distinct task scenarios", async () => {
    const user = userEvent.setup();
    const { fetcher } = renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "交代一件值得持续完成的事" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "关注重点" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "旅行规划" }));
    expect(screen.getByRole("heading", { name: "准备一段有余地的旅行" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "目的地" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "关注重点" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "创业调研" }));
    expect(screen.getByRole("heading", { name: "研究一个值得验证的生意" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "研究市场" })).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("updates live prose when a json-render bound Select changes", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText(/研究重点：模型、产品与开源/)).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "关注重点" }));
    await user.click(await screen.findByRole("option", { name: "创业与商业化机会" }));
    expect(screen.getByText(/研究重点：创业与商业化/)).toBeInTheDocument();
  });

  it("blocks acceptance on unresolved comments, never submitting a real task", async () => {
    const user = userEvent.setup();
    const { fetcher } = renderPage();
    await user.click(screen.getByRole("button", { name: "批注" }));
    const comments = screen.getByRole("complementary", { name: "随文批注" });
    await user.type(
      within(comments).getByRole("textbox", { name: "对当前阶段提出意见" }),
      "请增加失败案例",
    );
    await user.click(within(comments).getByRole("button", { name: "添加批注" }));
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeDisabled();
    await user.click(within(comments).getByRole("button", { name: "放弃此批注" }));
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    expect(
      screen.getByText("工作节奏", { selector: ".delegation-ui-intro h3" }),
    ).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("simulates streaming and abort without committing incomplete generated UI", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "演示流式修订" }));
    expect(screen.getByRole("status")).toHaveTextContent("Mira 正在同时更新正文与确认组件");
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "中止" }));
    expect(screen.getByText(/生成已中止；保留此前正文和批注/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeEnabled();
  });

  it("keeps stage acceptance explicitly human-controlled", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole("button", { name: /工作节奏.*等待前一阶段/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    const second = screen.getByRole("button", { name: "接受本阶段" });
    await user.click(second);
    expect(
      screen.getByText("交付与边界", { selector: ".delegation-ui-intro h3" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "接受并交代（演示）" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "接受并交代（演示）" }));
    expect(screen.getByText("三个阶段已经完成演示验收")).toBeInTheDocument();
    expect(screen.getByText(/没有发送工作请求/)).toBeInTheDocument();
  });

  it("provides selection-based comment affordance without opening sidebar automatically", () => {
    renderPage();
    const content = document.querySelector(".delegation-document-text") as HTMLElement;
    const paragraph = content.querySelector("p") as HTMLElement;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.mouseUp(content);
    expect(screen.getByRole("button", { name: "批注所选文字" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "随文批注" })).toBeNull();
    selection?.removeAllRanges();
  });
});

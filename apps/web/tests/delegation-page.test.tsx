// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import DelegationPage from "../src/features/work/delegation-page";

beforeEach(() => {
  window.sessionStorage.clear();
});

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

describe("delegation single document end-to-end prototype", () => {
  it("rejects a stored Markdown agreement that disagrees with the controls", async () => {
    const { createDelegationDraft, changeDocumentMarkdown } =
      await import("../src/features/work/delegation-document");
    const fixture = createDelegationDraft();
    const inconsistent = changeDocumentMarkdown(
      fixture,
      0,
      fixture.stages[0].markdown.replace("模型、产品与开源", "创业与商业化"),
    );
    window.sessionStorage.setItem("mira-cloud-delegation-fixture-v1", JSON.stringify(inconsistent));
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("暂时不能接受本阶段");
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "按控件同步约定" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeEnabled();
  });

  it("uses the same saved document for json-render changes and session restoration", async () => {
    const user = userEvent.setup();
    const view = renderPage();
    await user.click(screen.getByRole("combobox", { name: "关注重点" }));
    await user.click(await screen.findByRole("option", { name: "创业与商业化机会" }));
    expect(screen.getByText(/研究重点：创业与商业化/)).toBeInTheDocument();
    expect(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")).toContain("business");
    view.unmount();
    renderPage();
    expect(screen.getByText(/研究重点：创业与商业化/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "关注重点" })).toHaveTextContent(
      "创业与商业化机会",
    );
  });

  it("keeps accepted history read-only until explicit submission invalidates later stages", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    await user.click(screen.getByRole("button", { name: /研究目标.*已接受/ }));
    expect(screen.getByRole("button", { name: "修改本阶段" })).toBeInTheDocument();
    expect(screen.getByText(/历史验收版本 · 1/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "修改本阶段" }));
    await user.click(screen.getByRole("combobox", { name: "关注重点" }));
    await user.click(await screen.findByRole("option", { name: "创业与商业化机会" }));
    const pending = JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!);
    expect(pending.acceptedCount).toBe(1);
    expect(pending.stages[0].accepted.config.focus).toBe("products");
    await user.click(screen.getByRole("button", { name: "提交修改并重新验收" }));
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /工作节奏.*等待前一阶段/ })).toBeDisabled();
    expect(screen.getByText(/研究重点：创业与商业化/)).toBeInTheDocument();
  });

  it("cancelling a historical change restores the visible json-render field", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    await user.click(screen.getByRole("button", { name: /研究目标.*已接受/ }));
    await user.click(screen.getByRole("button", { name: "修改本阶段" }));
    await user.click(screen.getByRole("combobox", { name: "关注重点" }));
    await user.click(await screen.findByRole("option", { name: "创业与商业化机会" }));
    await user.click(screen.getByRole("button", { name: "放弃修改" }));
    expect(screen.getByRole("combobox", { name: "关注重点" })).toHaveTextContent(
      "模型、产品与开源工具",
    );
    expect(screen.getByRole("button", { name: "修改本阶段" })).toBeInTheDocument();
  });
});

describe("delegation POC UI completion", () => {
  it("protects an edited draft before changing the demonstration scenario", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("combobox", { name: "关注重点" }));
    await user.click(await screen.findByRole("option", { name: "创业与商业化机会" }));
    await user.click(screen.getByRole("button", { name: "旅行规划" }));

    const confirmation = screen.getByRole("dialog", { name: "切换体验情境" });
    expect(confirmation).toHaveTextContent("清空本标签页中的正文、批注与阶段验收记录");
    await user.click(within(confirmation).getByRole("button", { name: "继续审阅" }));
    expect(screen.queryByRole("dialog", { name: "切换体验情境" })).toBeNull();
    expect(screen.getByText(/研究重点：创业与商业化/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "旅行规划" }));
    await user.click(
      within(screen.getByRole("dialog", { name: "切换体验情境" })).getByRole("button", {
        name: "放弃并切换",
      }),
    );
    expect(screen.getByRole("heading", { name: "准备一段有余地的旅行" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "目的地" })).toBeInTheDocument();
  });

  it("keeps the stage and session-save states separate", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("待你审阅")).toBeInTheDocument();
    expect(screen.getByText("仅在此标签页保存")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    await user.click(screen.getByRole("button", { name: /研究目标.*已接受/ }));
    expect(screen.getByText("已接受 · 只读")).toBeInTheDocument();
    expect(screen.getByText("仅在此标签页保存")).toBeInTheDocument();
  });
});

describe("historical draft recovery", () => {
  it("returns to an in-progress historical revision after a same-tab reload", async () => {
    const user = userEvent.setup();
    const initial = renderPage();
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    await user.click(screen.getByRole("button", { name: /研究目标.*已接受/ }));
    await user.click(screen.getByRole("button", { name: "修改本阶段" }));
    initial.unmount();
    renderPage();
    expect(screen.getByRole("button", { name: "提交修改并重新验收" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "关注重点" })).toBeInTheDocument();
  });
});

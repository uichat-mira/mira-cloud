// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import DelegationPage from "../src/features/work/delegation-page";
import { DRAFT_STORAGE_KEY, createDelegationDraft } from "../src/features/work/delegation-document";

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPage({
  startAtEntry = false,
  fromArtifact = false,
  fixtureScenario,
}: {
  startAtEntry?: boolean;
  fromArtifact?: boolean;
  fixtureScenario?: "radar" | "journey" | "venture";
} = {}) {
  // Older review contract tests start from a saved Fixture document. New D02
  // tests intentionally start with no document to exercise the first entry.
  if (!startAtEntry && !window.sessionStorage.getItem(DRAFT_STORAGE_KEY)) {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(createDelegationDraft()));
  }
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const view = render(
    <MemoryRouter
      initialEntries={[
        fromArtifact
          ? { pathname: "/new", state: { returnTo: "/artifacts/market-note" } }
          : fixtureScenario
            ? "/new?fixture=" + fixtureScenario
            : "/new",
      ]}
    >
      <DelegationPage />
    </MemoryRouter>,
  );
  return { ...view, fetcher };
}

describe("D02: intent entry before a review document exists", () => {
  it("keeps the legacy review fixture shortcut explicitly dev-only", () => {
    const { fetcher } = renderPage({ startAtEntry: true, fixtureScenario: "journey" });
    expect(import.meta.env.DEV).toBe(true);
    expect(screen.queryByRole("textbox", { name: "你希望 Mira 做什么？" })).toBeNull();
    expect(screen.getByRole("heading", { name: "准备一段有余地的旅行" })).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("starts with an empty goal entry, not a prebuilt radar document", () => {
    const { fetcher } = renderPage({ startAtEntry: true });
    expect(screen.getByRole("heading", { name: "有什么事，想交给 Mira？" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "你希望 Mira 做什么？" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "整理需求草稿" })).toBeDisabled();
    expect(screen.queryByRole("article", { name: "需求审阅画布" })).toBeNull();
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("turns a free natural-language intent into a reviewable local template draft", async () => {
    const user = userEvent.setup();
    const { fetcher, unmount } = renderPage({ startAtEntry: true });
    const goal = "帮我持续整理社区活动的用户反馈，只在出现重要问题时提醒";
    await user.type(screen.getByRole("textbox", { name: "你希望 Mira 做什么？" }), goal);
    await user.click(screen.getByRole("button", { name: "整理需求草稿" }));
    expect(screen.getByRole("status")).toHaveTextContent("正在整理演示草稿");
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(await screen.findByRole("heading", { name: "把这件事交代清楚" })).toBeInTheDocument();
    expect(await screen.findByText(/先确认这件事的范围与关键前提/)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "优先从哪里开始" })).toBeInTheDocument();
    const saved = JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(saved).toMatchObject({ scenarioId: "custom", intent: goal, acceptedCount: 0 });
    expect(saved.stages[0].markdown).toContain(goal);
    expect(fetcher).not.toHaveBeenCalled();
    unmount();
    renderPage({ startAtEntry: true });
    expect(screen.queryByRole("textbox", { name: "你希望 Mira 做什么？" })).toBeNull();
    expect(screen.getByRole("heading", { name: "把这件事交代清楚" })).toBeInTheDocument();
  });

  it("offers opt-in demo examples without claiming to infer real context", async () => {
    const user = userEvent.setup();
    renderPage({ startAtEntry: true });
    await user.click(screen.getByRole("button", { name: "旅行规划" }));
    expect(
      await screen.findByRole("heading", { name: "准备一段有余地的旅行" }),
    ).toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!).intent).toBe(
      "帮我规划一次节奏从容的旅行，优先文化、街区和当地生活。",
    );
  });

  it("offers an explicitly bounded Fixture artifact continuation when entered from its detail", async () => {
    const user = userEvent.setup();
    const { fetcher } = renderPage({ startAtEntry: true, fromArtifact: true });
    expect(screen.getByText("市场机会研究摘要")).toBeInTheDocument();
    expect(screen.getByText(/只引用演示成果的标题和版本/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "以此起稿" }));
    expect(await screen.findByRole("heading", { name: "把这件事交代清楚" })).toBeInTheDocument();
    const saved = JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(saved.scenarioId).toBe("custom");
    expect(saved.intent).toContain("市场机会研究摘要");
    expect(saved.intent).toContain("v1");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("can cancel drafting without losing the typed goal or creating a document", async () => {
    const user = userEvent.setup();
    renderPage({ startAtEntry: true });
    await user.type(
      screen.getByRole("textbox", { name: "你希望 Mira 做什么？" }),
      "帮我每周整理社区运营问题",
    );
    await user.click(screen.getByRole("button", { name: "整理需求草稿" }));
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.getByRole("textbox", { name: "你希望 Mira 做什么？" })).toHaveValue(
      "帮我每周整理社区运营问题",
    );
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a recoverable error when browser storage rejects the new draft", async () => {
    const user = userEvent.setup();
    renderPage({ startAtEntry: true });
    await user.type(
      screen.getByRole("textbox", { name: "你希望 Mira 做什么？" }),
      "帮我持续跟进重要需求",
    );
    const original = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    try {
      await user.click(screen.getByRole("button", { name: "整理需求草稿" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("未能保存草稿");
      expect(screen.getByRole("textbox", { name: "你希望 Mira 做什么？" })).toHaveValue(
        "帮我持续跟进重要需求",
      );
      expect(screen.queryByRole("heading", { name: "把这件事交代清楚" })).toBeNull();
    } finally {
      spy.mockRestore();
      Storage.prototype.setItem = original;
    }
    await user.click(screen.getByRole("button", { name: "整理需求草稿" }));
    expect(await screen.findByRole("heading", { name: "把这件事交代清楚" })).toBeInTheDocument();
  });

  it("keeps the existing draft when browser storage refuses deletion", async () => {
    const user = userEvent.setup();
    renderPage();
    const before = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    await user.click(screen.getByRole("button", { name: "新交代" }));
    const denied = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    try {
      await user.click(screen.getByRole("button", { name: "放弃并重新交代" }));
      expect(screen.getByText("会话保存失败")).toBeInTheDocument();
      expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(before);
      expect(screen.queryByRole("heading", { name: "有什么事，想交给 Mira？" })).toBeNull();
    } finally {
      denied.mockRestore();
    }
    await user.click(screen.getByRole("button", { name: "放弃并重新交代" }));
    expect(screen.getByRole("heading", { name: "有什么事，想交给 Mira？" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it("asks before discarding a drafted task and returns to the intent start", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "新交代" }));
    expect(screen.getByText("放弃这份演示草稿？")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "放弃并重新交代" }));
    expect(screen.getByRole("heading", { name: "有什么事，想交给 Mira？" })).toBeInTheDocument();
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});

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

  it("keeps the single main timeline inside the review paper instead of a left rail", () => {
    renderPage();
    const paper = screen.getByRole("article", { name: "需求审阅画布" });
    const timeline = within(paper).getByRole("navigation", { name: "工作主时间轴" });
    expect(timeline).toHaveTextContent("研究目标");
    expect(timeline).toHaveTextContent("工作节奏");
    expect(timeline).toHaveTextContent("交付与边界");
    expect(timeline).toHaveTextContent("长期托管");
    expect(timeline.parentElement).toHaveClass("delegation-paper-topline");
    expect(document.querySelector(".delegation-timeline")).toBeNull();
    expect(document.querySelector(".delegation-intent")).toBeNull();
  });

  it("updates live prose when a json-render bound Select changes", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText(/研究重点：模型、产品与开源/)).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "关注重点" }));
    await user.click(await screen.findByRole("option", { name: "创业与商业化机会" }));
    expect(await screen.findByText(/研究重点：创业与商业化/)).toBeInTheDocument();
  });

  it("keeps one icon-only review entry in the sticky paper topline, not the footer", async () => {
    const user = userEvent.setup();
    renderPage();
    const header = document.querySelector(".delegation-paper-topline") as HTMLElement;
    const footer = document.querySelector(".delegation-paper-footer") as HTMLElement;
    const trigger = within(header).getByRole("button", { name: "批注" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls", "delegation-comments-panel");
    expect(trigger.querySelector("svg")).toBeInTheDocument();
    expect(trigger.querySelector(".delegation-comment-count")).toBeNull();
    expect(trigger.textContent?.trim()).toBe("");
    expect(within(footer).queryByRole("button", { name: "批注" })).toBeNull();
    expect(within(header).queryByText("仅在此标签页保存")).toBeNull();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const aside = screen.getByRole("complementary", { name: "随文批注" });
    expect(aside).toHaveAttribute("id", "delegation-comments-panel");
    expect(within(footer).queryByRole("button", { name: "批注" })).toBeNull();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("complementary", { name: "随文批注" })).toBeNull();
  });

  it("blocks acceptance on unresolved comments, never submitting a real task", async () => {
    const user = userEvent.setup();
    const { fetcher } = renderPage();
    await user.click(screen.getByRole("button", { name: "批注" }));
    const comments = screen.getByRole("complementary", { name: "随文批注" });
    expect(within(comments).queryByRole("textbox")).toBeNull();
    await user.click(within(comments).getByRole("button", { name: "批注整个阶段" }));
    // A separately scrolling review list must remain keyboard reachable.
    expect(within(comments).getByRole("region", { name: "批注列表" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    await user.type(
      within(comments).getByRole("textbox", { name: "批注整个阶段" }),
      "请增加失败案例",
    );
    await user.click(within(comments).getByRole("button", { name: "添加批注" }));
    const triggerWithCount = screen.getByRole("button", { name: "批注 · 1" });
    expect(triggerWithCount.querySelector(".delegation-comment-count")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeDisabled();
    // The review count is visible in the header: don't repeat it below the actions.
    expect(screen.queryByText(/条批注需要你确认解决或放弃/)).toBeNull();
    await user.click(within(comments).getByRole("button", { name: "放弃此批注" }));
    expect(within(comments).queryByText("请增加失败案例")).toBeNull();
    expect(within(comments).getByRole("heading", { name: "随文批注 0" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "批注" }).querySelector(".delegation-comment-count"),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeEnabled();
    expect(
      JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!).comments,
    ).toMatchObject([{ text: "请增加失败案例", status: "abandoned" }]);
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    expect(
      screen.getByText("工作节奏", { selector: ".delegation-ui-intro h3" }),
    ).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("opens the review panel in read-only list mode when nothing is selected", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "批注" }));
    const panel = screen.getByRole("complementary", { name: "随文批注" });

    expect(within(panel).getByText("先选中正文中的文字，才能添加随文批注。")).toBeInTheDocument();
    expect(within(panel).queryByRole("textbox")).toBeNull();
    expect(within(panel).queryByRole("button", { name: "添加批注" })).toBeNull();
    expect(
      JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!).comments,
    ).toEqual([]);

    await user.click(within(panel).getByRole("button", { name: "批注整个阶段" }));
    expect(within(panel).getByRole("textbox", { name: "批注整个阶段" })).toBeInTheDocument();
    await user.click(within(panel).getByRole("button", { name: "取消全文批注" }));
    expect(within(panel).queryByRole("textbox")).toBeNull();
    expect(
      JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!).comments,
    ).toEqual([]);
  });

  it("requires a separate explicit decision before making an unanchored whole-stage comment", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "批注" }));
    const panel = screen.getByRole("complementary", { name: "随文批注" });
    await user.click(within(panel).getByRole("button", { name: "批注整个阶段" }));
    await user.type(
      within(panel).getByRole("textbox", { name: "批注整个阶段" }),
      "需要补充完整交付范围",
    );
    await user.click(within(panel).getByRole("button", { name: "添加批注" }));
    const draft = JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!);
    expect(draft.comments).toMatchObject([
      { excerpt: "本阶段整体", text: "需要补充完整交付范围", status: "open" },
    ]);
    expect(draft.comments[0].anchor).toBeUndefined();
    expect(within(panel).queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeDisabled();
  });

  it("does not carry an unsubmitted whole-stage comment target into the next stage", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "批注" }));
    const panel = screen.getByRole("complementary", { name: "随文批注" });
    await user.click(within(panel).getByRole("button", { name: "批注整个阶段" }));
    expect(within(panel).getByRole("textbox", { name: "批注整个阶段" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    expect(screen.getByRole("button", { name: /研究目标.*已接受/ })).toBeInTheDocument();
    expect(within(panel).queryByRole("textbox")).toBeNull();
    expect(within(panel).getByRole("button", { name: "批注整个阶段" })).toBeInTheDocument();
    expect(
      JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!).comments,
    ).toEqual([]);
  });

  it("saves a ProseMirror-backed text annotation in the existing draft and restores its highlight", async () => {
    const user = userEvent.setup();
    const first = renderPage();
    await screen.findByText(/研究重点：模型、产品与开源/);
    const editor = document.querySelector(".delegation-review-editor") as HTMLElement;
    const paragraph = editor.querySelector(".ProseMirror p") as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.mouseUp(editor);
    await user.click(await screen.findByRole("button", { name: "批注所选文字" }));
    const panel = screen.getByRole("complementary", { name: "随文批注" });
    await user.type(within(panel).getByRole("textbox", { name: "批注所选文字" }), "请注明证据来源");
    await user.click(within(panel).getByRole("button", { name: "添加批注" }));
    const draft = JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!);
    expect(draft.comments[0].anchor).toMatchObject({
      status: "active",
      version: { stage: 0, revision: 0 },
    });
    expect(draft.comments[0].anchor.to).toBeGreaterThan(draft.comments[0].anchor.from);
    expect(document.querySelectorAll(".delegation-review-poc-anchor")).toHaveLength(1);
    first.unmount();
    selection?.removeAllRanges();
    renderPage();
    await screen.findByText(/研究重点：模型、产品与开源/);
    expect(document.querySelectorAll(".delegation-review-poc-anchor")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "批注 · 1" })).toBeInTheDocument();
  });

  it("can annotate a second paragraph while the review sidebar stays open", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/研究重点：模型、产品与开源/);
    await user.click(screen.getByRole("button", { name: "批注" }));
    const panel = screen.getByRole("complementary", { name: "随文批注" });
    const editor = document.querySelector(".delegation-review-editor") as HTMLElement;
    const paragraphs = editor.querySelectorAll(".ProseMirror p");
    expect(paragraphs.length).toBeGreaterThanOrEqual(2);
    if (!paragraphs[0] || !paragraphs[1]) throw new Error("Expected two document paragraphs");

    const selectParagraph = (paragraph: Element) => {
      const selection = window.getSelection()!;
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      selection.removeAllRanges();
      selection.addRange(range);
      fireEvent.mouseUp(editor);
    };
    // Regression: the previous commentsOpen guard discarded this entirely.
    selectParagraph(paragraphs[1]);
    const firstComposer = await within(panel).findByRole("textbox", { name: "批注所选文字" });
    expect(within(panel).getByText(/研究重点：模型、产品与开源/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "批注所选文字" })).toBeNull();
    await user.type(firstComposer, "先确认第二段的来源");
    await user.click(within(panel).getByRole("button", { name: "添加批注" }));
    expect(within(panel).getByRole("heading", { name: "随文批注 1" })).toBeInTheDocument();

    selectParagraph(paragraphs[0]);
    const secondComposer = await within(panel).findByRole("textbox", { name: "批注所选文字" });
    expect(within(panel).getByText(/请持续观察 AI 行业的新产品/)).toBeInTheDocument();
    await user.type(secondComposer, "再确认第一段的约定");
    await user.click(within(panel).getByRole("button", { name: "添加批注" }));

    expect(within(panel).getByRole("heading", { name: "随文批注 2" })).toBeInTheDocument();
    expect(document.querySelectorAll(".delegation-review-poc-anchor")).toHaveLength(2);
    const draft = JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!);
    expect(draft.comments).toHaveLength(2);
    expect(draft.comments[0].excerpt).toContain("研究重点");
    expect(draft.comments[1].excerpt).toContain("请持续观察");
    expect(draft.comments.every((item: { anchor?: unknown }) => !!item.anchor)).toBe(true);
  });

  it("removes abandoned anchored comments from the review list and document decorations without deleting their history", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/研究重点：模型、产品与开源/);
    const editor = document.querySelector(".delegation-review-editor") as HTMLElement;
    const paragraph = editor.querySelector(".ProseMirror p") as HTMLElement;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent.mouseUp(editor);
    await user.click(await screen.findByRole("button", { name: "批注所选文字" }));
    const panel = screen.getByRole("complementary", { name: "随文批注" });
    await user.type(
      within(panel).getByRole("textbox", { name: "批注所选文字" }),
      "这段内容不需要继续追踪",
    );
    await user.click(within(panel).getByRole("button", { name: "添加批注" }));
    expect(document.querySelectorAll(".delegation-review-poc-anchor")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "批注 · 1" })).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "放弃此批注" }));
    expect(within(panel).queryByText("这段内容不需要继续追踪")).toBeNull();
    expect(within(panel).getByRole("heading", { name: "随文批注 0" })).toBeInTheDocument();
    expect(document.querySelectorAll(".delegation-review-poc-anchor")).toHaveLength(0);
    expect(screen.getByRole("button", { name: "批注" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeEnabled();
    const stored = JSON.parse(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")!);
    expect(stored.comments).toHaveLength(1);
    expect(stored.comments[0]).toMatchObject({
      status: "abandoned",
      text: "这段内容不需要继续追踪",
      anchor: { status: "active" },
    });
  });

  it("debounces the selection action until dragging ends and the range settles", async () => {
    renderPage();
    await screen.findByText(/研究重点：模型、产品与开源/);
    const editor = document.querySelector(".delegation-review-editor") as HTMLElement;
    const paragraph = editor.querySelector(".ProseMirror p") as HTMLElement;
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(paragraph);

    // Simulate a dragged mouse range, including a rapid selectionchange while
    // the pointer is held down. Even a long drag must never show the action.
    fireEvent.pointerDown(editor);
    selection.removeAllRanges();
    selection.addRange(range);
    fireEvent(document, new Event("selectionchange"));
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(screen.queryByRole("button", { name: "批注所选文字" })).toBeNull();

    fireEvent.pointerUp(document);
    fireEvent.mouseUp(editor);
    await new Promise((resolve) => setTimeout(resolve, 65));
    expect(screen.queryByRole("button", { name: "批注所选文字" })).toBeNull();
    expect(await screen.findByRole("button", { name: "批注所选文字" })).toBeInTheDocument();

    // A changed selection cancels the previous offer immediately. It must
    // settle again instead of showing the old range while the user adjusts it.
    fireEvent(document, new Event("selectionchange"));
    expect(screen.queryByRole("button", { name: "批注所选文字" })).toBeNull();
    selection.removeAllRanges();
    fireEvent(document, new Event("selectionchange"));
    await new Promise((resolve) => setTimeout(resolve, 220));
    expect(screen.queryByRole("button", { name: "批注所选文字" })).toBeNull();
  });

  it("removes the selection-only comment action when selection collapses or the user clicks elsewhere", async () => {
    renderPage();
    await screen.findByText(/研究重点：模型、产品与开源/);
    const editor = document.querySelector(".delegation-review-editor") as HTMLElement;
    const paragraph = editor.querySelector(".ProseMirror p") as HTMLElement;
    const selection = window.getSelection()!;
    const selectText = () => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      selection.removeAllRanges();
      selection.addRange(range);
      fireEvent.mouseUp(editor);
    };
    selectText();
    expect(await screen.findByRole("button", { name: "批注所选文字" })).toBeInTheDocument();
    selection.removeAllRanges();
    fireEvent(document, new Event("selectionchange"));
    expect(screen.queryByRole("button", { name: "批注所选文字" })).toBeNull();

    selectText();
    expect(await screen.findByRole("button", { name: "批注所选文字" })).toBeInTheDocument();
    fireEvent.pointerDown(
      screen.getByRole("heading", { level: 1, name: "交代一件值得持续完成的事" }),
    );
    expect(screen.queryByRole("button", { name: "批注所选文字" })).toBeNull();
    expect(screen.queryByRole("complementary", { name: "随文批注" })).toBeNull();
  });

  it("simulates streaming and abort without committing incomplete generated UI", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "演示流式修订" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /正在(?:载入本地演示修订模块|准备正文与字段的演示差异)/,
    );
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

  it("provides selection-based comment affordance without opening sidebar automatically", async () => {
    renderPage();
    await screen.findByText(/研究重点：模型、产品与开源/);
    const content = document.querySelector(".delegation-document-text") as HTMLElement;
    const paragraph = content.querySelector("p") as HTMLElement;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.mouseUp(content.querySelector(".delegation-review-editor")!);
    expect(await screen.findByRole("button", { name: "批注所选文字" })).toBeInTheDocument();
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
    expect(await screen.findByText(/研究重点：创业与商业化/)).toBeInTheDocument();
    expect(window.sessionStorage.getItem("mira-cloud-delegation-fixture-v1")).toContain("business");
    view.unmount();
    renderPage();
    expect(await screen.findByText(/研究重点：创业与商业化/)).toBeInTheDocument();
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
    expect(await screen.findByText(/研究重点：创业与商业化/)).toBeInTheDocument();
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
    expect(await screen.findByText(/研究重点：创业与商业化/)).toBeInTheDocument();

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
    expect(screen.queryByText("仅在此标签页保存")).toBeNull();
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    await user.click(screen.getByRole("button", { name: /研究目标.*已接受/ }));
    expect(screen.getByText("已接受 · 只读")).toBeInTheDocument();
    expect(screen.queryByText("仅在此标签页保存")).toBeNull();
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

// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router";
import DelegationPage from "../src/features/work/delegation-page";
import {
  DRAFT_STORAGE_KEY,
  createDelegationDraft,
  type DelegationDraft,
} from "../src/features/work/delegation-document";

beforeEach(() => window.sessionStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function boot(draft: DelegationDraft = createDelegationDraft()) {
  window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const rendered = render(
    <MemoryRouter initialEntries={["/new"]}>
      <DelegationPage />
    </MemoryRouter>,
  );
  return { ...rendered, fetcher };
}

async function waitForCandidate() {
  return screen.findByRole("region", { name: "修订差异" }, { timeout: 5500 });
}

describe("D04–D06: /new Diff interactive fixture", () => {
  it("reviews three notes, exposes actual prose + field changes and preserves manual decisions", async () => {
    const user = userEvent.setup();
    const { fetcher } = boot();

    await user.click(screen.getByRole("button", { name: "批注" }));
    let rail = screen.getByRole("complementary", { name: "随文批注" });
    await user.click(within(rail).getByRole("button", { name: "载入三条演示批注" }));
    expect(within(rail).getByRole("heading", { name: "随文批注 3" })).toBeInTheDocument();
    const original = JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(original.comments.map((c: { status: string }) => c.status)).toEqual([
      "open",
      "open",
      "open",
    ]);

    await user.click(screen.getByRole("button", { name: "根据批注修订" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      /正在(?:载入本地演示修订模块|准备正文与字段的演示差异)/,
    );
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeDisabled();
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!).stages[0].revision).toBe(
      0,
    );

    const diff = await waitForCandidate();
    expect(within(diff).getByText("修订候选 · 等待你确认")).toBeInTheDocument();
    expect(within(diff).getByText(/正文 [1-9]\d* 处 · 字段 2 处/)).toBeInTheDocument();
    expect(within(diff).getByText(/它没有理解你的批注/)).toBeInTheDocument();
    await user.click(within(diff).getByRole("button", { name: "展开差异" }));
    expect(within(diff).getByText("阅读完整旧版正文（r0）")).toBeInTheDocument();
    expect(diff.querySelectorAll("del, ins").length).toBeGreaterThanOrEqual(2);

    expect(screen.getByRole("button", { name: "采用这版" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "接受本阶段" })).toBeNull();
    // The preview cannot commit to the canonical session until adoption.
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!).stages[0].revision).toBe(
      0,
    );
    rail = screen.getByRole("complementary", { name: "随文批注" });
    expect(within(rail).getAllByText(/预设演示将这条意见列为待核对/)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "采用这版" }));
    const adopted = JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!);
    expect(adopted.stages[0].revision).toBeGreaterThan(0);
    expect(adopted.stages[0].reviewHistory[0].revision).toBe(0);
    expect(adopted.stages[0].markdown).toContain("预设演示修订");
    expect(adopted.stages[0].config.focus).not.toBe(original.stages[0].config.focus);
    expect(adopted.stages[0].config.makers).toBe(false);
    expect(adopted.comments.map((c: { status: string }) => c.status)).toEqual([
      "suggested",
      "suggested",
      "open",
    ]);
    expect(adopted.comments.map((c: { suggestedReason?: string }) => c.suggestedReason)).toEqual([
      expect.stringContaining("预设演示将这条意见列为待核对"),
      expect.stringContaining("预设演示将这条意见列为待核对"),
      expect.stringContaining("示例不替这条意见作判断"),
    ]);
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeDisabled();

    rail = screen.getByRole("complementary", { name: "随文批注" });
    expect(within(rail).getAllByText(/预设演示将这条意见列为待核对/)).toHaveLength(2);
    expect(within(rail).getByText(/示例不替这条意见作判断/)).toBeInTheDocument();
    const confirmations = within(rail).getAllByRole("button", { name: "确认解决" });
    expect(confirmations).toHaveLength(2);
    await user.click(confirmations[0]!);
    await user.click(within(rail).getByRole("button", { name: "确认解决" }));
    await user.click(within(rail).getByRole("button", { name: "放弃此批注" }));
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "接受本阶段" }));
    expect(JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!).acceptedCount).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
  }, 15000);

  it("keeps the draft untouched on cancel while generating and on discarding a ready revision", async () => {
    const user = userEvent.setup();
    const { fetcher } = boot();
    const baseline = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    await user.click(screen.getByRole("button", { name: "演示流式修订" }));
    await user.click(screen.getByRole("button", { name: "中止" }));
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(baseline);
    expect(screen.queryByRole("region", { name: "修订差异" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "演示流式修订" }));
    await waitForCandidate();
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(baseline);
    await user.click(screen.getByRole("button", { name: "放弃修订" }));
    expect(screen.queryByRole("region", { name: "修订差异" })).toBeNull();
    expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(baseline);
    expect(screen.getByRole("button", { name: "接受本阶段" })).toBeEnabled();
    expect(fetcher).not.toHaveBeenCalled();
  }, 12000);

  it("opens the exact old source after adoption and after a same-tab reload", async () => {
    const user = userEvent.setup();
    const draft = createDelegationDraft("radar");
    draft.comments.push({
      id: 7,
      stage: 0,
      text: "请核对这一句",
      excerpt: "持续观察",
      status: "open",
      anchor: { from: 2, to: 6, version: { stage: 0, revision: 0 }, status: "active" },
    });
    const view = boot(draft);
    await user.click(screen.getByRole("button", { name: "根据批注修订" }));
    await waitForCandidate();
    await user.click(screen.getByRole("button", { name: "采用这版" }));

    await user.click(screen.getByRole("button", { name: "批注 · 1" }));
    let rail = screen.getByRole("complementary", { name: "随文批注" });
    await user.click(within(rail).getByRole("button", { name: /查看来源版本 r0/ }));
    expect(screen.getByText(/这条批注属于修订 r0/)).toBeInTheDocument();
    expect(
      await within(screen.getByRole("dialog")).findByText(/请持续观察 AI 行业的新产品/),
    ).toBeInTheDocument();

    view.unmount();
    const restored = boot(JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!));
    await user.click(screen.getByRole("button", { name: "批注 · 1" }));
    rail = screen.getByRole("complementary", { name: "随文批注" });
    await user.click(within(rail).getByRole("button", { name: /查看来源版本 r0/ }));
    expect(screen.getByText(/这条批注属于修订 r0/)).toBeInTheDocument();
    expect(
      await within(screen.getByRole("dialog")).findByText(/请持续观察 AI 行业的新产品/),
    ).toBeInTheDocument();
    restored.unmount();
  }, 12000);

  it("does not discard the candidate if session storage rejects adoption; permits retry", async () => {
    const user = userEvent.setup();
    boot();
    await user.click(screen.getByRole("button", { name: "演示流式修订" }));
    await waitForCandidate();
    const before = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
    const deny = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage denied");
    });
    try {
      await user.click(screen.getByRole("button", { name: "采用这版" }));
      expect(screen.getByText(/无法保存修订/)).toBeInTheDocument();
      expect(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)).toBe(before);
      expect(screen.getByRole("button", { name: "采用这版" })).toBeEnabled();
    } finally {
      deny.mockRestore();
    }
    await user.click(screen.getByRole("button", { name: "采用这版" }));
    expect(
      JSON.parse(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)!).stages[0].reviewHistory,
    ).toHaveLength(1);
  }, 12000);
});

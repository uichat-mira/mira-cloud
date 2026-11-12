// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  WorkspaceTabs,
  resolveWorkspaceTabsWindow,
} from "../../src/components/mira-design/index.ts";

function rect(width: number, height = 32): DOMRect {
  return {
    x: 0,
    y: 0,
    width,
    height,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AGT-061 WorkspaceTabs", () => {
  it("keeps all tabs visible when their measured widths fit", () => {
    expect(
      resolveWorkspaceTabsWindow({
        availableWidth: 500,
        tabWidths: [80, 90, 100],
        selectedIndex: 1,
      }),
    ).toEqual({ start: 0, end: 3, hasOverflow: false });
  });

  it("keeps the selected tab visible while fitting the largest complete window", () => {
    expect(
      resolveWorkspaceTabsWindow({
        availableWidth: 260,
        tabWidths: [100, 100, 100, 100],
        selectedIndex: 3,
      }),
    ).toEqual({ start: 2, end: 4, hasOverflow: true });

    expect(
      resolveWorkspaceTabsWindow({
        availableWidth: 70,
        tabWidths: [100, 100, 100, 100],
        selectedIndex: 2,
      }),
    ).toEqual({ start: 2, end: 3, hasOverflow: true });
  });

  it.each([360, 390, 430, 600, 820])(
    "preserves the selected topic at %ipx without relying on horizontal scrolling",
    (viewportWidth) => {
      const widths = [120, 120, 120, 120, 120];
      const availableWidth = viewportWidth - 32;
      const window = resolveWorkspaceTabsWindow({
        availableWidth,
        tabWidths: widths,
        selectedIndex: 4,
      });

      expect(window.start).toBeLessThanOrEqual(4);
      expect(window.end).toBeGreaterThan(4);

      if (window.hasOverflow) {
        const visibleWidths = widths.slice(window.start, window.end);
        const visibleWidth =
          visibleWidths.reduce((total, width) => total + width, 0) +
          Math.max(0, visibleWidths.length - 1) * 2 +
          2 +
          32;
        expect(visibleWidth).toBeLessThanOrEqual(availableWidth);
      } else {
        expect(window).toEqual({ start: 0, end: widths.length, hasOverflow: false });
      }
    },
  );

  it("measures the container, renders a compact overflow menu and preserves selection", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const element = this as HTMLElement;
      if (element.hasAttribute("data-workspace-tabs-list")) return rect(210);
      if (element.hasAttribute("data-workspace-tabs-measure-item")) return rect(92);
      if (element.hasAttribute("data-workspace-tabs-overflow-measure")) return rect(32);
      return rect(0, 0);
    });

    function Harness() {
      const [value, setValue] = React.useState("a");
      return (
        <WorkspaceTabs
          tabs={[
            { value: "a", label: "概览" },
            { value: "b", label: "待处理" },
            { value: "c", label: "运行" },
            { value: "d", label: "成果" },
          ]}
          value={value}
          onChange={setValue}
          ariaLabel="任务视图"
        />
      );
    }

    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole("tab", { name: "概览" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "待处理" })).toBeNull();
    expect(screen.getByRole("button", { name: "更多视图" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "更多视图" }));
    const selectedMenuItem = await screen.findByRole("menuitemradio", { name: "概览" });
    expect(selectedMenuItem).toHaveAttribute("aria-checked", "true");

    await user.click(screen.getByRole("menuitemradio", { name: "成果" }));
    expect(screen.getByRole("tab", { name: "成果" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "概览" })).toBeNull();
  });

  it("opens the overflow menu by keyboard and can choose a hidden view", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      const element = this as HTMLElement;
      if (element.hasAttribute("data-workspace-tabs-list")) return rect(210);
      if (element.hasAttribute("data-workspace-tabs-measure-item")) return rect(92);
      if (element.hasAttribute("data-workspace-tabs-overflow-measure")) return rect(32);
      return rect(0, 0);
    });

    function Harness() {
      const [value, setValue] = React.useState("a");
      return (
        <WorkspaceTabs
          tabs={[
            { value: "a", label: "概览" },
            { value: "b", label: "待处理" },
            { value: "c", label: "运行" },
            { value: "d", label: "成果" },
          ]}
          value={value}
          onChange={setValue}
        />
      );
    }

    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole("tab", { name: "概览" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "更多视图" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menuitemradio", { name: "概览" })).toHaveFocus();

    await user.keyboard("{End}{Enter}");
    expect(screen.getByRole("tab", { name: "成果" })).toHaveAttribute("aria-selected", "true");
  });
});

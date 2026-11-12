// @vitest-environment jsdom
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  NavigationCardTabs,
  resolveNavigationCardTabsWindow,
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

interface LayoutState {
  availableWidth: number;
  tabWidth: number;
  overflowWidth: number;
}

function installLayout(
  initial: Pick<LayoutState, "availableWidth" | "tabWidth"> & Partial<LayoutState>,
): LayoutState {
  const state: LayoutState = { overflowWidth: 32, ...initial };

  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.hasAttribute("data-navigation-card-tabs-measure-item")) {
      return rect(state.tabWidth);
    }
    if (this.hasAttribute("data-navigation-card-tabs-overflow-measure")) {
      return rect(state.overflowWidth);
    }
    if (this.getAttribute("role") === "tablist") {
      return rect(state.availableWidth);
    }
    return rect(0, 0);
  });

  return state;
}

class ControllableResizeObserver {
  static instances: ControllableResizeObserver[] = [];

  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ControllableResizeObserver.instances.push(this);
  }

  observe() {}

  unobserve() {}

  disconnect() {
    const index = ControllableResizeObserver.instances.indexOf(this);
    if (index >= 0) ControllableResizeObserver.instances.splice(index, 1);
  }

  trigger() {
    this.callback([], this as unknown as ResizeObserver);
  }
}

const originalResizeObserver = globalThis.ResizeObserver;

beforeEach(() => {
  ControllableResizeObserver.instances = [];
  globalThis.ResizeObserver = ControllableResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  ControllableResizeObserver.instances = [];
  globalThis.ResizeObserver = originalResizeObserver;
});

function Harness() {
  const [value, setValue] = React.useState("overview");
  return (
    <NavigationCardTabs
      tabs={[
        { value: "overview", label: "Overview" },
        { value: "pending", label: "Pending" },
        { value: "runs", label: "Runs" },
        { value: "artifacts", label: "Artifacts" },
      ]}
      value={value}
      onChange={setValue}
    />
  );
}

describe("AGT-066 NavigationCardTabs overflow contract", () => {
  it("keeps the selected tab represented in the overflow menu before and after switching", async () => {
    installLayout({ availableWidth: 210, tabWidth: 92 });
    const user = userEvent.setup();

    render(<Harness />);

    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Pending" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "More navigation tabs" }));
    expect(await screen.findByRole("menuitemradio", { name: "Overview" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.click(screen.getByRole("menuitemradio", { name: "Artifacts" }));
    expect(await screen.findByRole("tab", { name: "Artifacts" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.queryByRole("tab", { name: "Overview" })).toBeNull();
  });

  it("represents the selected value in the overflow menu when no full tab can fit", async () => {
    installLayout({ availableWidth: 96, tabWidth: 92 });
    const user = userEvent.setup();

    render(<Harness />);

    expect(screen.queryByRole("tab")).toBeNull();
    const trigger = screen.getByRole("button", { name: "More navigation tabs" });
    await user.click(trigger);

    expect(await screen.findByRole("menuitemradio", { name: "Overview" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getAllByRole("menuitemradio")).toHaveLength(4);
  });

  it("opens the overflow menu by keyboard with accurate checked ARIA state", async () => {
    installLayout({ availableWidth: 210, tabWidth: 92 });
    const user = userEvent.setup();

    render(<Harness />);

    await user.tab();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveFocus();

    await user.tab();
    const trigger = screen.getByRole("button", { name: "More navigation tabs" });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{Enter}");
    const selectedItem = await screen.findByRole("menuitemradio", { name: "Overview" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(selectedItem).toHaveFocus();
    expect(selectedItem).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{End}{Enter}");
    expect(await screen.findByRole("tab", { name: "Artifacts" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("recomputes a stable window and keeps the selected tab active across resizes", () => {
    const layout = installLayout({ availableWidth: 600, tabWidth: 92 });

    render(<Harness />);

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "More navigation tabs" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");

    layout.availableWidth = 210;
    act(() => {
      ControllableResizeObserver.instances.at(-1)?.trigger();
    });

    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "More navigation tabs" })).toBeInTheDocument();

    layout.availableWidth = 600;
    act(() => {
      ControllableResizeObserver.instances.at(-1)?.trigger();
    });

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "More navigation tabs" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
  });

  it("reserves the measured overflow trigger width instead of a fixed estimate", () => {
    installLayout({ availableWidth: 230, tabWidth: 92, overflowWidth: 44 });

    render(<Harness />);

    expect(screen.getAllByRole("tab")).toHaveLength(1);
    expect(screen.queryByRole("tab", { name: "Pending" })).toBeNull();
    expect(screen.getByRole("button", { name: "More navigation tabs" })).toBeInTheDocument();
  });

  it("keeps the selected tab inside the resolved window for common widths", () => {
    const widths = [92, 110, 76, 140, 96];

    for (const availableWidth of [120, 160, 210, 260, 320, 420, 600]) {
      for (let selectedIndex = 0; selectedIndex < widths.length; selectedIndex += 1) {
        const window = resolveNavigationCardTabsWindow({
          availableWidth,
          tabWidths: widths,
          selectedIndex,
        });

        expect(window.start).toBeLessThanOrEqual(selectedIndex);
        expect(window.end).toBeGreaterThan(selectedIndex);
      }
    }
  });
});

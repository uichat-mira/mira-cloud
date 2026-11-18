// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StepIndicator } from "../../src/components/mira-design/index.ts";

function rect(left: number, width: number, height = 40): DOMRect {
  return {
    x: left,
    y: 0,
    left,
    right: left + width,
    top: 0,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("StepIndicator viewport", () => {
  it("centers the current item in an overflowing arbitrary-length track and exposes edge fades", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.hasAttribute("data-step-indicator-viewport")) return rect(0, 300);
      if (this.hasAttribute("data-step-indicator-track")) return rect(0, 900);
      if (this.hasAttribute("data-step-indicator-item")) {
        const index = Number(this.getAttribute("data-step-index") ?? 0);
        return rect(index * 100, 80);
      }
      return rect(0, 0, 0);
    });

    const steps = Array.from({ length: 8 }, (_, index) => ({
      step: index,
      label: `阶段 ${index + 1}`,
      description: `状态 ${index + 1}`,
    }));
    render(<StepIndicator currentStep={4} steps={steps} ariaLabel="动态阶段" />);

    const viewport = document.querySelector<HTMLElement>("[data-step-indicator-viewport]");
    expect(viewport).not.toBeNull();
    await waitFor(() => expect(viewport?.scrollLeft).toBe(290));
    expect(viewport).toHaveAttribute("data-fade-left", "true");
    expect(viewport).toHaveAttribute("data-fade-right", "true");
    expect(screen.getByRole("navigation", { name: "动态阶段" })).toHaveTextContent("阶段 8");
    expect(screen.getByText("阶段 5").closest("[aria-current=step]")).not.toBeNull();
  });

  it("keeps navigation explicit and respects disabled steps", async () => {
    const onStepChange = vi.fn();
    render(
      <StepIndicator
        currentStep="review"
        onStepChange={onStepChange}
        steps={[
          { step: "scope", label: "范围", completed: true },
          { step: "review", label: "审阅" },
          { step: "delivery", label: "交付", disabled: true },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /范围/ }));
    expect(onStepChange).toHaveBeenCalledWith("scope");
    expect(screen.getByRole("button", { name: /交付/ })).toBeDisabled();
  });
});

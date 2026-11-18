import React, { useLayoutEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

export type StepValue = string | number;

export interface StepItem<T extends StepValue = number> {
  step: T;
  label: React.ReactNode;
  description?: React.ReactNode;
  marker?: React.ReactNode;
  completed?: boolean;
  disabled?: boolean;
}

export interface StepIndicatorProps<T extends StepValue = number> {
  currentStep: T;
  steps: readonly StepItem<T>[];
  onStepChange?: (step: T) => void;
  className?: string;
  ariaLabel?: string;
}

type EdgeFade = { left: boolean; right: boolean };

function sameStep(left: StepValue, right: StepValue): boolean {
  return left === right;
}

function deriveCompleted<T extends StepValue>(item: StepItem<T>, currentStep: T): boolean {
  if (item.completed !== undefined) return item.completed;
  return (
    typeof item.step === "number" && typeof currentStep === "number" && item.step < currentStep
  );
}

function maskImage({ left, right }: EdgeFade): string | undefined {
  if (left && right) {
    return "linear-gradient(to right, transparent 0, black 30px, black calc(100% - 30px), transparent 100%)";
  }
  if (left) return "linear-gradient(to right, transparent 0, black 30px, black 100%)";
  if (right) return "linear-gradient(to right, black 0, black calc(100% - 30px), transparent 100%)";
  return undefined;
}

export function StepIndicator<T extends StepValue>({
  currentStep,
  steps,
  onStepChange,
  className = "",
  ariaLabel = "Progress steps",
}: StepIndicatorProps<T>) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const [fade, setFade] = useState<EdgeFade>({ left: false, right: false });
  const stepKey = steps.map((item) => String(item.step)).join("\u0000");

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || steps.length === 0) return;

    const centerCurrentStep = () => {
      const currentIndex = steps.findIndex((item) => sameStep(item.step, currentStep));
      if (currentIndex < 0) return;
      const target = track.querySelector<HTMLElement>(
        `[data-step-indicator-item][data-step-index="${currentIndex}"]`,
      );
      if (!target) return;

      const viewportRect = viewport.getBoundingClientRect();
      const trackRect = track.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const viewportWidth = viewportRect.width;
      const trackWidth = trackRect.width;
      if (viewportWidth <= 0 || trackWidth <= 0) return;

      const targetCenter = targetRect.left - trackRect.left + targetRect.width / 2;
      const maxScroll = Math.max(0, trackWidth - viewportWidth);
      const nextScroll = Math.min(Math.max(0, targetCenter - viewportWidth / 2), maxScroll);
      viewport.scrollLeft = nextScroll;
      setFade({ left: nextScroll > 1, right: nextScroll < maxScroll - 1 });
    };

    centerCurrentStep();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(centerCurrentStep);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [currentStep, stepKey, steps.length]);

  const currentMask = maskImage(fade);

  return (
    <nav
      aria-label={ariaLabel}
      data-mira-step-indicator=""
      className={["relative min-w-0", className].filter(Boolean).join(" ")}
    >
      <div
        ref={viewportRef}
        data-step-indicator-viewport=""
        data-fade-left={fade.left ? "true" : "false"}
        data-fade-right={fade.right ? "true" : "false"}
        className="min-w-0 overflow-x-hidden py-1 [scrollbar-width:none]"
        style={
          currentMask
            ? {
                maskImage: currentMask,
                WebkitMaskImage: currentMask,
              }
            : undefined
        }
      >
        <ol
          ref={trackRef}
          data-step-indicator-track=""
          className="mx-auto flex w-max min-w-0 items-start p-0"
        >
          {steps.map((item, index) => {
            const active = sameStep(item.step, currentStep);
            const completed = deriveCompleted(item, currentStep);
            const marker = completed ? (
              <Check className="h-3 w-3" aria-hidden="true" />
            ) : (
              (item.marker ?? String(index + 1).padStart(2, "0"))
            );
            const content = (
              <>
                <span
                  data-slot="step-indicator-marker"
                  className={[
                    "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border px-1 text-[10px] font-medium tabular-nums",
                    active
                      ? "border-primary bg-primary text-text-inverted"
                      : completed
                        ? "border-primary/40 bg-surface-primary text-primary"
                        : "border-border bg-surface-primary text-text-tertiary",
                  ].join(" ")}
                >
                  {marker}
                </span>
                <span className="flex min-w-0 max-w-36 flex-col gap-0.5 pt-0.5">
                  <strong
                    className={[
                      "truncate whitespace-nowrap text-xs font-medium",
                      active || completed ? "text-text-primary" : "text-text-tertiary",
                    ].join(" ")}
                  >
                    {item.label}
                  </strong>
                  {item.description ? (
                    <small
                      className={[
                        "truncate whitespace-nowrap text-[10px] leading-4",
                        active ? "text-text-secondary" : "text-text-tertiary",
                      ].join(" ")}
                    >
                      {item.description}
                    </small>
                  ) : null}
                </span>
              </>
            );

            return (
              <li key={String(item.step)} className="flex shrink-0 items-start">
                <div
                  data-step-indicator-item=""
                  data-step-index={index}
                  data-step-value={String(item.step)}
                  className="shrink-0"
                >
                  {onStepChange ? (
                    <button
                      type="button"
                      disabled={item.disabled}
                      aria-current={active ? "step" : undefined}
                      onClick={() => onStepChange(item.step)}
                      className="flex min-h-9 min-w-0 items-start gap-2 rounded-ui-control border-0 bg-transparent p-1 text-left outline-none transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-default disabled:hover:bg-transparent [@media(pointer:coarse)]:min-h-11"
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      aria-current={active ? "step" : undefined}
                      className="flex min-h-9 min-w-0 items-start gap-2 p-1"
                    >
                      {content}
                    </div>
                  )}
                </div>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    data-step-indicator-connector=""
                    className={[
                      "mt-3 h-px w-8 shrink-0",
                      completed ? "bg-primary/35" : "bg-border",
                    ].join(" ")}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

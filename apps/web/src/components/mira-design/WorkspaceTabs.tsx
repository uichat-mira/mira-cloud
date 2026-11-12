import React, { useLayoutEffect, useRef, useState } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";
import { Check, Ellipsis } from "lucide-react";

export interface WorkspaceTab<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface WorkspaceTabsProps<T extends string> {
  tabs: readonly WorkspaceTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
  density?: "compact" | "comfortable";
  overflowLabel?: string;
}

export interface WorkspaceTabsWindow {
  start: number;
  end: number;
  hasOverflow: boolean;
}

interface ResolveWorkspaceTabsWindowOptions {
  availableWidth: number;
  tabWidths: readonly number[];
  selectedIndex: number;
  overflowTriggerWidth?: number;
  gap?: number;
}

const DEFAULT_OVERFLOW_WIDTH = 32;
const DEFAULT_GAP = 2;

function sumWidths(widths: readonly number[], start: number, end: number, gap: number): number {
  if (end <= start) return 0;
  let width = gap * Math.max(0, end - start - 1);
  for (let index = start; index < end; index += 1) width += widths[index] ?? 0;
  return width;
}

/**
 * Chooses the largest contiguous group of complete tabs that fits while always
 * keeping the selected tab visible. The overflow button is reserved whenever
 * the full strip does not fit.
 */
export function resolveWorkspaceTabsWindow({
  availableWidth,
  tabWidths,
  selectedIndex,
  overflowTriggerWidth = DEFAULT_OVERFLOW_WIDTH,
  gap = DEFAULT_GAP,
}: ResolveWorkspaceTabsWindowOptions): WorkspaceTabsWindow {
  const count = tabWidths.length;
  if (count === 0) return { start: 0, end: 0, hasOverflow: false };

  const safeSelectedIndex = Math.min(Math.max(selectedIndex, 0), count - 1);
  const hasMeasurements =
    Number.isFinite(availableWidth) &&
    availableWidth > 0 &&
    tabWidths.every((width) => Number.isFinite(width) && width > 0);

  if (!hasMeasurements) {
    return { start: 0, end: count, hasOverflow: false };
  }

  const fullWidth = sumWidths(tabWidths, 0, count, gap);
  if (fullWidth <= availableWidth) {
    return { start: 0, end: count, hasOverflow: false };
  }

  const tabBudget = Math.max(0, availableWidth - overflowTriggerWidth - gap);
  let bestStart = safeSelectedIndex;
  let bestEnd = safeSelectedIndex + 1;
  let bestCount = 1;
  let bestCenterDistance = Number.POSITIVE_INFINITY;

  for (let start = 0; start <= safeSelectedIndex; start += 1) {
    for (let end = safeSelectedIndex + 1; end <= count; end += 1) {
      const width = sumWidths(tabWidths, start, end, gap);
      if (width > tabBudget) continue;

      const visibleCount = end - start;
      const center = (start + end - 1) / 2;
      const centerDistance = Math.abs(center - safeSelectedIndex);

      if (
        visibleCount > bestCount ||
        (visibleCount === bestCount && centerDistance < bestCenterDistance) ||
        (visibleCount === bestCount &&
          centerDistance === bestCenterDistance &&
          start < bestStart)
      ) {
        bestStart = start;
        bestEnd = end;
        bestCount = visibleCount;
        bestCenterDistance = centerDistance;
      }
    }
  }

  return { start: bestStart, end: bestEnd, hasOverflow: true };
}

function numberArraysEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function tabClassName(density: WorkspaceTabsProps<string>["density"]): string {
  return [
    "group relative -mb-px inline-flex min-w-0 max-w-[14rem] shrink items-center gap-1.5 rounded-t-ui-control border border-transparent px-2.5 text-sm text-text-secondary outline-none transition-colors",
    density === "comfortable" ? "h-9" : "h-8",
    "hover:bg-surface-secondary hover:text-text-primary",
    "focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-primary/20",
    "data-[state=active]:border-border data-[state=active]:border-b-surface-primary data-[state=active]:bg-surface-primary data-[state=active]:font-medium data-[state=active]:text-text-primary",
    "data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
    "[@media(pointer:coarse)]:h-11",
  ].join(" ");
}

function WorkspaceTabContent({ tab }: { tab: WorkspaceTab<string> }) {
  return (
    <>
      {tab.icon ? (
        <span
          aria-hidden="true"
          className="flex h-4 w-4 shrink-0 items-center justify-center text-icon-secondary group-data-[state=active]:text-primary"
        >
          {tab.icon}
        </span>
      ) : null}
      <span className="min-w-0 truncate whitespace-nowrap">{tab.label}</span>
    </>
  );
}

export default function WorkspaceTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = "",
  ariaLabel = "Workspace views",
  density = "compact",
  overflowLabel = "更多视图",
}: WorkspaceTabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const overflowMeasureRef = useRef<HTMLButtonElement>(null);
  const [measurement, setMeasurement] = useState<{
    availableWidth: number;
    tabWidths: number[];
    overflowWidth: number;
  }>({ availableWidth: 0, tabWidths: [], overflowWidth: DEFAULT_OVERFLOW_WIDTH });

  const measureKey = tabs.map((tab) => tab.value).join("\u0000");

  useLayoutEffect(() => {
    const list = listRef.current;
    const measure = measureRef.current;
    const overflowMeasure = overflowMeasureRef.current;
    if (!list || !measure || !overflowMeasure) return;

    const readLayout = () => {
      const availableWidth = list.getBoundingClientRect().width;
      const tabWidths = Array.from(measure.querySelectorAll("[data-workspace-tabs-measure-item]")).map(
        (node) => node.getBoundingClientRect().width,
      );
      const overflowWidth = overflowMeasure.getBoundingClientRect().width || DEFAULT_OVERFLOW_WIDTH;

      setMeasurement((current) => {
        if (
          current.availableWidth === availableWidth &&
          current.overflowWidth === overflowWidth &&
          numberArraysEqual(current.tabWidths, tabWidths)
        ) {
          return current;
        }
        return { availableWidth, tabWidths, overflowWidth };
      });
    };

    readLayout();

    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(readLayout);
    observer.observe(list);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [measureKey, density]);

  const selectedIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === value),
  );
  const measuredTabWidths = tabs.map((_, index) => measurement.tabWidths[index] ?? 0);
  const window = resolveWorkspaceTabsWindow({
    availableWidth: measurement.availableWidth,
    tabWidths: measuredTabWidths,
    selectedIndex,
    overflowTriggerWidth: measurement.overflowWidth,
  });

  const visibleTabs = tabs.slice(window.start, window.end);
  const surfaceClassName = tabClassName(density);

  return (
    <Tabs.Root
      value={value}
      onValueChange={(nextValue) => onChange(nextValue as T)}
      data-mira-workspace-tabs=""
      data-density={density}
      className={["min-w-0", className].filter(Boolean).join(" ")}
    >
      <Tabs.List
        ref={listRef}
        aria-label={ariaLabel}
        data-workspace-tabs-list=""
        data-slot="workspace-tabs-list"
        className="relative flex min-w-0 items-end gap-0.5 overflow-hidden border-b border-border"
      >
        {visibleTabs.map((tab) => (
          <Tabs.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            aria-label={typeof tab.label === "string" ? tab.label : undefined}
            data-slot="workspace-tab"
            className={surfaceClassName}
          >
            <WorkspaceTabContent tab={tab as WorkspaceTab<string>} />
          </Tabs.Trigger>
        ))}

        {window.hasOverflow ? (
          <DropdownMenuPrimitive.Root modal={false}>
            <DropdownMenuPrimitive.Trigger asChild>
              <button
                type="button"
                aria-label={overflowLabel}
                title={overflowLabel}
                data-slot="workspace-tabs-overflow-trigger"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-ui-control border-0 bg-transparent text-icon-secondary outline-none transition-colors hover:bg-surface-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary/20 data-[state=open]:bg-surface-secondary data-[state=open]:text-text-primary [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
              >
                <Ellipsis className="h-4 w-4 rotate-90" aria-hidden="true" />
              </button>
            </DropdownMenuPrimitive.Trigger>

            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content
                align="end"
                side="bottom"
                sideOffset={5}
                collisionPadding={12}
                aria-label="全部工作区视图"
                className="z-[260] min-w-[10rem] max-w-[18rem] overflow-hidden rounded-ui-overlay border border-border bg-surface-elevated p-1 shadow-shadow-lg"
              >
                <DropdownMenuPrimitive.RadioGroup
                  value={value}
                  onValueChange={(nextValue) => onChange(nextValue as T)}
                >
                  {tabs.map((tab) => (
                    <DropdownMenuPrimitive.RadioItem
                      key={tab.value}
                      value={tab.value}
                      disabled={tab.disabled}
                      aria-label={typeof tab.label === "string" ? tab.label : undefined}
                      className="group relative flex min-h-9 w-full cursor-default items-center justify-between gap-3 rounded-ui-control px-2.5 py-2 text-left text-sm text-text-primary outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-45 data-[highlighted]:bg-surface-secondary data-[state=checked]:bg-surface-secondary"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        {tab.icon ? (
                          <span className="shrink-0 text-icon-secondary" aria-hidden="true">
                            {tab.icon}
                          </span>
                        ) : null}
                        <span className="truncate">{tab.label}</span>
                      </span>
                      <DropdownMenuPrimitive.ItemIndicator>
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      </DropdownMenuPrimitive.ItemIndicator>
                    </DropdownMenuPrimitive.RadioItem>
                  ))}
                </DropdownMenuPrimitive.RadioGroup>
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        ) : null}

        <div
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 flex w-max gap-0.5"
        >
          {tabs.map((tab, index) => (
            <span
              key={tab.value}
              data-workspace-tabs-measure-item={index}
              className={[surfaceClassName, "shrink-0"].join(" ")}
            >
              <WorkspaceTabContent tab={tab as WorkspaceTab<string>} />
            </span>
          ))}
          <button
            ref={overflowMeasureRef}
            type="button"
            tabIndex={-1}
            data-workspace-tabs-overflow-measure=""
            className="h-8 w-8 shrink-0 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
          />
        </div>
      </Tabs.List>
    </Tabs.Root>
  );
}

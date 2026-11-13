/**
 * Browser-local layout preferences for the fixture work cockpit.
 * This is presentation state only; never imply Cloud account synchronization.
 */
export const cockpitWidgetIds = ["attention", "schedule", "managed", "artifacts"] as const;
export type CockpitWidgetId = (typeof cockpitWidgetIds)[number];

export interface CockpitLayout {
  order: CockpitWidgetId[];
  hidden: CockpitWidgetId[];
  wide: CockpitWidgetId[];
}

export const cockpitLayoutStorageKey = "mira:work-cockpit-layout:v1";

export function defaultCockpitLayout(): CockpitLayout {
  return {
    order: [...cockpitWidgetIds],
    hidden: [],
    wide: ["managed", "artifacts"],
  };
}

function isWidgetId(value: unknown): value is CockpitWidgetId {
  return typeof value === "string" && cockpitWidgetIds.some((id) => id === value);
}

function filteredIds(value: unknown): CockpitWidgetId[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isWidgetId))];
}

export function resolveCockpitLayout(value: unknown): CockpitLayout {
  const defaults = defaultCockpitLayout();
  if (!value || typeof value !== "object") return defaults;
  const raw = value as Record<string, unknown>;
  const order = filteredIds(raw["order"]);
  const hidden = filteredIds(raw["hidden"]);
  // Unknown/malformed stored values cannot make the entire cockpit disappear.
  return {
    order: [...order, ...cockpitWidgetIds.filter((id) => !order.includes(id))],
    hidden: hidden.length === cockpitWidgetIds.length ? [] : hidden,
    wide: Array.isArray(raw["wide"]) ? filteredIds(raw["wide"]) : defaults.wide,
  };
}

export function readCockpitLayout(): CockpitLayout {
  try {
    const stored = window.localStorage.getItem(cockpitLayoutStorageKey);
    return stored ? resolveCockpitLayout(JSON.parse(stored) as unknown) : defaultCockpitLayout();
  } catch {
    return defaultCockpitLayout();
  }
}

export function persistCockpitLayout(layout: CockpitLayout): void {
  try {
    window.localStorage.setItem(cockpitLayoutStorageKey, JSON.stringify(layout));
  } catch {
    // Storage can be disabled. The current page still supports in-memory edits.
  }
}

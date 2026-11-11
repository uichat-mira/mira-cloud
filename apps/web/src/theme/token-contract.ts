import { fontSize, radius, spacing } from "./upstream/tokens";
import { themePresets, type ThemePresetId, type ThemeColors } from "./upstream/palette";

export const presetIds = [
  "default",
  "knowledge-blue",
  "archive-green",
  "slate-ocean",
] as const satisfies readonly ThemePresetId[];
export type Appearance = "light" | "dark";

function luminance(hex: string): number {
  const raw = hex.replace("#", "");
  const rgb = [0, 2, 4].map((offset) => {
    const v = Number.parseInt(raw.slice(offset, offset + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (rgb[0] ?? 0) + 0.7152 * (rgb[1] ?? 0) + 0.0722 * (rgb[2] ?? 0);
}

export function contrast(foreground: string, background: string): number {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function safeActionColor(colors: ThemeColors): string {
  // Web accessibility adaptation derived deterministically from the pinned Mobile palette.
  for (const choice of [colors.primary, colors.primaryActive]) {
    if (contrast(colors.onPrimary, choice) >= 4.5) return choice;
  }
  const original = colors.primaryActive;
  const raw = original.replace("#", "");
  const channels = [0, 2, 4].map((offset) => Number.parseInt(raw.slice(offset, offset + 2), 16));
  const lighten = luminance(colors.onPrimary) < 0.5;
  for (let step = 1; step <= 12; step++) {
    const amount = step * 0.06;
    const result = channels.map((v) => {
      const c = v ?? 0;
      return Math.min(
        255,
        Math.max(0, Math.round(lighten ? c + (255 - c) * amount : c * (1 - amount))),
      );
    });
    const hex = "#" + result.map((v) => v.toString(16).padStart(2, "0")).join("");
    if (contrast(colors.onPrimary, hex) >= 4.5) return hex;
  }
  throw new Error("Pinned palette cannot produce an accessible primary button");
}

export function themeVariables(id: ThemePresetId, appearance: Appearance): Record<string, string> {
  const p = themePresets[id][appearance];
  return {
    "--mira-color-primary": p.primary,
    "--mira-color-action": safeActionColor(p),
    "--mira-color-on-primary": p.onPrimary,
    "--mira-color-canvas": p.bg.canvas,
    "--mira-color-card": p.bg.card,
    "--mira-color-soft": p.bg.soft,
    "--mira-color-input": p.bg.input,
    "--mira-color-text": p.text.base,
    "--mira-color-ink": p.text.ink,
    "--mira-color-muted": p.text.muted,
    "--mira-color-border": p.border.default,
    "--mira-color-success": p.status.success,
    "--mira-color-warning": p.status.warning,
    "--mira-color-error": p.status.error,
    "--mira-radius-control": radius.sm + "px",
    "--mira-radius-card": radius.lg + "px",
    "--mira-radius-panel": radius.xl + "px",
    "--mira-space-xs": spacing.xs + "px",
    "--mira-space-sm": spacing.sm + "px",
    "--mira-space-md": spacing.md + "px",
    "--mira-space-lg": spacing.lg + "px",
    "--mira-space-xl": spacing.xl + "px",
    "--mira-space-section": spacing.section + "px",
    "--mira-type-body": fontSize.bodyMd / 16 + "rem",
    "--mira-type-title": fontSize.titleLg / 16 + "rem",
    "--mira-type-caption": fontSize.caption / 16 + "rem",
  };
}

function cssBlock(selector: string, vars: Record<string, string>): string {
  const rows = Object.entries(vars)
    .map(([key, value]) => "  " + key + ": " + value + ";")
    .join("\n");
  return selector + " {\n" + rows + "\n}";
}

export function renderThemeCss(): string {
  const output = [
    "/* Generated from pinned uichat-mira/mira-mobile commit 31ee125953fe23e0af14f280a0b316637e46fa45. Do not edit by hand. */",
    cssBlock(":root", themeVariables("default", "light")),
  ];
  for (const preset of presetIds) {
    for (const appearance of ["light", "dark"] as const) {
      output.push(
        cssBlock(
          ':root[data-mira-preset="' + preset + '"][data-mira-appearance="' + appearance + '"]',
          themeVariables(preset, appearance),
        ),
      );
    }
  }
  return output.join("\n\n") + "\n";
}

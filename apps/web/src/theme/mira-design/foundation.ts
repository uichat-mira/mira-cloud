export const presetIds = [
  "warm-neutral",
  "knowledge-blue",
  "archive-green",
  "slate-ocean",
] as const;

export type ThemePresetId = (typeof presetIds)[number];
export type Appearance = "light" | "dark";
export type MiraColorVariableSet = Readonly<Record<string, string>>;

export interface MiraThemePresetMeta {
  readonly id: ThemePresetId;
  readonly label: string;
  readonly description: string;
  readonly seed: string;
}

export const appearances = ["light", "dark"] as const;

export const foundationRevision = "5036067d3a87ba95d798e01ededc7fbd678327de";

export const styleTokens = {
  "--mira-space-1": "4px",
  "--mira-space-2": "8px",
  "--mira-space-3": "12px",
  "--mira-space-4": "16px",
  "--mira-space-5": "20px",
  "--mira-space-6": "24px",
  "--mira-space-8": "32px",
  "--mira-space-10": "40px",
  "--mira-radius-ui-control": "8px",
  "--mira-radius-ui-surface": "10px",
  "--mira-radius-ui-panel": "12px",
  "--mira-radius-ui-overlay": "16px",
  "--mira-radius-ui-hero": "20px",
  "--mira-radius-sm": "8px",
  "--mira-radius-md": "10px",
  "--mira-radius-lg": "14px",
  "--mira-radius-xl": "18px",
  "--mira-radius-pill": "9999px",
  "--mira-shadow-sm": "0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 1px rgba(15, 23, 42, 0.03)",
  "--mira-shadow-md": "0 8px 24px rgba(15, 23, 42, 0.08)",
  "--mira-shadow-lg": "0 16px 40px rgba(15, 23, 42, 0.14)",
  "--mira-shadow-xl": "0 24px 60px rgba(15, 23, 42, 0.18)",
  "--mira-font-sans":
    '"IBM Plex Sans", "Noto Sans SC", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--mira-font-serif":
    '"Source Han Serif CN", "Source Han Serif", "Noto Serif SC", ui-serif, Georgia, serif',
  "--mira-font-mono":
    '"Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  "--mira-type-display-size": "28px",
  "--mira-type-display-weight": "600",
  "--mira-type-display-line-height": "1.2",
  "--mira-type-heading-1-size": "20px",
  "--mira-type-heading-1-weight": "600",
  "--mira-type-heading-1-line-height": "1.3",
  "--mira-type-heading-2-size": "16px",
  "--mira-type-heading-2-weight": "600",
  "--mira-type-heading-2-line-height": "1.4",
  "--mira-type-body-size": "14px",
  "--mira-type-body-weight": "400",
  "--mira-type-body-line-height": "1.6",
  "--mira-type-body-small-size": "13px",
  "--mira-type-body-small-weight": "400",
  "--mira-type-body-small-line-height": "1.5",
  "--mira-type-caption-size": "12px",
  "--mira-type-caption-weight": "500",
  "--mira-type-caption-line-height": "1.4",
  "--mira-motion-duration-150": "150ms",
  "--mira-motion-duration-200": "200ms",
} as const;

export type ThemeVariableSets = Readonly<
  Record<ThemePresetId, Readonly<Record<Appearance, MiraColorVariableSet>>>
>;

function cssBlock(selector: string, variables: MiraColorVariableSet): string {
  const rows = Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join("\n");
  return `${selector} {\n${rows}\n}`;
}

export function themeSelector(preset: ThemePresetId, appearance: Appearance): string {
  return `:root[data-mira-color-theme="${preset}"][data-mira-theme-mode="${appearance}"]`;
}

export function renderThemeCss(
  themeVariables: ThemeVariableSets,
  revision = foundationRevision,
): string {
  const defaultVariables = themeVariables[presetIds[0]].light;
  const output = [
    `/* Generated from pinned uichat-mira/mira-desktop commit ${revision}. Do not edit by hand. */`,
    cssBlock(":root", {
      "color-scheme": "light",
      ...styleTokens,
      ...defaultVariables,
    }),
  ];

  for (const preset of presetIds) {
    for (const appearance of appearances) {
      output.push(
        cssBlock(themeSelector(preset, appearance), {
          "color-scheme": appearance,
          ...themeVariables[preset][appearance],
        }),
      );
    }
  }

  return `${output.join("\n\n")}\n`;
}

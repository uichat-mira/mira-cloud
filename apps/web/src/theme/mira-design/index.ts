import {
  appearances,
  foundationRevision,
  presetIds,
  renderThemeCss as renderThemeCssFromSets,
  type Appearance,
  type MiraColorVariableSet,
  type MiraThemePresetMeta,
  type ThemePresetId,
  type ThemeVariableSets,
} from "./foundation.ts";
import { themePresets, themeVariablesByPreset } from "./themes.generated.ts";

export type { Appearance, MiraColorVariableSet, MiraThemePresetMeta, ThemePresetId };

export { appearances, foundationRevision, presetIds };

export const themeVariables = themeVariablesByPreset satisfies ThemeVariableSets;

export const themePresetMap = Object.fromEntries(
  themePresets.map((preset) => [preset.id, preset]),
) as Record<ThemePresetId, (typeof themePresets)[number]>;

export const defaultThemePresetId: ThemePresetId = "warm-neutral";

export function renderThemeCss(): string {
  return renderThemeCssFromSets(themeVariables, foundationRevision);
}

export { themePresets };

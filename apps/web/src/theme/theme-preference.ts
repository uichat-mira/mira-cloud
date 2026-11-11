import { presetIds, type Appearance } from "./token-contract";
import type { ThemePresetId } from "./upstream/palette";

const storageKey = "mira-cloud-theme-v1";

export interface ThemePreference {
  preset: ThemePresetId;
  appearance: Appearance;
}

export function isPreset(value: unknown): value is ThemePresetId {
  return typeof value === "string" && presetIds.some((preset) => preset === value);
}

export function isAppearance(value: unknown): value is Appearance {
  return value === "light" || value === "dark";
}

export function currentTheme(): ThemePreference {
  const miraPreset = document.documentElement.dataset["miraPreset"];
  const miraAppearance = document.documentElement.dataset["miraAppearance"];
  return {
    preset: isPreset(miraPreset) ? miraPreset : "default",
    appearance: isAppearance(miraAppearance) ? miraAppearance : "light",
  };
}

export function applyTheme(next: ThemePreference): void {
  document.documentElement.dataset["miraPreset"] = next.preset;
  document.documentElement.dataset["miraAppearance"] = next.appearance;
  try {
    // Only a local visual preference; no user identity or cloud session is persisted here.
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Private browsing / storage denial is safe: the in-page theme still works.
  }
}

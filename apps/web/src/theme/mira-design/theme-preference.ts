import {
  appearances,
  defaultThemePresetId,
  presetIds,
  type Appearance,
  type ThemePresetId,
} from "./index.ts";

const storageKey = "mira-cloud-theme-v1";

export interface ThemePreference {
  preset: ThemePresetId;
  appearance: Appearance;
}

export function isPreset(value: unknown): value is ThemePresetId {
  return typeof value === "string" && presetIds.some((preset) => preset === value);
}

export function isAppearance(value: unknown): value is Appearance {
  return typeof value === "string" && appearances.some((appearance) => appearance === value);
}

export function currentTheme(): ThemePreference {
  const miraPreset = document.documentElement.dataset["miraColorTheme"];
  const miraAppearance = document.documentElement.dataset["miraThemeMode"];
  return {
    preset: isPreset(miraPreset) ? miraPreset : defaultThemePresetId,
    appearance: isAppearance(miraAppearance) ? miraAppearance : "light",
  };
}

export function applyTheme(next: ThemePreference): void {
  const root = document.documentElement;
  root.dataset["miraColorTheme"] = next.preset;
  root.dataset["miraThemeMode"] = next.appearance;
  root.classList.toggle("dark", next.appearance === "dark");
  try {
    // Only a local visual preference; no user identity or cloud session is persisted here.
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Private browsing / storage denial is safe: the in-page theme still works.
  }
}

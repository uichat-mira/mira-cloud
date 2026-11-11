// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  applyTheme,
  currentTheme,
  isAppearance,
  isPreset,
} from "../src/theme/mira-design/theme-preference";

beforeEach(() => {
  const root = document.documentElement;
  root.removeAttribute("data-mira-color-theme");
  root.removeAttribute("data-mira-theme-mode");
  root.classList.remove("dark");
  localStorage.clear();
});

describe("Web-safe MiraDesign theme switching", () => {
  it("reads the default warm-neutral light theme from the document", () => {
    expect(currentTheme()).toEqual({ preset: "warm-neutral", appearance: "light" });
  });

  it("applies preset and appearance without depending on a native shell", () => {
    applyTheme({ preset: "slate-ocean", appearance: "dark" });
    expect(document.documentElement.dataset["miraColorTheme"]).toBe("slate-ocean");
    expect(document.documentElement.dataset["miraThemeMode"]).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(JSON.parse(localStorage.getItem("mira-cloud-theme-v1") ?? "null")).toEqual({
      preset: "slate-ocean",
      appearance: "dark",
    });
    expect(currentTheme()).toEqual({ preset: "slate-ocean", appearance: "dark" });

    applyTheme({ preset: "archive-green", appearance: "light" });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("validates preset and appearance values from persistent storage", () => {
    expect(isPreset("warm-neutral")).toBe(true);
    expect(isPreset("default")).toBe(false);
    expect(isAppearance("dark")).toBe(true);
    expect(isAppearance("system")).toBe(false);
  });
});

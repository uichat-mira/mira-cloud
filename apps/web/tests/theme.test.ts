import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  appearances,
  foundationRevision,
  presetIds,
  renderThemeCss,
  themePresetMap,
  themeVariables,
  type MiraColorVariableSet,
} from "../src/theme/mira-design/index";

const webRoot = new URL("../", import.meta.url);

function gitBlobSha(text: string): string {
  const body = Buffer.from(text, "utf8");
  return createHash("sha1")
    .update("blob " + body.byteLength + "\0")
    .update(body)
    .digest("hex");
}

function readWebFile(path: string): string {
  return readFileSync(new URL(path, webRoot), "utf8");
}

async function loadUpstream(): Promise<{
  getThemeVariables: (preset: string, appearance: "light" | "dark") => Record<string, string>;
  themePresets: Array<{ id: string; label: string }>;
}> {
  const url = new URL("../src/theme/mira-design/upstream/colorThemes.ts", import.meta.url).href;
  return (await import(url)) as {
    getThemeVariables: (preset: string, appearance: "light" | "dark") => Record<string, string>;
    themePresets: Array<{ id: string; label: string }>;
  };
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(?:ts|tsx|css)$/.test(entry) ? [path] : [];
  });
}

const requiredSemanticTokens = [
  "--mira-color-primary",
  "--mira-color-primary-hover",
  ...Array.from({ length: 9 }, (_, index) => `--mira-color-primary-${index + 1}`),
  "--mira-color-cloudy",
  ...Array.from({ length: 9 }, (_, index) => `--mira-color-cloudy-${index + 1}`),
  "--mira-color-pampas",
  ...Array.from({ length: 9 }, (_, index) => `--mira-color-pampas-${index + 1}`),
  "--mira-color-secondary",
  "--mira-color-surface-primary",
  "--mira-color-surface-auth",
  "--mira-color-surface-soft",
  "--mira-color-surface-secondary",
  "--mira-color-surface-tertiary",
  "--mira-color-surface-elevated",
  "--mira-color-border",
  "--mira-color-text-primary",
  "--mira-color-text-secondary",
  "--mira-color-text-tertiary",
  "--mira-color-text-inverted",
  "--mira-color-icon-primary",
  "--mira-color-icon-secondary",
  "--mira-color-icon-tertiary",
  "--mira-color-icon-inverted",
  ...["success", "warning", "danger", "info"].flatMap((status) =>
    ["", "-soft", "-border", "-text"].map((suffix) => `--mira-color-${status}${suffix}`),
  ),
];

describe("MiraDesign Foundation provenance", () => {
  it("pins one full Mira Desktop revision and the expected upstream blobs", () => {
    expect(readWebFile("src/theme/mira-design/upstream/desktop-revision.txt").trim()).toBe(
      foundationRevision,
    );
    expect(foundationRevision).toBe("5036067d3a87ba95d798e01ededc7fbd678327de");
    expect(gitBlobSha(readWebFile("src/theme/mira-design/upstream/colorThemes.ts"))).toBe(
      "95fcc33be0b6769cae4e5ba4e1e32de69aa5bef2",
    );
    expect(gitBlobSha(readWebFile("src/theme/mira-design/upstream/styles.css"))).toBe(
      "55c9f5622c8334f1b2bc0f38856241fae7562a4c",
    );
    expect(gitBlobSha(readWebFile("src/theme/mira-design/upstream/tailwind.config.cjs"))).toBe(
      "591f6df8dde4f3726ecfce5d06fca6f2e19a099c",
    );
  });

  it("retires the Mobile-derived token authority instead of running both in parallel", () => {
    for (const path of [
      "src/theme/upstream/tokens.ts",
      "src/theme/upstream/palette.ts",
      "src/theme/token-contract.ts",
      "src/theme/mobile-revision.txt",
      "src/styles/tokens.generated.css",
    ]) {
      expect(existsSync(new URL(path, webRoot)), path).toBe(false);
    }
  });
});

describe("MiraDesign semantic token contract", () => {
  it("matches every pinned Desktop semantic value for all four presets and both modes", async () => {
    const upstream = await loadUpstream();
    expect(presetIds).toHaveLength(4);
    expect(themePresetMap["warm-neutral"].label).toBe(upstream.themePresets[0]?.label);
    for (const preset of presetIds) {
      for (const appearance of appearances) {
        const expected = Object.fromEntries(
          Object.entries(upstream.getThemeVariables(preset, appearance)).map(([name, value]) => [
            name.replace("--color-", "--mira-color-"),
            value,
          ]),
        );
        expect(themeVariables[preset][appearance]).toEqual(expected);
      }
    }
  });

  it("generates a complete semantic set for every preset and mode", () => {
    const seen = new Set<string>();
    for (const preset of presetIds) {
      for (const appearance of appearances) {
        const variables: MiraColorVariableSet = themeVariables[preset][appearance];
        for (const token of requiredSemanticTokens) {
          expect(variables[token], `${preset}/${appearance} ${token}`).toMatch(/^\S/);
        }
        seen.add(`${preset}:${appearance}`);
      }
    }
    expect(seen.size).toBe(8);
    expect(themeVariables["warm-neutral"].light["--mira-color-primary"]).toBe("193 95 60");
    expect(themeVariables["warm-neutral"].light["--mira-color-surface-soft"]).toBe("245 240 232");
    expect(themeVariables["slate-ocean"].dark["--mira-color-surface-primary"]).toBe("23 26 28");
  });

  it("keeps generous text contrast for each preset and mode", () => {
    function luminance(triplet: string): number {
      const channels = triplet.split(" ").map((value) => Number(value) / 255);
      const [red = 0, green = 0, blue = 0] = channels.map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    }
    function contrast(foreground: string, background: string): number {
      const first = luminance(foreground);
      const second = luminance(background);
      return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
    }

    for (const preset of presetIds) {
      for (const appearance of appearances) {
        const variables = themeVariables[preset][appearance];
        expect(
          contrast(
            variables["--mira-color-text-primary"] ?? "",
            variables["--mira-color-surface-primary"] ?? "",
          ),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(
            variables["--mira-color-text-secondary"] ?? "",
            variables["--mira-color-surface-primary"] ?? "",
          ),
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("Tailwind 4 consumption and generated CSS", () => {
  it("regenerates the exact CSS bundle for every theme selector", () => {
    const saved = readWebFile("src/styles/mira-design.generated.css");
    expect(saved).toBe(renderThemeCss());
    for (const [token, value] of [
      ["--mira-space-1", "4px"],
      ["--mira-space-10", "40px"],
      ["--mira-radius-ui-control", "8px"],
      ["--mira-radius-ui-hero", "20px"],
      ["--mira-shadow-md", "0 8px 24px rgba(15, 23, 42, 0.08)"],
      ["--mira-type-display-size", "28px"],
      ["--mira-type-body-line-height", "1.6"],
      ["--mira-motion-duration-150", "150ms"],
    ]) {
      expect(saved).toContain(`${token}: ${value};`);
    }
    for (const preset of presetIds) {
      for (const appearance of appearances) {
        expect(saved).toContain(
          `data-mira-color-theme="${preset}"][data-mira-theme-mode="${appearance}"`,
        );
      }
    }
  });

  it("maps every Desktop-equivalent color token into Tailwind 4 @theme", () => {
    const globals = readWebFile("src/styles/globals.css");
    for (const token of requiredSemanticTokens) {
      const utilityToken = token.replace("--mira-color-", "--color-");
      expect(globals).toContain(`${utilityToken}: rgb(var(${token}));`);
    }
    for (const token of [
      "--spacing-space-1",
      "--radius-ui-control",
      "--radius-radius-sm",
      "--shadow-shadow-sm",
      "--font-sans",
      "--text-display",
      "--text-heading-1",
      "--text-heading-2",
      "--text-body",
      "--text-body-small",
      "--text-caption",
    ]) {
      expect(globals).toContain(`${token}:`);
    }
    expect(globals).toContain("@custom-variant dark (&:where(.dark, .dark *));");
  });

  it("does not leave old parallel Mira aliases in Web source", () => {
    const files = sourceFiles(new URL("../src", import.meta.url).pathname).filter(
      (path) => !path.includes("/theme/mira-design/upstream/"),
    );
    const forbidden = [
      "mira-canvas",
      "mira-card",
      "mira-soft",
      "mira-action",
      "mira-on-primary",
      "mira-input",
      "mira-button",
      "mira-icon-button",
      "data-mira-preset",
      "data-mira-appearance",
    ];
    for (const file of files) {
      const contents = readFileSync(file, "utf8");
      for (const alias of forbidden) {
        expect(contents, `${file} contains ${alias}`).not.toContain(alias);
      }
    }
  });
});

import { readFileSync, writeFileSync } from "node:fs";
import {
  appearances,
  foundationRevision,
  presetIds,
  renderThemeCss,
  type ThemePresetId,
  type ThemeVariableSets,
} from "../src/theme/mira-design/foundation.ts";

interface UpstreamPreset {
  id: string;
  label: string;
  description: string;
  seed: string;
}

interface UpstreamModule {
  getThemeVariables: (
    preset: string,
    appearance: (typeof appearances)[number],
  ) => Record<string, string>;
  themePresets: UpstreamPreset[];
}

const upstreamUrl = new URL("../src/theme/mira-design/upstream/colorThemes.ts", import.meta.url)
  .href;
const upstream = (await import(upstreamUrl)) as UpstreamModule;

const generatedDataDestination = new URL(
  "../src/theme/mira-design/themes.generated.ts",
  import.meta.url,
);
const generatedCssDestination = new URL("../src/styles/mira-design.generated.css", import.meta.url);

function buildThemeVariables(): ThemeVariableSets {
  const available = new Set(upstream.themePresets.map((preset) => preset.id));
  for (const preset of presetIds) {
    if (!available.has(preset)) {
      throw new Error(`Pinned Mira Desktop source is missing preset ${preset}`);
    }
  }

  const result = {} as Record<
    ThemePresetId,
    Record<(typeof appearances)[number], Record<string, string>>
  >;
  for (const preset of presetIds) {
    result[preset] = {
      light: {},
      dark: {},
    };
    for (const appearance of appearances) {
      const variables = upstream.getThemeVariables(preset, appearance);
      for (const [name, value] of Object.entries(variables)) {
        if (!name.startsWith("--color-")) {
          throw new Error(`Unexpected Mira Desktop token ${name}`);
        }
        result[preset][appearance][name.replace("--color-", "--mira-color-")] = value;
      }
    }
  }
  return result;
}

function buildGeneratedData(themeVariables: ThemeVariableSets): string {
  const presets = upstream.themePresets.map(({ id, label, description, seed }) => ({
    id,
    label,
    description,
    seed,
  }));

  return [
    `/* Generated from pinned uichat-mira/mira-desktop commit ${foundationRevision}. Do not edit by hand. */`,
    'import type { MiraThemePresetMeta, ThemeVariableSets } from "./foundation.ts";',
    "",
    `export const themePresets = ${JSON.stringify(presets, null, 2)} as const satisfies readonly MiraThemePresetMeta[];`,
    "",
    `export const themeVariablesByPreset = ${JSON.stringify(themeVariables, null, 2)} as const satisfies ThemeVariableSets;`,
    "",
  ].join("\n");
}

function writeOrCheck(path: URL, contents: string, label: string): void {
  if (process.argv.includes("--check")) {
    const actual = readFileSync(path, "utf8");
    if (actual !== contents) {
      console.error(`${label} has drifted from the pinned Mira Desktop source.`);
      process.exitCode = 1;
    }
  } else {
    writeFileSync(path, contents);
    console.log(`${label} regenerated from pinned Mira Desktop sources.`);
  }
}

const themeVariables = buildThemeVariables();
writeOrCheck(
  generatedDataDestination,
  buildGeneratedData(themeVariables),
  "MiraDesign generated token data",
);
writeOrCheck(
  generatedCssDestination,
  renderThemeCss(themeVariables, foundationRevision),
  "MiraDesign generated CSS",
);

if (process.argv.includes("--check") && process.exitCode !== 1) {
  console.log("MiraDesign theme contract passed.");
}

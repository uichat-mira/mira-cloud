import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { themePresets } from "../src/theme/upstream/palette";
import { themeVariables, renderThemeCss, presetIds, contrast } from "../src/theme/token-contract";

function gitBlobSha(text: string): string {
  const body = Buffer.from(text, "utf8");
  return createHash("sha1")
    .update("blob " + body.byteLength + "\0")
    .update(body)
    .digest("hex");
}

describe("Mira Mobile pinned design tokens", () => {
  it("pins exactly one full upstream revision and both original blobs", () => {
    const pinned = readFileSync(
      new URL("../src/theme/mobile-revision.txt", import.meta.url),
      "utf8",
    ).trim();
    expect(pinned).toBe("31ee125953fe23e0af14f280a0b316637e46fa45");
    expect(
      gitBlobSha(readFileSync(new URL("../src/theme/upstream/tokens.ts", import.meta.url), "utf8")),
    ).toBe("00c242f81edf062e44e951851e8b7ecd50e18a1f");
    expect(
      gitBlobSha(
        readFileSync(new URL("../src/theme/upstream/palette.ts", import.meta.url), "utf8"),
      ),
    ).toBe("271e3427bb93a55a54c3e95ef6f78c595048a4fd");
  });

  it("maps all four canonical presets into distinct light/dark semantic themes", () => {
    expect(presetIds).toHaveLength(4);
    const seen = new Set<string>();
    for (const preset of presetIds) {
      for (const appearance of ["light", "dark"] as const) {
        const actual = themeVariables(preset, appearance);
        const source = themePresets[preset][appearance];
        expect(actual["--mira-color-primary"]).toBe(source.primary);
        expect(actual["--mira-color-canvas"]).toBe(source.bg.canvas);
        expect(actual["--mira-color-text"]).toBe(source.text.base);
        expect(actual["--mira-color-border"]).toBe(source.border.default);
        expect(actual["--mira-color-success"]).toBe(source.status.success);
        expect(
          contrast(
            actual["--mira-color-on-primary"] ?? "#FFFFFF",
            actual["--mira-color-action"] ?? "#000000",
          ),
        ).toBeGreaterThanOrEqual(4.5);
        expect(contrast(source.text.ink, source.bg.canvas)).toBeGreaterThanOrEqual(4.5);
        seen.add(preset + ":" + appearance);
      }
    }
    expect(seen.size).toBe(8);
  });

  it("generates the exact versioned CSS bundle without manual overrides", () => {
    const generated = renderThemeCss();
    const saved = readFileSync(
      new URL("../src/styles/tokens.generated.css", import.meta.url),
      "utf8",
    );
    expect(saved).toBe(generated);
    for (const preset of presetIds) {
      for (const mode of ["light", "dark"]) {
        expect(saved).toContain(
          'data-mira-preset="' + preset + '"][data-mira-appearance="' + mode + '"]',
        );
      }
    }
  });
});

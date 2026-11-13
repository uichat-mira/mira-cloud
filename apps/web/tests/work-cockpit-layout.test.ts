import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cockpitCss = readFileSync(new URL("../src/features/work/work.css", import.meta.url), "utf8");

function declarations(selector: string): string {
  const marker = selector + " {";
  const start = cockpitCss.indexOf(marker);
  if (start < 0) throw new Error("Missing CSS rule: " + selector);
  const end = cockpitCss.indexOf("\n}", start);
  if (end < 0) throw new Error("Unterminated CSS rule: " + selector);
  return cockpitCss.slice(start, end + 2);
}

describe("Work cockpit card rhythm", () => {
  it("draws list dividers between items but never at the end", () => {
    for (const selector of [
      ".workbench-work-row",
      ".workbench-attention-row",
      ".workbench-artifact-row",
    ]) {
      expect(declarations(selector)).not.toContain("border-bottom");
      expect(cockpitCss).toContain(selector + ":not(:last-child)");
    }
    expect(declarations(".workbench-artifact-row:not(:last-child)")).toContain(
      "border-bottom: 1px solid rgb(var(--mira-color-border))",
    );
  });

  it("stretches paired cards through the grid and nested content instead of fixed heights", () => {
    expect(declarations(".workbench-cockpit-grid")).toContain("align-items: stretch;");
    expect(declarations(".workbench-cockpit-grid")).not.toContain("align-items: start;");
    expect(declarations(".workbench-cockpit-card")).toContain("display: flex;");
    expect(declarations(".workbench-cockpit-card-inner")).toContain("flex: 1 1 auto;");
    expect(declarations(".workbench-cockpit-card-content")).toContain("flex: 1 1 auto;");
    expect(declarations(".workbench-schedule-preview")).toContain("flex: 1 1 auto;");
    expect(declarations(".workbench-schedule-boundary")).toContain("margin-top: auto;");
    expect(cockpitCss).toContain("@container (max-width: 730px)");
  });
});

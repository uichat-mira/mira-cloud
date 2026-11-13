import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  createWorkspaceShellStyleVars,
  defaultWorkspaceShellLayout,
} from "../src/features/workspace-shell/layout";

const repoRoot = new URL("../../../", import.meta.url).pathname;
const shellCss = readFileSync(
  join(repoRoot, "apps/web/src/features/workspace-shell/workspace-shell.css"),
  "utf8",
);
const workCss = readFileSync(join(repoRoot, "apps/web/src/features/work/work.css"), "utf8");

function cssRule(css: string, selector: string): string {
  const marker = selector + " {";
  const start = css.indexOf(marker);
  if (start === -1) throw new Error("Missing CSS rule: " + selector);
  const end = css.indexOf("\n}", start);
  if (end === -1) throw new Error("Unterminated CSS rule: " + selector);
  return css.slice(start, end + 2);
}

describe("AGT-062 Workspace shell geometry", () => {
  it("publishes one typed geometry source for desktop header and separators", () => {
    expect(defaultWorkspaceShellLayout.headerHeight).toBe(58);
    expect(defaultWorkspaceShellLayout.separatorWidth).toBe(1);

    const vars = createWorkspaceShellStyleVars({
      headerHeight: 64,
      separatorWidth: 2,
    });

    expect(vars["--workspace-header-height"]).toBe("64px");
    expect(vars["--workspace-separator-width"]).toBe("2px");
  });

  it("keeps rail, sidebar and topbar on exact shared header geometry", () => {
    expect(shellCss).not.toContain("min-height: 58px");
    expect(shellCss).not.toContain("min-height: var(--workspace-header-height)");
    expect(
      shellCss.match(/height: var\(--workspace-header-height\);/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
    expect(
      shellCss.match(
        /border-bottom: var\(--workspace-separator-width\) solid rgb\(var\(--mira-color-border\)\);/g,
      )?.length ?? 0,
    ).toBeGreaterThanOrEqual(3);
    expect(shellCss).toContain(".workspace-topbar {");
    expect(shellCss).not.toContain(".workspace-topicbar");
    expect(shellCss).not.toContain("--workspace-topicbar-height");
  });
  it("gives every page the Home-sized canvas without feature-local outer width caps", () => {
    expect(defaultWorkspaceShellLayout.contentMaxWidth).toBe(1320);
    const vars = createWorkspaceShellStyleVars({ contentMaxWidth: 1440 });
    expect(vars["--workspace-content-max-width"]).toBe("1440px");
    expect(cssRule(shellCss, ".workspace-content")).toContain(
      "max-width: var(--workspace-content-max-width);",
    );
    expect(cssRule(shellCss, ".workspace-page-body")).toContain("width: 100%;");
    expect(cssRule(shellCss, ".workspace-page-body")).toContain("min-width: 0;");
    expect(cssRule(shellCss, ".workspace-page-body")).not.toContain("max-width:");

    for (const selector of [
      ".workbench-full-ledger",
      ".workbench-task-overview,\n.workbench-task-progress",
      ".workbench-artifact-preview",
    ]) {
      expect(cssRule(workCss, selector)).not.toMatch(/(?:max-)?width:\\s*min\\(100%,\\s*\\d+px\\)/);
    }
    // Text-column limits are allowed; they do not constrain the page surface.
    expect(workCss).toContain(".workbench-artifact-preview p {");
  });

});

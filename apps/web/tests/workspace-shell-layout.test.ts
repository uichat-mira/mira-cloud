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
});

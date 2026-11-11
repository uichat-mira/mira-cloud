import { describe, expect, it } from "vitest";

import { findWorkspaceViolations, type WorkspacePackage } from "../scripts/lib/workspace-check.ts";

function workspacePackage(overrides: Partial<WorkspacePackage> = {}): WorkspacePackage {
  return {
    dir: "/repo/packages/example",
    name: "@mira-cloud/example",
    scripts: { check: "tsc --noEmit" },
    ...overrides,
  };
}

describe("findWorkspaceViolations", () => {
  it("accepts an empty workspace", () => {
    expect(findWorkspaceViolations([])).toEqual([]);
  });

  it("accepts a package with a runnable check script", () => {
    expect(findWorkspaceViolations([workspacePackage()])).toEqual([]);
  });

  it("rejects a package with no check script", () => {
    expect(findWorkspaceViolations([workspacePackage({ scripts: {} })])).toEqual([
      {
        dir: "/repo/packages/example",
        name: "@mira-cloud/example",
        missingScripts: ["check"],
      },
    ]);
  });

  it("rejects a blank check script", () => {
    const result = findWorkspaceViolations([workspacePackage({ scripts: { check: "   " } })]);
    expect(result).toHaveLength(1);
    expect(result[0]?.missingScripts).toEqual(["check"]);
  });

  it("reports only invalid packages in mixed workspaces", () => {
    const result = findWorkspaceViolations([
      workspacePackage(),
      workspacePackage({
        dir: "/repo/apps/web",
        name: "@mira-cloud/web",
        scripts: { check: "" },
      }),
    ]);
    expect(result).toEqual([
      {
        dir: "/repo/apps/web",
        name: "@mira-cloud/web",
        missingScripts: ["check"],
      },
    ]);
  });
});

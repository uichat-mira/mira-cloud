export interface WorkspacePackage {
  readonly dir: string;
  readonly name: string;
  readonly scripts: Readonly<Record<string, string>>;
}

export interface WorkspaceViolation {
  readonly dir: string;
  readonly name: string;
  readonly missingScripts: readonly string[];
}

export const REQUIRED_WORKSPACE_SCRIPTS = ["check"] as const;

function hasRunnableScript(script: string | undefined): script is string {
  return typeof script === "string" && script.trim().length > 0;
}

export function findWorkspaceViolations(
  packages: readonly WorkspacePackage[],
): readonly WorkspaceViolation[] {
  return packages.flatMap((pkg) => {
    const missingScripts = REQUIRED_WORKSPACE_SCRIPTS.filter(
      (name) => !hasRunnableScript(pkg.scripts[name]),
    );

    return missingScripts.length === 0 ? [] : [{ dir: pkg.dir, name: pkg.name, missingScripts }];
  });
}

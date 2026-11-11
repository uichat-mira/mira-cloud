import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { findWorkspaceViolations, type WorkspacePackage } from "./lib/workspace-check.ts";

interface WorkspaceEntry {
  readonly path: string;
  readonly name: string;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function readWorkspaceEntries(): readonly WorkspaceEntry[] {
  const output = execFileSync("pnpm", ["m", "ls", "--json", "--depth", "-1"], {
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });
  const parsed: unknown = JSON.parse(output);

  if (!Array.isArray(parsed)) {
    throw new Error("pnpm workspace listing was not a JSON array");
  }

  return parsed.map((entry: unknown) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as { path?: unknown }).path !== "string"
    ) {
      throw new Error("pnpm workspace entry is missing a path");
    }

    const candidate = entry as { path: string; name?: unknown };
    return {
      path: candidate.path,
      name: typeof candidate.name === "string" ? candidate.name : candidate.path,
    };
  });
}

function readScripts(pkg: Record<string, unknown>, dir: string): Readonly<Record<string, string>> {
  const scriptsValue = pkg["scripts"];
  if (scriptsValue === undefined) return {};

  if (typeof scriptsValue !== "object" || scriptsValue === null || Array.isArray(scriptsValue)) {
    throw new Error(`${join(dir, "package.json")} has an invalid scripts field`);
  }

  const scripts: Record<string, string> = {};
  for (const [name, value] of Object.entries(scriptsValue)) {
    if (typeof value !== "string") {
      throw new Error(`${join(dir, "package.json")} script "${name}" is not a string`);
    }
    scripts[name] = value;
  }
  return scripts;
}

function readWorkspacePackage(dir: string, fallbackName: string): WorkspacePackage {
  const pkg = readJson(join(dir, "package.json"));
  if (typeof pkg !== "object" || pkg === null) {
    throw new Error(`${join(dir, "package.json")} is not a JSON object`);
  }

  const record = pkg as Record<string, unknown>;
  return {
    dir,
    name: typeof record["name"] === "string" ? record["name"] : fallbackName,
    scripts: readScripts(record, dir),
  };
}

const root = resolve(import.meta.dirname, "..");
const packages = readWorkspaceEntries()
  .filter((entry) => resolve(entry.path) !== root)
  .map((entry) => readWorkspacePackage(resolve(entry.path), entry.name));

const violations = findWorkspaceViolations(packages);

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(
      `FAIL ${violation.name} (${violation.dir}) is missing runnable script(s): ${violation.missingScripts.join(", ")}`,
    );
  }
  process.exitCode = 1;
} else {
  console.log(
    `Workspace Contract passed: ${packages.length} package(s) declare a runnable check script.`,
  );
}

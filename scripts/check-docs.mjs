#!/usr/bin/env node
/**
 * Design-only T1-style source validation, not a deployed service check.
 * No dependencies, network, credentials, infrastructure or production effects.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "README.md",
  "AGENTS.md",
  "docs/architecture/v0.4.md",
  "docs/product/workbench.md",
  "docs/engineering/environment.md",
  "docs/decisions/ADR-001-repository-scope.md",
  "prototypes/workbench-v0.1/index.html",
  "prototypes/workbench-v0.1/notes.md",
];
const failures = [];

for (const path of required) {
  if (!existsSync(join(root, path))) failures.push(`Missing required design file: ${path}`);
}

function walk(folder) {
  if (!existsSync(folder)) return [];
  const items = [];
  for (const dirent of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, dirent.name);
    if (dirent.isDirectory()) items.push(...walk(path));
    else if (dirent.isFile() && extname(dirent.name).toLowerCase() === ".md") items.push(path);
  }
  return items;
}

// For this small design-only tree, validate relative Markdown link destinations.
// External URLs and fragment-only links are intentionally out of scope.
const markdown = [join(root, "README.md"), join(root, "AGENTS.md"), ...walk(join(root, "docs")), ...walk(join(root, "prototypes"))]
  .filter(existsSync);

for (const file of markdown) {
  const source = readFileSync(file, "utf8");
  if (!source.trim()) failures.push(`Empty Markdown file: ${relative(root, file)}`);
  const linkPattern = /(?<!!)\[[^\]]+\]\(([^)]+)\)/g;
  for (const match of source.matchAll(linkPattern)) {
    const raw = match[1].trim().replace(/^<|>$/g, "");
    if (!raw || raw.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;
    const target = raw.split("#")[0].split("?")[0];
    let resolved;
    try { resolved = resolve(dirname(file), decodeURIComponent(target)); }
    catch { failures.push(`Invalid encoded link in ${relative(root, file)}: ${raw}`); continue; }
    if (!resolved.startsWith(root + "/") && resolved !== root) {
      failures.push(`Relative link escapes repository: ${relative(root, file)} -> ${raw}`);
    } else if (!existsSync(resolved)) {
      failures.push(`Broken relative link: ${relative(root, file)} -> ${raw}`);
    }
  }
}

const html = join(root, "prototypes/workbench-v0.1/index.html");
if (existsSync(html)) {
  const source = readFileSync(html, "utf8");
  if (!/<html\b/i.test(source) || !/Mira/i.test(source)) {
    failures.push("Prototype HTML is missing its expected document or identity markers");
  }
}

if (failures.length > 0) {
  for (const item of failures) console.error("FAIL", item);
  process.exitCode = 1;
} else {
  console.log(`Docs Contract passed: ${markdown.length} Markdown files; no runtime or server checks attempted.`);
}

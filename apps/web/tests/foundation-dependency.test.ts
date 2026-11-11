import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = new URL("../", import.meta.url).pathname;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      if (path.includes("/theme/mira-design/upstream")) return [];
      return sourceFiles(path);
    }
    return /\.(?:ts|tsx)$/.test(entry) ? [path] : [];
  });
}

describe("MiraDesign Foundation runtime boundary", () => {
  it("has no Desktop runtime, Electron, Tauri or backend imports", () => {
    const forbidden = [
      "electron",
      "@tauri-apps",
      "mira-desktop",
      "/desktop/src/",
      "features/chat",
      "features/Settings",
    ];
    for (const file of sourceFiles(join(webRoot, "src"))) {
      const contents = readFileSync(file, "utf8");
      for (const dependency of forbidden) {
        expect(contents, `${file} imports ${dependency}`).not.toContain(`from "${dependency}`);
        expect(contents, `${file} imports ${dependency}`).not.toContain(`from '${dependency}`);
      }
    }
  });

  it("keeps the Desktop palette generator out of the browser dependency graph", () => {
    const pkg = JSON.parse(readFileSync(join(webRoot, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["@ant-design/colors"]).toBeUndefined();
    expect(pkg.devDependencies?.["@ant-design/colors"]).toBe("8.0.1");
    expect(pkg.dependencies?.["electron"]).toBeUndefined();
    expect(pkg.dependencies?.["@tauri-apps/api"]).toBeUndefined();
  });
});

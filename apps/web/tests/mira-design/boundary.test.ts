import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const webRoot = new URL("../../", import.meta.url).pathname;
const componentRoot = join(webRoot, "src/components/mira-design");
const sourceFiles = readdirSync(componentRoot)
  .filter((entry) => entry.endsWith(".tsx"))
  .sort();
const entry = readFileSync(join(componentRoot, "index.ts"), "utf8");

function workspaceSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return workspaceSourceFiles(path);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("MiraDesign component ownership boundary", () => {
  it("exports every Cloud-owned component from the single MiraDesign entry", () => {
    expect(sourceFiles.length).toBeGreaterThanOrEqual(29);
    for (const file of sourceFiles) {
      expect(entry, `${file} is not exported`).toContain(`"./${file}"`);
    }
  });

  it("retires the previous parallel components/ui layer", () => {
    expect(existsSync(join(webRoot, "src/components/ui"))).toBe(false);
    for (const file of workspaceSourceFiles(join(webRoot, "src"))) {
      expect(readFileSync(file, "utf8"), file).not.toContain("components/ui");
    }
  });

  it("does not import Desktop runtime, feature, backend or i18n code", () => {
    const forbidden = [
      "electron",
      "@tauri-apps",
      "mira-desktop",
      "/desktop/src/",
      "react-i18next",
      "i18next",
      "react-router-dom",
      "desktopRuntime",
      "@/shared/",
      "/desktop/src/",
      "features/",
      "shared/lib/request",
      "shared/lib/clipboard",
      "fetch(",
      "XMLHttpRequest",
      "zustand",
    ];

    for (const file of sourceFiles) {
      const contents = readFileSync(join(componentRoot, file), "utf8");
      for (const dependency of forbidden) {
        expect(contents, `${file} imports ${dependency}`).not.toContain(dependency);
      }
    }
  });

  it("consumes Foundation roles instead of a parallel raw palette", () => {
    const rawPalette =
      /(?:bg|text|border)-(?:white|black|slate|gray|rose|emerald|sky)(?:-|\b)|#[0-9a-fA-F]{3,8}/;
    for (const file of sourceFiles) {
      expect(readFileSync(join(componentRoot, file), "utf8"), file).not.toMatch(rawPalette);
    }
  });

  it("owns every non-Tailwind MiraDesign component CSS hook in Cloud styles", () => {
    const globals = readFileSync(join(webRoot, "src/styles/globals.css"), "utf8");
    expect(globals).toContain(".mira-range-slider {");
    expect(globals).toContain(".mira-range-slider-compact::-webkit-slider-thumb");
    expect(globals).toContain(".mira-stable-scrollbar {");
    expect(globals).toContain(".mira-hide-scrollbar {");
    expect(globals).toContain(".mira-range-slider-vertical {");
    expect(globals).toContain(".mira-markdown-editor {");

    for (const file of sourceFiles) {
      const contents = readFileSync(join(componentRoot, file), "utf8");
      expect(contents, file).not.toContain("claude-range-slider");
      expect(contents, file).not.toMatch(/(?:^|[\\s"'])stable-scrollbar(?:[\\s"']|$)/);
    }
  });

  it("keeps AGT-049 platform/data boundaries explicit", () => {
    const modal = readFileSync(join(componentRoot, "Modal.tsx"), "utf8");
    const searchSelect = readFileSync(join(componentRoot, "SearchSelectModal.tsx"), "utf8");
    const externalLink = readFileSync(join(componentRoot, "ExternalLink.tsx"), "utf8");
    const streaming = readFileSync(join(componentRoot, "StreamingTextRenderer.tsx"), "utf8");

    expect(modal).not.toContain("globalModalApi");
    expect(modal).toContain("mira-design:modal");
    expect(searchSelect).toContain("loadItems:");
    expect(searchSelect).toContain("AbortSignal");
    expect(searchSelect).not.toContain("url:");
    expect(externalLink).toContain("openUrl?:");
    expect(externalLink).toContain("copyText?:");
    expect(externalLink).not.toContain("DesktopHostKind");
    expect(streaming).not.toMatch(/^let\s+/m);
  });

  it("keeps heavy content behind an explicit dynamic entry", () => {
    const contentEntry = readFileSync(join(componentRoot, "content.ts"), "utf8");
    expect(entry).not.toMatch(/export\s+\{[^}]*MarkdownText/);
    expect(entry).not.toMatch(/export\s+\{[^}]*MarkdownEditor/);
    expect(entry).toContain('import("./MarkdownText.tsx")');
    expect(entry).toContain('import("./MarkdownEditor.tsx")');
    expect(contentEntry).toContain('from "./MarkdownText.tsx"');
    expect(contentEntry).toContain('from "./MarkdownEditor.tsx"');
  });

  it("keeps explicit non-goal Desktop surfaces out of MiraDesign", () => {
    for (const excluded of [
      "AccessPointPreviewDrawer.tsx",
      "CoverageReportPanel.tsx",
      "MicroFrontend.tsx",
    ]) {
      expect(existsSync(join(componentRoot, excluded)), excluded).toBe(false);
    }
  });

  it("only declares heavy direct dependencies that source actually consumes", () => {
    const packageJson = JSON.parse(readFileSync(join(webRoot, "package.json"), "utf8")) as {
      dependencies: Record<string, string>;
    };
    expect(packageJson.dependencies).not.toHaveProperty("mermaid");
    expect(packageJson.dependencies).not.toHaveProperty("@mermaid-js/parser");
    expect(packageJson.dependencies).not.toHaveProperty("@milkdown/kit");
    for (const required of [
      "@milkdown/crepe",
      "@milkdown/react",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@streamdown/code",
      "@streamdown/math",
      "@streamdown/mermaid",
      "@tanstack/react-table",
      "katex",
      "streamdown",
    ]) {
      expect(packageJson.dependencies, required).toHaveProperty(required);
    }
  });

  it("does not reintroduce mutable module-global Message state", () => {
    const messageSource = readFileSync(join(componentRoot, "Message.tsx"), "utf8");
    expect(messageSource).not.toContain("globalMessageApi");
    expect(messageSource).not.toMatch(/^let\\s+/m);
    expect(messageSource).toContain("mira-design:message");
  });

  it("records the pinned upstream revision and per-component source blobs", () => {
    const manifest = readFileSync(
      new URL("../../../../docs/design/mira-design-migration.md", import.meta.url),
      "utf8",
    );
    expect(manifest).toContain("5036067d3a87ba95d798e01ededc7fbd678327de");
    for (const component of [
      "Alert.tsx",
      "Button.tsx",
      "Card.tsx",
      "SectionCard.tsx",
      "Input.tsx",
      "Skeleton.tsx",
      "Switch.tsx",
      "Slider.tsx",
      "Tag.tsx",
      "TagInput.tsx",
      "Tooltip.tsx",
      "NavItem.tsx",
      "SegmentedTabs.tsx",
      "TabCard.tsx",
      "CollapsiblePanel.tsx",
      "ExpandableSection.tsx",
      "Drawer.tsx",
      "DropdownMenu.tsx",
      "ConfirmDialog.tsx",
      "Message.tsx",
      "Result.tsx",
      "FullPageStatus.tsx",
      "FileIcon.tsx",
      "ImagePreviewOverlay.tsx",
      "StepIndicator.tsx",
      "TerminalPanel.tsx",
      "WelcomePanel.tsx",
    ]) {
      expect(manifest, `${component} missing from manifest`).toContain(component);
    }
  });
});

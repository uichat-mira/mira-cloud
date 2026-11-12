import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../../../", import.meta.url).pathname;

function readRepo(path: string) {
  return readFileSync(join(repoRoot, path), "utf8");
}

const desktopSharedUi = [
  "AccessPointPreviewDrawer.tsx",
  "Alert.tsx",
  "AvatarPicker.tsx",
  "Badge.tsx",
  "Button.tsx",
  "Card.tsx",
  "CodeBlock.tsx",
  "CollapsiblePanel.tsx",
  "CompactAudioPlayer.tsx",
  "ConfirmDialog.tsx",
  "CoverageReportPanel.tsx",
  "Divider.tsx",
  "Drawer.tsx",
  "DropdownMenu.tsx",
  "ErrorBoundary.tsx",
  "ExpandableSection.tsx",
  "ExternalLink.tsx",
  "FileIcon.tsx",
  "FileListItem.tsx",
  "FileUploadDropzone.tsx",
  "FullPageStatus.tsx",
  "GithubIcon.tsx",
  "IconButton.tsx",
  "ImagePreviewOverlay.tsx",
  "Input.tsx",
  "MarkdownEditor.tsx",
  "MarkdownText.tsx",
  "Message.tsx",
  "MicroFrontend.tsx",
  "Modal.tsx",
  "NavigationCardTabs.tsx",
  "NavItem.tsx",
  "NotionIcon.tsx",
  "Result.tsx",
  "SearchSelectModal.tsx",
  "SearchSelectModalChrome.tsx",
  "SectionCard.tsx",
  "SegmentedTabs.tsx",
  "Select.tsx",
  "Skeleton.tsx",
  "Slider.tsx",
  "StatusIndicator.tsx",
  "StepIndicator.tsx",
  "StreamingTextRenderer.tsx",
  "Switch.tsx",
  "TabCard.tsx",
  "Table.tsx",
  "Tag.tsx",
  "TagInput.tsx",
  "TerminalPanel.tsx",
  "Tooltip.tsx",
  "WelcomePanel.tsx",
] as const;

describe("AGT-050 MiraDesign cutover contract", () => {
  it("keeps Desktop shared assets as the visual baseline and Mobile as interaction guidance only", () => {
    const readme = readRepo("README.md");
    const design = readRepo("DESIGN.md");
    const guidelines = readRepo("docs/design/mira-design-guidelines.md");

    expect(readme).not.toContain("inherits the current Mira Mobile Token/palette");
    expect(readme).toContain("Mira Desktop shared design assets");
    expect(design).toContain("Mira Mobile is not a visual authority for Cloud");
    expect(guidelines).toContain("44×44 CSS");
    expect(guidelines).toContain("Safe Area");
    expect(guidelines).toContain("dynamic viewport");
    expect(guidelines).toContain("Hover is enhancement only");
    expect(guidelines).toContain("Wide screens use Desktop-derived workbench density");
  });

  it("records every pinned Desktop shared UI candidate in the final matrix", () => {
    const matrix = readRepo("docs/design/mira-design-cutover.md");
    expect(desktopSharedUi).toHaveLength(52);
    for (const component of desktopSharedUi) {
      expect(matrix, component).toContain(`\`desktop/src/shared/ui/${component}\``);
    }
    expect(matrix).toContain("5036067d3a87ba95d798e01ededc7fbd678327de");
    expect(matrix).toContain("29182dd13cff79246f082b543812ead06db2902d");
    expect(matrix).toContain("5ba0e45dbe24c155bfc69f4951292d77522217db");
  });

  it("keeps retired Mobile-derived and duplicate component paths absent", () => {
    for (const path of [
      "apps/web/src/theme/upstream/tokens.ts",
      "apps/web/src/theme/upstream/palette.ts",
      "apps/web/src/theme/token-contract.ts",
      "apps/web/src/theme/mobile-revision.txt",
      "apps/web/src/styles/tokens.generated.css",
      "apps/web/src/components/ui",
    ]) {
      expect(existsSync(join(repoRoot, path)), path).toBe(false);
    }
  });

  it("cuts the real Workspace and ConnectionPanel over to MiraDesign primitives", () => {
    const workspace = readRepo("apps/web/src/features/work/workspace-view.tsx");
    const shell = readRepo("apps/web/src/features/workspace-shell/workspace-shell-frame.tsx");
    const shellStyles = readRepo("apps/web/src/features/workspace-shell/workspace-shell.css");
    const workStyles = readRepo("apps/web/src/features/work/work.css");
    const connection = readRepo("apps/web/src/features/connection/connection-panel.tsx");
    const globals = readRepo("apps/web/src/styles/globals.css");

    expect(workspace).toContain("<WorkspaceShellFrame");
    expect(shell).toContain("<WorkspaceTabs");
    expect(shell).toContain("<Drawer");
    expect(workspace).not.toContain('className="nav-link"');
    expect(connection).toContain("<SectionCard");
    expect(connection).toContain("Button");
    expect(globals).not.toContain(".nav-link {");
    expect(globals).toContain("@media (pointer: coarse)");
    expect(globals).toContain("min-width: 44px");
    expect(globals).toContain("min-height: 44px");
    expect(globals).not.toContain(".workspace-shell {");
    expect(globals).not.toContain(".workbench-page-header {");
    expect(shellStyles).toContain("env(safe-area-inset-left)");
    expect(shellStyles).toContain("100svh");
    expect(shellStyles).toContain("100dvh");
    expect(shellStyles).toContain("--workspace-rail-width");
    expect(workStyles).toContain(".workbench-page-header {");
  });
});

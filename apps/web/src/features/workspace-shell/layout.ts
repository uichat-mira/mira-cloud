import type { CSSProperties } from "react";
import type { WorkspaceShellLayoutMetrics } from "./types";

export const defaultWorkspaceShellLayout: WorkspaceShellLayoutMetrics = {
  railWidth: 56,
  sidebarWidth: 252,
  headerHeight: 58,
  separatorWidth: 1,
  mobileHeaderHeight: 62,
  contentMaxWidth: 1320,
};

type WorkspaceShellStyleVars = CSSProperties & {
  "--workspace-rail-width": string;
  "--workspace-sidebar-width": string;
  "--workspace-header-height": string;
  "--workspace-separator-width": string;
  "--workspace-mobile-header-height": string;
  "--workspace-content-max-width": string;
};

export function createWorkspaceShellStyleVars(
  overrides: Partial<WorkspaceShellLayoutMetrics> = {},
): WorkspaceShellStyleVars {
  const metrics = { ...defaultWorkspaceShellLayout, ...overrides };
  return {
    "--workspace-rail-width": `${metrics.railWidth}px`,
    "--workspace-sidebar-width": `${metrics.sidebarWidth}px`,
    "--workspace-header-height": `${metrics.headerHeight}px`,
    "--workspace-separator-width": `${metrics.separatorWidth}px`,
    "--workspace-mobile-header-height": `${metrics.mobileHeaderHeight}px`,
    "--workspace-content-max-width": `${metrics.contentMaxWidth}px`,
  };
}

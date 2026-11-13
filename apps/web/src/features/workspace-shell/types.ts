import type { ReactNode } from "react";

export interface WorkspaceRailItem {
  id: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  to?: string;
  badge?: boolean;
}

export interface WorkspaceSidebarItem {
  id: string;
  label: string;
  to?: string;
  onSelect?: () => void;
  icon?: ReactNode;
  meta?: ReactNode;
  end?: boolean;
}

export interface WorkspaceSidebarSection {
  id: string;
  label?: string;
  meta?: ReactNode;
  items: readonly WorkspaceSidebarItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface WorkspaceShellLayoutMetrics {
  railWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  separatorWidth: number;
  mobileHeaderHeight: number;
  contentMaxWidth: number;
}

export type WorkspaceShellDensity = "compact" | "comfortable";

export interface WorkspaceShellFrameProps {
  brand: ReactNode;
  mobileBrand?: ReactNode;
  railItems: readonly WorkspaceRailItem[];
  sidebarTitle: ReactNode;
  sidebarSubtitle?: ReactNode;
  sidebarAction?: ReactNode;
  sidebarSections: readonly WorkspaceSidebarSection[];
  mobileSidebarSections?: readonly WorkspaceSidebarSection[];
  sidebarFooter?: ReactNode;
  topbarLeading?: ReactNode;
  topbarActions?: ReactNode;
  mobileContextTitle: ReactNode;
  layout?: Partial<WorkspaceShellLayoutMetrics>;
  density?: WorkspaceShellDensity;
  children: ReactNode;
}

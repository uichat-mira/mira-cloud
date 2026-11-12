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
  to: string;
  icon?: ReactNode;
  meta?: ReactNode;
  end?: boolean;
}

export interface WorkspaceSidebarSection {
  id: string;
  label?: string;
  items: readonly WorkspaceSidebarItem[];
}

export interface WorkspaceTopicTab {
  value: string;
  label: ReactNode;
}

export interface WorkspaceShellLayoutMetrics {
  railWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  topicbarHeight: number;
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
  sidebarFooter?: ReactNode;
  topicTabs: readonly WorkspaceTopicTab[];
  topicValue: string;
  onTopicChange: (value: string) => void;
  topbarLeading?: ReactNode;
  topbarActions?: ReactNode;
  mobileContextTitle: ReactNode;
  mobileAction?: ReactNode;
  layout?: Partial<WorkspaceShellLayoutMetrics>;
  density?: WorkspaceShellDensity;
  children: ReactNode;
}

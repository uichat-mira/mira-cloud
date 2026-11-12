import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import { NavigationCardTabs } from "../../components/mira-design/index.ts";

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

export interface WorkspaceShellFrameProps {
  brand: ReactNode;
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
  mobileHeader?: ReactNode;
  mobileNavigation?: ReactNode;
  children: ReactNode;
}

function RailItem({ item }: { item: WorkspaceRailItem }) {
  const className = [
    "workspace-rail-item",
    item.active ? "workspace-rail-item-active" : "",
    item.disabled ? "workspace-rail-item-disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="workspace-rail-item-icon">{item.icon}</span>
      {item.badge ? <span className="workspace-rail-item-dot" aria-hidden="true" /> : null}
      <span className="sr-only">{item.label}</span>
    </>
  );

  if (!item.disabled && item.to) {
    return (
      <Link
        to={item.to}
        className={className}
        aria-current={item.active ? "page" : undefined}
        aria-label={item.label}
        title={item.label}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-disabled="true"
      aria-label={item.label + "（尚未开放）"}
      title={item.label + " · 尚未开放"}
      disabled
    >
      {content}
    </button>
  );
}

export function WorkspaceShellFrame({
  brand,
  railItems,
  sidebarTitle,
  sidebarSubtitle,
  sidebarAction,
  sidebarSections,
  sidebarFooter,
  topicTabs,
  topicValue,
  onTopicChange,
  topbarLeading,
  topbarActions,
  mobileHeader,
  mobileNavigation,
  children,
}: WorkspaceShellFrameProps) {
  return (
    <div className="workspace-shell">
      <aside className="workspace-rail" aria-label="Mira Cloud 工作台">
        <div className="workspace-rail-brand">{brand}</div>
        <nav className="workspace-rail-nav" aria-label="业务工作台">
          {railItems.map((item) => (
            <RailItem key={item.id} item={item} />
          ))}
        </nav>
      </aside>

      <aside className="workspace-sidebar" aria-label="当前业务">
        <header className="workspace-sidebar-header">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-text-primary">{sidebarTitle}</div>
            {sidebarSubtitle ? (
              <div className="mt-1 truncate text-xs text-text-tertiary">{sidebarSubtitle}</div>
            ) : null}
          </div>
          {sidebarAction ? <div className="shrink-0">{sidebarAction}</div> : null}
        </header>

        <div className="workspace-sidebar-scroll">
          {sidebarSections.map((section) => (
            <section key={section.id} className="workspace-sidebar-section">
              {section.label ? <h2 className="workspace-sidebar-label">{section.label}</h2> : null}
              <nav
                className="workspace-sidebar-list"
                aria-label={section.label ?? sidebarTitle?.toString()}
              >
                {section.items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      ["workspace-sidebar-item", isActive ? "workspace-sidebar-item-active" : ""]
                        .filter(Boolean)
                        .join(" ")
                    }
                  >
                    {item.icon ? (
                      <span className="workspace-sidebar-item-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.meta ? (
                      <span className="workspace-sidebar-item-meta">{item.meta}</span>
                    ) : null}
                  </NavLink>
                ))}
              </nav>
            </section>
          ))}
        </div>

        {sidebarFooter ? (
          <footer className="workspace-sidebar-footer">{sidebarFooter}</footer>
        ) : null}
      </aside>

      {mobileHeader ? <header className="workspace-mobile-header">{mobileHeader}</header> : null}

      <section className="workspace-main">
        <div className="workspace-topbar">
          <div className="min-w-0">{topbarLeading}</div>
          <div className="shrink-0">{topbarActions}</div>
        </div>

        <div className="workspace-topicbar">
          <NavigationCardTabs
            tabs={topicTabs.map((tab) => ({ value: tab.value, label: tab.label }))}
            value={topicValue}
            onChange={onTopicChange}
            activeTabStyle="plain"
            className="min-w-0 flex-1"
          />
        </div>

        <main className="workspace-content" id="main-content">
          {children}
        </main>
      </section>

      {mobileNavigation ? (
        <nav className="workspace-bottom-nav" aria-label="手机主导航">
          {mobileNavigation}
        </nav>
      ) : null}
    </div>
  );
}

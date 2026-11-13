import { useState, type ReactNode } from "react";
import { ChevronDown, Layers3 } from "lucide-react";
import { Link, NavLink } from "react-router";
import { CollapsiblePanel, Drawer } from "../../components/mira-design/index.ts";

export type {
  WorkspaceRailItem,
  WorkspaceSidebarItem,
  WorkspaceSidebarSection,
  WorkspaceShellDensity,
  WorkspaceShellFrameProps,
  WorkspaceShellLayoutMetrics,
} from "./types";
import type { WorkspaceRailItem, WorkspaceSidebarSection, WorkspaceShellFrameProps } from "./types";
import { createWorkspaceShellStyleVars } from "./layout";
import "./workspace-shell.css";

type MobilePanel = "workspaces" | "objects" | null;

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

function SidebarItemContent({ item }: { item: WorkspaceSidebarSection["items"][number] }) {
  return (
    <>
      {item.icon ? (
        <span className="workspace-sidebar-item-icon" aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.meta ? <span className="workspace-sidebar-item-meta">{item.meta}</span> : null}
    </>
  );
}

function MobileWorkspaceDrawer({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: readonly WorkspaceRailItem[];
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      width="min(88vw, 340px)"
      header={
        <div>
          <div className="text-sm font-semibold text-text-primary">切换工作台</div>
          <div className="mt-1 text-xs text-text-tertiary">选择 Mira Cloud 的业务面向</div>
        </div>
      }
      closeLabel="关闭工作台导航"
      bodyClassName="px-2 py-3"
    >
      <nav className="workspace-mobile-drawer-list" aria-label="移动业务工作台">
        {items.map((item) =>
          !item.disabled && item.to ? (
            <Link
              key={item.id}
              to={item.to}
              onClick={onClose}
              aria-current={item.active ? "page" : undefined}
              className={item.active ? "is-active" : ""}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {item.active ? <small>当前</small> : null}
            </Link>
          ) : (
            <button key={item.id} type="button" disabled aria-label={item.label + "（尚未开放）"}>
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              <small>尚未开放</small>
            </button>
          ),
        )}
      </nav>
    </Drawer>
  );
}

function MobileObjectItems({
  items,
  onClose,
  ariaLabel,
}: {
  items: readonly WorkspaceSidebarSection["items"][number][];
  onClose: () => void;
  ariaLabel: string;
}) {
  return (
    <nav aria-label={ariaLabel}>
      {items.map((item) =>
        item.onSelect ? (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              item.onSelect?.();
              onClose();
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
            {item.meta ? <small>{item.meta}</small> : null}
          </button>
        ) : (
          <NavLink
            key={item.id}
            to={item.to ?? "#"}
            {...(item.end !== undefined ? { end: item.end } : {})}
            onClick={onClose}
            className={({ isActive }) => (isActive ? "is-active" : "")}
          >
            {item.icon ? <span aria-hidden="true">{item.icon}</span> : <span aria-hidden="true" />}
            <span>{item.label}</span>
            {item.meta ? <small>{item.meta}</small> : null}
          </NavLink>
        ),
      )}
    </nav>
  );
}

function MobileObjectDrawer({
  open,
  onClose,
  title,
  subtitle,
  sections,
  footer,
  utility,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  sections: readonly WorkspaceSidebarSection[];
  footer?: ReactNode;
  utility?: ReactNode;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="left"
      width="min(92vw, 380px)"
      header={
        <div>
          <div className="text-sm font-semibold text-text-primary">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-text-tertiary">{subtitle}</div> : null}
        </div>
      }
      footer={
        footer || utility ? (
          <div className="flex w-full flex-col items-stretch gap-4">
            {utility ? <div>{utility}</div> : null}
            {footer ? <div>{footer}</div> : null}
          </div>
        ) : undefined
      }
      closeLabel="关闭工作对象导航"
      bodyClassName="px-2 py-3"
    >
      <div className="workspace-mobile-object-sections">
        {sections.map((section) => (
          <section key={section.id}>
            {section.collapsible ? (
              <CollapsiblePanel
                title={section.label ?? "分组"}
                meta={section.meta}
                {...(section.defaultExpanded !== undefined
                  ? { defaultExpanded: section.defaultExpanded }
                  : {})}
                className="workspace-mobile-object-group"
                headerClassName="workspace-mobile-object-group-trigger"
                contentClassName="workspace-mobile-object-group-content"
              >
                <MobileObjectItems
                  items={section.items}
                  onClose={onClose}
                  ariaLabel={section.label ?? "移动工作对象"}
                />
              </CollapsiblePanel>
            ) : (
              <>
                {section.label ? <h2>{section.label}</h2> : null}
                <MobileObjectItems
                  items={section.items}
                  onClose={onClose}
                  ariaLabel={section.label ?? "移动工作对象"}
                />
              </>
            )}
          </section>
        ))}
      </div>
    </Drawer>
  );
}

export function WorkspaceShellFrame({
  brand,
  mobileBrand,
  railItems,
  sidebarTitle,
  sidebarSubtitle,
  sidebarAction,
  sidebarSections,
  mobileSidebarSections,
  sidebarFooter,
  topbarLeading,
  topbarActions,
  mobileContextTitle,
  layout,
  density = "compact",
  children,
}: WorkspaceShellFrameProps) {
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const activeWorkspace = railItems.find((item) => item.active) ?? railItems[0];

  return (
    <div
      className="workspace-shell"
      style={createWorkspaceShellStyleVars(layout)}
      data-workspace-density={density}
      data-workspace-region="shell"
    >
      <aside className="workspace-rail" aria-label="Mira Cloud 工作台" data-workspace-region="rail">
        <div className="workspace-rail-brand">{brand}</div>
        <nav className="workspace-rail-nav" aria-label="业务工作台">
          {railItems.map((item) => (
            <RailItem key={item.id} item={item} />
          ))}
        </nav>
      </aside>

      <aside className="workspace-sidebar" aria-label="当前业务" data-workspace-region="sidebar">
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
                {section.items.map((item) =>
                  item.onSelect ? (
                    <button
                      key={item.id}
                      type="button"
                      className="workspace-sidebar-item"
                      onClick={item.onSelect}
                    >
                      <SidebarItemContent item={item} />
                    </button>
                  ) : (
                    <NavLink
                      key={item.id}
                      to={item.to ?? "#"}
                      {...(item.end !== undefined ? { end: item.end } : {})}
                      className={({ isActive }) =>
                        ["workspace-sidebar-item", isActive ? "workspace-sidebar-item-active" : ""]
                          .filter(Boolean)
                          .join(" ")
                      }
                    >
                      <SidebarItemContent item={item} />
                    </NavLink>
                  ),
                )}
              </nav>
            </section>
          ))}
        </div>

        {sidebarFooter ? (
          <footer className="workspace-sidebar-footer">{sidebarFooter}</footer>
        ) : null}
      </aside>

      <header className="workspace-mobile-header" data-workspace-region="mobile-header">
        <button
          type="button"
          className="workspace-mobile-workspace-trigger"
          aria-label="切换业务工作台"
          onClick={() => setMobilePanel("workspaces")}
        >
          <span aria-hidden="true">
            {mobileBrand ?? activeWorkspace?.icon ?? <Layers3 size={17} />}
          </span>
          <span>{activeWorkspace?.label ?? "工作台"}</span>
          <ChevronDown size={13} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="workspace-mobile-context-trigger"
          aria-label="切换工作对象"
          onClick={() => setMobilePanel("objects")}
        >
          <span className="truncate">{mobileContextTitle}</span>
          <ChevronDown size={13} aria-hidden="true" />
        </button>
      </header>

      <MobileWorkspaceDrawer
        open={mobilePanel === "workspaces"}
        onClose={() => setMobilePanel(null)}
        items={railItems}
      />
      <MobileObjectDrawer
        open={mobilePanel === "objects"}
        onClose={() => setMobilePanel(null)}
        title={sidebarTitle}
        subtitle={sidebarSubtitle}
        sections={mobileSidebarSections ?? sidebarSections}
        footer={sidebarFooter}
        utility={topbarActions}
      />

      <section className="workspace-main" data-workspace-region="main">
        <div className="workspace-topbar" data-workspace-region="topbar">
          <div className="min-w-0">{topbarLeading}</div>
          <div className="shrink-0">{topbarActions}</div>
        </div>

        <main className="workspace-content" id="main-content" data-workspace-region="canvas">
          {children}
        </main>
      </section>
    </div>
  );
}

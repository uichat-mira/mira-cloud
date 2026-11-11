import type { ReactNode } from "react";
import { NavLink } from "react-router";

export interface NavItemProps {
  readonly to: string;
  readonly icon: ReactNode;
  readonly children: ReactNode;
  readonly end?: boolean;
  readonly className?: string;
}

export default function NavItem({ to, icon, children, end, className = "" }: NavItemProps) {
  return (
    <NavLink
      to={to}
      {...(end !== undefined ? { end } : {})}
      className={({ isActive }) =>
        `
        flex items-center gap-2.5
        rounded-ui-control
        px-3 py-2.5
        text-sm
        font-medium
        transition-all
        duration-150
        ease-out
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-primary/20
        focus-visible:ring-offset-2
        focus-visible:ring-offset-surface-primary
        ${
          isActive
            ? "bg-surface-soft text-text-primary"
            : "text-text-secondary hover:bg-primary/7 hover:text-text-primary"
        } ${className}
        `
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

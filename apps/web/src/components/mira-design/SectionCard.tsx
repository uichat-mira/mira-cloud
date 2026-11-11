import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export interface SectionCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  divided?: boolean;
}

type SectionCardRowProps =
  | (HTMLAttributes<HTMLDivElement> & {
      as?: "div";
    })
  | (ButtonHTMLAttributes<HTMLButtonElement> & {
      as: "button";
    });

export function SectionCardRow({
  as = "div",
  className = "",
  children,
  ...props
}: SectionCardRowProps) {
  const rowClassName = `grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 ${
    as === "button"
      ? "text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20"
      : ""
  } ${className}`;

  if (as === "button") {
    return (
      <button {...(props as ButtonHTMLAttributes<HTMLButtonElement>)} className={rowClassName}>
        {children}
      </button>
    );
  }

  return (
    <div {...(props as HTMLAttributes<HTMLDivElement>)} className={rowClassName}>
      {children}
    </div>
  );
}

export default function SectionCard({
  title,
  icon,
  meta,
  action,
  children,
  contentClassName = "",
  divided = false,
  className = "",
  ...sectionProps
}: SectionCardProps) {
  return (
    <section
      {...sectionProps}
      className={`overflow-hidden rounded-ui-panel border border-border bg-surface-primary shadow-shadow-sm ${className}`}
    >
      <header className="flex min-h-12 flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        {icon ? <span className="shrink-0 text-icon-secondary">{icon}</span> : null}
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
        {meta ? <div className="text-xs text-text-secondary">{meta}</div> : null}
        {action ? <div className="ml-auto shrink-0">{action}</div> : null}
      </header>
      <div className={`${divided ? "divide-y divide-border" : ""} ${contentClassName}`}>
        {children}
      </div>
    </section>
  );
}

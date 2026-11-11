import type { ComponentPropsWithoutRef } from "react";

export function Card({ className = "", ...props }: ComponentPropsWithoutRef<"section">) {
  return (
    <section
      className={"min-w-0 rounded-ui-overlay border border-border bg-surface-primary " + className}
      {...props}
    />
  );
}

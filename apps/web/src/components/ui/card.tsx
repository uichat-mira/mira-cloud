import type { ComponentPropsWithoutRef } from "react";

export function Card({ className = "", ...props }: ComponentPropsWithoutRef<"section">) {
  return <section className={"mira-card min-w-0 " + className} {...props} />;
}

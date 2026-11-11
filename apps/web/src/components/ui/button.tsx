import { forwardRef, type ComponentPropsWithRef } from "react";

export type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
};

const variantClasses = {
  primary: "border border-transparent bg-primary text-text-inverted enabled:hover:bg-primary-hover",
  secondary:
    "border border-border bg-surface-primary text-text-primary enabled:hover:bg-surface-soft",
  ghost: "border border-transparent bg-transparent text-text-primary enabled:hover:bg-surface-soft",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", className = "", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-ui-control px-4 py-2.5 font-semibold transition-opacity duration-150 enabled:hover:opacity-90 disabled:opacity-55 " +
        variantClasses[variant] +
        " " +
        className
      }
      {...props}
    />
  );
});

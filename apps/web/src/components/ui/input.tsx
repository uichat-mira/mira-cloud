import { forwardRef, type ComponentPropsWithRef } from "react";

type InputProps = ComponentPropsWithRef<"input"> & { hasError?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={
        "min-h-11 w-full rounded-ui-control border border-border bg-surface-primary px-3 py-2.5 text-text-primary aria-invalid:border-danger " +
        className
      }
      aria-invalid={hasError ? true : undefined}
      {...rest}
    />
  );
});

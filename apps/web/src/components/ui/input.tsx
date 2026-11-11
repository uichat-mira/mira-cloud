import { forwardRef, type ComponentPropsWithRef } from "react";

type InputProps = ComponentPropsWithRef<"input"> & { hasError?: boolean };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError, className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={"mira-input " + className}
      aria-invalid={hasError ? true : undefined}
      {...rest}
    />
  );
});

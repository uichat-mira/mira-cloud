import { cloneElement, type ReactElement } from "react";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type FormFieldProps = {
  id: string;
  label: string;
  description?: string;
  error?: string;
  children: ReactElement<FieldControlProps>;
};

export function FormField({ id, label, description, error, children }: FormFieldProps) {
  const describedBy =
    [description ? id + "-help" : undefined, error ? id + "-error" : undefined]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label className="text-sm font-medium text-mira-ink" htmlFor={id}>
        {label}
      </label>
      {cloneElement(children, {
        id,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error ? { "aria-invalid": true } : {}),
      })}
      {description && (
        <p id={id + "-help"} className="text-xs text-mira-muted">
          {description}
        </p>
      )}
      {error && (
        <p
          id={id + "-error"}
          role="alert"
          className="text-sm font-medium"
          style={{ color: "var(--mira-color-error)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

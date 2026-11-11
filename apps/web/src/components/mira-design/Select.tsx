import { useId, useMemo, type ReactNode } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, CircleHelp } from "lucide-react";
import Tooltip from "./Tooltip";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectEndAction {
  ariaLabel: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  error?: string;
  compact?: boolean;
  labelHelp?: string;
  endAction?: SelectEndAction;
  placeholder?: string;
  noOptionsLabel?: string;
}

const encodedValuePrefix = "__radix-select__";
const encodeValue = (value: string) => `${encodedValuePrefix}${encodeURIComponent(value)}`;
const decodeValue = (value: string) =>
  value.startsWith(encodedValuePrefix)
    ? decodeURIComponent(value.slice(encodedValuePrefix.length))
    : value;

const inputBaseClassName =
  "w-full rounded-ui-control border border-border bg-surface-primary px-3.5 text-sm text-text-primary shadow-shadow-sm transition-[background-color,border-color,box-shadow] duration-150 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-text-tertiary";
const getInputSizeClassName = (compact?: boolean) =>
  compact ? "h-8 px-2.5 py-1.5 text-[13px]" : "h-10 px-3.5 text-sm";

export default function Select({
  label,
  value,
  onChange,
  options,
  disabled,
  error,
  compact,
  labelHelp,
  endAction,
  placeholder = "请选择",
  noOptionsLabel = "暂无可选项",
}: SelectProps) {
  const inputId = useId();
  const describedById = error ? `${inputId}-error` : undefined;
  const encodedOptions = useMemo(
    () => options.map((option) => ({ ...option, encodedValue: encodeValue(option.value) })),
    [options],
  );
  const selectedOption = encodedOptions.find((option) => option.value === value);
  const hasOptions = encodedOptions.length > 0;
  const currentValue = selectedOption?.encodedValue ?? "";
  const selectedLabel = selectedOption?.label ?? "";

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {label || labelHelp ? (
        <label
          htmlFor={inputId}
          className={`flex h-5 items-center gap-1.5 text-xs font-medium ${
            disabled ? "text-text-tertiary" : "text-text-secondary"
          }`}
        >
          {label ? <span>{label}</span> : null}
          {labelHelp ? (
            <Tooltip text={labelHelp} placement="top">
              <span className="text-icon-secondary">
                <CircleHelp className="h-3.5 w-3.5" />
              </span>
            </Tooltip>
          ) : null}
        </label>
      ) : null}

      <div className="relative">
        <SelectPrimitive.Root
          value={currentValue}
          onValueChange={(nextValue) => onChange(decodeValue(nextValue))}
          disabled={disabled || !hasOptions}
        >
          <SelectPrimitive.Trigger
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedById}
            className={`inline-flex min-w-0 w-full items-center text-left ${inputBaseClassName} ${getInputSizeClassName(
              compact,
            )} ${endAction ? "pr-14" : "pr-10"} ${error ? "border-danger" : ""}`}
          >
            {selectedOption ? (
              <SelectPrimitive.Value aria-label={selectedLabel}>
                <span className="block min-w-0 truncate">{selectedLabel}</span>
              </SelectPrimitive.Value>
            ) : (
              <SelectPrimitive.Value
                placeholder={
                  <span className="block truncate text-text-tertiary">
                    {hasOptions ? placeholder : noOptionsLabel}
                  </span>
                }
              />
            )}
          </SelectPrimitive.Trigger>

          {hasOptions ? (
            <SelectPrimitive.Portal>
              <SelectPrimitive.Content
                position="popper"
                sideOffset={6}
                collisionPadding={8}
                className="z-[240] max-h-64 min-w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-content-available-width)] overflow-hidden rounded-ui-surface border border-border bg-surface-elevated shadow-shadow-lg"
              >
                <SelectPrimitive.Viewport className="min-w-[var(--radix-select-trigger-width)] p-1">
                  {encodedOptions.map((option) => (
                    <SelectPrimitive.Item
                      key={option.encodedValue}
                      value={option.encodedValue}
                      className="relative flex w-full min-w-0 cursor-default items-center gap-2 rounded-ui-control px-2.5 py-2 pr-8 text-left text-sm text-text-primary outline-none transition-colors duration-150 data-[highlighted]:bg-primary/10 data-[state=checked]:bg-primary/8 data-[state=checked]:text-primary"
                    >
                      <SelectPrimitive.ItemText>
                        <span className="block break-words">{option.label}</span>
                      </SelectPrimitive.ItemText>
                      <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </SelectPrimitive.ItemIndicator>
                    </SelectPrimitive.Item>
                  ))}
                </SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
          ) : null}
        </SelectPrimitive.Root>

        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-1">
          {endAction ? (
            <button
              type="button"
              aria-label={endAction.ariaLabel}
              disabled={disabled || endAction.disabled}
              className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface-secondary hover:text-danger-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                endAction.onClick();
              }}
            >
              {endAction.icon}
            </button>
          ) : null}
          <ChevronDown className="h-4 w-4 shrink-0 text-icon-secondary" />
        </div>
      </div>

      {error ? (
        <span id={describedById} className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export { Select as SelectInput };

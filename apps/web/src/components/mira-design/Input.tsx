import { useId, type FocusEventHandler, type KeyboardEventHandler, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import Tooltip from "./Tooltip";

interface InputWrapperProps {
  label?: string | undefined;
  children: ReactNode;
  disabled?: boolean | undefined;
  error?: string | undefined;
  inputId: string;
  describedById?: string | undefined;
  compact?: boolean | undefined;
  labelHelp?: string | undefined;
}

function InputWrapper({
  label,
  children,
  disabled,
  error,
  inputId,
  describedById,
  compact = false,
  labelHelp,
}: InputWrapperProps) {
  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      {label ? (
        <label
          htmlFor={inputId}
          className={`flex h-5 items-center gap-1.5 text-xs font-medium ${disabled ? "text-text-tertiary" : "text-text-secondary"}`}
        >
          <span>{label}</span>
          {labelHelp ? (
            <Tooltip text={labelHelp} placement="top">
              <span className="text-icon-secondary">
                <CircleHelp className="h-3.5 w-3.5" />
              </span>
            </Tooltip>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <span id={describedById} className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

const inputBaseClassName = `
  w-full
  rounded-ui-control
  border
  border-border
  bg-surface-primary
  px-3.5
  text-sm
  text-text-primary
  shadow-shadow-sm
  transition-[background-color,border-color,box-shadow]
  duration-150
  ease-out
  placeholder:text-text-tertiary
  focus:outline-none
  focus:ring-2
  focus:ring-primary/20
  focus:border-primary
  disabled:cursor-not-allowed
  disabled:bg-surface-secondary
  disabled:text-text-tertiary
`;

const getInputSizeClassName = (compact?: boolean) =>
  compact ? "h-8 px-2.5 py-1.5 text-[13px]" : "h-10 px-3.5 text-sm";

const getTextAreaSizeClassName = (compact?: boolean) =>
  compact ? "min-h-[72px] px-2.5 py-1.5 text-[13px]" : "min-h-[96px] py-2.5 text-sm";

export interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  disabled?: boolean;
  error?: string;
  compact?: boolean;
  labelHelp?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  step,
  disabled,
  error,
  compact,
  labelHelp,
}: NumberInputProps) {
  const inputId = useId();
  const describedById = error ? `${inputId}-error` : undefined;

  return (
    <InputWrapper
      label={label}
      disabled={disabled}
      error={error}
      inputId={inputId}
      describedById={describedById}
      compact={compact}
      labelHelp={labelHelp}
    >
      <input
        id={inputId}
        type="number"
        step={step}
        value={value}
        onChange={(event) => onChange(Number.parseFloat(event.target.value))}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedById}
        className={`
          ${inputBaseClassName}
          ${getInputSizeClassName(compact)}
          ${error ? "border-danger" : ""}
        `}
      />
    </InputWrapper>
  );
}

export interface TextInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  type?: string;
  step?: string | number;
  compact?: boolean;
  labelHelp?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  ariaLabel?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  onKeyDown,
  onBlur,
  placeholder,
  disabled,
  error,
  type = "text",
  step,
  compact,
  labelHelp,
  autoComplete = "off",
  autoFocus,
  ariaLabel,
}: TextInputProps) {
  const inputId = useId();
  const describedById = error ? `${inputId}-error` : undefined;

  return (
    <InputWrapper
      label={label}
      disabled={disabled}
      error={error}
      inputId={inputId}
      describedById={describedById}
      compact={compact}
      labelHelp={labelHelp}
    >
      <input
        id={inputId}
        type={type}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        aria-invalid={Boolean(error)}
        aria-describedby={describedById}
        className={`
          ${inputBaseClassName}
          ${getInputSizeClassName(compact)}
          ${error ? "border-danger" : ""}
        `}
      />
    </InputWrapper>
  );
}

export interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  rows?: number;
  compact?: boolean;
  labelHelp?: string;
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  rows = 4,
  compact,
  labelHelp,
}: TextAreaProps) {
  const inputId = useId();
  const describedById = error ? `${inputId}-error` : undefined;

  return (
    <InputWrapper
      label={label}
      disabled={disabled}
      error={error}
      inputId={inputId}
      describedById={describedById}
      compact={compact}
      labelHelp={labelHelp}
    >
      <textarea
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        aria-invalid={Boolean(error)}
        aria-describedby={describedById}
        className={`
          resize-y
          ${inputBaseClassName}
          ${getTextAreaSizeClassName(compact)}
          ${error ? "border-danger" : ""}
        `}
      />
    </InputWrapper>
  );
}

export { TextInput as Input };

import { useRef, type ReactNode } from "react";
import { CloudUpload } from "lucide-react";

export interface FileUploadDropzoneProps {
  onSelectFiles: (files: File[]) => void;
  helperText?: ReactNode;
  accept?: string;
  maxCount?: number;
  className?: string;
  disabled?: boolean;
  selectLabel?: string;
}

export function FileUploadDropzone({
  onSelectFiles,
  helperText,
  accept,
  maxCount,
  className = "",
  disabled = false,
  selectLabel = "选择文件",
}: FileUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        className={`flex w-full items-center gap-3 rounded-ui-panel border border-dashed border-border px-4 py-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 ${
          disabled
            ? "cursor-not-allowed bg-surface-secondary/70 opacity-60"
            : "bg-surface-secondary hover:bg-surface-primary"
        } ${className}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui-panel bg-surface-primary shadow-shadow-sm">
          <CloudUpload className="h-4 w-4 text-icon-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-primary">{selectLabel}</div>
          {helperText ? (
            <div className="mt-0.5 text-xs leading-5 text-text-secondary">{helperText}</div>
          ) : null}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple={!maxCount || maxCount > 1}
        className="hidden"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const selected = Array.from(event.target.files ?? []);
          const limited = maxCount ? selected.slice(0, maxCount) : selected;
          if (limited.length > 0) onSelectFiles(limited);
          event.target.value = "";
        }}
      />
    </>
  );
}

export default FileUploadDropzone;

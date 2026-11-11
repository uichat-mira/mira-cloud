export type StatusType = "running" | "stopped" | "unknown";

export interface StatusIndicatorProps {
  status: StatusType;
  size?: "sm" | "md";
  label?: string;
  showLabel?: boolean;
  className?: string;
}

const defaults: Record<StatusType, { dot: string; ring: string; label: string }> = {
  running: {
    dot: "bg-success",
    ring: "ring-success-border/50",
    label: "运行中",
  },
  stopped: {
    dot: "bg-danger",
    ring: "ring-danger-border/50",
    label: "已停止",
  },
  unknown: {
    dot: "bg-warning",
    ring: "ring-warning-border/50",
    label: "状态未知",
  },
};

export function StatusIndicator({
  status,
  size = "md",
  label,
  showLabel = true,
  className = "",
}: StatusIndicatorProps) {
  const config = defaults[status];
  const resolvedLabel = label ?? config.label;
  const sizeClass = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";

  return (
    <span
      className={`inline-flex items-center gap-2 text-sm text-text-secondary ${className}`}
      aria-label={resolvedLabel}
    >
      <span
        aria-hidden="true"
        className={`${sizeClass} rounded-full ${config.dot} ring-4 ${config.ring}`}
      />
      {showLabel ? <span>{resolvedLabel}</span> : null}
    </span>
  );
}

export default StatusIndicator;

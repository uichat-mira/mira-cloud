import { useId, type ReactNode } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-tooltip/dist/react-tooltip.css";

export interface TooltipProps {
  children: ReactNode;
  text: string;
  placement?: "top" | "bottom" | "left" | "right";
}

const placementMap = {
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
} as const;

const tooltipClassName =
  "z-[120] max-w-[min(24rem,calc(100vw-2rem))] whitespace-normal break-words rounded-ui-control border border-border bg-surface-primary text-left text-[10.5px] leading-4 text-text-primary shadow-shadow-md";

const tooltipArrowClassName = "border-border";

export default function Tooltip({ children, text, placement = "right" }: TooltipProps) {
  const tooltipId = useId();

  if (!text.trim()) {
    return <>{children}</>;
  }

  return (
    <>
      <span
        data-tooltip-id={tooltipId}
        data-tooltip-content={text}
        className="inline-flex min-w-0 max-w-full items-center"
      >
        {children}
      </span>
      <ReactTooltip
        id={tooltipId}
        place={placementMap[placement]}
        className={tooltipClassName}
        classNameArrow={tooltipArrowClassName}
        opacity={1}
        offset={8}
        delayShow={80}
        noArrow={false}
        style={{
          padding: "2.5px 6.5px",
        }}
      />
    </>
  );
}

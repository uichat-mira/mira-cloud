import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./Button";

type DrawerWidth = number | string;
export type DrawerSide = "left" | "right";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  width?: DrawerWidth;
  side?: DrawerSide;
  closeLabel?: string;
  closeMaskLabel?: string;
  bodyClassName?: string;
  panelClassName?: string;
  showCloseButton?: boolean;
}

const exitDurationMs = 280;
const enterFrameDelayMs = 32;

const resolveWidth = (width: DrawerWidth) => (typeof width === "number" ? `${width}px` : width);

export default function Drawer({
  open,
  onClose,
  children,
  header,
  footer,
  width = 560,
  side = "right",
  closeLabel,
  closeMaskLabel,
  bodyClassName = "",
  panelClassName = "",
  showCloseButton = true,
}: DrawerProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const panelRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMounted(true);
      const timer = window.setTimeout(() => {
        setVisible(true);
        panelRef.current?.focus();
      }, enterFrameDelayMs);

      return () => window.clearTimeout(timer);
    }

    setVisible(false);
    const timer = window.setTimeout(() => {
      setMounted(false);
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    }, exitDurationMs);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mounted, onClose]);

  if (!mounted) {
    return null;
  }

  const sideClass =
    side === "left" ? "left-0 border-r border-border" : "right-0 border-l border-border";
  const hiddenTransform = side === "left" ? "-translate-x-10" : "translate-x-10";

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={closeMaskLabel ?? closeLabel ?? "Close drawer"}
        className={`absolute inset-0 transition-[opacity,backdrop-filter] duration-300 ease-out ${
          visible
            ? "bg-text-primary/40 opacity-100 backdrop-blur-[1px]"
            : "opacity-0 backdrop-blur-0"
        }`}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        data-side={side}
        className={`absolute top-0 flex h-full w-full max-w-full flex-col bg-surface-primary shadow-shadow-xl transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] will-change-transform ${sideClass} ${
          visible ? "translate-x-0 opacity-100" : `${hiddenTransform} opacity-0`
        } ${panelClassName}`}
        style={{ width: resolveWidth(width) }}
      >
        {header || showCloseButton ? (
          <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
            <div className="min-w-0 flex-1">{header}</div>
            {showCloseButton ? (
              <IconButton ariaLabel={closeLabel} onClick={onClose}>
                <X className="h-4 w-4" />
              </IconButton>
            ) : null}
          </header>
        ) : null}

        <div
          className={`mira-stable-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 ${bodyClassName}`}
        >
          {children}
        </div>

        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

import "./preview-debug.css";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Bug } from "lucide-react";

interface Position {
  left: number;
  top: number;
}

interface PointerStart extends Position {
  pointerId: number;
  clientX: number;
  clientY: number;
  moved: boolean;
}

interface PreviewDebugBallProps {
  scope: string | null;
  contextKey: string;
  title: string;
  children: (close: () => void) => ReactNode;
}

const BALL_SIZE = 48;
const EDGE_GAP = 12;
const DRAG_THRESHOLD = 6;

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

function viewportBounds() {
  return {
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  };
}

function confine(position: Position): Position {
  const viewport = viewportBounds();
  return {
    left: clamp(position.left, EDGE_GAP, viewport.width - BALL_SIZE - EDGE_GAP),
    top: clamp(position.top, EDGE_GAP, viewport.height - BALL_SIZE - EDGE_GAP),
  };
}

/**
 * A lightweight preview-only launcher. Each business page contributes its own
 * lazy-loaded menu, so the production canvas never owns debug controls.
 */
export function PreviewDebugBall({ scope, contextKey, title, children }: PreviewDebugBallProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pointerStart = useRef<PointerStart | null>(null);
  const lastDragEndedAt = useRef<number | null>(null);

  useEffect(() => {
    setOpen(false);
  }, [scope, contextKey]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: globalThis.PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  useEffect(() => {
    const handleViewport = () => {
      setPosition((current) => (current ? confine(current) : current));
    };
    window.addEventListener("resize", handleViewport);
    window.visualViewport?.addEventListener("resize", handleViewport);
    return () => {
      window.removeEventListener("resize", handleViewport);
      window.visualViewport?.removeEventListener("resize", handleViewport);
    };
  }, []);

  if (!scope) return null;

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerStart.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      left: rect.left,
      top: rect.top,
      moved: false,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.clientX;
    const dy = event.clientY - start.clientY;
    if (!start.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    start.moved = true;
    setOpen(false);
    setPosition(confine({ left: start.left + dx, top: start.top + dy }));
  };

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (pointerStart.current?.pointerId !== event.pointerId) return;
    lastDragEndedAt.current = pointerStart.current.moved ? performance.now() : null;
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const moveWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
    const delta: Record<string, Position> = {
      ArrowLeft: { left: -16, top: 0 },
      ArrowRight: { left: 16, top: 0 },
      ArrowUp: { left: 0, top: -16 },
      ArrowDown: { left: 0, top: 16 },
    };
    const step = delta[event.key];
    if (!step) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setOpen(false);
    setPosition(
      confine({
        left: rect.left + step.left,
        top: rect.top + step.top,
      }),
    );
  };

  const viewport = viewportBounds();
  const menuLeft = position ? position.left < viewport.width / 2 : false;
  const menuBelow = position ? position.top < viewport.height / 2 : false;

  return (
    <div
      ref={root}
      className="preview-debug-float"
      data-debug-scope={scope}
      data-placed={position ? "true" : "false"}
      data-horizontal={menuLeft ? "left" : "right"}
      data-vertical={menuBelow ? "below" : "above"}
      style={
        position
          ? {
              // CSS env() is evaluated by the browser, including landscape notch insets.
              left: `clamp(max(${EDGE_GAP}px, env(safe-area-inset-left)), ${position.left}px, calc(100vw - ${BALL_SIZE}px - max(${EDGE_GAP}px, env(safe-area-inset-right))))`,
              top: `clamp(max(${EDGE_GAP}px, env(safe-area-inset-top)), ${position.top}px, calc(100dvh - ${BALL_SIZE}px - max(${EDGE_GAP}px, env(safe-area-inset-bottom))))`,
            }
          : undefined
      }
    >
      <button
        ref={trigger}
        type="button"
        className="preview-debug-trigger"
        aria-label="原型调试（拖动移动位置）"
        aria-expanded={open}
        aria-controls={open ? "preview-debug-panel" : undefined}
        title="原型调试 · 拖动移动，点击展开"
        onClick={() => {
          const ended = lastDragEndedAt.current;
          lastDragEndedAt.current = null;
          if (ended !== null && performance.now() - ended < 350) return;
          setOpen((value) => !value);
        }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={moveWithKeyboard}
      >
        <Bug size={20} aria-hidden="true" />
      </button>
      {open ? (
        <section
          className="preview-debug-panel"
          id="preview-debug-panel"
          aria-label={title}
          role="region"
        >
          <div className="preview-debug-heading">
            <strong>{title}</strong>
            <span>仅供原型调试</span>
          </div>
          {children(() => {
            setOpen(false);
            trigger.current?.focus();
          })}
        </section>
      ) : null}
    </div>
  );
}

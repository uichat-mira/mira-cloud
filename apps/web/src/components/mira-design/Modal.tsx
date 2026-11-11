import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button, IconButton } from "./Button";
import ConfirmDialog, { type ConfirmTone } from "./ConfirmDialog";

export interface ModalShowOptions {
  title?: ReactNode;
  content: ReactNode;
  footer?: ReactNode | null;
  width?: number | string;
  height?: number | string;
  maxHeight?: number | string;
  bodyClassName?: string;
  closable?: boolean;
  maskClosable?: boolean;
  showCloseButton?: boolean;
  enableEscapeClose?: boolean;
  closeLabel?: string;
  closeText?: string;
  ariaLabel?: string;
  onClose?: () => void;
}

export interface ModalConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  width?: number | string;
  loadingText?: string;
  errorText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ModalItem extends ModalShowOptions {
  key: string;
}

export interface ModalContextValue {
  show: (options: ModalShowOptions) => string;
  confirm: (options: ModalConfirmOptions) => string;
  close: (key?: string) => void;
  destroy: () => void;
}

export interface ModalShellProps {
  open: boolean;
  title?: ReactNode;
  width?: number | string;
  height?: number | string;
  maxHeight?: number | string;
  bodyClassName?: string;
  closable?: boolean;
  maskClosable?: boolean;
  showCloseButton?: boolean;
  enableEscapeClose?: boolean;
  closeLabel?: string;
  closeText?: string;
  ariaLabel?: string;
  footer?: ReactNode | null;
  children: ReactNode;
  onClose: () => void;
}

interface ConfirmModalContentProps extends ModalConfirmOptions {
  onClose: () => void;
}

type ModalCommand =
  | { kind: "show"; key: string; options: ModalShowOptions }
  | { kind: "confirm"; key: string; options: ModalConfirmOptions }
  | { kind: "close"; key?: string }
  | { kind: "destroy" };

type ModalCommandEnvelope = {
  command: ModalCommand;
  handled: boolean;
};

const ModalContext = createContext<ModalContextValue | undefined>(undefined);
const modalEventName = "mira-design:modal";

function createModalKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `modal_${globalThis.crypto.randomUUID()}`;
  }
  return `modal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function dispatchModalCommand(command: ModalCommand) {
  if (typeof window === "undefined") {
    throw new Error("Modal static API requires a browser environment");
  }

  const envelope: ModalCommandEnvelope = { command, handled: false };
  window.dispatchEvent(new CustomEvent<ModalCommandEnvelope>(modalEventName, { detail: envelope }));
  if (!envelope.handled) {
    throw new Error("ModalProvider is not mounted");
  }
}

const resolveWidthStyle = (width?: number | string) =>
  typeof width === "number" ? `${width}px` : (width ?? "560px");

const resolveSizeStyle = (value?: number | string) =>
  typeof value === "number" ? `${value}px` : value;

function ConfirmModalContent({
  title,
  description,
  confirmText,
  cancelText,
  loadingText,
  errorText = "操作失败，请重试",
  tone,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmModalContentProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  return (
    <ConfirmDialog
      title={title}
      description={description}
      {...(confirmText !== undefined ? { confirmText } : {})}
      {...(cancelText !== undefined ? { cancelText } : {})}
      {...(loadingText !== undefined ? { loadingText } : {})}
      {...(errorMessage !== undefined ? { errorMessage } : {})}
      {...(tone !== undefined ? { tone } : {})}
      loading={loading}
      onCancel={() => {
        onCancel?.();
        onClose();
      }}
      onConfirm={async () => {
        try {
          setErrorMessage(undefined);
          setLoading(true);
          await onConfirm();
          onClose();
        } catch (error) {
          setErrorMessage(
            error instanceof Error && error.message.trim() ? error.message : errorText,
          );
        } finally {
          setLoading(false);
        }
      }}
    />
  );
}

export function ModalShell({
  open,
  title,
  width,
  height,
  maxHeight,
  bodyClassName,
  closable = true,
  maskClosable = true,
  showCloseButton = true,
  enableEscapeClose = true,
  closeLabel = "关闭弹窗",
  closeText = "关闭",
  ariaLabel,
  footer,
  children,
  onClose,
}: ModalShellProps) {
  const showTitle = Boolean(title) || showCloseButton;
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
        (element) => !element.hasAttribute("hidden"),
      );

    const initialFocus = focusable()[0] ?? dialog;
    initialFocus.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closable && enableEscapeClose) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [closable, enableEscapeClose, onClose, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-text-primary/45 backdrop-blur-sm"
        onMouseDown={() => {
          if (maskClosable && closable) {
            onClose();
          }
        }}
      />
      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        className="relative z-[101] flex w-full flex-col overflow-hidden rounded-ui-panel border border-border bg-surface-elevated shadow-shadow-xl"
        style={{
          maxWidth: resolveWidthStyle(width),
          height: resolveSizeStyle(height),
          maxHeight: resolveSizeStyle(maxHeight) ?? "calc(100dvh - 2rem)",
        }}
      >
        {showTitle ? (
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-2.5">
            <div className="min-w-0 flex-1">
              {title ? (
                <div id={titleId} className="text-[15px] leading-8 font-semibold text-text-primary">
                  {title}
                </div>
              ) : null}
            </div>
            {showCloseButton && closable ? (
              <IconButton ariaLabel={closeLabel} onClick={onClose} className="h-8 w-8">
                <X className="h-4 w-4" />
              </IconButton>
            ) : null}
          </header>
        ) : null}

        <div
          data-scroll-container="true"
          className={`mira-stable-scrollbar min-h-0 flex-1 overflow-y-auto px-4 ${
            title ? "py-4" : "py-3"
          } text-sm text-text-primary ${bodyClassName ?? ""}`}
        >
          {children}
        </div>

        {footer !== null ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-2.5">
            {footer ?? (
              <Button variant="secondary" onClick={onClose}>
                {closeText}
              </Button>
            )}
          </footer>
        ) : null}
      </section>
    </div>,
    document.body,
  );
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modals, setModals] = useState<ModalItem[]>([]);
  const liveModalsRef = useRef<ModalItem[]>([]);

  useEffect(() => {
    liveModalsRef.current = modals;
  }, [modals]);

  const close = useCallback((key?: string) => {
    setModals((previous) => {
      if (previous.length === 0) {
        return previous;
      }
      const targetKey = key ?? previous.at(-1)?.key;
      const target = previous.find((item) => item.key === targetKey);
      target?.onClose?.();
      return previous.filter((item) => item.key !== targetKey);
    });
  }, []);

  const destroy = useCallback(() => {
    setModals((previous) => {
      previous.forEach((item) => item.onClose?.());
      return [];
    });
  }, []);

  const showWithKey = useCallback((key: string, options: ModalShowOptions) => {
    setModals((previous) => [...previous, { key, ...options }]);
    return key;
  }, []);

  const confirmWithKey = useCallback(
    (key: string, options: ModalConfirmOptions) => {
      setModals((previous) => [
        ...previous,
        {
          key,
          title: undefined,
          ariaLabel: options.title,
          width: options.width ?? 440,
          maskClosable: false,
          showCloseButton: false,
          footer: null,
          content: <ConfirmModalContent {...options} onClose={() => close(key)} />,
        },
      ]);
      return key;
    },
    [close],
  );

  const show = useCallback(
    (options: ModalShowOptions) => showWithKey(createModalKey(), options),
    [showWithKey],
  );
  const confirm = useCallback(
    (options: ModalConfirmOptions) => confirmWithKey(createModalKey(), options),
    [confirmWithKey],
  );

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const envelope = (event as CustomEvent<ModalCommandEnvelope>).detail;
      if (!envelope) return;
      envelope.handled = true;
      const { command } = envelope;
      if (command.kind === "show") {
        showWithKey(command.key, command.options);
      } else if (command.kind === "confirm") {
        confirmWithKey(command.key, command.options);
      } else if (command.kind === "close") {
        close(command.key);
      } else {
        destroy();
      }
    };

    window.addEventListener(modalEventName, handleCommand);
    return () => window.removeEventListener(modalEventName, handleCommand);
  }, [close, confirmWithKey, destroy, showWithKey]);

  useEffect(() => {
    if (modals.length === 0) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const topModal = liveModalsRef.current.at(-1);
      if (topModal?.closable !== false) {
        close(topModal?.key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [close, modals.length]);

  const api = useMemo<ModalContextValue>(
    () => ({ show, confirm, close, destroy }),
    [close, confirm, destroy, show],
  );

  return (
    <ModalContext.Provider value={api}>
      {children}
      {modals.map((modal) => (
        <ModalShell
          key={modal.key}
          open
          {...(modal.title !== undefined ? { title: modal.title } : {})}
          {...(modal.width !== undefined ? { width: modal.width } : {})}
          {...(modal.height !== undefined ? { height: modal.height } : {})}
          {...(modal.maxHeight !== undefined ? { maxHeight: modal.maxHeight } : {})}
          {...(modal.bodyClassName !== undefined ? { bodyClassName: modal.bodyClassName } : {})}
          {...(modal.closable !== undefined ? { closable: modal.closable } : {})}
          {...(modal.maskClosable !== undefined ? { maskClosable: modal.maskClosable } : {})}
          {...(modal.showCloseButton !== undefined
            ? { showCloseButton: modal.showCloseButton }
            : {})}
          enableEscapeClose={false}
          {...(modal.closeLabel !== undefined ? { closeLabel: modal.closeLabel } : {})}
          {...(modal.closeText !== undefined ? { closeText: modal.closeText } : {})}
          {...(modal.ariaLabel !== undefined ? { ariaLabel: modal.ariaLabel } : {})}
          {...(modal.footer !== undefined ? { footer: modal.footer } : {})}
          onClose={() => close(modal.key)}
        >
          {modal.content}
        </ModalShell>
      ))}
    </ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

const modalStaticApi: ModalContextValue = {
  show: (options) => {
    const key = createModalKey();
    dispatchModalCommand({ kind: "show", key, options });
    return key;
  },
  confirm: (options) => {
    const key = createModalKey();
    dispatchModalCommand({ kind: "confirm", key, options });
    return key;
  },
  close: (key) =>
    dispatchModalCommand(key === undefined ? { kind: "close" } : { kind: "close", key }),
  destroy: () => dispatchModalCommand({ kind: "destroy" }),
};

export const Modal = Object.assign(ModalShell, modalStaticApi);
export default Modal;

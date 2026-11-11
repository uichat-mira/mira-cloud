import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle, Info, Loader2, XCircle } from "lucide-react";

export type MessageType = "success" | "error" | "warning" | "info" | "loading";

interface MessageItem {
  key: string;
  content: ReactNode;
  type: MessageType;
  duration: number;
}

export interface MessageContextType {
  open: (config: {
    content: ReactNode;
    type?: MessageType | undefined;
    duration?: number | undefined;
  }) => void;
  success: (content: ReactNode, duration?: number) => void;
  error: (content: ReactNode, duration?: number) => void;
  warning: (content: ReactNode, duration?: number) => void;
  info: (content: ReactNode, duration?: number) => void;
  loading: (content: ReactNode, duration?: number) => void;
  destroy: () => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

type MessageOpenConfig = Parameters<MessageContextType["open"]>[0];
type MessageCommand = { kind: "open"; config: MessageOpenConfig } | { kind: "destroy" };

type MessageCommandEnvelope = {
  command: MessageCommand;
  handled: boolean;
};

const messageEventName = "mira-design:message";

function dispatchMessageCommand(command: MessageCommand) {
  if (typeof window === "undefined") {
    throw new Error("Message static API requires a browser environment");
  }

  const envelope: MessageCommandEnvelope = { command, handled: false };
  window.dispatchEvent(
    new CustomEvent<MessageCommandEnvelope>(messageEventName, { detail: envelope }),
  );
  if (!envelope.handled) {
    throw new Error("MessageProvider is not mounted");
  }
}

export function MessageProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const messageKeyCounter = useRef(0);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeMessage = useCallback((key: string) => {
    const timer = timers.current.get(key);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(key);
    }
    setMessages((previous) => previous.filter((message) => message.key !== key));
  }, []);

  const open = useCallback(
    (config: MessageOpenConfig) => {
      const { content, type = "info", duration = 3 } = config;
      const key = `msg_${messageKeyCounter.current++}`;

      setMessages((previous) => [...previous, { key, content, type, duration }]);

      if (duration > 0) {
        const timer = setTimeout(() => removeMessage(key), duration * 1000);
        timers.current.set(key, timer);
      }
    },
    [removeMessage],
  );

  const destroy = useCallback(() => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current.clear();
    setMessages([]);
  }, []);

  const api = useMemo<MessageContextType>(
    () => ({
      open,
      success: (content, duration) => open({ content, type: "success", duration }),
      error: (content, duration) => open({ content, type: "error", duration }),
      warning: (content, duration) => open({ content, type: "warning", duration }),
      info: (content, duration) => open({ content, type: "info", duration }),
      loading: (content, duration) => open({ content, type: "loading", duration }),
      destroy,
    }),
    [destroy, open],
  );

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const envelope = (event as CustomEvent<MessageCommandEnvelope>).detail;
      if (!envelope) {
        return;
      }
      envelope.handled = true;
      const { command } = envelope;

      if (command.kind === "destroy") {
        destroy();
        return;
      }

      open(command.config);
    };

    window.addEventListener(messageEventName, handleCommand);
    return () => {
      window.removeEventListener(messageEventName, handleCommand);
    };
  }, [destroy, open]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const getIcon = (type: MessageType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 shrink-0 text-success" />;
      case "error":
        return <XCircle className="h-5 w-5 shrink-0 text-danger" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 shrink-0 text-warning" />;
      case "info":
        return <Info className="h-5 w-5 shrink-0 text-info" />;
      case "loading":
        return <Loader2 className="h-5 w-5 shrink-0 animate-spin text-info" />;
    }
  };

  return (
    <MessageContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed top-4 left-1/2 z-[220] flex -translate-x-1/2 flex-col items-center gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {messages.map((message) => (
          <div
            key={message.key}
            className="pointer-events-auto flex min-w-[280px] max-w-[520px] items-center gap-3 rounded-ui-surface border border-border bg-surface-elevated/95 px-4 py-3 text-left shadow-shadow-lg backdrop-blur-sm"
            role="status"
          >
            {getIcon(message.type)}
            <div className="flex-1 text-sm text-text-primary">{message.content}</div>
          </div>
        ))}
      </div>
    </MessageContext.Provider>
  );
}

export function useMessage(): MessageContextType {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessage must be used within a MessageProvider");
  }
  return context;
}

const createStaticApi = (): MessageContextType => ({
  open: (config) => {
    dispatchMessageCommand({ kind: "open", config });
  },
  success: (content, duration) => {
    dispatchMessageCommand({ kind: "open", config: { content, type: "success", duration } });
  },
  error: (content, duration) => {
    dispatchMessageCommand({ kind: "open", config: { content, type: "error", duration } });
  },
  warning: (content, duration) => {
    dispatchMessageCommand({ kind: "open", config: { content, type: "warning", duration } });
  },
  info: (content, duration) => {
    dispatchMessageCommand({ kind: "open", config: { content, type: "info", duration } });
  },
  loading: (content, duration) => {
    dispatchMessageCommand({ kind: "open", config: { content, type: "loading", duration } });
  },
  destroy: () => {
    dispatchMessageCommand({ kind: "destroy" });
  },
});

export const message = createStaticApi();

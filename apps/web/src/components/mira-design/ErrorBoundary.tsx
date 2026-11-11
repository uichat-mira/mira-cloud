import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { Button } from "./Button";

export interface ErrorBoundaryLabels {
  title: string;
  routeTitle: string;
  defaultMessage: string;
  unknownError: string;
  pageLoadFailed: string;
  retry: string;
  reload: string;
  viewDetails: string;
  retryOrReload: string;
}

const defaultLabels: ErrorBoundaryLabels = {
  title: "页面遇到问题",
  routeTitle: "页面加载失败",
  defaultMessage: "发生了未知错误。",
  unknownError: "未知错误",
  pageLoadFailed: "页面加载失败。",
  retry: "重试",
  reload: "重新加载",
  viewDetails: "查看详情",
  retryOrReload: "你可以重试当前内容，或重新加载页面。",
};

type ErrorBoundaryProps = {
  children: ReactNode;
  labels?: Partial<ErrorBoundaryLabels>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type ErrorBoundaryState = {
  error: Error | null;
  resetKey: number;
};

function resolveLabels(labels?: Partial<ErrorBoundaryLabels>): ErrorBoundaryLabels {
  return { ...defaultLabels, ...labels };
}

function getErrorMessage(error: Error | null, labels: ErrorBoundaryLabels) {
  if (!error) return labels.defaultMessage;
  return error.message.trim() || labels.unknownError;
}

export function ErrorFallback({
  title,
  message,
  detail,
  retryLabel = defaultLabels.retry,
  reloadLabel = defaultLabels.reload,
  detailsLabel = defaultLabels.viewDetails,
  onRetry,
  onReload,
}: {
  title?: string;
  message: string;
  detail?: string;
  retryLabel?: string;
  reloadLabel?: string;
  detailsLabel?: string;
  onRetry?: () => void;
  onReload?: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-secondary px-6 py-10">
      <section className="w-full max-w-xl rounded-ui-hero border border-border bg-surface-primary p-8 shadow-shadow-lg">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-ui-panel border border-border bg-surface-secondary text-lg font-semibold text-text-primary">
          !
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-text-tertiary">
            Error Boundary
          </p>
          {title ? <h1 className="text-2xl font-semibold text-text-primary">{title}</h1> : null}
          <p className="max-w-lg text-sm leading-6 text-text-secondary">{message}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry ? (
            <Button variant="primary" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {onReload ? (
            <Button variant="outline" onClick={onReload}>
              {reloadLabel}
            </Button>
          ) : null}
        </div>

        {detail ? (
          <details className="mt-6 rounded-ui-panel border border-border bg-surface-secondary px-4 py-3 text-sm text-text-secondary">
            <summary className="cursor-pointer font-medium text-text-primary">{detailsLabel}</summary>
            <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-6">
              {detail}
            </pre>
          </details>
        ) : null}
      </section>
    </main>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    if (!this.props.onError) {
      console.error("Unhandled MiraDesign error boundary error", error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState((current) => ({ error: null, resetKey: current.resetKey + 1 }));
  };

  render() {
    const { children, labels } = this.props;
    const { error, resetKey } = this.state;
    const copy = resolveLabels(labels);

    if (error) {
      return (
        <ErrorFallback
          title={copy.title}
          message={`${getErrorMessage(error, copy)} ${copy.retryOrReload}`}
          detail={error.stack || error.message}
          retryLabel={copy.retry}
          reloadLabel={copy.reload}
          detailsLabel={copy.viewDetails}
          onRetry={this.handleRetry}
          onReload={() => window.location.reload()}
        />
      );
    }

    return <Fragment key={resetKey}>{children}</Fragment>;
  }
}

export function RouteErrorBoundary({ labels }: { labels?: Partial<ErrorBoundaryLabels> }) {
  const copy = resolveLabels(labels);
  const routeError = useRouteError();
  let message = copy.pageLoadFailed;
  let detail = "";

  if (isRouteErrorResponse(routeError)) {
    message =
      typeof routeError.data === "string" && routeError.data.trim()
        ? routeError.data
        : `${routeError.status} ${routeError.statusText || "Route Error"}`;
    detail = `${routeError.status} ${routeError.statusText}\n${String(routeError.data ?? "")}`.trim();
  } else if (routeError instanceof Error) {
    message = getErrorMessage(routeError, copy);
    detail = routeError.stack || routeError.message;
  } else if (routeError) {
    detail = String(routeError);
  }

  return (
    <ErrorFallback
      title={copy.routeTitle}
      message={message}
      detail={detail}
      reloadLabel={copy.reload}
      detailsLabel={copy.viewDetails}
      onReload={() => window.location.reload()}
    />
  );
}

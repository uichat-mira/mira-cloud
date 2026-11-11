import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Cloud, Database, LoaderCircle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { checkConnection, type ConnectionFetcher, type ConnectionView } from "./connection-client";

const states: Record<ConnectionView["kind"], { title: string; explanation: string }> = {
  checking: {
    title: "正在检查基础服务",
    explanation: "通过本地同源连接，分别检查 API 和数据库状态。",
  },
  "api-offline": {
    title: "API 无法连接",
    explanation: "本地 Hono API 没有响应。请检查服务是否运行，然后重新检查。",
  },
  "api-invalid": {
    title: "API 响应异常",
    explanation: "服务响应不符合预期合同，无法可靠判断数据库状态。",
  },
  "database-unconfigured": {
    title: "数据库尚未配置",
    explanation: "API 已连接，但未配置 PostgreSQL。此状态不代表用户未登录。",
  },
  "database-unavailable": {
    title: "数据库暂不可用",
    explanation: "API 已连接，但 PostgreSQL 检查失败。检查数据库后可重新检测。",
  },
  ready: {
    title: "基础设施已就绪",
    explanation: "API 与 PostgreSQL 均可连接；用户登录、Agent 和任务执行仍未接入。",
  },
};

export interface ConnectionPanelProps {
  /** Injected only for deterministic component tests; browser defaults to same-origin fetch. */
  fetcher?: ConnectionFetcher;
}

export function ConnectionPanel({ fetcher }: ConnectionPanelProps) {
  const [view, setView] = useState<ConnectionView>({ kind: "checking" });
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  const retry = useCallback(async () => {
    const current = ++generation.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setView({ kind: "checking" });
    try {
      const next = await checkConnection(fetcher ?? fetch, controller.signal);
      if (mounted.current && generation.current === current && !controller.signal.aborted) {
        setView(next);
      }
    } catch {
      if (mounted.current && generation.current === current && !controller.signal.aborted) {
        setView({ kind: "api-offline" });
      }
    }
  }, [fetcher]);

  useEffect(() => {
    mounted.current = true;
    void retry();
    return () => {
      mounted.current = false;
      generation.current++;
      pending.current?.abort();
    };
  }, [retry]);

  const content = states[view.kind];
  const checking = view.kind === "checking";
  return (
    <Card className="p-6" aria-labelledby="link-status-title">
      <div className="mb-4 flex items-center gap-3 text-mira-muted">
        {checking ? (
          <LoaderCircle aria-hidden="true" size={19} />
        ) : view.kind === "ready" ? (
          <CheckCircle2 aria-hidden="true" size={19} />
        ) : view.kind === "api-offline" ? (
          <WifiOff aria-hidden="true" size={19} />
        ) : (
          <Database aria-hidden="true" size={19} />
        )}
        <h2 id="link-status-title" className="font-semibold text-mira-ink">
          基础服务连接
        </h2>
      </div>
      <div aria-live="polite" aria-atomic="true" aria-busy={checking}>
        <p className="mb-3 text-xl font-semibold text-mira-ink">{content.title}</p>
        <p className="text-sm leading-7 text-mira-muted">{content.explanation}</p>
      </div>
      {"apiVersion" in view && (
        <p className="mt-3 text-xs text-mira-muted">API 版本：{view.apiVersion}</p>
      )}
      {"requestId" in view && view.requestId && (
        <p className="mt-2 break-all text-xs text-mira-muted">请求编号：{view.requestId}</p>
      )}
      <Button
        className="mt-5"
        variant="secondary"
        onClick={() => void retry()}
        aria-label="重新检查基础服务"
      >
        <RefreshCw aria-hidden="true" size={16} />
        重新检查
      </Button>
      <div className="mt-6 border-t border-mira-border pt-4 text-sm text-mira-muted">
        <span className="inline-flex items-center gap-2">
          <Cloud size={16} aria-hidden="true" />
          仅检查基础设施，不代表 Cloud Auth 登录或 Cloud Pi 在线
        </span>
      </div>
    </Card>
  );
}

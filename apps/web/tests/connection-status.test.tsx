// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkConnection,
  type ConnectionFetcher,
} from "../src/features/connection/connection-client";
import { ConnectionPanel } from "../src/features/connection/connection-panel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function response(status: number, value: unknown, requestId = "trace_123"): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", "x-request-id": requestId },
  });
}
const health = () =>
  response(200, { service: "mira-cloud-api", status: "alive", version: "0.1.0" });
const ready = () => response(200, { status: "ready" });
const noDb = () =>
  response(503, { status: "unavailable", error: { code: "DATABASE_NOT_CONFIGURED" } });
const dbDown = () =>
  response(503, { status: "unavailable", error: { code: "DATABASE_UNAVAILABLE" } });

function fetcherFor(db: () => Response): ConnectionFetcher {
  return async (input) => (String(input).endsWith("/health") ? health() : db());
}

describe("connection contracts", () => {
  it("shows only real API+DB readiness, with no user or Agent readiness claim", async () => {
    const result = await checkConnection(fetcherFor(ready));
    expect(result).toEqual({ kind: "ready", apiVersion: "0.1.0" });
  });

  it("distinguishes API failure, invalid API, DB missing and DB outage", async () => {
    expect(
      await checkConnection(async () => {
        throw Error("NETWORK_DETAILS_SECRET");
      }),
    ).toEqual({
      kind: "api-offline",
    });
    expect(await checkConnection(async () => response(200, { status: "fake-success" }))).toEqual({
      kind: "api-invalid",
      requestId: "trace_123",
    });
    expect(await checkConnection(fetcherFor(noDb))).toEqual({
      kind: "database-unconfigured",
      apiVersion: "0.1.0",
      requestId: "trace_123",
    });
    expect(await checkConnection(fetcherFor(dbDown))).toEqual({
      kind: "database-unavailable",
      apiVersion: "0.1.0",
      requestId: "trace_123",
    });
  });

  it("classifies an API dying between health and ready as offline, not a DB failure", async () => {
    const fetcher: ConnectionFetcher = async (input) => {
      if (String(input).endsWith("/health")) return health();
      throw Error("API process disconnected");
    };
    expect(await checkConnection(fetcher)).toEqual({ kind: "api-offline" });
    const proxyOffline: ConnectionFetcher = async () =>
      new Response("<html>Proxy connection refused</html>", { status: 500 });
    expect(await checkConnection(proxyOffline)).toEqual({ kind: "api-offline" });
  });

  it("does not leak remote response details, secrets or unsafe trace IDs", async () => {
    const result = await checkConnection(async (input) =>
      String(input).endsWith("/health")
        ? health()
        : response(
            500,
            {
              password: "LEAK_ME",
              error: "postgresql://operator:secret@some-host/schema",
            },
            "<script>bad</script>",
          ),
    );
    expect(JSON.stringify(result)).not.toContain("LEAK_ME");
    expect(JSON.stringify(result)).not.toContain("postgresql:");
    expect(JSON.stringify(result)).not.toContain("<script>");
    expect(result.kind).toBe("api-invalid");
  });

  it("uses same-origin paths, no-store cache and cancelable fetches", async () => {
    const spy = vi.fn(fetcherFor(ready));
    const controller = new AbortController();
    await checkConnection(spy, controller.signal);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, "/api/v1/health", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
    expect(spy).toHaveBeenNthCalledWith(2, "/api/v1/ready", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    });
  });
});

describe("live status panel", () => {
  it("renders checking then real ready and leaves Task authority disabled", async () => {
    render(<ConnectionPanel fetcher={fetcherFor(ready)} />);
    expect(screen.getByRole("heading", { name: "基础服务连接" })).toBeTruthy();
    expect(await screen.findByText("基础设施已就绪")).toBeTruthy();
    expect(screen.getByText(/用户登录、Agent 和任务执行仍未接入/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "重新检查基础服务" })).toBeTruthy();
  });

  it("moves from API offline to ready after the real retry action", async () => {
    let online = false;
    const fetcher: ConnectionFetcher = async (input) => {
      if (!online) throw Error("connection refused");
      return String(input).endsWith("/health") ? health() : ready();
    };
    render(<ConnectionPanel fetcher={fetcher} />);
    await screen.findByText("API 无法连接");
    online = true;
    fireEvent.click(screen.getByRole("button", { name: "重新检查基础服务" }));
    await screen.findByText("基础设施已就绪");
  });

  it("moves from actual DB-unavailable status to ready after retry", async () => {
    let dbUp = false;
    const fetcher: ConnectionFetcher = async (input) =>
      String(input).endsWith("/health") ? health() : dbUp ? ready() : dbDown();
    render(<ConnectionPanel fetcher={fetcher} />);
    await screen.findByText("数据库暂不可用");
    dbUp = true;
    fireEvent.click(screen.getByRole("button", { name: "重新检查基础服务" }));
    await screen.findByText("基础设施已就绪");
  });

  it("does not allow a stale result to overwrite the latest check", async () => {
    let resolveOriginal!: (value: Response) => void;
    let firstHealth = true;
    const fetcher: ConnectionFetcher = (input) => {
      if (String(input).endsWith("/ready")) return Promise.resolve(ready());
      if (firstHealth) {
        firstHealth = false;
        return new Promise<Response>((resolve) => {
          resolveOriginal = resolve;
        });
      }
      return Promise.resolve(health());
    };
    render(<ConnectionPanel fetcher={fetcher} />);
    expect(screen.getByText("正在检查基础服务")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "重新检查基础服务" }));
    await screen.findByText("基础设施已就绪");
    resolveOriginal(health());
    await waitFor(() => {
      expect(screen.getByText("基础设施已就绪")).toBeTruthy();
      expect(screen.queryByText("API 无法连接")).toBeNull();
    });
  });

  it("does not update after unmount even if fetch ignores abort", async () => {
    let resolveOriginal!: (value: Response) => void;
    const fetcher: ConnectionFetcher = () =>
      new Promise<Response>((resolve) => {
        resolveOriginal = resolve;
      });
    const view = render(<ConnectionPanel fetcher={fetcher} />);
    view.unmount();
    resolveOriginal(health());
    await Promise.resolve();
    expect(view.container.innerHTML).toBe("");
  });
});

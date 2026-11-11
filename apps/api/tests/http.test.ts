import { once } from "node:events";
import { request } from "node:http";
import { serve } from "@hono/node-server";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
type ApiApp = ReturnType<typeof createApp>;

async function start(app: ApiApp): Promise<{ uri: string; close: () => Promise<void> }> {
  // Start a real Node TCP server: do not use app.request() as an HTTP integration test.
  const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
  if (!server.listening) await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw Error("TCP listener expected");
  return {
    uri: "http://127.0.0.1:" + address.port,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}

// A real TCP request that never follows machine-wide HTTP proxy settings.
function localRequest(
  uri: string,
  options: { method?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = request(uri, options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.once("error", reject);
      res.once("end", () => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) headers.set(key, value.join(", "));
          else if (typeof value === "string") headers.set(key, value);
        }
        resolve(new Response(Buffer.concat(chunks), { status: res.statusCode ?? 500, headers }));
      });
    });
    req.once("error", reject);
    req.end();
  });
}

describe("real Node HTTP service", () => {
  it("reports process liveness without claiming DB or Pi readiness", async () => {
    const s = await start(createApp());
    try {
      const r = await localRequest(s.uri + "/api/v1/health");
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({
        service: "mira-cloud-api",
        status: "alive",
        version: "0.1.0",
      });
      expect(r.headers.get("x-request-id")).toBeTruthy();
    } finally {
      await s.close();
    }
  });

  it("rejects invalid, unknown and duplicated health query options", async () => {
    const s = await start(createApp());
    try {
      for (const q of ["detail=unknown", "unexpected=yes", "detail=basic&detail=basic"]) {
        const r = await localRequest(s.uri + "/api/v1/health?" + q);
        expect(r.status).toBe(400);
        const body = (await r.json()) as { error: { code: string; requestId: string } };
        expect(body.error.code).toBe("INVALID_QUERY");
        expect(body.error.requestId).toBe(r.headers.get("x-request-id"));
      }
    } finally {
      await s.close();
    }
  });

  it("maintains safe request IDs and correct 404/405 contracts", async () => {
    const s = await start(createApp());
    try {
      const r = await localRequest(s.uri + "/api/v1/health", {
        headers: { "x-request-id": "trace_123" },
      });
      expect(r.headers.get("x-request-id")).toBe("trace_123");
      const missing = await localRequest(s.uri + "/api/v1/missing");
      expect(missing.status).toBe(404);
      expect(((await missing.json()) as { error: { code: string } }).error.code).toBe("NOT_FOUND");
      const method = await localRequest(s.uri + "/api/v1/health", { method: "POST" });
      expect(method.status).toBe(405);
      expect(method.headers.get("allow")).toBe("GET, HEAD");
      expect(((await method.json()) as { error: { code: string } }).error.code).toBe(
        "METHOD_NOT_ALLOWED",
      );
    } finally {
      await s.close();
    }
  });

  it("hides internal exceptions and stops the live TCP listener", async () => {
    const app = createApp();
    // Only this test instance gets the failure route; never expose a debug route.
    app.get("/__throw_test", () => {
      throw Error("PRIVATE_TEST_DETAIL");
    });
    const s = await start(app);
    const r = await localRequest(s.uri + "/__throw_test");
    expect(r.status).toBe(500);
    const body = await r.text();
    expect(body).toContain("INTERNAL_ERROR");
    expect(body).not.toContain("PRIVATE_TEST_DETAIL");
    await s.close();
    await expect(localRequest(s.uri + "/api/v1/health")).rejects.toThrow();
  });
});

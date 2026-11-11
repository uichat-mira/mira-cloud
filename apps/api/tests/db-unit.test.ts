import { describe, expect, it } from "vitest";
import { createDbContext, databaseReady } from "../src/db/client.js";
import { createApp } from "../src/app.js";

describe("database configuration and truthful readiness", () => {
  it("does not instantiate a pool when no DB is configured", async () => {
    expect(createDbContext({})).toBeUndefined();
    expect(await databaseReady()).toBe(false);
    const response = await createApp().request("/api/v1/ready");
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("DATABASE_NOT_CONFIGURED");
  });

  it("bounds connections and rejects invalid config", () => {
    expect(() =>
      createDbContext({ DATABASE_URL: "postgresql://localhost/db", DB_POOL_MAX: "19" }),
    ).toThrow();
    expect(() => createDbContext({ DATABASE_URL: "not-a-url" })).toThrow();
  });

  it("reports unreachable DB without returning credentials or internal exception", async () => {
    const db = createDbContext({
      DATABASE_URL: "postgresql://test-user:TEST_SECRET_VALUE@127.0.0.1:1/not_running",
      DB_CONNECT_TIMEOUT_MS: "200",
    });
    expect(db).toBeDefined();
    try {
      const app = createApp({ databaseReady: () => databaseReady(db) });
      const response = await app.request("/api/v1/ready");
      expect(response.status).toBe(503);
      const responseText = await response.text();
      expect(responseText).toContain("DATABASE_UNAVAILABLE");
      expect(responseText).not.toContain("TEST_SECRET_VALUE");
      expect(responseText).not.toContain("127.0.0.1");
    } finally {
      await db?.close();
    }
  });
});

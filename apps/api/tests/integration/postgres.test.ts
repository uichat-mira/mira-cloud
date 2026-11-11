import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { createDbContext, databaseReady, type DbContext } from "../../src/db/client.js";
import {
  createOrFindTaskMetadata,
  findTaskMetadataForOwner,
  IdempotencyConflictError,
} from "../../src/db/task-metadata-repository.js";
import { taskMetadata } from "../../src/db/schema.js";

const ownerA = "fixture-owner-" + randomUUID();
const ownerB = "fixture-owner-" + randomUUID();
const hash = "a".repeat(64);
let ctx: DbContext;

function item(owner: string, key: string) {
  return {
    ownerAccountRef: owner,
    idempotencyKey: key,
    definitionHash: hash,
    specVersion: 1,
    description: "Local metadata contract fixture",
  };
}

beforeAll(() => {
  if (!process.env["DATABASE_URL"]) throw Error("T3 requires a real PostgreSQL DATABASE_URL");
  const database = createDbContext();
  if (!database) throw Error("T3 real PostgreSQL not configured");
  ctx = database;
});

afterAll(async () => {
  if (!ctx) return;
  await ctx.db.delete(taskMetadata).where(eq(taskMetadata.ownerAccountRef, ownerA));
  await ctx.db.delete(taskMetadata).where(eq(taskMetadata.ownerAccountRef, ownerB));
  await ctx.close();
});

describe("real PostgreSQL with committed Drizzle migrations", () => {
  it("separates process liveness and database readiness on real driver", async () => {
    const app = createApp({ databaseReady: () => databaseReady(ctx) });
    expect((await app.request("/api/v1/health")).status).toBe(200);
    const ready = await app.request("/api/v1/ready");
    expect(ready.status).toBe(200);
    expect(await ready.json()).toMatchObject({ status: "ready" });
  });

  it("returns sanitized 503 for rejected PostgreSQL credentials", async () => {
    const realUrl = process.env["DATABASE_URL"];
    if (!realUrl) throw Error("PostgreSQL test URL required");
    const badUrl = new URL(realUrl);
    badUrl.password = "intentionally_wrong_ci_password";
    const bad = createDbContext({
      DATABASE_URL: badUrl.toString(),
      DB_POOL_MAX: "1",
      DB_CONNECT_TIMEOUT_MS: "500",
    });
    expect(bad).toBeDefined();
    try {
      const app = createApp({ databaseReady: () => databaseReady(bad) });
      expect((await app.request("/api/v1/health")).status).toBe(200);
      const response = await app.request("/api/v1/ready");
      expect(response.status).toBe(503);
      const body = await response.text();
      expect(body).toContain("DATABASE_UNAVAILABLE");
      expect(body).not.toContain("intentionally_wrong_ci_password");
      expect(body).not.toContain("postgresql:");
    } finally {
      await bad?.close();
    }
  });

  it("keeps one row under concurrent identical idempotency keys", async () => {
    const input = item(ownerA, "concurrency-" + randomUUID());
    const results = await Promise.all(
      Array.from({ length: 10 }, () => createOrFindTaskMetadata(ctx.db, input)),
    );
    expect(new Set(results.map((r) => r.task.id)).size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);
    const rows = await ctx.db
      .select()
      .from(taskMetadata)
      .where(eq(taskMetadata.idempotencyKey, input.idempotencyKey));
    expect(rows).toHaveLength(1);
  });

  it("rejects reused key with different payload but allows same key for another owner", async () => {
    const key = "scoping-" + randomUUID();
    const a = await createOrFindTaskMetadata(ctx.db, item(ownerA, key));
    await expect(
      createOrFindTaskMetadata(ctx.db, { ...item(ownerA, key), definitionHash: "b".repeat(64) }),
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
    const b = await createOrFindTaskMetadata(ctx.db, item(ownerB, key));
    expect(a.task.id).not.toBe(b.task.id);
    expect(await findTaskMetadataForOwner(ctx.db, ownerA, a.task.id)).toBeDefined();
    expect(await findTaskMetadataForOwner(ctx.db, ownerB, a.task.id)).toBeUndefined();
    expect(await findTaskMetadataForOwner(ctx.db, ownerA, b.task.id)).toBeUndefined();
  });

  it("enforces schema CHECK constraints in PostgreSQL, not only Zod", async () => {
    await expect(
      ctx.db.insert(taskMetadata).values({
        ...item(ownerB, "invalid-" + randomUUID()),
        specVersion: 0,
      }),
    ).rejects.toThrow();
    await expect(
      ctx.db.insert(taskMetadata).values({
        ...item(ownerB, "invalid-hash-" + randomUUID()),
        definitionHash: "not-a-sha256",
      }),
    ).rejects.toThrow();
  });

  it("rolls back all task metadata writes when the transaction fails", async () => {
    const key = "rollback-" + randomUUID();
    await expect(
      ctx.db.transaction(async (tx) => {
        await tx.insert(taskMetadata).values(item(ownerA, key));
        throw Error("test rollback");
      }),
    ).rejects.toThrow("test rollback");
    const rows = await ctx.db
      .select()
      .from(taskMetadata)
      .where(eq(taskMetadata.idempotencyKey, key));
    expect(rows).toHaveLength(0);
  });

  it("limits pool and disposes connections cleanly", async () => {
    expect(ctx.pool.options.max).toBeLessThanOrEqual(5);
    const answer = await ctx.db.execute(sql.raw("select 1 as alive"));
    expect(answer.rows).toHaveLength(1);
  });
});

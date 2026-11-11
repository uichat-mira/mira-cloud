import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { z } from "zod";
import * as schema from "./schema.js";

export type CoreDb = NodePgDatabase<typeof schema>;
export interface DbContext {
  readonly db: CoreDb;
  readonly pool: pg.Pool;
  close(): Promise<void>;
}

const configSchema = z.object({
  url: z.string().url(),
  max: z.coerce.number().int().min(1).max(5),
  connectionTimeoutMs: z.coerce.number().int().min(100).max(10000),
});

export function createDbContext(env: NodeJS.ProcessEnv = process.env): DbContext | undefined {
  const url = env["DATABASE_URL"];
  if (!url) return undefined;
  const config = configSchema.parse({
    url,
    max: env["DB_POOL_MAX"] ?? "4",
    connectionTimeoutMs: env["DB_CONNECT_TIMEOUT_MS"] ?? "2000",
  });
  // Pool is private; no connection string, SQL, credentials or row data are logged.
  const pool = new pg.Pool({
    connectionString: config.url,
    max: config.max,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: config.connectionTimeoutMs,
    statement_timeout: 5000,
    application_name: "mira-cloud-core",
  });
  pool.on("error", () =>
    console.error(
      JSON.stringify({ event: "db_idle_connection_error", code: "DATABASE_UNAVAILABLE" }),
    ),
  );
  return { db: drizzle({ client: pool, schema }), pool, close: () => pool.end() };
}

export async function databaseReady(context?: DbContext): Promise<boolean> {
  if (!context) return false;
  try {
    await context.pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

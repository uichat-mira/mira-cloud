import { serve } from "@hono/node-server";
import { z } from "zod";
import { createApp } from "./app.js";
import { createDbContext, databaseReady } from "./db/client.js";

const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65535)
  .parse(process.env["PORT"] ?? "3000");
// Container-only wildcard binding is permitted when Docker publishes exclusively
// to the host loopback; bare-host development keeps the safe 127.0.0.1 default.
const host = process.env["HOST"] ?? "127.0.0.1";
if (host !== "127.0.0.1" && host !== "0.0.0.0") {
  throw new Error("Unsupported API bind host");
}
const dbContext = createDbContext();
const app = createApp(dbContext ? { databaseReady: () => databaseReady(dbContext) } : {});
const server = serve({ fetch: app.fetch, hostname: host, port });
console.info(JSON.stringify({ event: "api_started", host, port }));

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(JSON.stringify({ event: "api_shutdown", signal }));
  server.close((error) => {
    if (error) {
      console.error(JSON.stringify({ event: "api_shutdown_failed" }));
      process.exitCode = 1;
    }
    void dbContext?.close().catch(() => {
      console.error(JSON.stringify({ event: "db_shutdown_failed" }));
      process.exitCode = 1;
    });
  });
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

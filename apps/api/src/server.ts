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
// Local-only until a production reverse-proxy and deployment contract are approved.
const dbContext = createDbContext();
const app = createApp(dbContext ? { databaseReady: () => databaseReady(dbContext) } : {});
const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port });
console.info(JSON.stringify({ event: "api_started", host: "127.0.0.1", port }));

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

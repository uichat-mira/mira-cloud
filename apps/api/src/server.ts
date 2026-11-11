import { serve } from "@hono/node-server";
import { z } from "zod";
import { createApp } from "./app.js";

const port = z.coerce
  .number()
  .int()
  .min(1)
  .max(65535)
  .parse(process.env["PORT"] ?? "3000");
// Local-only until a production reverse-proxy and deployment contract are approved.
const server = serve({ fetch: createApp().fetch, hostname: "127.0.0.1", port });
console.info(JSON.stringify({ event: "api_started", host: "127.0.0.1", port }));

function shutdown(signal: string): void {
  console.info(JSON.stringify({ event: "api_shutdown", signal }));
  server.close((error) => {
    if (error) {
      console.error(JSON.stringify({ event: "api_shutdown_failed" }));
      process.exitCode = 1;
    }
  });
}
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

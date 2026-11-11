import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { z } from "zod";

type Env = { Variables: { requestId: string } };
const requestIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const querySchema = z.object({ detail: z.literal("basic").optional() }).strict();
const { version } = z
  .object({ version: z.string() })
  .parse(JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as unknown);

function parseQuery(url: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of new URL(url).searchParams) {
    if (Object.hasOwn(result, key)) return { duplicateParameter: key };
    result[key] = value;
  }
  return result;
}

export function createApp(): Hono<Env> {
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    const candidate = c.req.header("x-request-id");
    const requestId =
      candidate && requestIdSchema.safeParse(candidate).success ? candidate : randomUUID();
    c.set("requestId", requestId);
    const start = Date.now();
    await next();
    c.header("x-request-id", requestId);
    console.info(
      JSON.stringify({
        event: "http_request",
        requestId,
        method: c.req.method,
        status: c.res.status,
        durationMs: Date.now() - start,
      }),
    );
  });

  app.get("/api/v1/health", (c) => {
    if (!querySchema.safeParse(parseQuery(c.req.url)).success) {
      return c.json(
        {
          error: {
            code: "INVALID_QUERY",
            message: "Invalid health query",
            requestId: c.get("requestId"),
          },
        },
        400,
      );
    }
    return c.json({ service: "mira-cloud-api", status: "alive", version });
  });

  app.all("/api/v1/health", (c) => {
    c.header("Allow", "GET, HEAD");
    return c.json(
      {
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Unsupported method",
          requestId: c.get("requestId"),
        },
      },
      405,
    );
  });

  app.notFound((c) =>
    c.json(
      {
        error: { code: "NOT_FOUND", message: "Route not found", requestId: c.get("requestId") },
      },
      404,
    ),
  );

  app.onError((_err, c) => {
    // Do not write exception messages or credentials to logs or HTTP responses.
    console.error(
      JSON.stringify({
        event: "http_error",
        code: "INTERNAL_ERROR",
        requestId: c.get("requestId"),
      }),
    );
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Unexpected server error",
          requestId: c.get("requestId"),
        },
      },
      500,
    );
  });
  return app;
}

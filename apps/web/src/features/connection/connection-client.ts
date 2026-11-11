/**
 * AGT-045: Infrastructure connectivity, not identity or Agent authority.
 * Interpret only fixed, known API contracts; never surface raw remote errors.
 */
export type ConnectionResult =
  | { kind: "ready"; apiVersion: string }
  | { kind: "api-offline" }
  | { kind: "api-invalid"; requestId?: string }
  | { kind: "database-unconfigured"; apiVersion: string; requestId?: string }
  | { kind: "database-unavailable"; apiVersion: string; requestId?: string };

export type ConnectionView = ConnectionResult | { kind: "checking" };
export type ConnectionFetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const requestIdPattern = /^[a-zA-Z0-9_-]{1,64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requestIdFrom(response: Response): string | undefined {
  const id = response.headers.get("x-request-id");
  return id && requestIdPattern.test(id) ? id : undefined;
}

async function jsonOrUnknown(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return undefined;
  }
}

function isHealth(
  value: unknown,
): value is { service: "mira-cloud-api"; status: "alive"; version: string } {
  return (
    isRecord(value) &&
    value["service"] === "mira-cloud-api" &&
    value["status"] === "alive" &&
    typeof value["version"] === "string" &&
    value["version"].length > 0 &&
    value["version"].length <= 64
  );
}

/** No probing, tracing or credentials are sent to any cross-origin endpoint. */
export async function checkConnection(
  fetcher: ConnectionFetcher,
  signal?: AbortSignal,
): Promise<ConnectionResult> {
  let health: Response;
  try {
    health = await fetcher("/api/v1/health", {
      signal: signal ?? null,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    return { kind: "api-offline" };
  }
  const requestId = requestIdFrom(health);
  const healthBody = await jsonOrUnknown(health);
  if (!health.ok || !isHealth(healthBody)) {
    // Reverse proxies may serve HTML on upstream connection refusal.
    if (!health.ok && !isRecord(healthBody)) return { kind: "api-offline" };
    return { kind: "api-invalid", ...(requestId ? { requestId } : {}) };
  }

  const apiVersion = healthBody.version;
  let ready: Response;
  try {
    ready = await fetcher("/api/v1/ready", {
      signal: signal ?? null,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    return { kind: "api-offline" };
  }
  const readyBody = await jsonOrUnknown(ready);
  const readyRequestId = requestIdFrom(ready);
  if (ready.status === 200 && isRecord(readyBody) && readyBody["status"] === "ready") {
    return { kind: "ready", apiVersion };
  }
  if (ready.status === 503 && isRecord(readyBody) && readyBody["status"] === "unavailable") {
    const error = readyBody["error"];
    if (isRecord(error) && error["code"] === "DATABASE_NOT_CONFIGURED") {
      return {
        kind: "database-unconfigured",
        apiVersion,
        ...(readyRequestId ? { requestId: readyRequestId } : {}),
      };
    }
    if (isRecord(error) && error["code"] === "DATABASE_UNAVAILABLE") {
      return {
        kind: "database-unavailable",
        apiVersion,
        ...(readyRequestId ? { requestId: readyRequestId } : {}),
      };
    }
  }
  if (!ready.ok && !isRecord(readyBody)) return { kind: "api-offline" };
  return { kind: "api-invalid", ...(readyRequestId ? { requestId: readyRequestId } : {}) };
}

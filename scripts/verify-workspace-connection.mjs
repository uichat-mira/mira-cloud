/**
 * AGT-045 real TCP integration: Vite same-origin proxy -> compiled Hono -> real PG.
 * Runs only inside the ephemeral PostgreSQL CI job after migrations, never on VPS.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request as nodeRequest } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("AGT-045 T3 requires DATABASE_URL from an ephemeral PostgreSQL CI service");
}
const apiPort = 3000;
const vitePort = 31874;
const base = "http://127.0.0.1:" + vitePort;
const api = "http://127.0.0.1:" + apiPort;
const children = new Set();

function start(command, args, overrides = {}) {
  const env = { ...process.env, NODE_USE_ENV_PROXY: "0", ...overrides };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete env[key];
  }
  const processHandle = spawn(command, args, {
    cwd: new URL("../", import.meta.url),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  processHandle.stderr?.on("data", (chunk) => {
    // Never echo raw process logs or environment values into public CI output.
    stderr = (stderr + String(chunk)).slice(-2048);
  });
  children.add(processHandle);
  return {
    processHandle,
    get failed() {
      return processHandle.exitCode !== null;
    },
  };
}

async function stop(child) {
  const processHandle = child?.processHandle;
  if (!processHandle) return;
  if (processHandle.exitCode !== null) {
    children.delete(processHandle);
    return;
  }
  if (!processHandle.killed) processHandle.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => processHandle.once("close", resolve)),
    delay(3000).then(() => {
      if (processHandle.exitCode === null) processHandle.kill("SIGKILL");
    }),
  ]);
  children.delete(processHandle);
}

function get(url) {
  return new Promise((resolve, reject) => {
    const req = nodeRequest(url, { method: "GET", timeout: 3000 }, (res) => {
      const bytes = [];
      res.on("data", (chunk) => bytes.push(chunk));
      res.once("error", reject);
      res.once("end", () =>
        resolve({
          status: res.statusCode,
          body: Buffer.concat(bytes).toString("utf8"),
          headers: res.headers,
        }),
      );
    });
    req.once("timeout", () => req.destroy(Error("HTTP request timed out")));
    req.once("error", reject);
    req.end();
  });
}

async function waitFor(url, expectedStatus = 200) {
  let last = "not started";
  for (let i = 0; i < 70; i++) {
    try {
      const response = await get(url);
      if (response.status === expectedStatus) return response;
      last = String(response.status);
    } catch {
      last = "connection unavailable";
    }
    await delay(150);
  }
  throw new Error("Local endpoint did not become ready: " + url + " (" + last + ")");
}

function bodyAsJson(response) {
  return JSON.parse(response.body);
}

async function expectThroughProxy(expectReady, expectedError) {
  const health = await get(base + "/api/v1/health");
  assert.equal(health.status, 200, "Vite must forward actual Hono liveness");
  assert.deepEqual(bodyAsJson(health), {
    service: "mira-cloud-api",
    status: "alive",
    version: "0.1.0",
  });
  assert.match(String(health.headers["x-request-id"] ?? ""), /^[A-Za-z0-9_-]{1,64}$/);
  const readiness = await get(base + "/api/v1/ready");
  assert.equal(readiness.status, expectReady ? 200 : 503);
  const data = bodyAsJson(readiness);
  if (expectReady) {
    assert.equal(data.status, "ready");
  } else {
    assert.equal(data.status, "unavailable");
    assert.equal(data.error?.code, expectedError);
  }
  assert.ok(!readiness.body.includes("postgresql://"));
  assert.ok(!readiness.body.includes("ci_ephemeral_only"));
  return { health: health.status, readiness: readiness.status, code: data.error?.code };
}

let web;
let backend;
try {
  // The web process must serve a built-in Vite same-origin /api proxy.
  web = start("pnpm", [
    "--filter",
    "@mira-cloud/web",
    "exec",
    "vite",
    "--host",
    "127.0.0.1",
    "--port",
    String(vitePort),
    "--strictPort",
  ]);
  await waitFor(base + "/");
  const page = await get(base + "/");
  assert.equal(page.status, 200);
  assert.ok(page.body.includes("Mira Cloud"));
  console.log("Vite Web real HTTP started.");

  backend = start(process.execPath, ["apps/api/dist/server.js"], {
    PORT: String(apiPort),
    DATABASE_URL: databaseUrl,
  });
  await waitFor(api + "/api/v1/ready");
  console.log("PostgreSQL ready through Vite proxy:", await expectThroughProxy(true));

  await stop(backend);
  // A genuine unavailable API is NOT a 200 'ready' response.
  let offline = false;
  try {
    const result = await get(base + "/api/v1/health");
    offline = result.status !== 200;
  } catch {
    offline = true;
  }
  assert.equal(offline, true, "Proxy must not fake success after API shutdown");
  console.log("Hono offline through Vite proxy: no false positive.");

  backend = start(process.execPath, ["apps/api/dist/server.js"], {
    PORT: String(apiPort),
    DATABASE_URL: undefined,
  });
  await waitFor(api + "/api/v1/health");
  console.log(
    "Database not configured:",
    await expectThroughProxy(false, "DATABASE_NOT_CONFIGURED"),
  );
  await stop(backend);

  backend = start(process.execPath, ["apps/api/dist/server.js"], {
    PORT: String(apiPort),
    DATABASE_URL: "postgresql://invalid:invalid@127.0.0.1:1/missing",
    DB_CONNECT_TIMEOUT_MS: "300",
  });
  await waitFor(api + "/api/v1/health");
  console.log("Database unreachable:", await expectThroughProxy(false, "DATABASE_UNAVAILABLE"));
  await stop(backend);

  backend = start(process.execPath, ["apps/api/dist/server.js"], {
    PORT: String(apiPort),
    DATABASE_URL: databaseUrl,
  });
  await waitFor(api + "/api/v1/ready");
  console.log("Database restored:", await expectThroughProxy(true));
  console.log("AGT-045 REAL TCP WEB → VITE PROXY → HONO → POSTGRESQL: PASS");
} finally {
  await stop(backend);
  await stop(web);
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

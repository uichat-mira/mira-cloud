// Shared CDP lifecycle for disposable local /new browser regressions.
// The scripts own the assertions; this module owns only tab, socket and cleanup.
export const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function openChrome() {
  const response = await fetch("http://127.0.0.1:9222/json/new?about:blank", {
    method: "PUT",
  });
  if (!response.ok) throw new Error(`Chrome remote debugging returned ${response.status}`);
  const target = await response.json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let sequence = 0;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const wait = pending.get(message.id);
    if (!wait) return;
    pending.delete(message.id);
    if (message.error) wait.reject(new Error(message.error.message));
    else wait.resolve(message.result);
  });
  socket.addEventListener("close", () => {
    for (const wait of pending.values()) wait.reject(new Error("Chrome debugging socket closed"));
    pending.clear();
  });
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text ?? "Chrome evaluation exception");
    }
    return result.result.value;
  };
  const close = async () => {
    try {
      await send("Page.close");
    } catch {
      // The disposable tab can already have closed on failed navigation.
    } finally {
      socket.close();
    }
  };
  return { send, evaluate, close };
}

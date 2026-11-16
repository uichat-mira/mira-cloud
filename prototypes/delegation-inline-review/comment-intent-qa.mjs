// CDP regression: opening the review list does not implicitly authorize annotation.
const tab = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then((r) =>
  r.json(),
);
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const d = JSON.parse(e.data);
  const next = pending.get(d.id);
  if (!next) return;
  pending.delete(d.id);
  d.error ? next.reject(Error(d.error.message)) : next.resolve(d.result);
});
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    ws.send(JSON.stringify({ id: n, method, params }));
  });
const run = async (expression) => {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.text);
  return result.result.value;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const snapshot = () =>
  run(
    "(()=>{const panel=document.querySelector('[aria-label=\"随文批注\"]');const draft=JSON.parse(sessionStorage.getItem('mira-cloud-delegation-fixture-v1'));return JSON.stringify({opened:!!panel,entries:draft.comments.length,composer:!!panel?.querySelector('textarea'),submit:[...(panel?.querySelectorAll('button')||[])].some(x=>x.textContent.includes('添加批注')),targetAction:[...(panel?.querySelectorAll('button')||[])].some(x=>x.textContent.trim()==='批注整个阶段'),width:document.documentElement.scrollWidth,viewport:innerWidth})})()",
  );
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:5173/new" });
  await pause(3200);
  await run(
    "Array.from(document.querySelectorAll('button.delegation-quiet-action')).find(x=>x.textContent.includes('批注'))?.click()",
  );
  await pause(170);
  const opened = JSON.parse(await snapshot());
  console.log("REVIEW_ONLY", opened);
  if (
    !opened.opened ||
    opened.composer ||
    opened.submit ||
    !opened.targetAction ||
    opened.entries !== 0
  )
    throw Error("Review opened with a composer despite no selection");
  await run(
    "Array.from(document.querySelectorAll('[aria-label=\"随文批注\"] button')).find(x=>x.textContent.trim()==='批注整个阶段')?.click()",
  );
  await pause(140);
  const explicit = JSON.parse(await snapshot());
  console.log("EXPLICIT_WHOLE_STAGE", explicit);
  if (!explicit.composer || !explicit.submit || explicit.entries !== 0)
    throw Error("Explicit target failed");
  await run(
    "Array.from(document.querySelectorAll('[aria-label=\"随文批注\"] button')).find(x=>x.textContent.includes('取消全文批注'))?.click()",
  );
  await pause(140);
  const cancelled = JSON.parse(await snapshot());
  console.log("CANCEL_TARGET", cancelled);
  if (cancelled.composer || cancelled.submit || cancelled.entries !== 0)
    throw Error("Cancel target left composer or draft");
  await run("document.querySelector('[aria-label=\"收起批注\"]')?.click()");
  await pause(170);
  const closed = JSON.parse(await snapshot());
  console.log("CLOSE_REVIEW", closed);
  if (closed.opened || closed.entries !== 0 || closed.width > closed.viewport)
    throw Error("Review close not clean");
  console.log("EXPLICIT_COMMENT_INTENT_PASS");
} finally {
  try {
    await send("Page.close");
  } catch {}
  ws.close();
}

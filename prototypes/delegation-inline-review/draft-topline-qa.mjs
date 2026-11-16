import { writeFileSync } from "node:fs";
const target = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then(
  (r) => r.json(),
);
const ws = new WebSocket(target.webSocketDebuggerUrl);
let n = 0;
const map = new Map();
ws.addEventListener("message", (event) => {
  const r = JSON.parse(event.data);
  const h = map.get(r.id);
  if (h) {
    map.delete(r.id);
    r.error ? h.reject(Error(r.error.message)) : h.resolve(r.result);
  }
});
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
const call = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++n;
    map.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expr) => {
  const a = await call("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true,
  });
  if (a.exceptionDetails) throw Error(a.exceptionDetails.text);
  return a.result.value;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const inspect = () =>
  evaluate(
    "(()=>{const select=s=>document.querySelector(s);const rect=s=>{const r=select(s)?.getBoundingClientRect();return r?{top:Math.round(r.top),bottom:Math.round(r.bottom),left:Math.round(r.left),width:Math.round(r.width)}:null};return JSON.stringify({scrollY:scrollY,viewport:innerHeight,pageWidth:document.documentElement.scrollWidth,width:innerWidth,bar:rect('.delegation-paper-topline'),paper:rect('.delegation-paper'),nav:rect('.workspace-topbar'),notes:rect('.delegation-comments'),position:getComputedStyle(select('.delegation-paper-topline')).position})})()",
  );
async function checkpoint(label, expectedPinned) {
  await pause(210);
  const state = JSON.parse(await inspect());
  console.log(label, JSON.stringify(state));
  if (state.pageWidth > state.width + 1) throw Error(label + ": horizontal overflow");
  if (
    expectedPinned &&
    (state.position !== "sticky" || Math.abs(state.bar.top - state.nav.bottom) > 2)
  )
    throw Error(label + ": draft header not sticky under Work topbar");
  return state;
}
try {
  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call("Page.navigate", { url: "http://127.0.0.1:5173/new" });
  await pause(3500);
  const fixture = await evaluate(
    "(()=>{const k='mira-cloud-delegation-fixture-v1';const raw=sessionStorage.getItem(k);if(!raw)return 'no fixture';const d=JSON.parse(raw);d.stages[0].markdown+='\\n\\n'+Array.from({length:85},(_,i)=>'长期工作说明段落 '+i+'：文档较长，要求固定显示草稿归属与保存状态。').join('\\n\\n');sessionStorage.setItem(k,JSON.stringify(d));return 'ready'})()",
  );
  if (fixture !== "ready") throw Error("Cannot prepare fixture: " + fixture);
  await call("Page.reload", { ignoreCache: true });
  await pause(3100);
  const initial = await checkpoint("INITIAL", false);
  if (initial.bar.top <= initial.nav.bottom)
    throw Error("Draft header should have a natural position before sticking");
  await evaluate("window.scrollTo(0,650)");
  const middle = await checkpoint("SCROLLED_MIDDLE", true);
  await evaluate("window.scrollTo(0,1750)");
  await checkpoint("SCROLLED_DEEP", true);
  await evaluate(
    "Array.from(document.querySelectorAll('button.delegation-quiet-action')).find(x=>x.textContent.includes('批注'))?.click()",
  );
  await checkpoint("WITH_RIGHT_REVIEW", true);
  const notes = JSON.parse(await inspect());
  if (notes.notes && Math.abs(notes.notes.top - 74) > 2)
    throw Error("Review panel top changed when sticky draft visible");
  const image = await call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync("/tmp/mira-delegation-sticky-draft-desktop.png", Buffer.from(image.data, "base64"));
  for (const width of [1280, 1920]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await checkpoint("DESKTOP_" + width, true);
  }
  await call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await pause(200);
  const mobile = await checkpoint("MOBILE", false);
  if (mobile.position !== "static") throw Error("Mobile should not gain a fixed draft bar");
  console.log("DRAFT_TOPLINE_STICKY_PASS");
} finally {
  try {
    await call("Page.close");
  } catch {}
  ws.close();
}

const target = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then(
  (r) => r.json(),
);
const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
ws.addEventListener("message", (ev) => {
  const d = JSON.parse(ev.data);
  const h = pending.get(d.id);
  if (!h) return;
  pending.delete(d.id);
  d.error ? h.reject(Error(d.error.message)) : h.resolve(d.result);
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
const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.text);
  return r.result.value;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const metrics = () =>
  ev(
    "(()=>{const p=document.querySelector('.delegation-paper');const a=document.querySelector('.delegation-layout');const b=document.querySelector('.delegation-comments');return JSON.stringify({paper:p?.getBoundingClientRect().width,tracks:a&&getComputedStyle(a).gridTemplateColumns,gap:a&&getComputedStyle(a).columnGap,open:!!b,overflow:document.documentElement.scrollWidth>innerWidth})})()",
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
  await pause(3900);
  console.log(
    "EDITOR_FEATURES",
    await ev(
      "JSON.stringify({latex:document.querySelectorAll('.delegation-review-editor .milkdown-latex-inline-edit').length,icons:document.querySelectorAll('.delegation-review-editor .milkdown-icon').length})",
    ),
  );
  const initial = JSON.parse(await metrics());
  console.log("CLOSED_LAYOUT", initial);
  console.log("START_CTA", await ev("!!document.querySelector('.delegation-selected-comment')"));
  await ev(
    "(()=>{const p=document.querySelector('.delegation-review-editor .ProseMirror p');const n=p.firstChild;const r=document.createRange();r.setStart(n,3);r.setEnd(n,20);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));})()",
  );
  // The action is intentionally held until the selection has settled.
  await pause(260);
  const selected = JSON.parse(
    await ev(
      "JSON.stringify({cta:!!document.querySelector('.delegation-selected-comment'),selection:window.getSelection()?.toString()})",
    ),
  );
  console.log("SELECTED_CTA", selected);
  if (!selected.cta) throw Error("Settled selection never exposed its comment action");
  await ev(
    "(()=>{const p=document.querySelector('.delegation-review-editor .ProseMirror p');const r=document.createRange();r.setStart(p.firstChild,2);r.collapse(true);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));p.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));})()",
  );
  await pause(160);
  const cleared = await ev(
    "JSON.stringify({cta:!!document.querySelector('.delegation-selected-comment'),selection:getSelection()?.toString()})",
  );
  console.log("CLEARED_CTA", cleared);
  if (JSON.parse(cleared).cta) throw Error("Ghost CTA remained after native Selection collapsed");
  await ev("document.querySelector('button.delegation-comment-trigger')?.click()");
  const afterClick = JSON.parse(await metrics());
  await pause(105);
  const intermediate = JSON.parse(await metrics());
  await pause(230);
  const expanded = JSON.parse(await metrics());
  console.log(
    "OPEN_ANIMATION",
    JSON.stringify({
      before: initial.paper,
      immediate: afterClick.paper,
      intermediate: intermediate.paper,
      final: expanded.paper,
      tracks: expanded.tracks,
    }),
  );
  if (!(
    initial.paper > intermediate.paper &&
    intermediate.paper > expanded.paper &&
    expanded.paper > 200
  ))
    throw Error("No interpolated opening width");
  if (expanded.overflow) throw Error("Page overflow when opened");
  await ev("document.querySelector('.delegation-comments-header button')?.click()");
  const closeStart = JSON.parse(await metrics());
  await pause(105);
  const closeMid = JSON.parse(await metrics());
  await pause(225);
  const closed = JSON.parse(await metrics());
  console.log(
    "CLOSE_ANIMATION",
    JSON.stringify({
      start: closeStart.paper,
      mid: closeMid.paper,
      final: closed.paper,
      tracks: closed.tracks,
    }),
  );
  if (!(
    closeStart.paper < closeMid.paper &&
    closeMid.paper < closed.paper &&
    Math.abs(closed.paper - initial.paper) < 1
  ))
    throw Error("No interpolated closing width");
  if (
    (await ev(
      "document.querySelectorAll('.delegation-review-editor .milkdown-latex-inline-edit').length",
    )) !== 0
  )
    throw Error("Obsolete latex UI visible");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await pause(160);
  const wideBefore = JSON.parse(await metrics());
  await ev("document.querySelector('button.delegation-comment-trigger')?.click()");
  await pause(110);
  const wideMid = JSON.parse(await metrics());
  await pause(210);
  const wideAfter = JSON.parse(await metrics());
  console.log(
    "WIDE_ANIMATION",
    JSON.stringify({ before: wideBefore.paper, mid: wideMid.paper, final: wideAfter.paper }),
  );
  if (!(wideBefore.paper > wideMid.paper && wideMid.paper > wideAfter.paper && !wideAfter.overflow))
    throw Error("Wide desktop animation regressed");
  await ev("document.querySelector('.delegation-comments-header button')?.click()");
  await pause(260);
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await pause(180);
  const mobileBefore = JSON.parse(await metrics());
  await ev("document.querySelector('button.delegation-comment-trigger')?.click()");
  await pause(200);
  const mobileAfter = JSON.parse(await metrics());
  const mobileSheet = JSON.parse(
    await ev(
      "(()=>{const r=document.querySelector('.delegation-comments')?.getBoundingClientRect();return JSON.stringify(r?{left:r.left,bottom:r.bottom,width:r.width,height:r.height}:null)})()",
    ),
  );
  console.log(
    "MOBILE_SHEET",
    JSON.stringify({ before: mobileBefore.paper, after: mobileAfter.paper, sheet: mobileSheet }),
  );
  if (mobileAfter.overflow || mobileSheet?.width !== 390 || Math.abs(mobileSheet.bottom - 844) > 2)
    throw Error("Mobile sheet changed unexpectedly");
  console.log("SELECTION_AND_ANIMATION_PASS");
} finally {
  try {
    await send("Page.close");
  } catch {}
  ws.close();
}

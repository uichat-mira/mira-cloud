// Regression for successive paragraph annotations with a visible review sidebar.
const target = await fetch("http://127.0.0.1:9222/json/new?about:blank", { method: "PUT" }).then(
  (r) => r.json(),
);
const socket = new WebSocket(target.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
socket.addEventListener("message", (e) => {
  const d = JSON.parse(e.data),
    h = pending.get(d.id);
  if (h) {
    pending.delete(d.id);
    d.error ? h.reject(Error(d.error.message)) : h.resolve(d.result);
  }
});
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.text);
  return r.result.value;
};
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const state = () =>
  ev(
    "(()=>{const p=document.querySelector('[aria-label=\"随文批注\"]');const draft=JSON.parse(sessionStorage.getItem('mira-cloud-delegation-fixture-v1'));return JSON.stringify({open:!!p,field:!!p?.querySelector('textarea'),quote:p?.querySelector('.delegation-comment-compose blockquote')?.textContent,commentCount:document.querySelectorAll('.delegation-comment-item').length,highlights:document.querySelectorAll('.delegation-review-poc-anchor').length,cta:!!document.querySelector('.delegation-selected-comment'),stored:draft.comments.map(x=>({excerpt:x.excerpt,anchor:x.anchor}))})})()",
  );
async function selectParagraph(index) {
  await ev(
    "(()=>{const ed=document.querySelector('.delegation-review-editor');const p=ed.querySelectorAll('.ProseMirror p')[" +
      index +
      "];const n=p.firstChild;const r=document.createRange();r.setStart(n,0);r.setEnd(n,Math.min(n.textContent.length,24));const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));ed.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));})()",
  );
  await pause(310);
}
async function addComment(text) {
  await ev("document.querySelector('#delegation-comment-input')?.focus()");
  await send("Input.insertText", { text });
  await pause(80);
  await ev(
    "Array.from(document.querySelectorAll('.delegation-comment-compose button')).find(x=>x.textContent.includes('添加批注'))?.click()",
  );
  await pause(200);
}
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1460,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:5173/new" });
  await pause(3100);
  await ev("document.querySelector('.delegation-comment-trigger')?.click()");
  await pause(220);
  await selectParagraph(0);
  const first = JSON.parse(await state());
  console.log("FIRST_SELECTION_WITH_PANEL_OPEN", first);
  if (!first.field || !first.quote?.includes("请持续观察") || first.cta)
    throw Error("Cannot annotate first selected paragraph with panel open");
  await addComment("第一条测试批注");
  const saved1 = JSON.parse(await state());
  console.log("AFTER_FIRST_COMMENT", saved1);
  if (saved1.commentCount !== 1 || saved1.field || saved1.highlights !== 1)
    throw Error("First comment failed or composer not reset");
  await selectParagraph(1);
  const second = JSON.parse(await state());
  console.log("SECOND_SELECTION_WITH_PANEL_OPEN", second);
  if (!second.field || !second.quote?.includes("研究重点") || second.cta)
    throw Error("Second paragraph not captured while sidebar open");
  await addComment("第二条测试批注");
  const saved2 = JSON.parse(await state());
  console.log("AFTER_SECOND_COMMENT", saved2);
  if (
    saved2.commentCount !== 2 ||
    saved2.highlights !== 2 ||
    saved2.stored.length !== 2 ||
    saved2.stored[0].excerpt === saved2.stored[1].excerpt
  )
    throw Error("Sequential annotations failed to bind distinct source ranges");
  console.log("SECOND_PARAGRAPH_REVIEW_BROWSER_PASS");
} finally {
  try {
    await send("Page.close");
  } catch {}
  socket.close();
}

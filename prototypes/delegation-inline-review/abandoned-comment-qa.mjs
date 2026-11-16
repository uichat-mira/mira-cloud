// Chrome CDP regression for hiding abandoned annotations while retaining their
// provenance in the local prototype draft.
import { openChrome, pause } from "./chrome-client.mjs";
const { send, evaluate: run, close } = await openChrome();
const inspect = () =>
  run(
    "(()=>{const draft=JSON.parse(sessionStorage.getItem('mira-cloud-delegation-fixture-v1')||'{}');const aside=document.querySelector('[aria-label=\"随文批注\"]');return JSON.stringify({saved:draft.comments?.map(x=>({status:x.status,text:x.text,anchor:!!x.anchor})),shown:document.querySelectorAll('.delegation-comment-item').length,count:aside?.querySelector('h3')?.textContent,highlights:document.querySelectorAll('.delegation-review-poc-anchor').length,acceptDisabled:[...document.querySelectorAll('button')].find(x=>x.textContent.includes('接受本阶段'))?.disabled,docWidth:document.documentElement.scrollWidth,viewport:innerWidth})})()",
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
  await pause(3400);
  await run(
    "(()=>{const ed=document.querySelector('.delegation-review-editor');const t=ed.querySelector('.ProseMirror p').firstChild;const r=document.createRange();r.setStart(t,4);r.setEnd(t,22);const s=getSelection();s.removeAllRanges();s.addRange(r);ed.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));})()",
  );
  // Selection CTA appears only after the 180ms no-drag stabilization window.
  await pause(300);
  const cta = await run("!!document.querySelector('.delegation-selected-comment')");
  if (!cta) throw Error("Text selection CTA missing");
  await run("document.querySelector('.delegation-selected-comment')?.click()");
  await pause(140);
  await run("document.querySelector('#delegation-comment-input')?.focus()");
  await send("Input.insertText", { text: "这条意见决定放弃" });
  await pause(100);
  await run(
    "Array.from(document.querySelectorAll('.delegation-comment-compose button')).find(x=>x.textContent.includes('添加批注'))?.click()",
  );
  await pause(160);
  const before = JSON.parse(await inspect());
  console.log("BEFORE_ABANDON", before);
  if (
    before.shown !== 1 ||
    before.highlights !== 1 ||
    !before.acceptDisabled ||
    before.saved[0].status !== "open"
  )
    throw Error("Live comment did not render correctly");
  await run(
    "Array.from(document.querySelectorAll('.delegation-comment-item button')).find(x=>x.textContent.includes('放弃此批注'))?.click()",
  );
  await pause(170);
  const after = JSON.parse(await inspect());
  console.log("AFTER_ABANDON", after);
  if (
    after.shown !== 0 ||
    after.highlights !== 0 ||
    after.saved.length !== 1 ||
    after.saved[0].status !== "abandoned" ||
    after.acceptDisabled ||
    !after.count.includes("0")
  )
    throw Error("Abandoned comment remains active");
  await send("Page.reload", { ignoreCache: true });
  await pause(3100);
  await run("document.querySelector('button.delegation-comment-trigger')?.click()");
  await pause(140);
  const restored = JSON.parse(await inspect());
  console.log("AFTER_RELOAD", restored);
  if (
    restored.shown !== 0 ||
    restored.highlights !== 0 ||
    restored.saved[0].status !== "abandoned" ||
    restored.acceptDisabled ||
    restored.docWidth > restored.viewport
  )
    throw Error("Abandoned comment reappeared after reload");
  console.log("ABANDONED_REVIEW_BROWSER_PASS");
} finally {
  await close();
}

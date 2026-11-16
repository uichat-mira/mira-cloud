// Real Chrome /new selection stability regression.
import { openChrome, pause } from "./chrome-client.mjs";
const { send, evaluate: ev, close } = await openChrome();
const metrics = () =>
  ev(
    "(()=>{const x=document.querySelector('.delegation-selected-comment');return JSON.stringify({visible:!!x,selection:window.getSelection()?.toString(),label:x?.textContent,open:!!document.querySelector('[aria-label=\"随文批注\"]')})})()",
  );
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:5173/new?fixture=radar" });
  await pause(3300);
  await ev(
    "(()=>{const ed=document.querySelector('.delegation-review-editor');if(!ed)throw Error('editor not mounted');ed.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'mouse'}));const n=ed.querySelector('.ProseMirror p').firstChild;const s=getSelection();const r=document.createRange();r.setStart(n,2);r.setEnd(n,9);s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));})()",
  );
  await pause(270);
  const dragging = JSON.parse(await metrics());
  console.log("DURING_LONG_DRAG", dragging);
  if (dragging.visible) throw Error("CTA appeared before pointer was released");
  await ev(
    "(()=>{const n=document.querySelector('.delegation-review-editor .ProseMirror p').firstChild;const s=getSelection();const r=document.createRange();r.setStart(n,4);r.setEnd(n,19);s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));})()",
  );
  await pause(85);
  await ev(
    "document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'mouse'}))",
  );
  await pause(80);
  const released = JSON.parse(await metrics());
  console.log("RELEASED_80MS", released);
  if (released.visible) throw Error("CTA appeared before selection had settled");
  await pause(185);
  const settled = JSON.parse(await metrics());
  console.log("SETTLED_265MS", settled);
  if (!settled.visible) throw Error("CTA never appeared after settled selection");
  await ev(
    "(()=>{const n=document.querySelector('.delegation-review-editor .ProseMirror p').firstChild;const s=getSelection();const r=document.createRange();r.setStart(n,10);r.setEnd(n,24);s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));})()",
  );
  await pause(45);
  const moving = JSON.parse(await metrics());
  console.log("RESELECTED_45MS", moving);
  if (moving.visible) throw Error("CTA was not hidden while adjusting selected range");
  await pause(220);
  const readjusted = JSON.parse(await metrics());
  console.log("READJUSTED_265MS", readjusted);
  if (!readjusted.visible) throw Error("CTA did not return for stable revised selection");
  const expected = readjusted.selection;
  await ev("document.querySelector('.delegation-selected-comment')?.click()");
  await pause(170);
  const quote = await ev(
    "document.querySelector('.delegation-comment-compose blockquote')?.textContent",
  );
  console.log("ANNOTATION_TARGET", JSON.stringify({ expected, quote }));
  if (expected !== quote)
    throw Error("Composer was given a stale rather than most recent selected range");
  await ev("document.querySelector('.delegation-comments-header button')?.click()");
  await pause(130);
  await ev(
    "(()=>{const s=getSelection();s.removeAllRanges();document.dispatchEvent(new Event('selectionchange'));})()",
  );
  await pause(60);
  const cleared = JSON.parse(await metrics());
  console.log("CLEARED", cleared);
  if (cleared.visible) throw Error("CTA did not clear when native selection collapsed");
  console.log("SELECTION_DEBOUNCE_BROWSER_PASS");
} finally {
  await close();
}

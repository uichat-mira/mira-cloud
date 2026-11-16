import { writeFileSync } from "node:fs";
const target=await fetch("http://127.0.0.1:9222/json/new?about:blank",{method:"PUT"}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);let seq=0;const pending=new Map();
ws.addEventListener("message",ev=>{const x=JSON.parse(ev.data);if(x.id&&pending.has(x.id)){const h=pending.get(x.id);pending.delete(x.id);x.error?h.reject(Error(x.error.message)):h.resolve(x.result)}});
await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true})});
function send(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function run(expression){const ret=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(ret.exceptionDetails)throw Error(ret.exceptionDetails.text);return ret.result.value}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 await send("Page.enable");
 await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:1,mobile:true});
 await send("Page.navigate",{url:"http://127.0.0.1:5173/new"});
 await sleep(4400);
 const b=await run("JSON.stringify({title:document.querySelector('h1')?.textContent,scroll:document.documentElement.scrollWidth,inner:innerWidth,editor:!!document.querySelector('.delegation-document-text .ProseMirror'),readonly:document.querySelector('.delegation-document-text .ProseMirror')?.getAttribute('contenteditable'),pane:!!document.querySelector('[aria-label=\"随文批注\"]')})");
 console.log("INITIAL",b);if(!JSON.parse(b).editor||JSON.parse(b).scroll>390)throw Error("Initial reader not mounted or overflow");
 const selected=await run("(()=>{const p=document.querySelector('.delegation-document-text .ProseMirror p');const t=p.firstChild;const r=document.createRange();r.setStart(t,10);r.setEnd(t,30);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);document.querySelector('.delegation-review-editor').dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));return JSON.stringify({text:sel.toString(),cta:!!document.querySelector('.delegation-selected-comment'),pane:!!document.querySelector('[aria-label=\"随文批注\"]')})})()");
 await sleep(240);
 const ready=await run("JSON.stringify({cta:!!document.querySelector('.delegation-selected-comment'),pane:!!document.querySelector('[aria-label=\"随文批注\"]')})");
 console.log("SELECT",selected,ready);if(!JSON.parse(ready).cta||JSON.parse(ready).pane)throw Error("selection CTA or no auto-opening failed");
 await run("document.querySelector('.delegation-selected-comment')?.click()");
 await sleep(100);
 console.log("MOBILE_SHEET",await run("JSON.stringify({pane:!!document.querySelector('[aria-label=\"随文批注\"]'),rect:document.querySelector('.delegation-comments')?.getBoundingClientRect().toJSON(),viewport:{w:innerWidth,h:innerHeight},label:document.querySelector('label[for=\"delegation-comment-input\"]')?.innerText,quote:document.querySelector('.delegation-comment-compose blockquote')?.innerText})"));
 await run("document.querySelector('#delegation-comment-input')?.focus()");
 await send("Input.insertText",{text:"请补充来源证据，并明确风险。"});
 await sleep(140);
 console.log("TYPE",await run("JSON.stringify({value:document.querySelector('#delegation-comment-input')?.value,disabled:document.querySelector('.delegation-comment-compose>button:last-child')?.disabled})"));
 await run("document.querySelector('.delegation-comment-compose>button:last-child')?.click()");
 await sleep(250);
 const added=await run("JSON.stringify({highlight:[...document.querySelectorAll('.delegation-review-poc-anchor')].map(x=>x.textContent),comment:document.querySelector('.delegation-comment-item')?.innerText,storage:sessionStorage.getItem('mira-cloud-delegation-fixture-v1')?.includes('\"anchor\"')})");
 console.log("ADDED",added);if(JSON.parse(added).highlight.length!==1||!JSON.parse(added).storage)throw Error("comment didn't persist with ProseMirror anchor");
 await run("document.querySelector('.delegation-comment-backdrop')?.click()");
 await sleep(200);
 console.log("CLOSED",await run("JSON.stringify({pane:!!document.querySelector('[aria-label=\"随文批注\"]'),selected:!!document.querySelector('.delegation-selected-comment')})"));
 await run("document.querySelector('.delegation-review-poc-anchor')?.click()");
 await sleep(230);
 console.log("HIGHLIGHT_TO_PANEL",await run("JSON.stringify({pane:!!document.querySelector('[aria-label=\"随文批注\"]'),active:document.querySelector('.delegation-comment-item[data-selected=\"true\"]')?.textContent})"));
 await run("document.querySelector('.delegation-comment-source')?.click()");
 await sleep(230);
 const returned=await run("JSON.stringify({pane:!!document.querySelector('[aria-label=\"随文批注\"]'),selection:getSelection()?.toString()})");
 console.log("PANEL_TO_TEXT",returned);if(JSON.parse(returned).pane||!JSON.parse(returned).selection)throw Error("reverse navigation failed");
 await send("Page.reload",{ignoreCache:true});
 await sleep(4300);
 const recovered=await run("JSON.stringify({saved:JSON.parse(sessionStorage.getItem('mira-cloud-delegation-fixture-v1')).comments[0]?.anchor,highlight:document.querySelectorAll('.delegation-review-poc-anchor').length,comments:document.querySelector('button.delegation-quiet-action')?.innerText,scroll:document.documentElement.scrollWidth})");
 console.log("RELOAD",recovered);if(JSON.parse(recovered).highlight!==1||JSON.parse(recovered).scroll>390)throw Error("session recovery failed");
 await run("Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('修改正文'))?.click()");
 await sleep(530);
 const editable=await run("JSON.stringify({attr:document.querySelector('.delegation-document-text .ProseMirror')?.getAttribute('contenteditable'),highlight:document.querySelectorAll('.delegation-review-poc-anchor').length})");
 console.log("EDITOR_MODE",editable);
 if(JSON.parse(editable).attr!=="true")throw Error("Cannot edit existing anchored document");
 await run("(()=>{const el=document.querySelector('.delegation-document-text .ProseMirror');el.focus();const first=el.querySelector('p').firstChild;const range=document.createRange();range.setStart(first,0);range.collapse(true);const sel=getSelection();sel.removeAllRanges();sel.addRange(range);})()");
 await send("Input.insertText",{text:"证据补充："});
 await sleep(540);
 const shifted=await run("JSON.stringify({highlight:[...document.querySelectorAll('.delegation-review-poc-anchor')].map(x=>x.textContent),draft:JSON.parse(sessionStorage.getItem('mira-cloud-delegation-fixture-v1')).comments[0]?.anchor,markdown:JSON.parse(sessionStorage.getItem('mira-cloud-delegation-fixture-v1')).stages[0]?.markdown.slice(0,38)})");
 console.log("EDIT_REMAP",shifted);
 if(JSON.parse(shifted).highlight.length!==1||JSON.parse(shifted).draft.status!=="active"||JSON.parse(shifted).draft.from<=11)throw Error("Anchor did not map live editor insertion");
 await run("Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('完成编辑'))?.click()");
 await sleep(520);
 const finished=await run("JSON.stringify({readonly:document.querySelector('.delegation-document-text .ProseMirror')?.getAttribute('contenteditable'),highlight:document.querySelectorAll('.delegation-review-poc-anchor').length,commentSaved:JSON.parse(sessionStorage.getItem('mira-cloud-delegation-fixture-v1')).comments[0]?.anchor})");
 console.log("EDIT_COMPLETE",finished);
 if(JSON.parse(finished).highlight!==1||JSON.parse(finished).readonly!=="false")throw Error("Anchor lost across editor mode");
 const shot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync("/tmp/mira-inline-ui-mobile-390.png",Buffer.from(shot.data,"base64"));
 await send("Emulation.setDeviceMetricsOverride",{width:1365,height:900,deviceScaleFactor:1,mobile:false});
 await sleep(300);
 await run("Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim().startsWith('批注'))?.click()");
 await sleep(200);
 const desktop=await run("JSON.stringify({w:innerWidth,scroll:document.documentElement.scrollWidth,pane:!!document.querySelector('[aria-label=\"随文批注\"]'),layout:getComputedStyle(document.querySelector('.delegation-layout')).gridTemplateColumns,panel:document.querySelector('.delegation-comments')?.getBoundingClientRect().toJSON()})");
 console.log("DESKTOP",desktop);if(JSON.parse(desktop).scroll>JSON.parse(desktop).w)throw Error("desktop overflow");
 const shot2=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});writeFileSync("/tmp/mira-inline-ui-desktop.png",Buffer.from(shot2.data,"base64"));
 // Verify the formal new-task canvas uses available desktop width, including
 // when the annotation rail is visible. This guards against the Shell 1320px cap.
 for (const width of [1280, 1600, 1920, 2560]) {
   await send("Emulation.setDeviceMetricsOverride", {
     width, height: 900, deviceScaleFactor: 1, mobile: false,
   });
   await sleep(150);
   const wide = JSON.parse(await run(
     "(()=>{const box=s=>document.querySelector(s)?.getBoundingClientRect();" +
     "return JSON.stringify({viewport:innerWidth,scroll:document.documentElement.scrollWidth," +
     "main:box('.workspace-main')?.width,canvas:box('.delegation-page')?.width," +
     "paper:box('.delegation-paper')?.width,notes:box('.delegation-comments')?.width})})()"
   ));
   console.log("DESKTOP_CANVAS", width, wide);
   if (
     wide.scroll > wide.viewport + 1 ||
     wide.canvas < wide.main * 0.9 ||
     wide.paper < 500 ||
     wide.notes < 240
   ) throw Error("Desktop /new no longer fills its work canvas at " + width);
 }
 console.log("INLINE_REVIEW_BROWSER_PASS");
}finally{try{await send("Page.close")}catch{}ws.close()}

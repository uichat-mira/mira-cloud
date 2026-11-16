import { writeFileSync } from "node:fs";
import { openChrome, pause } from "./chrome-client.mjs";
const { send, evaluate: run, close } = await openChrome();
const inspect = () =>
  run(
    "(()=>{const select=s=>document.querySelector(s);const rect=s=>{const r=select(s)?.getBoundingClientRect();return r?{x:r.x,top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};const list=select('.delegation-comment-list');return JSON.stringify({pageY:scrollY,viewport:innerHeight,innerWidth,documentWidth:document.documentElement.scrollWidth,totalScroll:document.documentElement.scrollHeight,grid:rect('.delegation-layout'),panel:rect('.delegation-comments'),overlay:rect('.delegation-comment-overlay'),header:rect('.delegation-comments-header'),list:rect('.delegation-comment-list'),composer:rect('.delegation-comment-compose'),listScrollTop:list?.scrollTop,listScrollHeight:list?.scrollHeight,listClientHeight:list?.clientHeight,count:document.querySelectorAll('.delegation-comment-item').length,panelPosition:select('.delegation-comments')&&getComputedStyle(select('.delegation-comments')).position,overlayPosition:select('.delegation-comment-overlay')&&getComputedStyle(select('.delegation-comment-overlay')).position})})()",
  );
async function openPanel() {
  const found = await run(
    "(()=>{const b=document.querySelector('button.delegation-comment-trigger');b?.click();return !!b})()",
  );
  if (!found) throw Error("No annotation entry button");
  await pause(150);
}
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
  const populated = await run(
    "(()=>{const k='mira-cloud-delegation-fixture-v1';const value=sessionStorage.getItem(k);if(!value)return 'missing session fixture';const d=JSON.parse(value);d.comments=Array.from({length:24},(_,i)=>({id:i+1,stage:0,excerpt:'需要核实的原文摘录 '+(i+1),text:'第 '+(i+1)+' 条：请确认引用和来源是否可靠，并补充必要证据。',status:'open'}));d.stages[0].markdown+='\\n\\n'+Array.from({length:100},(_,i)=>'长期研究背景段落 '+(i+1)+'：该条仅用于验证长页面滚动行为。').join('\\n\\n');sessionStorage.setItem(k,JSON.stringify(d));return 'fixture loaded'})()",
  );
  if (populated !== "fixture loaded") throw Error(populated);
  await send("Page.reload", { ignoreCache: true });
  await pause(3300);
  await openPanel();
  const first = JSON.parse(await inspect());
  console.log("FIRST", JSON.stringify(first));
  if (first.count !== 24) throw Error("Expected 24 rendered comments, got " + first.count);
  if (first.listScrollHeight <= first.listClientHeight + 100)
    throw Error("Comments list is not independently scrollable");
  // Regression: the previous sticky grid rail was pushed below the fold
  // before its threshold and moved offscreen again near the document end.
  if (
    first.panelPosition !== "fixed" ||
    Math.abs(first.panel.top - 74) > 2 ||
    first.panel.bottom > first.viewport + 2
  )
    throw Error("Desktop review is not viewport-fixed from the beginning");
  await run("window.scrollTo(0,700)");
  await pause(250);
  const sticky = JSON.parse(await inspect());
  console.log("SCROLLED_PAGE", JSON.stringify(sticky));
  if (Math.abs(sticky.panel.top - first.panel.top) > 2)
    throw Error("Review rail moved with the document");
  if (sticky.panel.bottom > sticky.viewport + 2) throw Error("Panel escaped viewport");
  const pt = {
    x: sticky.list.x + sticky.list.width / 2,
    y: sticky.list.top + sticky.list.height / 2,
  };
  await send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x: pt.x,
    y: pt.y,
    deltaX: 0,
    deltaY: 750,
  });
  await pause(270);
  const wheel = JSON.parse(await inspect());
  console.log("SCROLLED_NOTES", JSON.stringify(wheel));
  if (wheel.listScrollTop < 100) throw Error("Wheel did not scroll note list");
  if (Math.abs(wheel.pageY - sticky.pageY) > 3) throw Error("Wheel leaked to page");
  if (
    Math.abs(wheel.header.top - sticky.header.top) > 2 ||
    Math.abs(wheel.composer.top - sticky.composer.top) > 2
  )
    throw Error("Header or composer moved with notes");
  // Jumping to a distant comment must scroll the list without moving the
  // separate reading document (the existing highlight-to-comment operation).
  await run("document.getElementById('delegation-comment-24')?.scrollIntoView({block:'nearest'})");
  await pause(150);
  const located = JSON.parse(await inspect());
  console.log(
    "JUMP_TO_NOTE",
    JSON.stringify({ pageY: located.pageY, listScrollTop: located.listScrollTop }),
  );
  if (Math.abs(located.pageY - sticky.pageY) > 3 || located.listScrollTop <= wheel.listScrollTop)
    throw Error("Comment navigation escaped its own list");
  // Wheel at the end of the list cannot bubble into the document scroll.
  await run(
    "(()=>{const x=document.querySelector('.delegation-comment-list');x.scrollTop=x.scrollHeight;})()",
  );
  await pause(80);
  const settled = JSON.parse(await inspect());
  await send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x: pt.x,
    y: pt.y,
    deltaX: 0,
    deltaY: 650,
  });
  await pause(170);
  const overscroll = JSON.parse(await inspect());
  console.log(
    "OVERSCROLL",
    JSON.stringify({
      before: settled.pageY,
      after: overscroll.pageY,
      listScroll: overscroll.listScrollTop,
    }),
  );
  if (Math.abs(overscroll.pageY - settled.pageY) > 3)
    throw Error("Overscroll propagated to reading document");
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync("/tmp/mira-inline-review-sticky-1600.png", Buffer.from(shot.data, "base64"));
  await run("window.scrollTo(0, document.documentElement.scrollHeight)");
  await pause(200);
  const documentEnd = JSON.parse(await inspect());
  console.log(
    "DOCUMENT_END",
    JSON.stringify({
      pageY: documentEnd.pageY,
      panelTop: documentEnd.panel.top,
      headerTop: documentEnd.header.top,
      composerTop: documentEnd.composer.top,
    }),
  );
  if (
    documentEnd.pageY <= sticky.pageY ||
    Math.abs(documentEnd.panel.top - first.panel.top) > 2 ||
    Math.abs(documentEnd.header.top - first.header.top) > 2 ||
    Math.abs(documentEnd.composer.top - first.composer.top) > 2
  )
    throw Error("Review rail moved when the document approached its end");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await pause(180);
  const wide = JSON.parse(await inspect());
  if (
    Math.abs(wide.panel.top - first.panel.top) > 2 ||
    wide.panel.bottom > wide.viewport + 2 ||
    wide.documentWidth > wide.innerWidth
  )
    throw Error("Review rail regression on wide desktop");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 680,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await pause(220);
  await run("window.scrollTo(0,700)");
  await pause(170);
  const small = JSON.parse(await inspect());
  console.log("SHORT_DESKTOP", JSON.stringify(small));
  if (
    small.listClientHeight < 30 ||
    small.panel.bottom > 684 ||
    small.documentWidth > small.innerWidth
  )
    throw Error("Short desktop rail clipped");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await pause(220);
  const mobile = JSON.parse(await inspect());
  console.log("MOBILE", JSON.stringify(mobile));
  if (
    mobile.overlayPosition !== "fixed" ||
    mobile.documentWidth > mobile.innerWidth ||
    mobile.panel.height > mobile.viewport * 0.76
  )
    throw Error("Mobile bottom sheet regression");
  console.log("FIXED_REVIEW_BROWSER_PASS");
} finally {
  await close();
}

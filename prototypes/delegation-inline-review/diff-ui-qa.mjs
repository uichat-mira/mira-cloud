import { writeFileSync } from "node:fs";
import { openChrome, pause } from "./chrome-client.mjs";
const { send, evaluate, close } = await openChrome();
const snapshot = async () =>
  JSON.parse(
    await evaluate(
      "(() => { const raw = sessionStorage.getItem('mira-cloud-delegation-fixture-v1');" +
        "const d=raw?JSON.parse(raw):null;return JSON.stringify({" +
        "count:d?.comments?.length??0,statuses:d?.comments?.map(c=>c.status)??[]," +
        "accepted:d?.acceptedCount??-1,rev:d?.stages?.[0]?.revision??-1," +
        "history:d?.stages?.[0]?.reviewHistory?.length??0," +
        "diff:!!document.querySelector('.delegation-diff')," +
        "details:document.querySelectorAll('.delegation-diff-details li').length," +
        "fields:document.querySelectorAll('.delegation-diff-field').length," +
        "pending:!!document.querySelector('.delegation-streaming')," +
        "buttons:[...document.querySelectorAll('.delegation-paper-footer button')].map(b=>b.textContent.trim())," +
        "rootWidth:document.documentElement.scrollWidth,viewport:innerWidth" +
        "})})()",
    ),
  );
const click = async (expression) => {
  await evaluate(
    "(()=>{const el=" + expression + ";if(!el)throw new Error('Missing control');el.click()})()",
  );
};
const clickText = (value) =>
  click(
    "Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim().includes(" +
      JSON.stringify(value) +
      "))",
  );
const screenshot = async (path) => {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(path, Buffer.from(result.data, "base64"));
};
const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:5173/new?fixture=radar" });
  await pause(1400);
  await evaluate("sessionStorage.removeItem('mira-cloud-delegation-fixture-v1')");
  await send("Page.reload", { ignoreCache: true });
  await pause(2200);
  console.log("INITIAL", await snapshot(), await evaluate("document.body.innerText.slice(0,320)"));
  assert((await snapshot()).accepted === 0, "Fixture route failed to enter review");
  await click("document.querySelector('.delegation-comment-trigger')");
  await click("document.querySelector('.delegation-comment-demo')");
  await pause(150);
  assert((await snapshot()).count === 3, "Demo comments missing");
  await clickText("根据批注修订");
  await pause(170);
  assert((await snapshot()).pending, "Expected local preparation");
  assert((await snapshot()).rev === 0, "Draft changed during preparation");
  await pause(2600);
  const candidate = await snapshot();
  console.log("CANDIDATE", candidate);
  assert(candidate.diff && candidate.fields === 2, "Candidate lacks field deltas");
  assert(
    candidate.rev === 0 && candidate.statuses.every((s) => s === "open"),
    "Candidate mutated draft",
  );
  await screenshot("/tmp/mira-diff-desktop-candidate.png");
  await click("document.querySelector('.delegation-diff-heading button')");
  await pause(180);
  const expanded = await snapshot();
  console.log("EXPANDED", expanded);
  assert(expanded.details >= 1, "Text diff didn't appear");
  await click("document.querySelector('.delegation-diff-old-document summary')");
  await pause(1600);
  const oldDocumentText = await evaluate(
    "document.querySelector('.delegation-diff-old-document')?.innerText ?? ''",
  );
  assert(
    oldDocumentText.includes("请持续观察 AI 行业的新产品"),
    "Old Markdown source did not lazy-load",
  );
  await screenshot("/tmp/mira-diff-desktop-expanded.png");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await pause(260);
  const mobile = await snapshot();
  console.log("MOBILE", mobile);
  assert(mobile.rootWidth <= mobile.viewport + 1, "Mobile overflow");
  // Let the document, not the bottom review sheet, be the mobile primary view.
  await click("document.querySelector('.delegation-comments-header button')");
  await evaluate("document.querySelector('.delegation-diff').scrollIntoView({block:'center'})");
  await pause(180);
  await screenshot("/tmp/mira-diff-mobile-candidate.png");
  await clickText("采用这版");
  await pause(650);
  const adopted = await snapshot();
  console.log("ADOPTED", adopted);
  assert(adopted.rev > 0 && adopted.history === 1, "Applied revision lacks source");
  assert(adopted.statuses.join(",") === "suggested,suggested,open", "Comments auto-closed");
  assert(adopted.rootWidth <= adopted.viewport + 1, "Adopted mobile overflow");
  await screenshot("/tmp/mira-diff-mobile-adopted.png");
  await click("document.querySelector('.delegation-comment-trigger')");
  assert(
    (await evaluate("document.querySelectorAll('.delegation-comment-select').length")) === 2,
    "Only the two suggested comments should be selectable",
  );
  await click(
    "document.querySelector('.delegation-comment-select input[aria-label=\"选择批注 1 进行批量确认\"]')",
  );
  await clickText("确认选中（1）");
  await pause(160);
  const batchDecided = await snapshot();
  console.log("BATCH_DECIDED", batchDecided);
  assert(
    batchDecided.statuses.join(",") === "resolved,suggested,open",
    "Batch confirmation changed an unselected or open comment",
  );
  await click("document.querySelector('.delegation-comment-actions button')");
  await click("document.querySelector('.delegation-comment-abandon')");
  await pause(160);
  const decided = await snapshot();
  console.log("DECIDED", decided);
  assert(decided.statuses.join(",") === "resolved,resolved,abandoned", "Individual closure failed");
  await clickText("接受本阶段");
  await pause(250);
  const accepted = await snapshot();
  console.log("ACCEPTED", accepted);
  assert(accepted.accepted === 1, "Stage acceptance failed");
  console.log("DIFF_UI_CHROME_PASS");
} finally {
  await close();
}

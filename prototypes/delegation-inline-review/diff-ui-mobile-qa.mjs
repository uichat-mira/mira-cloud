import { writeFileSync } from "node:fs";
import { openChrome, pause } from "./chrome-client.mjs";

const { send, evaluate, close } = await openChrome();
const snapshot = async () =>
  JSON.parse(
    await evaluate(
      "(() => { const raw=sessionStorage.getItem('mira-cloud-delegation-fixture-v1');" +
        "const d=raw?JSON.parse(raw):null;return JSON.stringify({" +
        "count:d?.comments?.length??0,statuses:d?.comments?.map(c=>c.status)??[]," +
        "accepted:d?.acceptedCount??-1,rev:d?.stages?.[0]?.revision??-1," +
        "history:d?.stages?.[0]?.reviewHistory?.length??0," +
        "diff:!!document.querySelector('.delegation-diff')," +
        "fields:document.querySelectorAll('.delegation-diff-field').length," +
        "proposals:document.querySelectorAll('.delegation-comment-proposal').length," +
        "details:document.querySelectorAll('.delegation-diff-details li').length," +
        "overlay:!!document.querySelector('.delegation-comment-overlay')," +
        "diffTop:document.querySelector('.delegation-diff')?.getBoundingClientRect().top??null," +
        "scrollY:window.scrollY," +
        "rootWidth:document.documentElement.scrollWidth,viewport:innerWidth" +
        "})})()",
    ),
  );
const click = async (expression) =>
  evaluate(
    "(()=>{const el=" +
      expression +
      ";if(!el)throw new Error('Missing control: '+ " +
      JSON.stringify(expression) +
      ");el.click()})()",
  );
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
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:5173/new?fixture=radar" });
  await pause(1200);
  await evaluate("sessionStorage.removeItem('mira-cloud-delegation-fixture-v1')");
  await send("Page.reload", { ignoreCache: true });
  await pause(2000);
  await click("document.querySelector('.delegation-comment-trigger')");
  await click("document.querySelector('.delegation-comment-demo')");
  await pause(120);
  assert((await snapshot()).overlay, "Review sheet did not open");
  await clickText("根据批注修订");
  await pause(180);
  assert(!(await snapshot()).overlay, "Mobile review sheet did not close for candidate");
  assert((await snapshot()).rev === 0, "Draft mutated during generation");
  await pause(3100);
  const candidate = await snapshot();
  console.log("MOBILE_CANDIDATE", candidate);
  assert(candidate.diff && candidate.fields === 2, "Candidate or field delta missing");
  assert(!candidate.overlay, "Candidate is covered by review sheet");
  assert(
    candidate.diffTop !== null && candidate.diffTop >= 0 && candidate.diffTop < 240,
    "Diff panel did not scroll into the mobile reading area",
  );
  assert(candidate.rootWidth <= candidate.viewport, "Mobile horizontal overflow");
  assert(
    candidate.statuses.every((s) => s === "open"),
    "Comments auto-resolved before adoption",
  );
  await screenshot("/tmp/mira-diff-mobile-candidate-final.png");
  await click("document.querySelector('.delegation-diff-heading button')");
  await pause(120);
  assert((await snapshot()).details > 0, "Text delta missing");
  await screenshot("/tmp/mira-diff-mobile-expanded-final.png");
  await clickText("采用这版");
  await pause(600);
  const adopted = await snapshot();
  console.log("MOBILE_ADOPTED", adopted);
  assert(
    adopted.rev === 1 && adopted.history === 1,
    "Revision counter or source snapshot incorrect",
  );
  assert(
    adopted.statuses.join(",") === "suggested,suggested,open",
    "Comments were not kept pending",
  );
  assert(!adopted.overlay, "Review sheet should remain closed after adoption");
  await click("document.querySelector('.delegation-comment-trigger')");
  await pause(120);
  assert((await snapshot()).overlay, "Review sheet did not reopen");
  assert((await snapshot()).proposals === 3, "Adopted comment reasons were not preserved");
  await click("document.querySelector('.delegation-comment-actions button')");
  await click("document.querySelector('.delegation-comment-actions button')");
  await click("document.querySelector('.delegation-comment-abandon')");
  await pause(120);
  assert(
    (await snapshot()).statuses.join(",") === "resolved,resolved,abandoned",
    "Manual comment closure failed",
  );
  await click("document.querySelector('.delegation-comments-header button')");
  await pause(120);
  assert(!(await snapshot()).overlay, "Review sheet did not close before stage acceptance");
  await clickText("接受本阶段");
  await pause(240);
  const accepted = await snapshot();
  console.log("MOBILE_ACCEPTED", accepted);
  assert(accepted.accepted === 1, "Stage acceptance failed");
  assert(!accepted.overlay, "Review sheet remained open after stage acceptance");
  assert(accepted.rootWidth <= accepted.viewport, "Accepted mobile page overflow");
  console.log("DIFF_UI_MOBILE_CHROME_PASS");
} finally {
  await close();
}

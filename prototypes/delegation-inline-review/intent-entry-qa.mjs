import { writeFileSync } from "node:fs";
import { openChrome, pause } from "./chrome-client.mjs";

const { send, evaluate, close } = await openChrome();
const snapshot = () =>
  evaluate(
    "(()=>{const d=sessionStorage.getItem('mira-cloud-delegation-fixture-v1');const b=document.querySelector('.delegation-entry-form button[type=submit]');return JSON.stringify({phase:!!document.querySelector('.delegation-entry')?'entry':'review',label:document.querySelector('.delegation-entry h1')?.textContent||document.querySelector('.delegation-paper-title h2')?.textContent,saved:d?JSON.parse(d).scenarioId:null,intent:d?JSON.parse(d).intent:null,stageText:d?JSON.parse(d).stages[0].markdown?.slice(0,210):null,submitDisabled:b?.disabled,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,dialog:!!document.querySelector('[role=dialog]')})})()",
  );
const image = async (path) => {
  const response = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(path, Buffer.from(response.data, "base64"));
};
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:5173/new" });
  await pause(2600);
  const entry = JSON.parse(await snapshot());
  console.log("INITIAL", entry);
  if (
    entry.phase !== "entry" ||
    entry.saved ||
    !entry.submitDisabled ||
    entry.scrollWidth > entry.width
  ) {
    throw new Error("Fresh /new did not start at an empty intent entry");
  }
  await image("/tmp/mira-d02-entry-desktop.png");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await pause(200);
  const mobile = JSON.parse(await snapshot());
  console.log("MOBILE_ENTRY", mobile);
  if (mobile.phase !== "entry" || mobile.scrollWidth > mobile.width) {
    throw new Error("Mobile entry has overflow");
  }
  await image("/tmp/mira-d02-entry-mobile-390.png");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const goal = "请帮我持续关注街区文化活动，每周整理重要变化，避免没有重点的通知。";
  await evaluate("document.querySelector('#delegation-intent-input').focus()");
  await send("Input.insertText", { text: goal });
  await pause(120);
  const filled = JSON.parse(await snapshot());
  console.log("FILLED", filled);
  if (filled.submitDisabled || filled.saved)
    throw new Error("Intent form did not accept goal safely");
  await evaluate("document.querySelector('.delegation-entry-form button[type=submit]').click()");
  await pause(100);
  const preparing = JSON.parse(await snapshot());
  console.log("PREPARING", preparing);
  if (preparing.phase !== "entry" || preparing.saved)
    throw new Error("Draft exists before local generation");
  await pause(690);
  const review = JSON.parse(await snapshot());
  console.log("REVIEW", review);
  if (
    review.phase !== "review" ||
    review.saved !== "custom" ||
    review.intent !== goal ||
    !review.stageText.includes(goal)
  ) {
    throw new Error("Custom intent was not carried into its review document");
  }
  await image("/tmp/mira-d02-review-custom.png");
  await send("Page.reload", { ignoreCache: true });
  await pause(3100);
  const restored = JSON.parse(await snapshot());
  console.log("RELOADED", restored);
  if (restored.phase !== "review" || restored.intent !== goal) {
    throw new Error("Review did not restore after reload");
  }
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('新交代'))?.click()",
  );
  await pause(120);
  const confirm = JSON.parse(await snapshot());
  console.log("CONFIRM_RESTART", confirm);
  if (!confirm.dialog) throw new Error("Missing destructive restart confirmation");
  await evaluate(
    "Array.from(document.querySelectorAll('button')).find(x=>x.textContent.includes('放弃并重新交代'))?.click()",
  );
  await pause(170);
  const reset = JSON.parse(await snapshot());
  console.log("RESET", reset);
  if (reset.phase !== "entry" || reset.saved)
    throw new Error("Restart did not clear the old draft");
  for (const width of [320, 270]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 820,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await pause(120);
    const state = JSON.parse(await snapshot());
    console.log("NARROW", width, state.scrollWidth, state.width);
    if (state.scrollWidth > state.width + 1) throw new Error("Overflow at " + width);
  }
  console.log("D02_INTENT_ENTRY_CHROME_PASS");
} finally {
  await close();
}

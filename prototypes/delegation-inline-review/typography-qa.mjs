import { writeFileSync } from "node:fs";
import { openChrome, pause } from "./chrome-client.mjs";

const { send, evaluate, close } = await openChrome();
const cases = [
  ["/", ".workbench-page-header h1", "工作台"],
  ["/tasks", ".workbench-page-header h1", "全部工作"],
  ["/tasks/market-research", ".workbench-page-header h1", "东南亚市场进入研究"],
  ["/artifacts", ".workbench-page-header h1", "成果"],
  ["/artifacts/market-note", ".workbench-page-header h1", "市场机会研究摘要"],
  ["/settings/general", "h1:not(.sr-only)", "通用"],
];
const screenshot = async (path) => {
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(path, Buffer.from(result.data, "base64"));
};
const inspect = async (selector) => {
  const js =
    "(()=>{const e=document.querySelector(" +
    JSON.stringify(selector) +
    ");const c=e?getComputedStyle(e):null;const b=getComputedStyle(document.body);return JSON.stringify({title:e?.textContent?.trim()??null,family:c?.fontFamily??null,weight:c?.fontWeight??null,body:b.fontFamily,rootSerif:getComputedStyle(document.documentElement).getPropertyValue('--mira-font-serif').trim(),overflow:document.documentElement.scrollWidth>innerWidth+1})})()";
  return JSON.parse(await evaluate(js));
};
const assertSerif = (info, label, expected) => {
  console.log(label, info);
  if (
    !info.family?.includes("Iowan Old Style") ||
    info.weight !== "400" ||
    (expected && info.title !== expected) ||
    !info.body.includes("IBM Plex Sans") ||
    info.overflow
  ) {
    throw new Error("Title token or body role mismatch: " + label);
  }
};
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (const [route, selector, expected] of cases) {
    await send("Page.navigate", { url: "http://127.0.0.1:5173" + route });
    await pause(740);
    assertSerif(await inspect(selector), route, expected);
    if (route === "/") {
      assertSerif(await inspect(".workbench-cockpit-card-header h2"), "Home section", "需要你关注");
      await screenshot("/tmp/mira-typography-home-desktop.png");
    }
    if (route === "/settings/general")
      await screenshot("/tmp/mira-typography-settings-desktop.png");
  }
  await send("Page.navigate", { url: "http://127.0.0.1:5173/new" });
  await pause(1050);
  assertSerif(
    await inspect(".delegation-entry h1, .delegation-introduction h1"),
    "/new entry-or-review",
  );
  await screenshot("/tmp/mira-typography-new-desktop.png");
  for (const width of [390, 320]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    for (const [route, selector] of [
      ["/", ".workbench-page-header h1"],
      ["/tasks/market-research", ".workbench-page-header h1"],
      ["/new", ".delegation-entry h1, .delegation-introduction h1"],
    ]) {
      await send("Page.navigate", { url: "http://127.0.0.1:5173" + route });
      await pause(710);
      assertSerif(await inspect(selector), route + "@" + width);
    }
  }
  console.log("MIRA_SERIF_TITLE_TOKEN_CHROME_PASS");
} finally {
  await close();
}

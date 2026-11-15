import { writeFileSync } from "node:fs";
const tabs = await fetch("http://127.0.0.1:9222/json").then((response) => response.json());
const target = tabs.find((tab) => tab.type === "page");
if (!target) throw new Error("No Chrome debugging target");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
let id = 0;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    const handler = (event) => {
      const result = JSON.parse(event.data);
      if (result.id !== n) return;
      ws.removeEventListener("message", handler);
      result.error ? reject(new Error(JSON.stringify(result.error))) : resolve(result.result);
    };
    ws.addEventListener("message", handler);
    ws.send(JSON.stringify({ id: n, method, params }));
  });
}
async function evalJs(expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "http://127.0.0.1:5173/new" });
await pause(1400);
await evalJs('sessionStorage.removeItem("mira-cloud-delegation-fixture-v1")');
await send("Page.reload", { ignoreCache: true });
await pause(1600);
const base = await evalJs('JSON.stringify({heading:document.querySelector("h1")?.textContent,agreement:document.body.innerText.includes("研究重点：模型、产品与开源"),controls:document.querySelectorAll("[role=combobox]").length,accept:!!Array.from(document.querySelectorAll("button")).find(x=>x.textContent?.includes("接受本阶段")&&!x.disabled)})');
console.log("BASE",base);
await evalJs('Array.from(document.querySelectorAll("button")).find(x=>x.textContent?.includes("修改正文"))?.click()');
await pause(1600);
const editor = await evalJs('JSON.stringify({editors:document.querySelectorAll("[contenteditable=true]").length,paragraphs:[...document.querySelectorAll("[contenteditable=true] p")].map(x=>x.textContent?.slice(0,100))})');
console.log("EDITOR",editor);
const selected = await evalJs('(()=>{const root=document.querySelector("[contenteditable=true]");if(!root)return false;const paragraphs=[...root.querySelectorAll("p")];const target=paragraphs.at(-1);if(!target)return false;root.focus();const range=document.createRange();range.selectNodeContents(target);range.collapse(false);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);return true})()');
if (!selected) throw new Error("No Milkdown text editor available");
await send("Input.insertText", { text: "，改为每天检查（故意制造冲突）" });
await pause(900);
await evalJs('Array.from(document.querySelectorAll("button")).find(x=>x.textContent?.includes("完成编辑"))?.click()');
await pause(500);
const blocked = await evalJs('JSON.stringify({alert:document.querySelector("[role=alert]")?.textContent,disabled:Array.from(document.querySelectorAll("button")).find(x=>x.textContent?.includes("接受本阶段"))?.disabled,body:document.querySelector(".delegation-document-text")?.innerText?.slice(-210)})');
console.log("CONFLICT",blocked);
if (!JSON.parse(blocked).disabled || !JSON.parse(blocked).alert) throw new Error("Milkdown disagreement was not blocked");
await evalJs('Array.from(document.querySelectorAll("button")).find(x=>x.textContent?.includes("按控件同步约定"))?.click()');
await pause(450);
const recovered = await evalJs('JSON.stringify({alert:document.querySelector("[role=alert]")?.textContent??null,acceptDisabled:Array.from(document.querySelectorAll("button")).find(x=>x.textContent?.includes("接受本阶段"))?.disabled,agreement:document.querySelector(".delegation-document-text")?.innerText?.includes("研究重点：模型、产品与开源")})');
console.log("RECONCILED",recovered);
if (JSON.parse(recovered).alert || JSON.parse(recovered).acceptDisabled) throw new Error("Explicit reconciliation did not unblock acceptance");
const pic = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
writeFileSync("/tmp/mira-unified-document-desktop.png", Buffer.from(pic.data, "base64"));
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await pause(500);
const mobile = await evalJs('JSON.stringify({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,accept:document.querySelector(".delegation-accept")?.getBoundingClientRect().height})');
console.log("MOBILE",mobile);
const picMobile = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
writeFileSync("/tmp/mira-unified-document-mobile.png", Buffer.from(picMobile.data, "base64"));
if (JSON.parse(mobile).scrollWidth > JSON.parse(mobile).width) throw new Error("Mobile horizontal overflow");
ws.close();

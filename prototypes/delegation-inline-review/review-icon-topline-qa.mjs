// Real Chrome verification for the single icon-only review entry in /new topline.
import { openChrome, pause } from "./chrome-client.mjs";
const { send, evaluate: ev, close } = await openChrome();
const inspect = () =>
  ev(
    "(()=>{const top=document.querySelector('.delegation-paper-topline');const btn=document.querySelector('button.delegation-comment-trigger');const paper=document.querySelector('.delegation-paper');const rect=x=>x?.getBoundingClientRect().toJSON();const panel=document.querySelector('#delegation-comments-panel');return JSON.stringify({viewport:{w:innerWidth,h:innerHeight},scrollWidth:document.documentElement.scrollWidth,scrollY:scrollY,topline:rect(top),button:rect(btn),paper:rect(paper),nav:rect(document.querySelector('.workspace-topbar')),panel:rect(panel),footerHasReview:!!document.querySelector('.delegation-paper-footer .delegation-comment-trigger'),actionText:btn?.textContent?.trim(),name:btn?.getAttribute('aria-label'),expanded:btn?.getAttribute('aria-expanded'),count:document.querySelectorAll('button.delegation-comment-trigger').length,save:top?.querySelector('.delegation-topline-actions span')?.textContent})})()",
  );
try {
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: "http://127.0.0.1:5173/new?fixture=radar" });
  await pause(3300);
  const before = JSON.parse(await inspect());
  console.log(
    "DESKTOP_CLOSED",
    JSON.stringify({
      button: before.button,
      topline: before.topline,
      save: before.save,
      footerHasReview: before.footerHasReview,
      actionText: before.actionText,
      count: before.count,
    }),
  );
  if (
    !before.button ||
    before.count !== 1 ||
    before.footerHasReview ||
    before.actionText ||
    before.expanded !== "false" ||
    before.scrollWidth > 1600
  )
    throw Error("Icon-only entry absent, duplicated or overflowing");
  const rightPadding = Number(
    await ev(
      "parseFloat(getComputedStyle(document.querySelector('.delegation-paper-topline')).paddingRight)",
    ),
  );
  if (
    Math.abs(before.topline.right - before.button.right - rightPadding) > 2 ||
    before.button.left < before.topline.left ||
    before.save
  )
    throw Error("Review icon is not right-aligned or save hint remains");
  await ev("document.querySelector('button.delegation-comment-trigger').click()");
  await pause(280);
  const open = JSON.parse(await inspect());
  console.log(
    "DESKTOP_OPEN",
    JSON.stringify({
      expanded: open.expanded,
      panel: open.panel,
      button: open.button,
      scroll: open.scrollWidth,
    }),
  );
  if (open.expanded !== "true" || !open.panel || open.scrollWidth > 1600)
    throw Error("Review rail did not open");
  await ev("window.scrollTo(0,700)");
  await pause(200);
  const scrolled = JSON.parse(await inspect());
  console.log(
    "DESKTOP_SCROLLED",
    JSON.stringify({
      nav: scrolled.nav,
      topline: scrolled.topline,
      button: scrolled.button,
      panel: scrolled.panel,
    }),
  );
  if (
    Math.abs(scrolled.topline.top - scrolled.nav.bottom) > 2 ||
    Math.abs(
      scrolled.button.top -
        scrolled.topline.top -
        (scrolled.topline.height - scrolled.button.height) / 2,
    ) > 3
  )
    throw Error("Review icon failed to stay in sticky topline");
  await ev("document.querySelector('button.delegation-comment-trigger').click()");
  await pause(250);
  const closed = JSON.parse(await inspect());
  console.log(
    "DESKTOP_RE_CLOSED",
    JSON.stringify({ expanded: closed.expanded, panel: closed.panel }),
  );
  if (closed.expanded !== "false" || closed.panel) throw Error("Review icon did not close panel");
  for (const width of [390, 320, 270]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await pause(160);
    const small = JSON.parse(await inspect());
    console.log(
      "MOBILE",
      width,
      JSON.stringify({
        save: small.save,
        button: small.button,
        topline: small.topline,
        overflow: small.scrollWidth > small.viewport.w,
      }),
    );
    if (
      small.scrollWidth > width + 1 ||
      !small.button ||
      small.count !== 1 ||
      small.footerHasReview
    )
      throw Error("Narrow view regression");
  }
  await ev("document.querySelector('button.delegation-comment-trigger').click()");
  await pause(160);
  const mobileOpen = JSON.parse(await inspect());
  console.log(
    "MOBILE_OPEN",
    JSON.stringify({ panel: mobileOpen.panel, expanded: mobileOpen.expanded }),
  );
  if (!mobileOpen.panel || mobileOpen.expanded !== "true") throw Error("Mobile sheet entry failed");
  console.log("REVIEW_ICON_TOPLINE_BROWSER_PASS");
} finally {
  await close();
}

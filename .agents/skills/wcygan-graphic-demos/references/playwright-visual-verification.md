# Playwright Visual Verification

Sources:

- Playwright Visual comparisons: https://playwright.dev/docs/test-snapshots
- Playwright Screenshots: https://playwright.dev/docs/screenshots

Use this reference when a change affects rendered article demos, demo CSS,
Canvas/SVG output, controls, labels, reduced-motion behavior, or mobile layout.

## Local Acceptance Bar

For `wcygan.net` graphic demos, browser verification should prove:

- The article route renders the demo in context.
- Desktop and phone-width viewports are readable.
- Canvas or SVG content is nonblank.
- Labels fit and do not overlap incoherently.
- Controls work and do not resize the layout.
- Horizontal overflow is zero.
- Reduced-motion mode still teaches the invariant when playback exists.

Use Playwright screenshots as evidence for visual layout and Canvas/chart
content. Use DOM assertions for text, controls, and geometry values.

## Screenshot Types

Page screenshot:

```ts
await page.screenshot({ path: "demo-desktop.png" });
```

Full-page screenshot:

```ts
await page.screenshot({
  path: "article-full-page.png",
  fullPage: true,
});
```

Element screenshot:

```ts
await page.locator("[data-demo='replication-lag']").screenshot({
  path: "replication-lag-demo.png",
});
```

Prefer element screenshots when checking one demo. Prefer viewport screenshots
when article rhythm, sticky UI, or nearby prose matters.

## Desktop And Mobile Smoke Check

Use a focused script shape for ad hoc visual verification:

```ts
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto("http://127.0.0.1:5173/example-post");
await page.locator("figure").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: "artifacts/example-desktop.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.locator("figure").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: "artifacts/example-mobile.png" });

const overflow = await page.evaluate(
  () =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
);

if (overflow !== 0) {
  throw new Error(`horizontal overflow: ${overflow}px`);
}

await browser.close();
```

Adapt the route, selector, and artifact paths to the post under review.

## Visual Comparisons

Use `toHaveScreenshot()` when a demo has stable deterministic output and visual
regression is worth keeping in tests:

```ts
import { expect, test } from "@playwright/test";

test("replication lag demo stays visually stable", async ({ page }) => {
  await page.goto("/multi-region-data");
  const demo = page.locator("[data-demo='replication-lag']");
  await expect(demo).toHaveScreenshot("replication-lag.png");
});
```

Playwright warns that screenshot output can differ by OS, browser, hardware,
power state, fonts, and headless mode. Keep baselines in the same environment
where they are generated.

Use screenshot comparisons for:

- deterministic static states
- reduced-motion states
- selected scenario states
- final frame snapshots

Avoid screenshot baselines for:

- live map tiles
- continuously animated frames
- timers or timestamps
- content with nondeterministic external assets

## Stabilizing Screenshots

Before taking screenshots:

- Navigate to the article route, not an isolated component when the issue is
  article fit.
- Scroll the target figure into view.
- Pause autoplay or select a deterministic state when controls exist.
- Use reduced-motion emulation when checking the reduced-motion branch.
- Hide or neutralize volatile external content only when the test is explicitly
  about the demo, not the full page.

Use Playwright's `stylePath` option for visual comparisons when volatile
elements need to be hidden consistently.

## Geometry Checks Beat Pixel Checks When Exactness Matters

For SVG packet/path demos, prefer direct geometry assertions when possible:

```ts
const distance = await page.locator("svg").evaluate((svg) => {
  const path = svg.querySelector<SVGPathElement>("[data-active-path]");
  const packet = svg.querySelector<SVGCircleElement>("[data-packet]");
  if (!path || !packet) return Number.POSITIVE_INFINITY;

  const point = path.getPointAtLength(path.getTotalLength());
  const cx = Number(packet.getAttribute("cx"));
  const cy = Number(packet.getAttribute("cy"));
  return Math.hypot(point.x - cx, point.y - cy);
});

expect(distance).toBeLessThan(0.5);
```

This is better than a screenshot when the acceptance criterion is exact
alignment, such as a packet leaving a trail on the same path.

## Review Checklist

- Did verification use the real article route?
- Were desktop and phone-width viewports checked?
- Was horizontal overflow measured?
- Was the target demo visible in screenshots?
- Were animations paused or reduced for deterministic checks?
- Was `toHaveScreenshot()` used only for stable output?
- Were exact SVG/canvas geometry requirements asserted directly when possible?
- Are generated artifacts useful for review without committing unnecessary
  runtime state?

# Canvas Rendering And Lifecycle

Sources:

- MDN Optimizing canvas:
  https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- MDN Window.requestAnimationFrame:
  https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame

Use this reference when implementing or reviewing Canvas 2D demos under
`src/components/*.tsx` or model-backed renderers under `src/demos/*`.

## Where This Fits Locally

Use the local model-backed shape when a demo has time, packets, phases,
ownership, replay, or derived state:

```text
src/components/ExampleDemo.tsx
src/demos/example/model.ts
src/demos/example/engine.ts
src/demos/example/render-canvas.ts
src/demos/example/viewport.ts
src/demos/example/model.test.ts
```

Keep the same boundary:

- `model.ts`: domain state, phase names, semantic labels, clamps, and derived
  values.
- `engine.ts`: frame scheduling, timestamp math, observers, visibility,
  reduced-motion behavior, and cleanup.
- `viewport.ts`: canvas CSS size, device-pixel sizing, and named geometry.
- `render-canvas.ts`: pure drawing from a snapshot and viewport.

## Canvas Setup Checklist

- Measure the CSS box with `getBoundingClientRect()` or a `ResizeObserver`.
- Size the backing bitmap with `devicePixelRatio`, then draw in CSS pixels.
- Reset the canvas transform before applying DPR scale when resizing.
- Render a useful first frame immediately after setup, before animation
  advances.
- Keep text and labels readable at phone widths; do not rely on desktop-only
  canvas dimensions.

Typical DPR setup:

```ts
const rect = canvas.getBoundingClientRect();
const dpr = window.devicePixelRatio || 1;

canvas.width = Math.max(1, Math.round(rect.width * dpr));
canvas.height = Math.max(1, Math.round(rect.height * dpr));

const ctx = canvas.getContext("2d");
if (!ctx) return;

ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

Use `ctx.setTransform(...)` during resize rather than repeatedly calling
`ctx.scale(...)` on an already-scaled context.

## Drawing Performance

Apply MDN's canvas optimization advice conservatively:

- Pre-render repeated primitives to an offscreen canvas when the same expensive
  shape is drawn every frame.
- Use layered canvases only when there is a clear split between static and
  frequently-changing content. Do not add layers for simple article figures.
- Batch paths: prefer one polyline/path over many separate stroke calls when the
  geometry allows it.
- Avoid unnecessary canvas state changes inside tight loops. Group drawing by
  fill, stroke, font, alpha, or shadow state.
- Avoid `shadowBlur` and repeated text rendering in hot paths when the demo is
  already frame-heavy.
- Set `getContext("2d", { alpha: false })` only when the canvas never needs a
  transparent background.
- Prefer CSS for static backgrounds rather than redrawing a static backdrop each
  frame.

Do not optimize away clarity. Named geometry, semantic colors, and faithful
packet paths matter more than micro-optimizing a small demo.

## Animation Loop Rules

`requestAnimationFrame` is one-shot: schedule the next frame from the current
callback only when playback should continue.

```ts
let frameId = 0;
let startedAt: number | null = null;

function tick(timestamp: number) {
  startedAt ??= timestamp;
  const elapsedMs = timestamp - startedAt;
  const progress = (elapsedMs % LOOP_MS) / LOOP_MS;

  render(snapshotAt(progress));
  frameId = window.requestAnimationFrame(tick);
}

frameId = window.requestAnimationFrame(tick);
```

Use the callback `timestamp` for progress. Do not increment by a fixed frame
amount; that runs too fast on high-refresh displays and too slowly after
throttling.

For finite animations, stop scheduling when the animation is settled:

```ts
function tick(timestamp: number) {
  const progress = Math.min((timestamp - startedAt) / durationMs, 1);
  render(snapshotAt(progress));

  if (progress < 1) {
    frameId = window.requestAnimationFrame(tick);
  }
}
```

## Visibility And Reduced Motion

Most browsers pause `requestAnimationFrame` in background tabs. Still wire demo
state intentionally:

- Listen for `visibilitychange` when the demo has long-running playback.
- On hidden pages, cancel the frame and stop doing work.
- On visible pages, restart from a coherent model state or render the current
  snapshot.
- Under `prefers-reduced-motion`, render a settled, final, or representative
  state that still teaches the invariant.

## Cleanup Contract

Every engine or effect must clean up:

- `cancelAnimationFrame(frameId)`
- `ResizeObserver.disconnect()`
- `IntersectionObserver.disconnect()`
- media-query listeners
- document/window event listeners
- intervals, timers, and map instances

Return a `destroy()` function from engines so React components can keep cleanup
linear.

## Review Checklist

- Does the first frame teach the article's invariant?
- Is progress derived from a timestamp, not a frame count?
- Are backing pixels and CSS pixels handled separately?
- Does resize render a crisp, nonblank canvas?
- Are connector paths and moving packets derived from the same named geometry?
- Does reduced motion preserve the same concept without playback?
- Does cleanup release every observer, event listener, frame, and timer?
- Did browser verification include desktop and phone-width viewports?

# Lock-queue case study

The worked trace behind `$wcygan-demo-replication`: replicating the
PlanetScale stuck-database demo from
`https://planetscale.com/blog/debugging-live-database-connections` into
`src/posts/connection-pooling.draft.mdx`. Three passes; the final artifact is
the vendored bundle, not a reimplementation. The accepted bundle and its
embedding wrapper now live in `$planet-scale-animation-design-system`
(`assets/`, published to `public/vendor/planetscale/`).

## Pass 1 — built from prose (rejected)

The article prose describes the causality, so a first implementation rendered
it: parallel lanes with packets traveling from a pool to an `orders` table.
The user rejected it — prose describes _what happens_; only the rendered demo
describes _what it looks like_. Open the demo before writing any code.

## Pass 2 — faithful reimplementation from frame traces (rejected)

Frame traces and DOM inspection produced a faithful DOM reimplementation
(`src/demos/lock-queue/`, component `LockQueueDemo`, CSS class family in
`src/styles/app.css`): PROCESS ID / QUERY / STATUS columns, five boxed rows,
gray `WORKING` with a shimmer sweep, crimson `ERROR` on
`SELECT * FROM orders WHERE id = 123`, olive `WAITING` staircase with dashed
elbow connectors, Replay control. Structure matched; the user judged the
styling, coloring, and animations short of the source. Reimplementing a
polished vendor demo by eye converges slowly — each discrepancy is one
screenshot round-trip.

## Pass 3 — vendor the bundle (final)

### Trace

1. The article's raw HTML carries an iframe `id="lock-queue"` pointing at
   `/blog/debugging-live-database-connections/iframe`. That HTML is a
   741-byte Vite shell loading one 23KB bundle, a modulepreload polyfill, and
   a stylesheet.
2. Dense frame trace: a `page.screenshot` burst at ~60ms (409 frames over
   24s), sampled at 1s intervals. CDP `Page.startScreencast` returned zero
   frames — the burst is the working capture path.
3. The running DOM names the technology: the demo is an SVG
   (`svg.brand-diagram-svg`, viewBox `0 0 1054 1203`) built at runtime, with
   one `clipPath`/`conn-fill-N` pair per row — the per-row progress fill is a
   clipped rect, not a CSS animation. There is no static SVG asset to
   download; the runnable artifact is the bundle.
4. Grep of the bundle (`grep` over the minified source) extracted the exact
   contract:
   - Palettes: `light`/`dark` objects — dark is `#111111` background,
     `#FAFAFA` foreground, accents `#F35815`/`#0E73CC`/`#27B648`/`#FF455D`/
     `#F2B600`.
   - State machine: `working → error → stuck → releasing`, with status labels
     `WORKING/ERROR/WAITING/RELEASING` and role colors
     `gray/red/yellow/green`.
   - Content: every query string (19 SQL statements) and the cycle length
     (`14e3` ms).
5. Vendored it wholesale: `public/connection-pooling/vendor/` holds
   `index.html` (mirrors the source shell, transparent background),
   `iframe-BxfYI-2n.js`, `modulepreload-polyfill-B5Qt9EMX.js`, and
   `styles-CWGXrFsx.css`.
6. `src/components/LockQueueDemo.tsx` embeds the local shell in an iframe
   inside the editorial figure: title, deck, a 44px Replay control that
   clears and restores `iframe.src`, and aspect switching measured from the
   stage (`1 / 1` under 801px, `10 / 5` above — the source's own breakpoint).
   The figcaption attributes the demo to PlanetScale's
   "How one connection kills a database".
7. `src/demos/lock-queue/` was deleted; clean cutover.

### Verification evidence

- Local page renders the desktop variant: pid/status columns, working rows
  with left-to-right progress fills, green `RELEASING` flashes, `RESTART`
  control; cycle advances across captures; no console errors.
- The compact square variant renders in the article column.
- Source-side stuck staircase (crimson `ERROR` top row, olive `WAITING`
  cascade with dashed connectors) captured frame-precise in
  `/tmp/ps-trace/`; the vendored bundle is the same code path.
- Unverified locally: a captured stuck-phase frame on the vendored embed (the
  demo's stuck window is narrow and randomized; dense capture froze its
  animation frames). The bundle is unchanged from the source, so this is a
  capture-timing limitation, not a fidelity gap.

### Timing notes for captures

The demo cycles every 14s and restarts on its own; the stuck window sits a
few seconds wide inside the cycle and drifts per run. Schedule captures at
fixed offsets from a Replay click across several short `run` calls — one call
dies at 30s and kills the tab. Frozen identical frames mean the capture
starved the page's animation frames, not that the demo stalled.

## Repeatability run — USL curve

The same process replicated the interactive Gunther's-law playground from
`planetscale.com/blog/concurrency-vs-throughput-vitess-mysql` in one pass:
three hash-routed demos (`#junction`, `#usl-curve`, `#before-after`) behind
one iframe, canvas-rendered with `α`/`β` sliders. Vendored to
`public/connection-pooling/vendor/concurrency/` (`iframe-A02iGTt6.js` +
shared polyfill/stylesheet + a local `index.html`), embedded via
`#usl-curve` through a shared `VendoredDemoFigure` wrapper
(`src/components/VendoredDemoFigure.tsx`) that both article figures now use.
Two lessons folded back into the wrapper: measure the iframe's laid-out
content height on load and on stage resize instead of guessing aspect ratios
(the demo's own height does not follow a clean ratio), and forward the demo
fragment in the iframe `src` for hash-routed bundles.

Follow-up: the first wiring of the USL post picked `#usl-curve`, but the
section's own words — "Adjust the ARRIVALS / S slider" — named the
`#junction` route. When one bundle serves several hash-routed demos, choose
the fragment from the section's prose, not from the bundle's most prominent
demo, and render each route the section references as its own figure.

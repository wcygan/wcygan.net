# Bundle inventory

Observed structure of each vendored bundle (DOM inspection + grep of the
served minified source, 2026-09).

## lock-queue — `iframe-BxfYI-2n.js`

- Source: `planetscale.com/blog/debugging-live-database-connections/iframe`
- Renderer: SVG built at runtime. `svg.brand-diagram-svg.compact`
  viewBox `0 0 1054 1203`; per row `i`: `clipPath id="conn-clip-i"`
  (`rect x=16 y=16+i·Δ w=1022 h=94.7`) plus `conn-fill-i` for the progress
  fill. Rows slide in; waiting rows staircase right with dashed elbow
  connectors.
- States: `working → error → stuck → releasing`; labels
  `WORKING/ERROR/WAITING/RELEASING`; role colors `gray/red/yellow/green`
  (dark palette: red `#FF455D`, yellow `#F2B600`, green `#27B648`).
- Cycle: 14s (`14e3`), auto-restart; stuck window a few seconds wide and
  randomized per run.
- Content: 19 SQL strings, fixed error query
  `SELECT * FROM orders WHERE id = 123`, alter
  `ALTER TABLE orders ADD foo integer`.
- Layout constants in the bundle: desktop canvas 1504×752, compact 1203
  tall, row height ≈ 94.7, gutter 16.

## concurrency — `iframe-A02iGTt6.js`

- Source: `planetscale.com/blog/doing-more-with-less/iframe`; demo chosen by
  `location.hash` (`#junction` default, `#usl-curve`, `#before-after`).
- Renderer: Canvas 2D, device-pixel scaled 2×
  (`canvas.brand-diagram-canvas`, e.g. `width=2400 height=760` at
  `height: 380px`), rAF loop with `dt = Math.min(0.05, …)`.
- Junction sim: `spawnTimes`/`doneTimes` ring buffers, 3s rolling window;
  `throughput() = doneTimes.length/3`, `offeredRate() =
spawnTimes.length/3`, latency = mean of `latencies`; per-request flash
  decays `max(0, flash − 2.2·dt)`. Chart sample pushed every 0.25s as
  `{t, off, tp, rt}`; columns ARRIVALS / COMPLETED / LATENCY.
- USL curve: X(N) = γN / (1 + α(N−1) + βN(N−1)); sliders for α
  (Contention) and β (Coherency); NMAX marker where the curve peaks; axis
  auto-scaled.
- Controls: `input[type=range].blog-styled-range` with dashed-track CSS and
  `.brand-diagram-control-label` text (JetBrains Mono, uppercase).
- Measured laid-out heights (for the figure wrapper): junction 1200×645
  desktop; USL 1200×577 desktop, ~500×559 compact. The wrapper measures the
  iframe's rendered height directly; these numbers are sanity anchors only.

## Shared

- Shell: Vite module HTML, Google Fonts JetBrains Mono 500/700, `#app` div,
  transparent body (the stage paints its own background).
- Shared assets: `modulepreload-polyfill-B5Qt9EMX.js`,
  `styles-CWGXrFsx.css` (defines `brand-diagram-*`, `blog-styled-range`,
  and the `--diagram-*` token set in light and dark).
- Light/dark tokens: see the table in `SKILL.md`; stage follows
  `prefers-color-scheme` because the stylesheet reads the tokens, and the
  wrapper's transparent shell lets the article show it full-bleed.

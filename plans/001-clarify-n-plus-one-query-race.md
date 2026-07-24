# 001 — Slow and clarify the N+1 query race

- **Status**: DONE
- **Commit**: 7fef978
- **Severity**: MEDIUM
- **Category**: Easing and duration; cohesion and content hierarchy
- **Estimated scope**: 4 files, about 45 changed lines

## Problem

The moving query/result packet in the N+1 comparison is too small and crosses
the application–database rail too quickly to read comfortably. The current
timeline is 22.5 seconds, but the N+1 lane divides most of that time across ten
round trips. Each trip lasts about 2.06 seconds, with an outbound crossing of
about 0.62 seconds and an inbound crossing of about 0.66 seconds.

```ts
// src/demos/n-plus-one-query/model.ts:1-11 — current
export const ORDER_COUNT = 10;
export const QUERY_RACE_DURATION_MS = 22_500;
export const PER_ID_TOTAL_MS = 250;
export const BATCH_TOTAL_MS = 35;

const INTRO_END = 0.045;
const BATCH_WINDOW_END = 0.22;
const N_PLUS_ONE_WINDOW_END = 0.96;
const REQUEST_END = 0.3;
const PROCESSING_END = 0.54;
const RESPONSE_END = 0.86;
```

The rendered packet is only 42×26px with 10px type. At the 1440px browser
viewport its rail is about 434px wide, so the label travels hundreds of pixels
while the reader is trying to identify `id 1`, `SQL`, or `1 row`.

```css
/* src/styles/app.css:5004-5027 — current */
.query-race-packet {
  position: absolute;
  z-index: 1;
  inset-block-start: 0;
  inset-inline-start: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  inline-size: 42px;
  block-size: 26px;
  border: 1px solid #8a8982;
  border-radius: 999px;
  background: var(--query-race-raised);
  color: var(--query-race-ink);
  font-family: var(--font-mono);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  line-height: 1;
  opacity: 0;
  white-space: nowrap;
  will-change: auto;
  transition: opacity 120ms ease;
}
```

The supporting copy and summary also emphasize implementation detail and
“removed waits” instead of the requested lesson: database access patterns affect
application latency, batching avoids round-trip latency and database overhead,
and the comparison is 1 versus 10 trips.

```tsx
// src/components/NPlusOneQueryDemos.tsx:34-84 — current excerpts
<p id="query-race-description">
  Both paths need the same rows. The difference is how many times the
  application waits on the database boundary.
</p>

<span>Same input</span>
<code className="query-race-input-value">
  [101, 102, 103, …, 110]
</code>

<ComparisonMetric label="Rows returned" value="10 = 10" />
<ComparisonMetric label="Round trips removed" value="9" />
<ComparisonMetric
  label="Illustrative wait"
  value={`${snapshot.batch.elapsedMs}ms vs 250ms`}
/>

<figcaption id="query-race-caption">
  Illustrative latency: each per-id trip costs 25ms; the grouped lookup
  costs 35ms. The rows are identical, but batching removes nine waits.
</figcaption>
```

## Target

### Motion

- Set `QUERY_RACE_DURATION_MS` to exactly `32_000`.
- Keep the existing normalized timeline windows and linear packet progress.
  Do not add easing to the rail transform: network travel is constant motion,
  for which the audit standard requires linear interpolation.
- With the existing windows, the target produces:
  - 2,928ms per N+1 round trip;
  - 878.4ms outbound travel;
  - 702.72ms processing hold at the database;
  - 936.96ms inbound travel; and
  - 409.92ms settled hold before the next trip.
- Increase the moving packet to exactly `52px` wide and `28px` high with
  `11px` monospace text. Increase `.query-race-rail` to `28px` high so the
  packet remains vertically contained.
- Preserve the current direct `translate3d(...)` transform, active-only
  `will-change`, finite autoplay, Replay behavior, tab-visibility pause, and
  reduced-motion settled state.

```ts
// target
export const QUERY_RACE_DURATION_MS = 32_000;
```

```css
/* target */
.query-race-rail {
  position: relative;
  min-inline-size: 0;
  block-size: 28px;
}

.query-race-packet {
  /* retain the existing positioning, colors, border, and lifecycle rules */
  inline-size: 52px;
  block-size: 28px;
  font-size: 11px;
}
```

### Copy and input

Use the following visible text exactly:

```tsx
<p id="query-race-description">
  The database access pattern can impact application latency
</p>

<div className="query-race-input" aria-hidden="true">
  <span>Order IDs:</span>
  <code className="query-race-input-value">
    [101, 102, 103, …, 110]
  </code>
</div>

<figcaption id="query-race-caption">
  Individual lookups cost 25ms while a batch lookup costs 35ms; the rows are
  identical but batching avoids round-trip latency and database overhead
</figcaption>
```

The desktop input row may keep the label and value on one line. At 390px, it may
wrap the value below `Order IDs:` using the existing responsive grid; do not
shrink the text to force one line.

### Summary

Replace the current metrics with these exact labels and values:

```tsx
<ComparisonMetric label="Rows returned" value="10" />
<ComparisonMetric
  label="Round trips"
  value="1 (Batched) 10 (Individual)"
/>
<ComparisonMetric label="Latency" value="35ms vs 250ms" />
```

Give the middle desktop column enough space for the longer round-trip value:

```css
/* target */
.query-race-summary {
  display: grid;
  grid-template-columns: 0.82fr 1.36fr 0.82fr;
  /* retain the current surface, color, opacity, and transition */
}

.query-race-summary strong {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  text-wrap: balance;
  /* retain the current type family, size, weight, and tabular numerals */
}

@media (max-width: 540px) {
  .query-race-summary {
    grid-template-columns: 1fr;
  }

  .query-race-summary strong {
    text-align: end;
  }
}
```

Update the final screen-reader announcement to match the new metric vocabulary:

```tsx
<p className="sr-only" aria-live="polite">
  {snapshot.isComplete
    ? "Comparison complete. Both approaches returned 10 rows. The batch lookup used one round trip and 35 milliseconds; individual lookups used ten round trips and 250 milliseconds."
    : ""}
</p>
```

## Repo conventions to follow

- `src/components/NPlusOneQueryDemos.tsx:116-126` derives progress from
  request-animation-frame timestamps. Change the duration constant, not the
  frame math.
- `src/demos/n-plus-one-query/model.ts:134-167` already models request,
  processing, and response as deterministic linear phases. Preserve those
  phase boundaries.
- `src/components/NPlusOneQueryDemos.tsx:176-202` measures the packet and rail
  with `ResizeObserver`, so increasing packet width automatically updates its
  travel distance.
- `src/styles/app.css:5029-5031` applies `will-change` only while a packet moves.
  Preserve this performance boundary.
- `src/styles/app.css:5217-5233` removes packet travel for
  `prefers-reduced-motion`; the React lifecycle immediately renders the settled
  comparison. Preserve both behaviors.
- Component styling remains in the canonical `/* N+1 query race */` section of
  `src/styles/app.css`. Do not add CSS Modules, CSS-in-JS, or another override
  block.

## Steps

1. In `src/demos/n-plus-one-query/model.ts`, change only
   `QUERY_RACE_DURATION_MS` from `22_500` to `32_000`. Keep all normalized
   phase constants unchanged.
2. In `src/demos/n-plus-one-query/model.test.ts`, update the exact duration
   expectation from `22_500` to `32_000`. Keep the remaining deterministic
   snapshot assertions unchanged.
3. In `src/components/NPlusOneQueryDemos.tsx`, replace the description,
   `Same input` label, summary metrics, final live announcement, and caption
   with the exact target strings above.
4. In the existing N+1 section of `src/styles/app.css`, set the rail and packet
   sizes to `28px`, `52px`, and `11px` as specified.
5. In the same CSS section, widen the middle summary column, allow metric values
   to wrap instead of ellipsizing, and right-align wrapped mobile values.
6. Do not change the article prose in
   `src/posts/n-plus-one-sql-query.mdx`; the requested copy belongs to the
   figure component.

## Boundaries

- Do not change `INTRO_END`, `BATCH_WINDOW_END`, `N_PLUS_ONE_WINDOW_END`,
  `REQUEST_END`, `PROCESSING_END`, or `RESPONSE_END`.
- Do not add a motion dependency, spring, keyframe, or CSS transition on
  `transform`.
- Do not change the application/database icons, rail line treatment, record
  bars, colors, Replay control, or article prose.
- Do not reintroduce a running commentary bar.
- Do not change the illustrative domain values: individual lookup `25ms`,
  batch lookup `35ms`, final individual total `250ms`, 10 rows, 10 individual
  trips, and 1 batched trip.
- The working tree already contains user-approved edits in the affected files.
  Preserve them and make only the changes listed in this plan.
- Do not add dependencies.
- If the cited structure has drifted since commit `7fef978`, stop and report the
  mismatch instead of improvising.

## Verification

- **Mechanical**:
  1. Run
     `deno task test src/demos/n-plus-one-query/model.test.ts`; expect all N+1
     model tests to pass and the duration assertion to equal `32_000`.
  2. Run `deno task typecheck`; expect zero TypeScript errors.
  3. Run `deno task pre-commit`; expect formatting, typecheck, and the complete
     test suite to pass.
  4. Run `deno task build`; expect `/n-plus-one-sql-query` to prerender.
- **Rendered browser check**:
  1. Open `https://wcygan.localhost/n-plus-one-sql-query` at `1440×900`.
  2. Replay and capture the opening frame, one outbound `id N` frame, one
     inbound `1 row` frame, the persistent completed batch while N+1 continues,
     and the final frame.
  3. Confirm each N+1 crossing remains readable for roughly 0.88–0.94 seconds,
     the database processing hold lasts roughly 0.70 seconds, and the entire
     sequence settles at 32 seconds.
  4. In DevTools Animations, inspect at 10% playback speed and confirm the
     packet moves at constant speed without easing, jumping, or overshooting.
  5. Confirm `id 10`, `10 ids`, `10 rows`, and `1 row` fit inside the 52×28px
     packet without clipping.
  6. Confirm the description, input, caption, and three summary metrics match
     the exact target copy.
  7. Confirm `1 (Batched) 10 (Individual)` is fully visible without ellipsis.
  8. Repeat at `390×844`; confirm zero page-level horizontal overflow, readable
     packet labels, and clean wrapping in the input, summary, and caption.
  9. Toggle reduced motion on, then off. Reduced motion must immediately show
     the complete comparison with no packet travel; returning to normal motion
     must restart coherently.
  10. Confirm Replay remains at least `44×44px`, the figure still has one
      `data-graphic-stage`, and browser errors are empty.
- **Done when**: all mechanical checks pass; desktop and mobile screenshots show
  the exact requested copy and metrics; no text truncates or overflows; packet
  labels are readable during travel; and normal/reduced/normal motion states
  remain coherent.

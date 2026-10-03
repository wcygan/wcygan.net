# ClickHouse beginner visual contract

Updated October 2, 2026. The requested presentation is PlanetScale's dark
standalone foundation: dark stages, vivid semantic geometry, dashed routes,
upright monospace labels, and bounded, inspectable interactions. This explicit
request supersedes the older warm-neutral demo treatment. The shared article
shell keeps its existing styling.

The ten demonstrations form a learning sequence, with five SVG explanations and
five orbitable Three.js scenes. Models describe tiny datasets, never benchmark
results or exact on-disk byte counts.

| Demo                          | Dimension | Beginner question                                  | Invariant                                                                           |
| ----------------------------- | --------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Workloads                     | 2D        | Why use an analytical database?                    | A record lookup and a many-row aggregate ask different questions of the same events |
| Analytics Pipeline            | 2D        | Where does ClickHouse sit?                         | Source commit, analytical insertion, and dashboard refresh are separate events      |
| Column Reads                  | 3D        | How does it avoid reading unused fields?           | Both layouts preserve every value; projection chooses only needed columns           |
| Dictionary Encoding           | 3D        | How can repeated strings share a representation?   | Every dictionary reference decodes to the exact original row value                  |
| Batch Aggregation             | 2D        | How does a large input become a small answer?      | The sum of partial sums equals the sum of all matching events                       |
| Sparse Index                  | 2D        | How can sorted data skip work?                     | Conservative candidate selection retains every matching row                         |
| Monthly Partitions            | 3D        | How are groups managed and excluded?               | Query pruning preserves stored data; removal is a distinct operation                |
| Sorted Parts                  | 3D        | What happens after insertion and merging?          | A merge preserves the row multiset, including duplicate keys                        |
| Incremental Materialized View | 2D        | How can repeated summaries move work to ingestion? | Only each newly inserted block contributes to its update                            |
| Shards and Replicas           | 3D        | How does distributed analytical work stay correct? | Distinct shard partials are counted once; copies are not extra data                 |

## Starting references

- `style-technical-visuals/references/standalone/sharded-database.html`,
  `service-request-chain.html`, and `change-data-capture.html`: direct labels,
  face-center SVG ports, shared routes, and delivery state.
- `style-technical-visuals/references/standalone-3d/commit-log.html` and
  `database-cluster.html`: raised records, spatial grouping, camera controls,
  and the shared dark palette.
- Project PlanetScale database-sharding, processes-and-threads, and caching
  references: semantic shapes, color identities, dashed connectors, and causal
  state progression.
- Project 3D modeling references: lazy rendering, independent camera state,
  world-space geometry, screen-space labels, reduced motion, and HTML fallback.

## Required verification

Inspect all ten figures in the real MDX route at 1440×900 and 390×844. Check
every meaningful state, controls, minimum touch targets, stage count, labels,
ports, camera angles and reset, overflow, keyboard focus, reduced motion,
offscreen playback suspension, and a WebGL-loss fallback. Test the domain
invariants, run `bun run pre-commit`, and run `bun run build`. The existing
version-pinned Docker exercise and observed results are preserved.

Color conversions and measured contrast belong in
[`clickhouse-color-audit.md`](./clickhouse-color-audit.md).

## Initial overhaul verification

- Inspected all ten figures in the MDX article at 1440×900 and 390×844,
  including final 2D states, both column layouts, encoded and unencoded country
  values, partition selection, parts before and after merging, and distributed
  aggregation. The page has one `h1`, ten figures, and exactly one authored stage
  per figure. No page-level horizontal overflow was observed.
- A separate mobile audit exercised 74 semantic states and 25 camera actions.
  Every scene reached ready; controls were at least 44px high, and projected
  labels stayed within their stage. Camera actions preserved the data state.
- Confirmed pointer and keyboard orbit, zoom, reset, and visible keyboard focus.
  The stage clips its own geometry; the outer figure permits the complete focus
  outline. Upright labels remained readable at the inspected camera angles.
- Verified finite 2D playback, disabled terminal Next controls, offscreen clock
  suspension with retained Play intent, and a visible packet freezing on Pause
  and advancing on Resume. Reduced motion preserves state and manual stepping
  while disabling Play.
- Forced WebGL context loss in Column Reads. Its HTML table and layout controls
  retained the 24 versus 12 comparison while camera controls became unavailable.
  Reloading and returning to the section restored the lazy scene.
- Independent source review confirmed the paused-packet and result-arrow fixes
  and found no remaining material issues. The pure models and playback clocks
  have 63 focused tests.
- `bun run pre-commit` passed: formatting, TypeScript, and 987 tests across 129
  files. `bun run build` passed after the final source changes. The draft remains
  excluded from the production sitemap and prerendered routes.

Saved rendered examples:

- [Column Reads, 3D](/Users/wcygan/.codex/visualizations/2026/10/02/01a0fad1-f7df-7061-a3b8-8f5b91db32ab/clickhouse-overhaul-3d.jpg)
- [Analytics Pipeline, 2D](/Users/wcygan/.codex/visualizations/2026/10/02/01a0fad1-f7df-7061-a3b8-8f5b91db32ab/clickhouse-overhaul-2d.jpg)

## Natural autoplay

All ten demos now use the same finite playback clock. Each starts once after a
readable portion of its stage enters the viewport; a lazy 3D scene must also be
ready. A 900ms orientation hold precedes 3.2-second causal beats. Scrolling away
or hiding the document suspends elapsed time without jumping ahead on return.
The terminal result remains settled until the reader requests Replay.

The five spatial tours narrate the column-read comparison, dictionary lookup,
part insertion and merging, monthly pruning, and one-copy-per-shard aggregation.
Read cursors and query packets follow the relevant geometry. They use a live
fraction reference and demand rendering, avoiding a React rerender every frame.
Pausing freezes their world position; camera inspection pauses the tour and
retains that pose. Domain controls and data inspection also take manual control.
Reduced-motion readers receive the initial explanation and manual steps without
automatic motion.

The shared clock, 2D models, and spatial models/tours/motion have 125 focused
tests. Independent source review confirmed startup gating, retained progress,
terminal state, manual ownership, and paused geometry. The final
`bun run pre-commit` passed formatting, TypeScript, and 1,147 tests across 137
files. The final `bun run build` also passed; the article remains an unpublished
draft excluded from production prerendering.

The final-source 390×844 browser audit completed every phase of all ten tours
without pressing Play, then confirmed that terminal results do not restart on
viewport reentry. Pause, Resume, Next, and Replay retained the remaining beat.
Offscreen pipeline and column tours retained their step and packet position; a
17.36-second background-tab check also held the SVG packet exactly in place and
resumed without catch-up. Manual mode/data changes and all five camera buttons
paused the tour while preserving the inspected state.

Desktop inspection at 1440×900 found all ten stages contained and 84 controls
with at least 44px height. The mobile page stayed within 390px; projected labels
and stages stayed contained. Actual desktop and mobile screenshots show readable
autoplay, Pause, and camera inspection states.

Reduced-motion startup kept all ten demos at their first step without autoplay.
All 36 manual transitions reached the same final explanations as normal
playback. Turning reduced motion on during a beat retained the current step and
packet position; turning it off did not restart a completed tour. The final
browser audit found no product issues.

Saved autoplay examples:

- [Column Layout, desktop](/Users/wcygan/.codex/visualizations/2026/10/02/01a0fad1-f7df-7061-a3b8-8f5b91db32ab/clickhouse-autoplay-desktop-columns.png)
- [Dictionary Encoding, mobile Pause](/Users/wcygan/.codex/visualizations/2026/10/02/01a0fad1-f7df-7061-a3b8-8f5b91db32ab/clickhouse-autoplay-mobile-dictionary-paused.png)

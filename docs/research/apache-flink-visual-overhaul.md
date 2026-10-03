# Flink visual overhaul

The draft now contains twelve beginner lessons, evenly split between 2D and 3D. Dark stages, restrained diffuse geometry, upright labels, dashed inactive routes, and finite playback follow the repository’s PlanetScale standalone examples. The surrounding article stays editorial.

| Lesson              | View | Question answered                                               |
| ------------------- | ---- | --------------------------------------------------------------- |
| Stateful dataflow   | 2D   | How does each purchase update a remembered total?               |
| File versus stream  | 2D   | When can a computation finish?                                  |
| Keyed state         | 3D   | Who owns each customer's state?                                 |
| Key shuffle         | 3D   | How do records from different sources reach the same owner?     |
| Hot key             | 3D   | Why can idle workers coexist with a long queue?                 |
| Event-time window   | 2D   | When is a time window complete, and what happens to late input? |
| Workers             | 3D   | How does coordination differ from record processing?            |
| Checkpoint barriers | 3D   | How does a snapshot exclude records after its boundary?         |
| Checkpoint recovery | 3D   | How do restored state and replayed input agree?                 |
| External effects    | 2D   | Why does replay require a suitable sink policy?                 |
| Backpressure        | 2D   | What happens when a destination cannot keep up?                 |
| Enrichment          | 2D   | How does remembered context change future output?               |

## Complete color review

CSS values use OKLCH; Three.js receives matching sRGB values at its material boundary. The scene was reconstructed, so some old neutral colors now serve several semantic roles. This table accounts for every previous hex color in the Flink CSS and scene.

| Role                       | Before      | After                                      |
| -------------------------- | ----------- | ------------------------------------------ |
| Canvas                     | `#fdfdfc`   | `oklch(0.178 0 0)`                         |
| Inset stage                | `#f7f6f3`   | `oklch(0.226 0 0)`                         |
| Primary text               | `#21201c`   | `oklch(0.985 0 0)`                         |
| Supporting text            | `#63635e`   | `oklch(0.858 0 0)`                         |
| Dashed connectors          | `#bcbbb5`   | `oklch(0.603 0 0)`                         |
| Borders / quiet separators | `#e4e3de`   | `oklch(1 0 0 / 0.22) / oklch(1 0 0 / 0.1)` |
| Focus                      | `#466eaa`   | `oklch(0.661 0.202 39.353)`                |
| Selected state label       | `#817b6c`   | `oklch(0.985 0 0)`                         |
| Projected label plate      | `#fdfdfcf0` | `oklch(0 0 0 / 0.96)`                      |
| Spatial material / route   | `#63635e`   | #666666 edges / #818181 inactive routes    |
| Spatial material / route   | `#817969`   | #818181 inactive routes                    |
| Spatial material / route   | `#969084`   | #27b648 Cy records                         |
| Spatial material / route   | `#9c7146`   | #f2b600 checkpoint route                   |
| Spatial material / route   | `#b7b2a5`   | #1e9de7 Ada records                        |
| Spatial material / route   | `#c6b6b0`   | #ff455d lost state                         |
| Spatial material / route   | `#c8b9a0`   | #f2b600 checkpoints                        |
| Spatial material / route   | `#c9c4b8`   | #27b648 sink                               |
| Spatial material / route   | `#d6c1bb`   | #ff455d crashed platform outline           |
| Spatial material / route   | `#d7d3c9`   | #1e9de7 input / #f35815 operators          |
| Spatial material / route   | `#e0d7c6`   | #f2b600 checkpoint state                   |
| Spatial material / route   | `#e8e4da`   | #242424 platforms                          |
| Spatial material / route   | `#ece8de`   | #1e9de7 replayable records                 |

New semantic roles, shared by both renderers:

| Role                      | Before                   | After                                    |
| ------------------------- | ------------------------ | ---------------------------------------- |
| Input / Ada               | No shared semantic token | `oklch(0.667 0.15 241.774)` / `#1e9de7`  |
| Computation / Bo          | No shared semantic token | `oklch(0.661 0.202 39.353)` / `#f35815`  |
| Output / Cy               | No shared semantic token | `oklch(0.681 0.191 146.483)` / `#27b648` |
| Checkpoint / watermark    | No shared semantic token | `oklch(0.809 0.166 84.552)` / `#f2b600`  |
| Failure / discarded event | No shared semantic token | `oklch(0.668 0.22 18.688)` / `#ff455d`   |
| Label border              | Warm solid hairline      | `oklch(1 0 0 / 0.22)`                    |
| Label surface             | Warm translucent paper   | `oklch(0 0 0 / 0.96)`                    |

## Contrast

Text uses white or bright neutral gray; semantic accents primarily encode geometry, borders, and connectors. Labels remain readable independently of color. APCA uses the 0.0.98G light-on-dark constants, with black soft clamping; WCAG ratios use sRGB relative luminance. Values below use the slightly lighter inset stage (`#1c1c1c`), the more conservative text background.

| Pair                    | WCAG ratio | APCA Lc |
| ----------------------- | ---------- | ------- |
| Primary text / stage    | 16.33:1    | -103.0  |
| Supporting text / stage | 11.05:1    | -76.5   |

Saturated accents are not a body-text palette. Small node titles and output values use primary text. Event circles retain dark numeric indices with at least 4.5:1 WCAG contrast. Disabled controls are visually muted; their information is also present in the persistent state summary.

## Verification

- All twelve figures inspected in the real MDX preview at 1440×900 and 390×844.
- Every figure has one authored stage, no page-level horizontal overflow, and controls at least 44×44px.
- Manual initial, intermediate, and completed states inspected; hot/balanced switching and camera rotation/zoom/reset exercised.
- Reduced-motion mode disables all twelve Play controls and retains manual progression and readable state.
- Flink-only snapshot pre-commit: 94 test files, 716 tests passed, including 24 Flink model/geometry checks. Shared checkout pre-commit was blocked by unrelated, concurrently edited draft files (including TiDB tests in the final run).
- The post remains a draft. The local preview temporarily compiles a copy as a route; it does not publish the draft.

- Final production build passed with the draft excluded. Finite 2D and 3D playback reached its settled final state; Pause and restart, keyboard camera focus/rotation/reset, and WebGL context-loss fallback were exercised.

## Visual-first copy revision

The MDX source was reduced from 2,863 to 985 words (including commands and metadata). Twelve demonstrations remain, with shorter captions and one compact introduction per lesson. The runnable SQL lab is folded by default. Desktop/mobile checks covered the new reading rhythm, table, keyboard-operated disclosure, code containment, and caption wrapping. The production build passed; the isolated Flink preview passed pre-commit with 716 tests. The shared checkout pre-commit was blocked by unrelated IndexingPrimerDemos type errors during this revision.

## Natural autoplay

All twelve demonstrations use shared, finite viewport playback. A run starts once at 35% stage visibility, waits 2.2 seconds between teaching beats, suspends offscreen or in hidden tabs, and preserves its completed state. Spatial lessons wait for the first rendered frame. Pause and manual steps suppress further automatic starts; Replay starts a new finite run. Reduced motion disables playback while retaining manual progression. Loading stages use the same dark surface as the scene.

Twelve lifecycle tests cover visibility, readiness, hidden tabs, callback stability, manual intervention, completion, replay, reduced motion, and cleanup. The shared checkout initially passed pre-commit with 137 test files and 1,136 tests; later rechecks encountered unrelated, concurrently edited IndexingPrimerDemos scene-readiness type errors. The isolated draft preview passed with 95 files and 728 tests. Both production and draft-preview builds passed. Browser checks at 1440×900 and 390×844 confirmed all twelve viewport starts, finite 2D/3D completion, replay, persistent manual pause, offscreen suspension, reduced-motion controls, and mobile containment.

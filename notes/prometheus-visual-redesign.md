# Prometheus visual overhaul

Ten reader-stepped lessons: five 2D and five 3D. Dark stages follow the PlanetScale standalone references. All CSS colors use OKLCH; Three.js material inputs use sRGB hex. Editorial controls remain outside the stage.

## Complete color changes

| Before                   | After                                                                         |
| ------------------------ | ----------------------------------------------------------------------------- |
| `#21201c`                | Editorial ink retained in OKLCH; stage text #fafafa; Head outline #f35815     |
| `#63635e`                | Editorial muted retained in OKLCH; stage muted #aeaeae; mesh outlines #76c5ff |
| `#e4e3de`                | editorial hairline retained; stage grid #323232                               |
| `#f7f6f3`                | editorial surface retained; stage panel #1c1c1c                               |
| `#bcbbb5`                | editorial border retained; stage border #323232                               |
| `#fdfdfc`                | editorial canvas retained; stage canvas #111111                               |
| `#466eaa`                | #1e9de7                                                                       |
| `#a64b19`                | #f35815                                                                       |
| `#c54c16`                | #f35815                                                                       |
| `#45433b`                | #fafafa                                                                       |
| `#ad4315`                | #f35815                                                                       |
| `rgb(247 246 243 / 94%)` | #111111 / 94%                                                                 |
| `#d7d4c9`                | #0e73cc                                                                       |
| `#cc5724`                | #f35815                                                                       |
| `#b0ada2`                | #27b648 or #ff455d by status                                                  |
| `#969388`                | #818181                                                                       |
| `#8b887d`                | #818181                                                                       |
| `#a5a194`                | #ff455d                                                                       |
| `#eae7dc`                | #1c1c1c                                                                       |
| `#77746a`                | #f2b600                                                                       |

New semantic colors: orange measurements, blue query/storage, green healthy states, yellow pending/durable samples, red errors/firing. Text and labels remain neutral and do not rely on color to convey state.

## Verification

- 10 semantic figures, exactly one authored stage each; five 2D SVG diagrams and five demand-rendered WebGL scenes.
- Inspected all ten at 1440×900 and 390×844; no page overflow and no controls shorter than 44px.
- Inspected terminal 3D states including 120-series label expansion, retention expiry, and firing alert; exercised rotate, zoom, keyboard Home, and reduced motion.
- Prometheus-focused checks: 27 tests pass in five files. Production build passes; the draft remains excluded from production routes.
- Article axe audit: zero violations. Automated contrast inspection is incomplete for some SVG/Canvas labels; these were visually inspected.
- Full pre-commit was attempted repeatedly; its typecheck is blocked by concurrent, unrelated Flink and Temporal changes. No Prometheus type errors were reported.

## Prose revision

Reduced article prose from 2,651 to 930 words (65%) while retaining all ten demos, essential examples, lab commands, and citations. Removed redundant demo descriptions and shortened captions/status text. Rechecked 1440×900 and 390×844: no overflow, ten authored figures, 44px controls. The 27 Prometheus tests and production build pass. Latest full pre-commit is blocked by concurrent, unrelated indexing-primer type errors.

## Natural autoplay revision

Article prose is now 640 words. All ten demos autoplay finite teaching sequences as their figure enters view; manual actions pause, Replay restarts, and terminal states remain inspectable. A shared hook suspends timeouts offscreen and in hidden documents, preserves pause intent, and honors reduced motion. 2D scrape packets use the wire endpoints; 3D transfers reuse their world-space routes. Sample growth and transfers preserve progress when paused.

Full pre-commit now passes: 137 test files, 1,136 tests. Production build passes. Prometheus-specific suite: 39 tests in five files. Earlier reports of unrelated blocked checks are superseded by this successful run.

Browser verification: all ten sequences advance automatically and hold after Pause. All ten remain static under reduced motion and advance with manual controls. Inspected desktop and mobile frames with no overflow or undersized controls; a mobile alert completes naturally at the firing state. Article accessibility audit checks are recorded separately; removed low-contrast code comments from this draft rather than changing the shared syntax palette.

Final article axe audit: zero violations, one incomplete graphical contrast check requiring the rendered inspections above.

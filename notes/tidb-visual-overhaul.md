# TiDB visual overhaul

The unpublished article now uses ten new lessons: five direct 2D explanations
and five spatial explanations with an independent orbit/zoom camera.

| 2D lesson                    | Beginner question                                  |
| ---------------------------- | -------------------------------------------------- |
| Why distribute a database?   | What changes when one machine is no longer enough? |
| Four component roles         | Who computes, stores, and coordinates?             |
| Follow one point read        | How does SQL reach a row?                          |
| One transaction, two Regions | What connects separate Raft groups?                |
| Choose the visible version   | Which committed version can a read see?            |

| 3D lesson                           | What the geometry explains                                                 |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Split the ordered key space         | Disjoint range slabs, a split, then leader placement                       |
| Commit with a majority              | Three copies of one range, log replication, two-copy quorum                |
| Find an index entry, then a row     | Sorted index and row trays; two logical lookup phases                      |
| Rows and columnar replicas          | Row groups versus column groups, learner progress, selected-column scan    |
| Grow compute and storage separately | Separate resource pools and three replicas per Region after redistribution |

## Rendering and interaction

The 3D scenes use actual world-space boxes, orthographic projection, face depth,
projected labels, and connector clipping. Their foundation follows the requested
standalone SVG 3D demos; no WebGL contexts are created. Support planes are painted
before raised records, preventing a broad tray's average depth from obscuring
far-edge records. Callout placement reserves inline cell labels.

Playback starts automatically once 40% of a stage is visible, advances every
2.6 seconds, and stops at the terminal beat. It suspends below that visibility
threshold and when the document is hidden. Manual pause, stepping, and scenario
selection preserve reader control. Replay restarts playback. Camera state is
independent.
Reduced motion disables automatic playback and keeps every manual step available.

## Complete palette replacement

This is a redesign, so individual legacy tints do not have a one-to-one mapping
to physical objects. The tables account for every retired explicit hex color in
the imported TiDB renderers and their local styles, and every new base token.
Legacy files remain for comparison but are no longer imported by this article.
The shared editorial shell is outside this palette replacement.

| Before                                                                                                                                                                                                                                                                                                                                                                               | After                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `#21201c`, `#474842`, `#56554e`, `#63635e`, `#88867e`, `#a5a196`, `#aaa79d`, `#b4a0bb`, `#b5b2a8`, `#bcbbb5`, `#bdbbb1`, `#c3c0b7`, `#c7c5bd`, `#cbc9c0`, `#d4d1c7`, `#d6d5ca`, `#d6d5cd`, `#dce6ec`, `#dde7e1`, `#dfddd4`, `#e0e7d9`, `#e0e7eb`, `#e3e1d9`, `#e4e2d8`, `#e4e3de`, `#e6dfed`, `#e7e6df`, `#e9e7df`, `#eeece5`, `#eeede8`, `#f0efe9`, `#f1eeea`, `#f7f6f3`, `#fdfdfc` | Dark canvas, panel, text, muted text, and border tokens below; neutral surfaces replace legacy paper and gray planes |
| `#346e65`, `#365f7e`, `#466eaa`, `#536936`, `#75527f`, `#796021`, `#80515f`, `#87a5bb`, `#89b4ae`, `#8a4e25`, `#993d35`, `#9ebfb4`, `#a0ad87`, `#a6becb`, `#bf939d`, `#c6b276`, `#c89370`                                                                                                                                                                                            | Semantic orange/blue/green/yellow/red tokens below, selected by role or state; scene faces use perceptual shading    |

| Before                               | After                                       |
| ------------------------------------ | ------------------------------------------- |
| Legacy mixed palette for canvas role | `oklch(0.178 0 0)` (`--tl-canvas`)          |
| Legacy mixed palette for panel role  | `oklch(0.226 0 0)` (`--tl-panel`)           |
| Legacy mixed palette for text role   | `oklch(0.985 0 0)` (`--tl-text`)            |
| Legacy mixed palette for muted role  | `oklch(0.87 0 0)` (`--tl-muted`)            |
| Legacy mixed palette for border role | `oklch(0.603 0 0)` (`--tl-border`)          |
| Legacy mixed palette for orange role | `oklch(0.661 0.202 39.353)` (`--tl-orange`) |
| Legacy mixed palette for blue role   | `oklch(0.667 0.15 241.774)` (`--tl-blue`)   |
| Legacy mixed palette for green role  | `oklch(0.681 0.191 146.483)` (`--tl-green`) |
| Legacy mixed palette for yellow role | `oklch(0.809 0.164 84.552)` (`--tl-yellow`) |
| Legacy mixed palette for red role    | `oklch(0.668 0.22 18.688)` (`--tl-red`)     |

All base tokens are in the sRGB gamut. Yellow chroma was reduced to 0.164 to
avoid clipping a small negative blue channel. Mixing uses Oklab, which preserves
the chromatic vector when blending semantic hues with an achromatic background.
The 2D node fill is 50% tone / 50% panel. Spatial top/front/side fills use
68% / 42% / 26% tone with panel. Colored small labels use 40% tone / 60% text.
Primary labels remain near-white. Result text stays near-white with a green rule.
Button focus follows the shared focus accent; SVG keyboard focus uses orange.

Contrast checked with standard sRGB relative luminance and `apca-w3@0.1.9`
in a temporary directory, with no repository dependency changes:

| Pair                       | WCAG contrast | Absolute APCA Lc |
| -------------------------- | ------------- | ---------------- |
| primary / canvas           | 18.07:1       | 104.0            |
| muted / panel              | 11.51:1       | 78.9             |
| orange label / canvas      | 11.85:1       | 75.7             |
| orange node text / surface | 7.66:1        | 88.7             |
| blue label / canvas        | 12.34:1       | 78.1             |
| blue node text / surface   | 7.16:1        | 87.3             |
| green label / canvas       | 12.81:1       | 80.4             |
| green node text / surface  | 6.72:1        | 85.7             |
| yellow label / canvas      | 14.63:1       | 88.9             |
| yellow node text / surface | 5.36:1        | 79.9             |
| red label / canvas         | 11.85:1       | 75.8             |
| red node text / surface    | 7.65:1        | 88.5             |

## Validation

- `bun run pre-commit`: formatting, typechecking, 129 test files / 994 tests passed.
- `bun run build`: production build and prerendering passed. The draft route is excluded.
- Fourteen TiDB-specific tests cover range ownership, replica preservation,
  quorum failures, timestamp visibility, semantic data, connector clipping,
  playback suspension, reduced motion, terminal states, and retained camera state.
- Ten authored figures, exactly one stage each; five SVG 2D and five projected 3D.
- Desktop 1440×900 and mobile 390×844 inspected; additional desktop inspections
  at the browser's default width. Figure widths are 644px / 342px, with no
  page-level horizontal overflow. All buttons meet 44×44px.
- Manual stages, snapshots 80/120/160, quorum failure choices, camera rotation,
  Home reset, and reduced-motion manual stepping inspected in the real article.
- The original TiUP/MySQL database lab remains researched but unexecuted.

Proof image: `tidb-columnar-desktop.jpg` in this chat's visualization directory.

## Visual-first edit

Following the request for fewer words, article prose was reduced from about
2,037 to 548 words (excluding code and URLs), while all ten figures remain.
Demo questions, captions, and step explanations were reduced from 1,080 to 638
words. The expanded original lab is preserved in `notes/tidb-local-lab.md`; the
article now uses the same four amounts as the TiFlash scene (sum 44).

Final rendered checks confirmed automatic completion for both the 2D capacity
lesson and the 3D quorum lesson (two reachable copies committed), ten figures
with one stage each, and no overflow. The shortened article was also checked
at a 390×844 CSS viewport. New proof images are `tidb-visual-first-2d.jpg` and
`tidb-visual-first-3d.jpg`; the normal browser viewport was restored.

## Autoplay validation

The shared player now starts on viewport entry (40% of the stage visible),
pauses outside the view or in a hidden tab, and keeps its terminal result.
Replay starts a new run; manual pause/steps/scenario changes stay manual.
Reduced-motion users retain manual stepping.

`bun run pre-commit` passed: 137 files / 1,124 tests, including 14 TiDB tests.
The production build passed. Browser checks confirmed 2D and 3D playback
without pressing Play, automatic completion, Replay, and all ten Play controls
disabled under reduced motion. Temporary media and viewport overrides were
restored. Proof: `tidb-autoplay.jpg` in the chat visualization directory.

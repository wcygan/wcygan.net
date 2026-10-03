# Celld visual overhaul

The October 2, 2026 revision follows the user's requested dark PlanetScale visual language. The article stays an unpublished draft and retains its v0.6.1 research scope.

## Teaching sequence

| Demo                  | Dimension | Question it answers                                        |
| --------------------- | --------- | ---------------------------------------------------------- |
| Named state           | 3D        | What belongs to one named cell, and what survives restart? |
| Request routing       | 2D        | How does a request find the current owner?                 |
| Runtime anatomy       | 3D        | What do V8, private SQLite, and LTX do?                    |
| Changed page images   | 3D        | What data does a later commit replicate?                   |
| Conditional ownership | 2D        | How do competing nodes avoid becoming two writers?         |
| Durability proof      | 2D        | Why does local commit not immediately mean success?        |
| Recovery gate         | 2D        | What must be recovered before serving again?               |
| Failure domains       | 3D        | Where can an acknowledged, unuploaded write survive?       |
| Cell keys             | 2D        | Why do independent keys scale better than one hot cell?    |
| Fleet placement       | 3D        | What changes when another node joins?                      |

2D uses runtime SVG topology and causal sequences. 3D uses procedural Three.js geometry with orbitable views. Every model exposes its state through HTML and manual controls. The geometric examples are explanatory, not measurements of a running fleet.

## Palette review

CSS uses OKLCH; Three.js and Canvas receive hex strings at the renderer boundary. Converted values are rounded to three decimals; all resulting CSS colors were checked against sRGB. Yellow chroma is rounded inward from 0.166 to 0.165 to keep the rounded value in gamut.

Orange identifies the cell or selected teaching point; blue identifies requests, network paths, and local runtime/database geometry; green identifies accepted writes or durable copies; yellow identifies waiting; red identifies unavailable or rejected work. Labels, position, and line style repeat these meanings.

### Contrast evidence

Values below are computed from the rounded CSS values, using WCAG 2 relative luminance and APCA 0.0.98G constants. The background is the dark panel `oklch(0.226 0 0)`.

| Foreground / purpose                          | WCAG on panel | APCA absolute Lc | Decision                                              |
| --------------------------------------------- | ------------: | ---------------: | ----------------------------------------------------- |
| `--celld-fg` / Body text and main labels      |       16.34:1 |            103.0 | Body target passes                                    |
| `--celld-muted` / Short secondary labels      |        8.61:1 |             62.5 | Text passes WCAG AA and APCA label target             |
| `--celld-orange-label` / Orange small labels  |       10.23:1 |             72.0 | Text passes WCAG AA and APCA label target             |
| `--celld-blue-label` / Blue small labels      |       10.53:1 |             73.7 | Text passes WCAG AA and APCA label target             |
| `--celld-green-label` / Green small labels    |       11.12:1 |             77.1 | Text passes WCAG AA and APCA label target             |
| `--celld-yellow` / Waiting labels             |        9.31:1 |             67.0 | Text passes WCAG AA and APCA label target             |
| `--celld-red-label` / Failure small labels    |       10.19:1 |             71.8 | Text passes WCAG AA and APCA label target             |
| `--celld-connector` / Essential wires         |        4.38:1 |             33.6 | Graphical object passes 3:1; not small text           |
| `--celld-control-border` / white 42% boundary |        4.05:1 |             31.0 | Active control boundary passes 3:1 and APCA UI target |
| `--celld-border` / white 22% divider          |        2.05:1 |             11.8 | Decorative only; essential wires use connector        |

Geometry accents are not the default text colors. White text on bright green/yellow/orange/red fails WCAG normal-text contrast; use near-white text outside the fill or dark ink on the fill. Dark ink on orange, blue, green, yellow, and red passes WCAG AA (respectively 5.60:1, 6.33:1, 7.08:1, 10.29:1, 5.62:1). Small labels placed on dark stages should use the light label tokens instead, which also meet the APCA label target. Longer secondary copy should use foreground rather than muted because muted meets the label target but not the APCA body target.

### Every changed existing color

Rows enumerate every distinct raw color in the original celld CSS and Three scene; repeated colors have separate rows where their roles now differ.

| Before                                | After                                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `#21201c / primary ink`               | `--celld-fg`: oklch(0.985 0 0)                                                                   |
| `#46433b / text and 3D surface IDs`   | `--celld-fg`: oklch(0.985 0 0); bright-fill IDs use `--celld-dark-ink`: oklch(0.178 0 0)         |
| `#466eaa / focus ring`                | `--celld-orange`: oklch(0.661 0.202 39.353)                                                      |
| `#63635e / muted copy`                | `--celld-muted`: oklch(0.783 0 0)                                                                |
| `#8b887e / decorative border`         | `--celld-border`: oklch(1 0 0 / 0.22)                                                            |
| `#8b887e / 3D edges and leader lines` | `--celld-connector`: oklch(0.603 0 0)                                                            |
| `#a64b19 / selected label`            | `--celld-orange-label`: oklch(0.84 0.066 39.353)                                                 |
| `#a64b19 / selected geometry edge`    | `--celld-orange`: oklch(0.661 0.202 39.353)                                                      |
| `#bcbbb5 / meaningful connectors`     | `--celld-connector`: oklch(0.603 0 0)                                                            |
| `#bcbbb5 / control boundary`          | `--celld-control-border`: oklch(1 0 0 / 0.42)                                                    |
| `#d2d0c8 / control boundary`          | `--celld-control-border`: oklch(1 0 0 / 0.42)                                                    |
| `#e4e3de / hairline divider`          | `--celld-border`: oklch(1 0 0 / 0.22)                                                            |
| `#eeece5 / selected control surface`  | `--celld-bg`: oklch(0.178 0 0); orange border marks selection                                    |
| `#f2f0ea / hovered control surface`   | `--celld-track`: oklch(1 0 0 / 0.1) over the panel                                               |
| `#f7f6f3 / stage and label backing`   | `--celld-bg`: oklch(0.178 0 0)                                                                   |
| `#fdfdfc / node and control surface`  | `--celld-panel`: oklch(0.226 0 0)                                                                |
| `#b7b3a8 / 3D faint connectors`       | `--celld-connector`: oklch(0.603 0 0)                                                            |
| `#eae7de / 3D neutral surfaces`       | `--celld-panel`: oklch(0.226 0 0); semantic cell/network/storage geometry gets orange/blue/green |
| `#faf9f4 / 3D page surfaces`          | `--celld-blue`: oklch(0.667 0.15 241.774) for local SQLite pages; green marks durable copies     |
| `#f2d6c1 / selected 3D surfaces`      | `--celld-orange`: oklch(0.661 0.202 39.353)                                                      |
| `No blue semantic geometry`           | `--celld-blue`: oklch(0.667 0.15 241.774), standalone #1e9de7                                    |
| `No yellow waiting geometry`          | `--celld-yellow`: oklch(0.809 0.165 84.552)                                                      |
| `No red unavailable geometry`         | `--celld-red`: oklch(0.668 0.22 18.688)                                                          |
| `No readable blue small-label tint`   | `--celld-blue-label`: oklch(0.84 0.063 241.774)                                                  |
| `No readable green small-label tint`  | `--celld-green-label`: oklch(0.84 0.182 146.483)                                                 |
| `No readable red small-label tint`    | `--celld-red-label`: oklch(0.84 0.063 18.688)                                                    |
| `No subdued track`                    | `--celld-track`: oklch(1 0 0 / 0.1)                                                              |

The former warm geometry colors remain part of the article shell; the replacement is scoped to celld demo figures. Color roles should be reused across 2D and 3D rather than assigning new hues per demo.

## Rendered verification

The real MDX draft contains ten automatically discovered workbench figures: five SVG and five Canvas, each with exactly one authored stage. Browser checks used actual CSS viewports of 1440×900 and 390×844. The article has one h1 and no page-level horizontal overflow.

All 27 finite SVG states were exercised at both widths, including the completed key-parallelism comparison. The follower-unreachable recovery branch remained blocked through repeated retries without claiming or restoring the cell. Every control measured at least 44×44 CSS pixels; SVG text stayed inside its stage.

All five 3D models rendered on desktop and mobile. All scenario selections were exercised, and each model was inspected through a full camera orbit. Projected labels had no overlap, clipping, or hidden entries. Keyboard focus, arrow-key orbit, zoom extremes, reset, and pointer dragging were checked. Reduced-motion mode retained manual exploration. A forced WebGL context loss replaced the anatomy scene with readable text while its layer controls remained operable.

The isolated celld checkout passed the production build and the complete pre-commit suite (95 files / 732 tests). The final shared-checkout pre-commit run also passed: formatting, typechecking, and 996 tests across 130 files. Its production build passed as well. Both build outputs exclude the unpublished celld route and scene assets. Three unrelated Temporal test failures from the earlier shared run were resolved by that concurrent work. The celld-only checks passed 40 tests across five files. Source review found no blocking issues.

A verified dark 3D preview is saved outside the repository at `/Users/wcygan/.codex/visualizations/2026/10/02/01a0facb-ad41-75c2-b6dc-575e7592ee3e/celld-dark-preview.jpg`.

No production publication was performed. The existing local counter exercise was previously tested against celld v0.6.1; the S3-backed multi-node recipe remains an explicitly unexecuted experiment. The new visualizations are explanatory models, not throughput measurements or live celld clients.

## Autoplay follow-up

All ten demos now play one finite guided sequence after at least 35% of the stage becomes visible. Causal beats hold for 3.6–4.2 seconds. Three-dimensional tours additionally wait for their first rendered frame. The final state stays available for inspection; Replay explicitly starts a new sequence.

Pause, manual steps, reset, and scenario selection preserve the reader's control. Hidden documents and off-screen stages suspend the remaining hold without catching up elapsed background time. Camera orbit and zoom remain independent of semantic progress, including through scene disposal and re-entry. Reduced-motion startup and live preference changes stop automatic advancement while preserving manual steps.

The named-state tour applies events to the current counters, so continuing after manual requests cannot roll saved values backward. Recovery halts at inconclusive retained-tail evidence. The failure-domain tour covers all six layout/coverage comparisons and labels upload-before-loss cases as alternative histories.

Browser verification watched all ten desktop tours start and finish automatically. At 1440×900 and 390×844, there was no page overflow and every celld button measured at least 44×44 pixels. Mobile checks confirmed that explicit pause survives off-screen re-entry, Play resumes it, and the explored camera angle survives both guided transitions and scene re-entry. Reduced-motion startup left all ten at their initial beat; manual advancement remained operable.

The autoplay changes passed 61 celld tests across seven files, including remaining-time suspension, first-frame readiness, explicit pause, finite completion, reduced-motion changes, manual counter continuity, and blocked recovery. The full pre-commit suite and production build passed.

The 3D loading overlay also now uses the scoped dark palette, preventing a bright flash before the first frame:

| Before                              | After                                       |
| ----------------------------------- | ------------------------------------------- |
| `#fdfdfc / loading overlay`         | `--celld-bg`: oklch(0.178 0 0)              |
| `#e4e3de / decorative spinner ring` | `--celld-border`: oklch(1 0 0 / 0.22)       |
| `#63635e / spinner indicator`       | `--celld-orange`: oklch(0.661 0.202 39.353) |

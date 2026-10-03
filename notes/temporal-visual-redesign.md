# Temporal visual redesign

The October 2, 2026 revision replaces the initial warm-neutral diagrams with
twelve PlanetScale-style explainers: six 2D SVG scenes and six orbitable 3D
scenes. The editorial article remains on the shared light canvas.

## Teaching sequence

| Dimension | Lesson                   | Question                                                           |
| --------- | ------------------------ | ------------------------------------------------------------------ |
| 2D        | Recovering progress      | What happens when an in-memory coordinator crashes?                |
| 2D        | Workflow and Activities  | Which code coordinates, and which code performs external work?     |
| 3D        | Application architecture | What does Temporal run, and what do my workers run?                |
| 3D        | Task Queues              | How can compatible workers share pending work?                     |
| 3D        | Event History            | Which events and results survive?                                  |
| 3D        | Crash and replay         | How does a replacement reconstruct local state?                    |
| 2D        | Durable timer            | How can a process wait without keeping a worker alive?             |
| 2D        | Human approval           | What happens if a Signal arrives while workers are offline?        |
| 2D        | Retry budget             | How do attempt timeouts and backoff bound recovery?                |
| 2D        | Provider idempotency     | What if an external effect succeeds before completion is recorded? |
| 3D        | Parallel Activities      | Why must a successful join wait for every required result?         |
| 3D        | Compensation             | What does cleanup mean after partial business success?             |

Geometry, task counts, and timings are teaching examples. The real SDK lab
remains separate, with its [runtime verification](../examples/temporal-intro/VERIFICATION.md).

## Complete color changes

These rows account for all seventeen color literals in the original Temporal
demos. Neutral geometry is replaced with semantic roles, rather than a direct
one-color-per-object inversion. New CSS colors use OKLCH; Three.js material
configuration uses the equivalent hex values it accepts.

| Before                                                               | After                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Canvas `#fdfdfc`                                                     | Canvas `oklch(0.178 0 0)`                                                 |
| Inset surface `#f7f6f3`                                              | Panel `oklch(0.226 0 0)`                                                  |
| Stage `#faf9f5`                                                      | Canvas `oklch(0.178 0 0)`                                                 |
| Label backing `#fdfdfcf5`                                            | Dark panel `oklch(0.226 0 0)`                                             |
| Primary text `#21201c`                                               | Text `oklch(0.985 0 0)`                                                   |
| Secondary text `#63635e`                                             | Muted `oklch(0.855 0 0)`; short metadata `oklch(0.773 0 0)`               |
| Focus `#466eaa`                                                      | Focus `oklch(0.764 0.129 245.155)`                                        |
| Connector `#47443d`                                                  | Connector `oklch(0.603 0 0)`                                              |
| Subtle line `#bcbbb5`                                                | Essential outline `oklch(0.603 0 0)`                                      |
| Divider `#e4e3de`                                                    | Essential outline `oklch(0.603 0 0)`; decorative track `oklch(0.341 0 0)` |
| Ground plane `#e9e6de`                                               | Panel `oklch(0.226 0 0)`                                                  |
| Neutral meshes `#827e72`, `#a49e91`, `#b8b2a5`, `#d5d1c8`, `#dad1bd` | Dark structure plus orange, blue, green, and yellow semantic roles below  |
| Failure `#a52b39`                                                    | Failure `oklch(0.668 0.22 18.688)`                                        |
| No active-work encoding                                              | Orange `oklch(0.661 0.202 39.353)`                                        |
| No durable-state encoding                                            | Blue `oklch(0.552 0.161 252.205)`                                         |
| Neutral completed-state encoding                                     | Green `oklch(0.681 0.191 146.483)`                                        |
| Neutral waiting-state encoding                                       | Yellow `oklch(0.809 0.165 84.552)`                                        |

The semantic colors follow the PlanetScale foundation. Yellow's CSS chroma is
clamped slightly to remain inside sRGB. Text stays neutral, including labels on
colored nodes. Meaning also appears through names, status, shape, and line
treatment.

## Contrast evidence

On the darker panel, primary text measures WCAG 16.33:1 and absolute APCA 102.99;
muted text measures 10.94:1 and 75.89; metadata measures 8.31:1 and 60.76.
These use the Three.js hex equivalents; CSS rounding differences are below one
8-bit channel. APCA was calculated using upstream `apca-w3` 0.1.9/98G4g.

Essential connectors and outlines measure approximately 4.37:1 and APCA 33.66.
Semantic blue is a graphical encoding, with neutral labels and contrasting
edges; it is not used as small text. Other semantic colors also retain neutral
labels. Displaced 3D callout leaders use full opacity rather than fading the
association below the graphical contrast targets.

## Verification

The final revision passes `bun run pre-commit`: typecheck and 996 tests in 130
files. `bun run build` passes. The Temporal models, geometry, playback, and
workbenches contribute 44 focused tests across six files.

The real article was inspected at 1440×900 and 390×844. All twelve figures have
one authored stage; the page has one `h1` and no horizontal overflow. Every
default causal step was inspected, along with exhausted retries and failed
compensation. SVG text fits its nodes; 3D labels remain inside their stages and
avoid collisions through the tested camera controls. Controls retain at least
44px height. Event payload inspection, independent cameras, pause persistence,
offscreen suspension, and manual stepping under reduced motion were checked.

An actual WebGL context loss retained the textual lesson and manual controls;
Retry 3D restored rendering. The dark loading overlay and `pan-y` on both the
R3F event-source wrapper and canvas were confirmed from computed styles.
The article and SDK lab remain a draft; no publication or commit was made.

## Natural autoplay — October 2, 2026

All twelve demos now begin after a one-second settling delay when at least 30%
of their visual stage is visible. The 3D demos also wait for the scene or its
textual fallback to be ready. Existing paced transitions lead to a persistent
final state. Leaving the viewport or hiding the document suspends progression;
manual Pause or Next prevents a later automatic restart. Replay restarts the
sequence explicitly. Reduced motion preserves manual stepping.

The autoplay revision passes `bun run pre-commit` with 1,124 tests in 137 files,
and `bun run build`. The Temporal suites contain 61 focused tests, including
viewport entry, delayed start, scene readiness, manual overrides, suspension,
Replay, and reduced-motion behavior. A targeted code review found no blocking
issues.

Rendered checks covered desktop at 1440×900 and mobile at 391×844. The desktop
3D architecture demo started and reached its final state automatically. The
mobile Signal demo started and advanced automatically. Manual pause remained
paused after scrolling away and returning in both renderers. All twelve demos
disabled autoplay with reduced motion; representative SVG and 3D demos retained
working Next controls. The mobile page had no horizontal overflow. Temporary
viewport and motion overrides were cleared after inspection.

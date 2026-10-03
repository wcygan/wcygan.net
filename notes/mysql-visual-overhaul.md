# MySQL visual overhaul

Ten beginner lessons, five SVG 2D workbenches and five orbitable Three.js 3D
workbenches. All figures have one stage, external 44px controls, a persistent
status, and a useful non-WebGL explanation. The draft remains unpublished.

| Dimension | Demonstration             | Problem and invariant                                                      |
| --------- | ------------------------- | -------------------------------------------------------------------------- |
| 2D        | A query round trip        | SQL responsibilities differ from storage responsibilities                  |
| 2D        | Related rows              | One customer key matches many order keys                                   |
| 2D        | Rules protect your data   | Invalid statements leave the stored data unchanged                         |
| 2D        | From rows to a result     | Only matching amounts contribute to SUM                                    |
| 2D        | One transaction           | Stock and the order commit or roll back together                           |
| 3D        | An index finds a row      | Secondary entries reference clustered rows; coverage can avoid that lookup |
| 3D        | Two shoppers, one book    | B's locking read waits, then sees the current stock                        |
| 3D        | Memory before disk        | A resident page avoids another logical disk miss                           |
| 3D        | A commit survives a crash | Durable redo can reconstruct a committed page change                       |
| 3D        | A replica can lag         | Receiving a change is different from applying it                           |

The 2D foundation uses measured SVG nodes and explicit port connections,
adapted from `style-technical-visuals/references/standalone/service-request-chain.html`.
The 3D foundation uses outlined colored blocks, separated shelves, inspectable
labels, and independent camera state, following the standalone commit-log
example and the repository's B-tree and caching reference guides. The geometry
is conceptual, not a physical MySQL byte layout. Three.js uses renderer-compatible
sRGB values; authored CSS uses OKLCH semantic tokens.

## Complete palette comparison

| Before                                                                                                                                   | After                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Stage canvas `#fdfdfc`                                                                                                                   | `oklch(0.178 0 0)` · dark canvas                                                                              |
| Outer surface `#f7f6f3`, inherited `#f1f4f7`                                                                                             | `oklch(0.178 0 0)` · dark workbench                                                                           |
| Primary ink `#21201c`                                                                                                                    | `oklch(0.985 0 0)` · white text                                                                               |
| Muted ink `#63635e`                                                                                                                      | `oklch(0.767 0 0)` · readable secondary labels                                                                |
| Hairline `#e4e3de`                                                                                                                       | `oklch(0.226 0 0)` · quiet stage boundary                                                                     |
| Control / node outline `#bcbbb5`                                                                                                         | `oklch(0.556 0 0)` · structure                                                                                |
| Dashed wire `#8f8e87`                                                                                                                    | `oklch(0.556 0 0)` · inactive connector                                                                       |
| Focus / selection `#466eaa`                                                                                                              | `oklch(0.667 0.15 241.774)` focus; `oklch(0.661 0.202 39.353)` selection                                      |
| Pressed control fill `#21201c`; inherited `#000` radio dot                                                                               | `oklch(0.226 0 0)` fill; `oklch(0.661 0.202 39.353)` selection outline / radio dot                            |
| Inherited scenario colors `oklch(0.65 0 0)`, `oklch(0.99 0 0)`, `oklch(0.95 0 0)`, `oklch(0.3 0 0)`, `oklch(0.9 0 0)`, `oklch(0.25 0 0)` | Shared panel, ink, line, and orange tokens replace light scenario variants                                    |
| 3D active outline / wire `#98622e`                                                                                                       | Orange `oklch(0.661 0.202 39.353)` · request / active operation                                               |
| 3D inactive outline `#a4a29b`                                                                                                            | `oklch(0.556 0 0)` · structural edges                                                                         |
| 3D active fill `#efdfcd`                                                                                                                 | Orange `oklch(0.661 0.202 39.353)`                                                                            |
| 3D inactive fill `#eeede7`                                                                                                               | Blue `oklch(0.667 0.15 241.774)` · stored data                                                                |
| 3D empty fill `#fdfdfc`                                                                                                                  | Neutral slab `oklch(0.243 0 0)` · empty slot / platform                                                       |
| 3D inactive wire `#c1bfb8`                                                                                                               | `oklch(0.556 0 0)`                                                                                            |
| 3D label background `oklch(0.992 0.003 95 / 0.94)`                                                                                       | `oklch(0.178 0 0 / 0.92)`                                                                                     |
| Active label ink `#724217`; background `#f5e7d6`                                                                                         | White ink `oklch(0.985 0 0)` on dark canvas; orange underline identifies active state                         |
| No committed-change color                                                                                                                | Green `oklch(0.681 0.191 146.483)` · accepted / committed changes                                             |
| No waiting / queued-change color                                                                                                         | Yellow `oklch(0.809 0.165 84.552)` · waiting session / pending log                                            |
| No invalid-write / crash color                                                                                                           | Red `oklch(0.668 0.22 18.688)` · rejection / lost memory                                                      |
| No bright 3D active / data edge variants                                                                                                 | sRGB `#ffb18d` / `#87cff8`, renderer equivalents of orange / blue edge tints; Three.js cannot parse CSS OKLCH |

## Color verification

Tokens are sRGB-derived. Rounded OKLCH coordinates were converted back to linear
sRGB and checked for gamut bounds. Yellow was reduced from chroma 0.166 to 0.165
to keep the rounded token in gamut. No P3-only colors are used.

Against the dark canvas, primary text has WCAG contrast about 18.1:1 and APCA
Lc -104.1. Secondary labels have about 9:1 and Lc -60.7. Colored strokes have
WCAG contrast from 5.6:1 to 10.3:1, above the 3:1 graphics threshold. Active 3D
labels and result labels use white text, since canonical orange/green/red alone
do not reach the recommended APCA Lc 60 for small labels. Selected control text
uses orange (Lc -41.1), above the UI threshold of 30, with a visible orange outline.

## Verification

- Focused MySQL suite: 24 tests passed after the rebuild.
- Production build completed and prerendered public routes; the MySQL draft is excluded.
- Actual `/mysql` browser inspection at 1440×900 and 390×844: all ten initial
  states and all ten final states captured and reviewed. Mobile SVG diagrams
  reflow vertically rather than shrinking desktop labels.
- One authored stage per figure, all controls at least 44×44px, no mobile page
  overflow. New 3D scenes exercised with orbit, keyboard rotation, zoom, and reset.
- Waiting locks, crash/lost memory, and received/unapplied replication states
  reviewed at the mobile size from the default camera and a rotated camera.
- The changed MySQL modules and imported dependencies pass a scoped TypeScript check.
- Forced WebGL context loss yields to the HTML lesson, including loss during
  renderer initialization; reduced-motion recovery retains the same conclusion.
- The final repository-wide pre-commit check passes formatting, TypeScript,
  and all 1,130 tests. The production build also completes.

Domain additions were checked against the official MySQL 8.4 documentation:
[locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html),
[crash recovery](https://dev.mysql.com/doc/refman/8.4/en/innodb-recovery.html), and
[CHECK constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html).
The article retains the independently verified local Docker/SQL exercise.

## Autoplay

All ten demos now advance through finite sequences when at least half of the
stage is visible. Each beat receives a fresh dwell after scrolling back or
returning to the tab. Playback waits for 3D readiness, pauses offscreen and in
hidden tabs, and stops at a persistent final state. Camera movement leaves the
lesson's progress intact. Manual steps, selections, rollback, and reset pause
the sequence; Replay starts it again. Reduced motion keeps the manual controls.

The focused MySQL suite passes 31 tests, including seven playback lifecycle
tests. Actual desktop and mobile browser checks confirm all ten demos reach
and retain their conclusions without manual steps, and Pause, Replay, and
manual controls retain the selected state. All ten stages were inspected at
1440×900 and 390×844.

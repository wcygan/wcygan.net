# ClickHouse figure color audit

The ten ClickHouse figures share one dark palette. The article shell keeps its existing editorial colors. This audit covers the full prior 2D stylesheet, spatial stylesheet, and spatial renderer; the table includes every distinct color literal from those sources, including the unchanged orange whose CSS representation changes.

The foundation is the active standalone [Commit log example](/Users/wcygan/.agents/skills/style-technical-visuals/references/standalone/commit-log.html:6): canvas `#111111`, panel `#1c1c1c`, primary text `#fafafa`, thin neutral structure, and semantic accents. The [PlanetScale reference](/Users/wcygan/Development/wcygan.net/.agents/skills/planet-scale-animation-design-system/SKILL.md) supplies the orange, green, yellow, and red families; the active standalone supplies the brighter blue. Purple distinguishes an additional named series rather than implying success or failure.

## Complete before/after inventory

| Before      | After                                                                                                                                                                                                             | Previous role and source proof                                                                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `#21201c`   | `text: oklch(0.985 0 0)`; `orange: oklch(0.661 0.202 39.353)`; `bg: oklch(0.178 0 0)`                                                                                                                             | Primary ink and selected controls; text; selected fills orange with bg text; `src/styles/clickhouse-2d.css:2`, `src/styles/clickhouse-spatial.css:3`                                                                                                                                       |
| `#63635e`   | `muted: oklch(0.851 0 0)`; `dim: oklch(0.783 0 0)`                                                                                                                                                                | Descriptions, captions, controls, labels; muted for prose; dim for tertiary labels; `src/styles/clickhouse-2d.css:3`, `src/styles/clickhouse-spatial.css:4`                                                                                                                                |
| `#e4e3de`   | `border: oklch(0.317 0 0)`; `dim: oklch(0.783 0 0)`                                                                                                                                                               | Hairlines and decorative boundaries; border; essential geometry uses dim or a semantic accent; `src/styles/clickhouse-2d.css:4`, `src/styles/clickhouse-spatial.css:5`                                                                                                                     |
| `#bcbbb5`   | `nodeBorder: oklch(0.39 0 0)`; `dim: oklch(0.783 0 0)`                                                                                                                                                            | Strong borders, marks, arrows; nodeBorder for decorative structure; dim or semantic accents for meaningful marks/routes; `src/styles/clickhouse-2d.css:5`                                                                                                                                  |
| `#f7f6f3`   | `panel: oklch(0.226 0 0)`; `orange: oklch(0.661 0.202 39.353)`; `blue: oklch(0.667 0.15 241.774)`; `green: oklch(0.681 0.191 146.483)`; `yellow: oklch(0.809 0.165 84.552)`; `purple: oklch(0.726 0.165 298.651)` | Stages, hover surfaces, neutral rows; panel; colored rows use the relevant semantic accent; `src/styles/clickhouse-2d.css:6`, `src/styles/clickhouse-spatial.css:101`, `src/demos/clickhouse-spatial/Scene.tsx:45`                                                                         |
| `#eeede8`   | `panel: oklch(0.226 0 0)`; `orange: oklch(0.661 0.202 39.353)`; `blue: oklch(0.667 0.15 241.774)`; `green: oklch(0.681 0.191 146.483)`; `yellow: oklch(0.809 0.165 84.552)`; `purple: oklch(0.726 0.165 298.651)` | Visited values and selected rows; panel for neutral surface; orange/blue/green/yellow/purple for labeled state; `src/styles/clickhouse-2d.css:7`                                                                                                                                           |
| `#f35815`   | `orange: oklch(0.661 0.202 39.353)`                                                                                                                                                                               | Selected output and highlighted events; orange (same brand sRGB, encoded as OKLCH in CSS); `src/styles/clickhouse-2d.css:8`                                                                                                                                                                |
| `#466eaa`   | `blue: oklch(0.667 0.15 241.774)`                                                                                                                                                                                 | Focus outlines; blue; `src/styles/clickhouse-2d.css:9`, `src/styles/clickhouse-spatial.css:119`                                                                                                                                                                                            |
| `#fdfdfc`   | `bg: oklch(0.178 0 0)`; `text: oklch(0.985 0 0)`                                                                                                                                                                  | Figure/button canvas and selected text; bg for dark canvas or labels on vivid fills; text for selected white copy; `src/styles/clickhouse-2d.css:84`, `src/styles/clickhouse-2d.css:100`, `src/styles/clickhouse-spatial.css:7`, `src/styles/clickhouse-spatial.css:91`; 1 additional uses |
| `#a64b19`   | `orange: oklch(0.661 0.202 39.353)`                                                                                                                                                                               | Active mesh edges and spatial labels; orange; `src/styles/clickhouse-spatial.css:6`, `src/demos/clickhouse-spatial/Scene.tsx:47`                                                                                                                                                           |
| `#8b887e`   | `dim: oklch(0.783 0 0)`; `nodeBorder: oklch(0.39 0 0)`                                                                                                                                                            | Mesh edges and label leaders; dim for essential edge/leader visibility; nodeBorder only for decorative outlines; `src/styles/clickhouse-spatial.css:181`, `src/demos/clickhouse-spatial/Scene.tsx:43`                                                                                      |
| `#fdfdfcf0` | `bg: oklch(0.178 0 0)` mixed at 94% with transparent                                                                                                                                                              | Translucent light spatial-label plate becomes a dark plate using `color-mix(in oklch, var(--ch-bg) 94%, transparent)`; `src/styles/clickhouse-spatial.css:193`                                                                                                                             |
| `#46433b`   | `text: oklch(0.985 0 0)`; `bg: oklch(0.178 0 0)`                                                                                                                                                                  | Row texture glyphs; text on dark panels, or bg on a vivid fill; `src/demos/clickhouse-spatial/Scene.tsx:42`                                                                                                                                                                                |
| `#e7e4da`   | `panel: oklch(0.226 0 0)`; `orange: oklch(0.661 0.202 39.353)`; `blue: oklch(0.667 0.15 241.774)`; `green: oklch(0.681 0.191 146.483)`; `yellow: oklch(0.809 0.165 84.552)`; `purple: oklch(0.726 0.165 298.651)` | Neutral mesh surfaces; panel; semantic surfaces use blue/orange/green/yellow/purple; `src/demos/clickhouse-spatial/Scene.tsx:44`                                                                                                                                                           |
| `#f2ddcc`   | `orange: oklch(0.661 0.202 39.353)`; `blue: oklch(0.667 0.15 241.774)`; `green: oklch(0.681 0.191 146.483)`; `yellow: oklch(0.809 0.165 84.552)`; `purple: oklch(0.726 0.165 298.651)`                            | Active row or mesh fill; orange or the specifically labeled semantic series; `src/demos/clickhouse-spatial/Scene.tsx:46`                                                                                                                                                                   |
| `#bcb9af`   | `dim: oklch(0.783 0 0)`; `border: oklch(0.317 0 0)`; `track: oklch(0.281 0 0)`                                                                                                                                    | Faint mesh structure; dim for meaningful structure; border/track for decorative rails; `src/demos/clickhouse-spatial/Scene.tsx:48`                                                                                                                                                         |

No old literal remains as a second color island. Multiple old neutral roles become named semantic colors only when their figure teaches that state or series. The exact role is attached to a label, shape, grouping, or selected state; color alone does not carry the lesson.

## Foundation changes and additions

| Before                                            | After                                                 | Reason                                                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Standalone muted text: `rgba(250, 250, 250, 0.6)` | `--ch-muted: oklch(0.851 0 0)` (`#cecece`)            | Supporting prose meets the body-text APCA target on either dark surface; the translucent reference is too dim for that use. |
| Standalone dim text: `rgba(250, 250, 250, 0.4)`   | `--ch-dim: oklch(0.783 0 0)` (`#b8b8b8`)              | Small labels meet the non-body APCA target on either surface.                                                               |
| Standalone border: white at 14%                   | `--ch-border: oklch(0.317 0 0)` (`#323232`)           | Opaque sRGB composite over the canvas; decorative separators only.                                                          |
| Standalone node border: white at 22%              | `--ch-node-border: oklch(0.39 0 0)` (`#454545`)       | Opaque sRGB composite over the canvas; decorative outlines only.                                                            |
| Standalone track: white at 10%                    | `--ch-track: oklch(0.281 0 0)` (`#292929`)            | Opaque sRGB composite over the canvas; inactive rails only.                                                                 |
| No prior ClickHouse blue token                    | `--ch-blue: oklch(0.667 0.15 241.774)` (`#1e9de7`)    | A labeled semantic series/state; geometry and large figures use the vivid color.                                            |
| No prior ClickHouse green token                   | `--ch-green: oklch(0.681 0.191 146.483)` (`#27b648`)  | A labeled semantic series/state; geometry and large figures use the vivid color.                                            |
| No prior ClickHouse yellow token                  | `--ch-yellow: oklch(0.809 0.165 84.552)` (`#f2b600`)  | A labeled semantic series/state; geometry and large figures use the vivid color.                                            |
| No prior ClickHouse red token                     | `--ch-red: oklch(0.668 0.22 18.688)` (`#ff455d`)      | A labeled semantic series/state; geometry and large figures use the vivid color.                                            |
| No prior ClickHouse purple token                  | `--ch-purple: oklch(0.726 0.165 298.651)` (`#b58cff`) | A labeled semantic series/state; geometry and large figures use the vivid color.                                            |

## Canonical palette and measured contrast

CSS lives in `src/styles/clickhouse-theme.css`; Canvas/Three.js sRGB values live in `src/demos/clickhouse-theme.ts`. CSS literals are OKLCH. The sRGB hex exports are intentional renderer inputs, which the color-conversion guide permits for library configurations. CSS colors are rounded to three decimals; chroma is reduced only when that rounding would move an edge color outside sRGB. The small rounding differences do not change a role.

Ratios below use WCAG 2 relative luminance on the sRGB renderer values. APCA uses the official [APCA-W3 implementation](https://github.com/Myndex/apca-w3/blob/master/src/apca-w3.js), Beta 0.1.9 W3. Negative APCA values indicate light text on a dark background; the magnitude is the contrast score.

| Token        | sRGB      | CSS OKLCH                    | WCAG on canvas | WCAG on panel | APCA on canvas / panel |
| ------------ | --------- | ---------------------------- | -------------: | ------------: | ---------------------: |
| `bg`         | `#111111` | `oklch(0.178 0 0)`           |         1.00:1 |        1.11:1 |              0.0 / 0.0 |
| `panel`      | `#1c1c1c` | `oklch(0.226 0 0)`           |         1.11:1 |        1.00:1 |              0.0 / 0.0 |
| `text`       | `#fafafa` | `oklch(0.985 0 0)`           |        18.09:1 |       16.33:1 |        -104.1 / -103.0 |
| `muted`      | `#cecece` | `oklch(0.851 0 0)`           |        12.00:1 |       10.83:1 |          -76.4 / -75.3 |
| `dim`        | `#b8b8b8` | `oklch(0.783 0 0)`           |         9.52:1 |        8.59:1 |          -63.5 / -62.5 |
| `border`     | `#323232` | `oklch(0.317 0 0)`           |         1.47:1 |        1.33:1 |              0.0 / 0.0 |
| `nodeBorder` | `#454545` | `oklch(0.39 0 0)`            |         1.97:1 |        1.78:1 |            -9.7 / -8.6 |
| `track`      | `#292929` | `oklch(0.281 0 0)`           |         1.30:1 |        1.17:1 |              0.0 / 0.0 |
| `orange`     | `#f35815` | `oklch(0.661 0.202 39.353)`  |         5.59:1 |        5.05:1 |          -41.1 / -40.0 |
| `blue`       | `#1e9de7` | `oklch(0.667 0.15 241.774)`  |         6.32:1 |        5.71:1 |          -45.3 / -44.3 |
| `green`      | `#27b648` | `oklch(0.681 0.191 146.483)` |         7.08:1 |        6.39:1 |          -50.1 / -49.0 |
| `yellow`     | `#f2b600` | `oklch(0.809 0.165 84.552)`  |        10.31:1 |        9.31:1 |          -68.1 / -67.0 |
| `red`        | `#ff455d` | `oklch(0.668 0.22 18.688)`   |         5.63:1 |        5.08:1 |          -41.7 / -40.6 |
| `purple`     | `#b58cff` | `oklch(0.726 0.165 298.651)` |         7.34:1 |        6.62:1 |          -51.3 / -50.2 |

Primary text and status copy use `text`. Supporting prose uses `muted` (WCAG at least 10.83:1; APCA at least 75.3). Small secondary labels use `dim` (WCAG at least 8.59:1; APCA at least 62.5). These are fixed opaque colors, so nesting a label inside a raised panel cannot reduce its contrast through repeated alpha compositing.

Decorative `border`, `nodeBorder`, and `track` intentionally stay quiet and must not identify essential information alone. Essential lines and edges use `dim` or a semantic accent. Every accent exceeds the 3:1 graphical-object threshold on both dark surfaces. Accent-colored small text does not meet the APCA label target, so normal text stays neutral; direct text on a vivid fill uses dark `bg`, never white.

| Filled surface | WCAG: dark text on fill | WCAG: white text on fill | Label choice     |
| -------------- | ----------------------: | -----------------------: | ---------------- |
| `orange`       |                  5.59:1 |                   3.24:1 | `bg` (`#111111`) |
| `blue`         |                  6.32:1 |                   2.86:1 | `bg` (`#111111`) |
| `green`        |                  7.08:1 |                   2.56:1 | `bg` (`#111111`) |
| `yellow`       |                 10.31:1 |                   1.75:1 | `bg` (`#111111`) |
| `red`          |                  5.63:1 |                   3.21:1 | `bg` (`#111111`) |
| `purple`       |                  7.34:1 |                   2.47:1 | `bg` (`#111111`) |

## Gamut and typography checks

Each exact source hex is within sRGB by construction. Each rounded CSS token is also checked by converting OKLCH back to linear sRGB; all three channels remain within [0, 1]. No P3-only enhancement or fallback is needed.

The rounded CSS values also pass the contrast checks: muted copy on the panel measures 10.83:1 and APCA −75.2; dim labels measure 8.61:1 and APCA −62.5. The least contrasted accent on the panel is orange at 5.06:1. The renderer hex and CSS values therefore meet the same acceptance thresholds despite their small rounding differences.

| Token        | Minimum linear channel | Maximum linear channel | Chroma adjustment after rounding |
| ------------ | ---------------------: | ---------------------: | -------------------------------: |
| `bg`         |               0.005640 |               0.005640 |                            0.000 |
| `panel`      |               0.011543 |               0.011543 |                            0.000 |
| `text`       |               0.955672 |               0.955672 |                            0.000 |
| `muted`      |               0.616295 |               0.616295 |                            0.000 |
| `dim`        |               0.480049 |               0.480049 |                            0.000 |
| `border`     |               0.031855 |               0.031855 |                            0.000 |
| `nodeBorder` |               0.059319 |               0.059319 |                            0.000 |
| `track`      |               0.022188 |               0.022188 |                            0.000 |
| `orange`     |               0.007724 |               0.897176 |                            0.000 |
| `blue`       |               0.012325 |               0.801766 |                            0.000 |
| `green`      |               0.020591 |               0.468186 |                            0.000 |
| `yellow`     |               0.002039 |               0.884521 |                           -0.001 |
| `red`        |               0.059871 |               0.997935 |                            0.000 |
| `purple`     |               0.262978 |               0.997823 |                           -0.001 |

`public/fonts/` contains local Lilex variable regular and italic fonts, plus their OFL license. No local JetBrains Mono asset or font face was found. The root `--ch-font-mono` alias therefore uses `"JetBrains Mono", "Lilex", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` with no external font request. The alias changes no shared-shell font; only `.clickhouse-demo` consumes it.

Shared figure, stage, title, caption, status, button, and focus rules are scoped to `.clickhouse-demo`. Controls retain a 44×44px minimum. A 2px blue focus outline has at least 5.71:1 contrast on the panel and a 2px offset. Uppercase tracked titles describe each figure, while longer status and caption copy remains sentence case.

## Verification scope

The numeric palette audit verified all 14 tokens, both background contrasts, label choices, and every rounded CSS token’s sRGB gamut. All ten figures were inspected in the rendered article on desktop and mobile, including shaded geometry and labels at changed camera angles. SVG labels and metrics use neutral text; saturated colors identify geometry, state, and series. Full pre-commit checks and the production build passed. The [visual verification record](./clickhouse-visual-overhaul.md) lists the exercised states and saved examples.

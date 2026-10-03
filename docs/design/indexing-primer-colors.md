# Indexing primer palette

The twelve tree demonstrations share scoped colors. CSS uses OKLCH; Three.js uses sRGB because its material parser does not accept OKLCH. Color marks the route, chosen separator, inspected entries, and result. Labels and cell boundaries carry the same information.

| Before                        | After                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Independent stage backgrounds | Stage `oklch(0.178 0 0)`; WebGL `#111111`                                                 |
| Floating node surfaces        | Page `oklch(0.227 0 0)`; mesh `#1c1c1c`                                                   |
| Per-demo text                 | Text `oklch(0.985 0 0)`; muted labels `oklch(0.75 0 0)`                                   |
| Undifferentiated emphasis     | Chosen separator, new entry, handoff and focus `oklch(0.659 0.211 40.16)`; edge `#f35815` |
| Generic blue boxes            | Visited page and route `oklch(0.55 0.162 251.4)`; edge `#0e73cc`                          |
| Generic green nodes           | Matching entry `oklch(0.68 0.181 146)`; edge `#27b648`                                    |
| Unclear page boundaries       | Stage border `oklch(0.4 0 0)`; page border `oklch(0.55 0 0)`; mesh border `#777777`       |
| One selected tint             | Visited fill `oklch(0.34 0.08 251)`; mesh `#12304b`                                       |
| No separator cell tint        | Branch fill `oklch(0.3 0.06 251)`; mesh `#173449`                                         |
| No chosen separator cell      | Chosen/new fill `oklch(0.35 0.08 40)`; mesh `#482611`                                     |
| Generic selected node         | Match fill `oklch(0.32 0.09 146)`; mesh `#123e1b`                                         |
| No scanned entry state        | Checked fill `oklch(0.32 0 0)`; mesh `#3d3d3d`                                            |
| No skipped entry state        | Muted fill `oklch(0.2 0 0)`; mesh `#202020`                                               |
| Independent connectors        | Muted connector `oklch(0.55 0 0)`; 3D wire `#8b8b8b`                                      |

Labels remain upright and at a readable size as the page width changes. Matches have an inset vertical marker, selected separators occupy their own cells, and untouched branches remain muted. Each sequence autoplays once while visible, with a longer opening hold and a settled ending. Pause, camera inspection, hidden tabs, and offscreen stages suspend playback. Reduced motion retains manual steps.

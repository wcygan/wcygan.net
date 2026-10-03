# Kafka visual palette — October 2, 2026

The user explicitly requested PlanetScale's dark stages and colorful semantic geometry. Editorial prose and the shared site shell retain the site's existing palette. CSS uses OKLCH; Three.js receives the corresponding sRGB hex values. Lilex preserves the site's local monospace font boundary.

## Complete changed-color inventory

| Role                               | Before                       | After                                                    |
| ---------------------------------- | ---------------------------- | -------------------------------------------------------- |
| Figure ink                         | `#21201c`                    | `#fafafa` / `oklch(.985 0 0)`                            |
| Figure muted text                  | `#63635e`                    | `#b6b6b6` / `oklch(.776 0 0)`                            |
| Figure canvas                      | `#fdfdfc`                    | `#111111` / `oklch(.178 0 0)`                            |
| Inset surface                      | `#f7f6f3`                    | `#1c1c1c` / `oklch(.226 0 0)`                            |
| Hairline                           | `#e4e3de`                    | white at 22% opacity                                     |
| Control border                     | `#bcbbb5`                    | white at 22% opacity                                     |
| Active accent                      | `#f35815`                    | same hue, CSS `oklch(.661 .202 39.353)`                  |
| Label backing                      | `oklch(.994 .001 106 / .92)` | `oklch(.178 0 0 / .94)`                                  |
| 3D tray                            | `#e9e6dd`                    | `#1c1c1c`                                                |
| 3D record                          | `#d4d0c6`                    | `#0e73cc` (blue partition/log)                           |
| Billing marker                     | `#77746c`                    | `#f35815` (orange reader)                                |
| Analytics marker                   | `#c2bdae`                    | `#27b648` (green reader)                                 |
| 3D edges                           | `#63635e`                    | `#818181`, white on record outlines                      |
| Offline outline                    | `#aaa79f`                    | `#ff455d`                                                |
| Leader tray                        | `#c8c2b3`                    | `#f35815`                                                |
| Replica connector                  | `#8b877e`                    | `#27b648` in sync; `#ff455d` offline; `#818181` baseline |
| Informational text                 | neutral                      | `#1e9de7` / `oklch(.667 .15 241.774)`                    |
| Partition B / processed / received | neutral                      | `#27b648` / `oklch(.681 .191 146.483)`                   |
| Partition C / backlog / waiting    | neutral                      | `#f2b600` / `oklch(.809 .166 84.552)`                    |
| Offline service                    | neutral                      | `#ff455d` / `oklch(.668 .22 18.688)`                     |
| Partition A / unread background    | neutral                      | `#0e73cc` / `oklch(.552 .161 252.205)`                   |

Global keyboard focus remains the site's visible blue outline; active Kafka controls additionally use the orange border. State is also represented by text, record position, explicit offsets, and dashed/offline outlines.

## Contrast

WCAG relative-luminance calculations against the lighter `#1c1c1c` panel: white 16.33:1; muted 8.40:1; orange 5.05:1; informational blue 5.71:1; green 6.39:1; yellow 9.31:1; red 5.08:1. All pass 4.5:1 for normal text. Darker `#111111` increases these ratios. White text on the blue unread blocks measures 4.63:1. Mesh labels use a dark backing rather than depending on rendered lighting contrast.

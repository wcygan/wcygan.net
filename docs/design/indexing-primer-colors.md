# Indexing primer visuals

The six lessons retain SVG pages and the article's warm-neutral light stage.
Color coordinates storage, the current decision, transport, and a completed result.
The figures explicitly stay light when the system prefers dark mode.

Two treatments were compared at desktop and phone reading widths: blue page
bodies, and neutral page bodies with pale-blue headers. The header treatment
keeps storage recognizable without letting large blue areas compete with the
selected route and record. Both primary and secondary indexes share that storage
identity; their names and positions distinguish them.

`src/styles/indexing-primer.css` owns the scoped tokens and states:

| Role                                     | Treatment                                             |
| ---------------------------------------- | ----------------------------------------------------- |
| Stage and page body                      | Warm `#f7f6f3` stage, `#fdfdfc` pages                 |
| Storage                                  | `#075e98` boundary and header text, `#e5f2fc` header  |
| Text                                     | `#21201c`; secondary labels `#63635e`                 |
| Current key and chosen route             | Orange `#b43d08`, `#fff1e8` key fill                  |
| Entry being inspected                    | Blue `#075e98` boundary, `#e5f2fc` fill               |
| Traveling lookup and cross-index handoff | Teal `#006b63`, moving packet on its actual connector |
| Completed match                          | Green `#187636`, `#e5f3e9` fill and inset marker      |
| New index entry                          | Teal `#006b63`, `#e2f3ef` fill and dashed outline     |
| Checked or ignored entry                 | Gray `#dedcd5` fill, `#4b4b46` text                   |
| Keyboard focus                           | `#466eaa` outline                                     |

The orange key highlight names the decision. Teal transport advances along the
same route as the connector. Green appears only after the lookup reaches its
matching record. Completed paths and matches remain visible. Color reinforces
labels, shape, and line treatment rather than replacing them.
An entry turns blue during inspection, then gray when it does not match. Skipped
pages turn gray when the branch chooses another route. Chosen separator highlights
have the same 3px inset on all four sides.

Keys and values stack in narrow pages instead of shrinking the text. Diagram
labels stay at least 12px, and playback buttons have 44px touch targets. Play/Pause
and Next step remain outside the stage. Next step pauses playback and wraps to
the beginning after the final result, including under reduced motion.
Playback starts on the first visible frame. Moving
between pages takes 500–800ms, while each entry inspection remains about 311ms. There
are no artificial waits before or between steps. The final result remains visible
for four seconds, then playback automatically starts again. A draining ring and
“Reset in 4s” countdown beside the controls show when it will restart, without
adding another row. The indicator uses the same clock as the reset. Pausing, hiding the
document, or scrolling offscreen freezes both movement and the remaining result
pause. A paused countdown keeps its remaining time visible. Reduced motion keeps
playback manual and hides the automatic-reset indicator.

All six demos share a 40px gap between each key router and its leaf pages, with
286px of diagram height for a single tree and 556px for a two-tree lookup.
Desktop gives pages more horizontal room. Connectors and moving packets use the
same geometry, and resizing preserves lookup progress. The browser check limits
each complete phone figure, including its controls, to 768px.

With the development server running, inspect desktop/mobile states and playback:

```sh
bun scripts/verify-indexing-primer.ts
```

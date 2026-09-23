# Spatial labels

Read this when placing text, status, or callouts inside a Three.js scene. Keep
the model in 3D and let HTML carry text that readers need to scan precisely.

## Anchor labels deliberately

- Derive a label anchor from its object's shared world position and dimensions.
  Use the same source coordinates as the mesh and its connectors.
- Use Drei `Html` for a small, sparse set of labels that can sit next to their
  anchors without collisions. Center labels when that improves alignment, and
  choose a deliberate stacking order for overlapping overlays.
- Keep label content short and stable. Put detailed explanation in article
  prose or accessible status, rather than crowding the 3D stage.
- Scope CSS to the demo's label classes. Keep typography, background, and
  contrast independent of broad article prose styles.

## Resolve dense layouts in screen space

When many labels overlap, solve the layout as a group. Project object bounds
through the current camera, place HTML labels around those bounds, and connect
callouts back to their anchors. Recompute placement when the camera, stage size,
or label set changes. Avoid writing identical DOM positions every rendered
frame.

The TiDB Architecture demo's `src/demos/tidb-architecture/Labels.tsx` and
`label-layout.ts` are the local example: they project node/group bounds, place
labels together, and draw SVG leader lines for callouts. Use that approach when
individual world-space labels cannot remain readable.

## Check legibility and collision

Inspect every supported node count and camera pose, including narrow screens.
Confirm labels do not cover important geometry, leader lines reach the intended
objects, and fault/state labels remain readable against every background. Use
the [article integration reference](article-integration.md) for accessibility,
figure semantics, and keyboard/fallback behavior.

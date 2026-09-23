# 3D article integration reference

Read this when embedding a Three.js scene in an MDX post or changing its
accessible behavior, loading/failure states, or rendered presentation.

## Article and figure structure

- Import the React demo component from the owning post and place it inside a
  semantic `figure`.
- Interactive demos use `data-graphic-frame="workbench"` and exactly one
  authored stage on the visual region: `data-graphic-stage="flush"` or
  `data-graphic-stage="padded"`. Bare figures have no stage; choose Plate or
  Bare only when the content and interaction fit those roles.
- The article route automatically marks figures with graphic IDs, kind, and an
  accessible label. Do not maintain a separate graphic index. Use explicit
  `data-graphic-key`, `data-graphic-kind`, or `data-graphic-label` only when the
  inferred metadata needs a stable override.
- Keep the demo's visual region inside the reading column and let article prose
  explain the invariant. The scene should support the text, not become a
  dashboard.

Use `?inspect=graphics` on the article route to inspect discovered figures, or
query `[data-article-graphic]` in browser tooling.

## Loading, accessibility, and layout

- Keep controls outside the Canvas with at least 44px touch targets and visible
  keyboard focus. Provide meaningful HTML status independent of an
  `aria-hidden` canvas. Do not rely on hover to reveal instructions or state.
- Lazy-load WebGL behind a client-ready boundary with Suspense and an error
  boundary. Preserve the stage's size while loading. A Canvas fallback should
  remain inert; mounting fallback JSX must not itself mark a working scene as
  unavailable.
- Detect renderer errors or context loss through the existing boundary/callback
  pattern. Keep the HTML fallback useful without WebGL and preserve the same
  lesson when reduced motion is requested.
- Pause nonessential animation while offscreen or while the document is hidden.
  Honor reduced motion without removing information or required controls.
- Use Drei `Html` for scene-anchored labels when appropriate. Fiber hooks belong
  outside the DOM subtree rendered by `Html`, which has a separate React root.
  Scope label styles so article typography does not distort them; inspect
  collisions at every supported configuration.

## Rendered verification

Inspect the real article at **1440×900** and **390×844**. Check page overflow,
responsive stage sizing, readable labels, keyboard controls, reduced motion,
loading and WebGL failure states, offscreen pause, replay, and the settled state.
For camera or playback changes, also exercise rotation, zoom, and
reconfiguration during motion. Apply the domain-specific checks from the
Kafka Partitioning or Failure Detectors reference.

Run `deno task pre-commit`. Run `deno task build` when changing routes, MDX,
lazy-loading/SSR behavior, or prerendering. Report the checks and any limits on
what was inspected.

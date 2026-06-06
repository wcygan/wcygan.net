---
name: wcygan-graphic-demos
description: Use when creating, editing, reviewing, or debugging wcygan.net article graphic demos, including Canvas 2D engines, SVG/DOM diagrams, Leaflet maps, ASCII flipbooks, MDX embeds, src/demos model state, demo CSS, accessibility text, reduced-motion behavior, and desktop/mobile visual verification.
---

# wcygan.net Graphic Demos

Goal: Build and maintain article-native graphic demos that explain one concrete
software or data-systems idea through inspectable state, clear motion, and
responsive presentation.

Success means:

- The demo teaches one invariant or concept that the surrounding prose names.
- The implementation follows the local shape for its complexity: React article
  shell, deterministic model, renderer, lifecycle, CSS, and tests when state is
  meaningful.
- The rendered figure works in the MDX post, stays readable on mobile, respects
  reduced motion, and exposes useful accessibility text.

Stop when the demo source, post embed, styling, and verification evidence all
agree with the concept being taught.

## Reference Map

- `references/ui-motion-polish.md`: Read before adding, tuning, or reviewing
  demo motion, micro-interactions, animation timing, easing, gesture behavior,
  reduced-motion handling, or animation performance.
- `references/ui-design.md`: Read when a demo needs a broader visual polish
  pass, interaction review, component feel audit, or concrete Before/After
  feedback on design details.
- `references/canvas-rendering-lifecycle.md`: Read before implementing or
  reviewing Canvas 2D renderers, `requestAnimationFrame` engines, DPR sizing,
  offscreen/layered canvases, and frame cleanup.
- `references/web-animation-techniques.md`: Read before choosing CSS
  transitions, CSS animations, or the Web Animations API for demo UI motion.
- `references/playwright-visual-verification.md`: Read before writing or running
  Playwright screenshot checks for rendered article demos.

## Start Here

Trace the post first. Open the MDX file that imports the component, read the
paragraph before and after the embed, and state the concept in one sentence.

Name the invariant before editing code. Good examples in this repo include:

- Entity routing: writes for an account route to the region that owns that
  account.
- Replication lag: a healthy-looking replica can return an older version during
  failover.
- Optimistic locking: the row version read earlier must still match at update
  time.
- Consistent hashing: adding a node moves only the keys whose next clockwise
  token changes.

Choose the representation that makes the invariant easiest to inspect:

- Use Canvas 2D for animated packet flows, timelines, logs, rings, replay, and
  dense state diagrams.
- Use SVG for small vector diagrams with a fixed number of labels and paths.
- Use DOM/CSS for compact controls, bars, tables, chips, and stateful article
  widgets.
- Use Leaflet for real map tiles.
- Use ASCII flipbooks for generated frame data from `src/data/*.json`.
- Use static Mermaid SVGs for diagrams authored in `src/diagrams/<slug>/*.mmd`
  and compiled into `public/<slug>/*.svg`.

## Demo Option Types

Classify a demo along two axes before implementation: how state advances, and
what the reader can manipulate. Prefer the simplest option that exposes the
post's invariant without extra controls.

- Continuous phase loop: a `progress` value from 0 to 1 drives named phases,
  moving packets, labels, and status. Use for routing, replication, retries,
  workflow execution, crash recovery, replay, and other flows where motion
  itself explains causality.
- Discrete autoplay or step-wise: an integer `stepIndex` advances one state at a
  time, often with clickable stage markers. Use when the reader should compare
  named moments instead of track sub-frame motion.
- Scenario selection: buttons or tabs switch between a small set of alternatives
  such as option A versus option B, query shapes, rebalance strategies, failure
  modes, or partition keys. Use when the teaching goal is comparison.
- Parameterized model: sliders, steppers, or small inputs change model
  parameters and recompute the figure immediately. Use for rings, load
  distribution, fanout, thresholds, and other demos where the invariant emerges
  from changing values.
- Live action or async probe: a button triggers real work and the UI moves
  through idle, pending, success, and failure states. Use when the article needs
  inspectable runtime evidence rather than a simulation.
- Spatial reference: a map, topology, or fixed diagram anchors a concept in
  geography or structure. Use when location, ownership, or topology matters more
  than elapsed time.
- Static reference or gallery: a stable visual inventory gives context without
  progression. Use when interaction would distract from recognition or scanning.
- Ambient loop: lightweight decorative or identity motion with no explanatory
  model. Keep this rare and make reduced motion settle to a static frame.

Keep the house contract consistent across types: name the invariant, name the
option type, define the progression source, expose only useful controls, provide
status text when state changes, and choose a reduced-motion state that still
teaches the same idea.

## Local Architecture

Prefer the model-backed shape when a demo has time, phases, packets, ownership,
or meaningful derived state:

```text
src/components/ExampleDemo.tsx
src/demos/example/model.ts
src/demos/example/engine.ts
src/demos/example/render-canvas.ts
src/demos/example/viewport.ts
src/demos/example/model.test.ts
```

Use these responsibilities:

- React component: article markup, header copy, controls, refs, lifecycle,
  `aria-label`, timeline/status DOM, and `data-phase` attributes.
- Model: domain state, typed snapshots, phase definitions, labels, semantic
  status, clamps/easing, and testable derived values.
- Engine: `requestAnimationFrame`, `ResizeObserver`, `IntersectionObserver` when
  useful, page visibility, reduced-motion defaults, cleanup, and snapshot
  callbacks.
- Renderer: pure drawing from snapshot plus viewport, with named geometry and
  semantic colors.
- CSS: figure frame, layout, controls, legends, responsive breakpoints, and
  reduced-motion behavior.

Keep small one-off demos in one component when the state is simple and the split
would add ceremony. `GeoDnsRoutingDemo`, `ConsistentHashingRingCanvasDemo`,
`ShardingPartitioningDemos`, and the ASCII components are valid local examples
of component-local models.

## Motion And Lifecycle

Build the first frame to teach something before the animation advances.

Before changing motion, translate the request into a motion contract: purpose,
pattern, timing, easing or physics, spatial rule, feedback behavior, performance
constraint, and reduced-motion fallback. Use `references/ui-motion-polish.md`
for the concrete vocabulary and thresholds.

Map time to named phases. Use typed phase identifiers, `phaseLabel`, and
timeline state helpers when the reader needs to follow a sequence.

Run motion only after mount. Access `window`, `document`, canvas contexts,
Leaflet, `matchMedia`, and observers inside effects or engines.

Respect reduced motion by showing a useful settled state, final state, or single
representative step. Keep the same invariant visible without playback.

Pause work when the page is hidden. For long-running Canvas demos, stop the loop
when `document.hidden` is true and resume or render when visible again.

Clean up every animation frame, observer, media-query listener, event listener,
interval, and map instance in the returned effect or engine `destroy()` method.

## Accessibility And Article Fit

Place each demo in a `<figure>` with a concise header or nearby prose that names
the concept. Add a `figcaption`, legend, timeline, or status text when color or
motion carries meaning.

Write `aria-label`, `<title>`, or `<desc>` text that describes the actual state
transition. Name the actors, states, and outcome that the reader would see.

Expose controls with native inputs and labels. Use `aria-live` for derived
metrics that update from user interaction.

Keep the demo inside the post rhythm. Use existing `src/styles/app.css` demo
families, semantic colors, and the mobile-first acceptance bar from `AGENTS.md`.

## Styling Patterns

Use semantic colors consistently:

- Blue for primary actions, selected paths, active regions, and source systems.
- Gold for moving packets, probes, highlighted paths, and active focus.
- Green for healthy, available, committed, current, or successful state.
- Red for failure, stale state, conflict, rejected writes, deletes, and changed
  ownership when the prose calls it out.
- Muted gray for supporting UI, inactive lines, grid planes, and labels.

Build geometry from named points, paths, ports, constants, and shared layout
objects. Keep connector paths and moving packets derived from the same geometry.

Give fixed-format surfaces stable dimensions with `aspect-ratio`, explicit CSS
height, or viewport-aware canvas sizing so labels, hover states, and animation
keep the layout stable.

## Verification

Run the narrowest useful checks for the change:

- Model or phase edits: `deno task test src/demos/<name>/model.test.ts`.
- Shared renderer edits: run the matching renderer/model tests when present.
- Type or component edits: `deno task typecheck`.
- Broad demo or post edits: `deno task pre-commit`.

Inspect the rendered post when visuals change. Check desktop and a phone-width
viewport. Confirm the canvas or SVG is nonblank, labels fit, controls work, and
horizontal overflow stays at zero.

Check reduced motion for demos with playback. Confirm the representative state
still teaches the invariant.

Before finishing, report which source files changed, which route or post owns
the demo, and which checks or browser views proved the result.

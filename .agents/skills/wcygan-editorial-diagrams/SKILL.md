---
name: wcygan-editorial-diagrams
description: Use when creating, editing, reviewing, or debugging explanatory diagrams and animations in wcygan.net articles. Applies the site's monochrome editorial visual system, comparison grammar, readable narrative pacing, article-graphic metadata, accessibility, reduced-motion behavior, model architecture, and desktop/mobile browser verification.
---

# wcygan.net Editorial Diagrams

Build article-native diagrams that make one software or data-systems idea easier
to understand. A diagram is part of the writing, not a miniature product UI.

Success means the reader can identify the actors, follow the causal sequence,
and state the takeaway without decoding a legend or inferring meaning from color.
Stop when the source, article prose, visible states, motion, accessibility text,
and browser evidence all teach the same invariant.

## Canonical Reference

Use the N+1 query race as the approved visual reference:

- Route: `/n-plus-one-sql-query`
- Component: `src/components/NPlusOneQueryDemos.tsx`
- Model and tests: `src/demos/n-plus-one-query/`
- Styles: the `/* N+1 query race */` section in `src/styles/app.css`

It establishes the direction:

- a restrained article header outside the stage;
- one black, white, and warm-gray explanatory surface;
- direct labels instead of decorative node illustrations;
- state expressed through grouping, rhythm, line treatment, text, and motion;
- a persistent completed alternative while the slower path continues;
- a short status sentence that narrates the current contrast; and
- a quantified summary that makes the conclusion explicit.

Treat it as a craft benchmark, not a layout template. Preserve its visual
language and explanatory clarity while choosing geometry appropriate to the new
concept.

## Start With The Article

Before editing code:

1. Open the MDX post that imports the diagram.
2. Read the paragraph before and after the embed.
3. State the single invariant in one sentence.
4. Name the input, actors, boundary, state change, and final outcome.
5. Decide what the first frame, decisive middle frame, and final frame must show.

If the diagram needs a long legend or several unrelated outcomes, narrow the
lesson before designing it.

## Visual System

Default to monochrome. Use the approved N+1 stage values when a dark explanatory
surface fits:

| Role        | Value     | Use                                     |
| ----------- | --------- | --------------------------------------- |
| Canvas      | `#181817` | Main diagram field                      |
| Panel       | `#20201e` | Status and supporting bands             |
| Raised      | `#292927` | Moving tokens and quiet emphasis        |
| Line        | `#3f3f3b` | Dividers and inactive structure         |
| Strong line | `#696862` | Rails, boundaries, and active structure |
| Primary ink | `#f4f3ee` | Labels and completed state              |
| Muted ink   | `#aaa9a2` | Supporting labels and inactive state    |
| Paper       | `#efeee9` | Returned payloads and final summary     |
| Paper ink   | `#20201d` | Text on the light summary surface       |

The article shell remains `#fdfdfc`, `#21201c`, `#63635e`, and `#e4e3de`.
Keep the blue focus accent `#466eaa` for keyboard visibility; it is not diagram
chrome.

Use saturated color only when domain meaning cannot remain clear through text,
shape, position, pattern, grouping, or line treatment. Document that reason in
the implementation or surrounding prose. Never default to red/green success and
failure cards, blue source nodes, or gold moving packets.

Encode comparison structurally:

- separated marks versus one grouped payload;
- dashed versus continuous rails;
- repeated crossings versus one crossing;
- progressive completion versus atomic completion;
- active movement versus a persistent settled state; and
- explicit labels and values instead of color-only meaning.

## Composition

Use two layers:

1. Editorial layer: title, short explanatory deck, and any reader control.
2. Diagram stage: the visual explanation, current status, and conclusion.

Keep the title and deck quiet. Put the explanatory contrast inside exactly one
authored stage. Avoid nested cards, badge collections, dashboard KPI tiles,
glossy gradients, illustrated servers/databases, and ornamental legends.

For comparisons, prefer this narrative order when it fits:

1. Show the shared input or starting condition.
2. Align the alternatives so the same boundary is visually comparable.
3. Let the efficient path settle and remain visible.
4. Continue the inefficient or failure-prone path long enough to expose cost.
5. Narrate the current difference in one sentence.
6. End with a compact, quantified comparison.

Do not hide the takeaway until the last frame. The lane names, operation counts,
or structural difference should already make the premise visible at rest.

## Motion Contract

Motion exists to explain causality, continuity, or accumulated cost. Do not add
ambient movement merely to make the page feel active.

Before implementing, define:

- Purpose: what relationship becomes clearer because it moves?
- Pattern: orchestration, continuity transition, stepped animation, stagger,
  number ticker, reveal, or another named behavior.
- Timing: establishment, action, processing, response, hold, and final settle.
- Spatial rule: where each token begins, which boundary it crosses, and where it
  returns or persists.
- Interruption: what Replay, resize, tab visibility, and preference changes do.
- Reduced motion: which settled state teaches the same invariant without travel.

Use these pacing defaults:

- Give the reader roughly one second to register the input and labels.
- Make one repeated request/process/response cycle readable as distinct beats;
  around two seconds per cycle is appropriate for the N+1 reference.
- A ten-step explanatory comparison may take roughly 20–24 seconds when every
  step matters. Do not compress it merely to resemble routine UI timing.
- Keep Replay and other UI feedback at 100–160ms.
- Use a 30–80ms stagger only when it helps parse a group; never delay access.

Use linear interpolation for constant travel, strong ease-in-out for visible
state-to-state movement, and `cubic-bezier(0.23, 1, 0.32, 1)` for enters, exits,
and control feedback. Avoid `ease-in` for UI, `transition: all`, `scale(0)`, and
layout-property animation.

Autoplay explanatory sequences once, then hold the final frame. Provide Replay
when repetition helps. Replay must restart immediately. Pause frame work while
the document is hidden and resume coherently.

## Representation And Architecture

Choose the simplest representation that keeps labels crisp and state testable:

- DOM/CSS: preferred for label-heavy comparisons, rails, grouped records,
  counters, status bands, and summaries.
- SVG: fixed vector geometry, paths, connectors, and small topology diagrams.
- Canvas 2D: dense packet fields, timelines, simulations, or geometry that would
  create excessive DOM/SVG nodes.
- Leaflet: real geographic tiles and map interaction.
- Static SVG or Mermaid: fixed reference diagrams that do not need interaction.
- ASCII: terminal-native or generated frame explanations.

When time, phases, packets, ownership, or derived metrics matter, use a
deterministic model:

```text
src/components/ExampleDiagram.tsx
src/demos/example/model.ts
src/demos/example/model.test.ts
```

Add an engine, renderer, or viewport module only when the complexity requires
it. Keep responsibilities clear:

- Component: semantic figure markup, controls, refs, lifecycle, and text.
- Model: typed phases, snapshots, domain values, clamps, and status labels.
- Engine: timestamp math, frame scheduling, visibility, observers, and cleanup.
- Renderer: pure drawing from a model snapshot and named geometry.
- CSS: visual system, layout, responsive states, and reduced motion.

Derive progress from timestamps, not frame counts. Animate transform and opacity
for per-frame DOM motion. Set high-frequency transforms on the moving element,
not an inherited CSS variable on an ancestor. Use `will-change` only for an
observed moving element, then remove or neutralize it when motion is disabled.

Clean up every animation frame, observer, media-query listener, event listener,
timer, interval, and map instance.

## Article Graphic Contract

Keep every diagram inside a semantic `<figure>` with a stable title and useful
description.

Author the editorial role, not the renderer technology:

- `data-graphic-frame="bare"`: transparent or static reference media.
- `data-graphic-frame="plate"`: self-contained explanation without controls.
- `data-graphic-frame="workbench"`: a reader can Replay, select, adjust, or act.

Every Plate and Workbench has exactly one
`data-graphic-stage="flush|padded"` on the intended visual surface. Controls sit
outside the stage. Use a stable `data-graphic-key` when the figure should retain
the same route-local identity after class or title changes.

The route adds `data-article-graphic`, `data-graphic-id`, `data-graphic-kind`, and
`data-graphic-label`. Use `?inspect=graphics` to verify the mounted contract.

## Accessibility

- Connect the figure to a stable title with `aria-labelledby`.
- Use `aria-describedby` for a short explanation and caption when useful.
- If the animated visual tree is `aria-hidden`, provide equivalent static text.
- Announce the decisive final result, not every animation frame.
- Keep controls native, keyboard reachable, visibly focused, and at least
  `44x44px`.
- Never rely on color or motion alone to communicate state.
- Use tabular numbers for changing counters and timers.
- Keep labels readable at mobile width without zoom or horizontal scrolling.

For `prefers-reduced-motion: reduce`, remove travel and transform motion first.
Render the complete or representative state immediately, keep the conclusion
visible, and retain brief opacity or color feedback only when it aids clarity.
Listen for live preference changes while the component is mounted.

## CSS Rules

Keep diagram styles in `src/styles/app.css` with a component-scoped class family
and local semantic variables. Reuse the editorial shell primitives for the
outer title, deck, caption, focus, and figure rhythm.

- One canonical rule owns each primitive.
- Remove superseded selectors when replacing a diagram.
- Do not append a stronger override island over retired styles.
- Do not introduce CSS Modules, CSS-in-JS, or inline layout styles.
- Inline transform or opacity values are acceptable for model-driven motion.
- Name every transitioned property explicitly.
- Gate hover-only behavior behind
  `@media (hover: hover) and (pointer: fine)`.

## Verification

Run the narrowest source checks first:

- Model changes: `deno task test src/demos/<name>/model.test.ts`
- Component changes: `deno task typecheck`
- Completed diagram work: `deno task pre-commit`
- Route, MDX, static diagram, or prerender changes: `deno task build`

Then inspect the real article route at `1440x900` and `390x844`. Capture or
inspect at least the first frame, one decisive middle frame, and the final
frame. Verify:

- the article header and diagram share the reading column;
- labels, packets, rails, and summaries remain legible;
- controls work without layout shift and meet `44x44px`;
- the mounted figure has the expected frame, key, label, and exactly one stage;
- page-level horizontal overflow is zero;
- browser errors are empty;
- normal to reduced to normal motion changes remain coherent; and
- the reduced-motion state teaches the same invariant.

Reject the result if it looks like a colorful admin dashboard, needs color to
decode, moves too quickly to read, loops without purpose, hides the conclusion,
or passes tests without rendered desktop/mobile inspection.

Before finishing, report the changed sources, owning article route, source
checks, browser viewports, reduced-motion result, and any deliberate exception
to the monochrome system.

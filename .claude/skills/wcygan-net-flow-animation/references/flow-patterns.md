# Flow Animation Patterns

## Current Anchors

- `src/components/CdcPipelineDemo.tsx`: full pipeline rail with autoplay,
  Play/Step/Reset controls, clickable stage markers, progress custom properties,
  a mobile flow list, and staged detail panels.
- `src/components/CdcStaleReadDemo.tsx`: compact comparison board for a
  consistency gap, with derived booleans such as `queryStarted`,
  `responseReturned`, and `mismatchVisible`.
- `src/components/DeadLetterQueueDemo.tsx`: reusable controls, retry/isolation
  state, trace rail, mobile trace, and reduced-motion handling.
- `src/posts/change-data-capture.draft.mdx`: MDX usage pattern for importing
  demos near the prose they explain.
- `src/styles/app.css`: the canonical place for flow-demo CSS, including palette
  variables, state selectors, mobile layout, and reduced-motion overrides.

## Component Contract

Use this shape unless the local post has a better existing pattern:

```tsx
const STEPS = [
  {
    id: "source",
    label: "Source",
    detail: "row committed",
    status: "The write is durable.",
  },
  {
    id: "stream",
    label: "Stream",
    detail: "event stored",
    status: "The event can be replayed.",
  },
] as const;

const LAST_STEP = STEPS.length - 1;
const STEP_MS = 1500;

function nextStep(step: number) {
  return step === LAST_STEP ? 0 : step + 1;
}
```

Keep derived display state close to render:

```tsx
const active = STEPS[activeStep];
const progressRatio = activeStep / LAST_STEP;
const isVisible = activeStep >= item.visibleAt;
```

Avoid nested or implicit state machines unless the demo truly has independent
timelines. Most blog demos should be one indexed step plus derived booleans.

## Controls

- Use one primary action that starts/stops or reveals the goal state, followed
  by `Step` and `Reset`.
- Disable the autoplay control when `prefers-reduced-motion` makes playback
  unavailable.
- Set `isPlaying` to `false` before `Step`, `Reset`, or jump-to-stage marker
  changes.
- Keep buttons text-based for these controls; they are commands readers should
  understand instantly.
- Preserve focus states from the site stylesheet. Do not remove outlines.

## Accessibility

- Wrap the demo in a labelled `<section>` with `aria-labelledby`.
- Put the current step status in a compact live region:
  - `aria-live={isPlaying ? "off" : "polite"}` for autoplaying demos.
  - Include a stable step label such as `Step 03` when there are three or more
    stages.
- Use buttons for clickable stages and set `aria-current="step"` on the active
  stage.
- Mark decorative rails, arrows, packets, and connector lines with
  `aria-hidden="true"`.
- Keep semantic data displays as `ol`, `dl`, `table` roles, or labelled sections
  instead of visual-only divs.

## Motion And CSS

- Use `transition` for state changes and short keyframes only for subtle
  attention cues.
- Keep durations roughly in the current range: 120-260ms for UI transitions and
  1100-1650ms for autoplay cadence.
- Use CSS custom properties for progress position/ratio instead of recalculating
  layout in the DOM.
- Drive visual states with `data-state`, `data-visible`, `data-active`,
  `data-returned`, or similarly explicit attributes.
- Add `@media (prefers-reduced-motion: reduce)` overrides for any transform,
  transition, or animation introduced by the demo.
- Stay within the site palette unless the post's subject needs one restrained
  semantic accent. If adding a new accent, define it as a local variable and
  verify contrast.

## Responsive Pattern

Desktop demos can use rails, boards, and multi-panel layouts. Mobile demos
should usually switch to an ordered vertical flow:

- one marker button per step
- short label/detail copy
- one domain payload line or code value
- vertical connector drawn in CSS

Do not let labels, code values, or buttons overflow. Prefer `minmax(0, 1fr)`,
`min-width: 0`, `overflow-wrap: anywhere`, and a purpose-built mobile structure
over viewport-scaled font sizes.

## Verification Checklist

- The post imports the component from MDX and renders without hydration
  warnings.
- Autoplay advances, wraps, and cleans up its interval.
- Play/Pause or Goal, Step, and Reset all work.
- Clicking a stage marker updates state and stops autoplay.
- Reduced motion prevents autoplay and removes attention animations.
- Desktop and mobile layouts are readable and non-overlapping.
- The active step has `aria-current="step"` and status text is meaningful
  without visual context.
- Browser screenshots confirm the demo is visible in the post, not clipped by
  surrounding prose.

# 002 — Connect each ETL actor with rounded payload handoffs

- **Status**: TODO
- **Commit**: a57da4d
- **Severity**: HIGH
- **Category**: Purpose and frequency; physicality and origin
- **Estimated scope**: 4 source files, about 100–140 changed lines

## Problem

The moving CDC event in the final `/change-data-capture` diagram does not
visually hand data from one named actor to the next. It is represented by one
scalar position on a continuous vertical rail:

```ts
// src/demos/incremental-etl-flow/model.ts:103-138 — current
function eventForProgress(progress: number) {
  if (progress < CAPTURE_START || progress >= SYNCHRONIZED_START) {
    return { visible: false, position: progress < CAPTURE_START ? 0.5 : 3.5 };
  }

  if (progress < PUBLISH_START) {
    return { visible: true, position: 0.5 };
  }
  if (progress < CONSUME_START) {
    return {
      visible: true,
      position:
        0.5 +
        strongEaseInOut(
          progressInWindow(progress, PUBLISH_START, CONSUME_START),
        ),
    };
  }
  if (progress < APPLY_START) {
    return {
      visible: true,
      position:
        1.5 +
        strongEaseInOut(progressInWindow(progress, CONSUME_START, APPLY_START)),
    };
  }

  return {
    visible: true,
    position:
      2.5 +
      strongEaseInOut(
        progressInWindow(progress, APPLY_START, SYNCHRONIZED_START),
      ),
  };
}
```

Those half-step values are gaps between actors, not actor centers:

- `0.5`: MySQL ↔ Brooklin
- `1.5`: Brooklin ↔ Kafka
- `2.5`: Kafka ↔ Gobblin
- `3.5`: Gobblin ↔ Opal

The capture phase therefore materializes the event in the first gap instead of
showing MySQL → Brooklin. Every later phase glides from one gap to the next,
passing through the actor that supposedly received the event.

The component forwards that scalar directly to CSS:

```tsx
// src/components/IncrementalEtlFlowDemo.tsx:44-49,122-135 — current
const eventStyle: EtlEventStyle = {
  "--etl-event-position": snapshot.event.position,
  opacity: snapshot.event.visible ? 1 : 0,
};

<span
  className="etl-flow-event-position"
  data-moving={
    snapshot.event.visible &&
    snapshot.phase !== "capturing" &&
    snapshot.phase !== "synchronized"
      ? "true"
      : "false"
  }
  data-visible={snapshot.event.visible ? "true" : "false"}
  style={eventStyle}
>
  <code>id 42 · free → pro</code>
</span>;
```

CSS then restricts the token to a single straight axis:

```css
/* src/styles/app.css:2543-2556 — current */
.etl-flow-event-position {
  position: absolute;
  z-index: 2;
  inset: 16px auto auto 16px;
  display: flex;
  inline-size: 104px;
  block-size: 88px;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transform: translateY(calc(var(--etl-event-position) * 100%));
  transition: opacity 120ms var(--etl-ease-out);
  will-change: auto;
}
```

Changing only the easing will not solve this. Neither will bowing the token away
from a straight rail: that would still leave the route itself visually
continuous and anonymous. The annotated target is four persistent, rounded
connector paths—one between each adjacent pair of actors—with the current
payload traveling on the matching path.

## Target

Keep the existing vertical composition, 16-second finite lifecycle, actor order,
Replay behavior, and final state. Replace the gap-to-gap glide and continuous
rail with exactly four directly visible, actor-to-actor connector paths:

| Phase        | Source   | Destination | Meaning                                   |
| ------------ | -------- | ----------- | ----------------------------------------- |
| `capturing`  | MySQL    | Brooklin    | Brooklin captures the committed change    |
| `publishing` | Brooklin | Kafka       | Brooklin produces the event to Kafka      |
| `consuming`  | Kafka    | Gobblin     | Gobblin consumes the Kafka event          |
| `applying`   | Gobblin  | Opal        | Opal receives and applies the HDFS update |

The invariant is non-negotiable: MySQL becomes `pro` at commit; Opal stays
`free` through the complete final hop and changes to `pro` only when that hop
has landed and the model enters `synchronized`.

### Hop timing

Do not change `INCREMENTAL_ETL_DURATION_MS` or the seven equal phase windows.
Each handoff keeps its existing 2,285.714ms phase and divides it into:

- source dwell: first `25%`, about `571.429ms`;
- curved flight: middle `50%`, about `1,142.857ms`; and
- destination dwell: final `25%`, about `571.429ms`.

Use these exact normalized boundaries:

```ts
const HOP_TRAVEL_START = 0.25;
const HOP_TRAVEL_END = 0.75;
```

Use the existing `strongEaseInOut` function for the middle flight. Do not ease
the source or destination dwell. Do not add artificial delays outside the
existing 16-second narrative.

### Model contract

Replace the anonymous `position` scalar with inspectable handoff semantics:

```ts
export type IncrementalEtlEventState =
  | "hidden"
  | "departing"
  | "traveling"
  | "arrived";

export type IncrementalEtlEvent = {
  visible: boolean;
  handoffIndex: 0 | 1 | 2 | 3;
  from: IncrementalEtlActor;
  to: IncrementalEtlActor;
  payload: "commit" | "CDC" | "Kafka" | "HDFS";
  hopProgress: number;
  state: IncrementalEtlEventState;
};
```

Define the ordered legs directly beside the existing phase-boundary constants:

```ts
const INCREMENTAL_ETL_HANDOFFS = [
  {
    index: 0,
    phase: "capturing",
    from: "mysql",
    to: "brooklin",
    payload: "commit",
    start: CAPTURE_START,
    end: PUBLISH_START,
  },
  {
    index: 1,
    phase: "publishing",
    from: "brooklin",
    to: "kafka",
    payload: "CDC",
    start: PUBLISH_START,
    end: CONSUME_START,
  },
  {
    index: 2,
    phase: "consuming",
    from: "kafka",
    to: "gobblin",
    payload: "Kafka",
    start: CONSUME_START,
    end: APPLY_START,
  },
  {
    index: 3,
    phase: "applying",
    from: "gobblin",
    to: "opal",
    payload: "HDFS",
    start: APPLY_START,
    end: SYNCHRONIZED_START,
  },
] as const;
```

`hopProgress` is always clamped to `0…1`:

- before capture: hidden MySQL → Brooklin event at `0`;
- source dwell: visible at `0`, state `departing`;
- flight: eased `0 → 1`, state `traveling`;
- destination dwell: visible at `1`, state `arrived`;
- synchronized: hidden Gobblin → Opal event at `1`.

For the selected handoff, derive its local phase progress and state exactly as
follows:

```ts
const phaseProgress = progressInWindow(progress, handoff.start, handoff.end);
const state =
  phaseProgress < HOP_TRAVEL_START
    ? "departing"
    : phaseProgress < HOP_TRAVEL_END
      ? "traveling"
      : "arrived";
const hopProgress =
  state === "departing"
    ? 0
    : state === "arrived"
      ? 1
      : strongEaseInOut(
          progressInWindow(phaseProgress, HOP_TRAVEL_START, HOP_TRAVEL_END),
        );
```

At every phase boundary, the new hop must begin at the exact actor center where
the previous hop ended. There must be no discontinuity when:

- MySQL → Brooklin becomes Brooklin → Kafka;
- Brooklin → Kafka becomes Kafka → Gobblin; or
- Kafka → Gobblin becomes Gobblin → Opal.

Add model assertions for each hop's start, midpoint, arrival, and next-leg
boundary. Use `toBeCloseTo(0.5)` for midpoint progress and exact equality at `0`
and `1`.

Keep the existing state-mutation assertions. In particular, retain the test that
Opal is `free` at `INCREMENTAL_ETL_DURATION_MS - 1` and `pro` only in
`COMPLETE_INCREMENTAL_ETL_SNAPSHOT`.

### Spatial motion

Remove `.etl-flow-rail`. Its replacement is an absolutely positioned
`.etl-flow-handoffs` layer in the existing first grid column. It contains four
stacked inline SVGs, each drawing one rounded connector between adjacent actor
centers. All four connectors are present on the initial frame; the topology must
not depend on catching a moving token.

Use this exact desktop geometry for every connector segment:

```tsx
<svg
  className="etl-flow-handoff"
  viewBox="0 0 104 88"
  preserveAspectRatio="none"
  data-status={status}
>
  <path
    d="M 104 0 H 88 C 36 0 36 88 88 88 H 104"
    vectorEffect="non-scaling-stroke"
  />
</svg>
```

The short horizontal stubs touch the source and destination actor boundary. The
cubic curve bows into the open gutter and rejoins the next actor. Use
`fill: none`, `stroke-width: 1.5`, `stroke-linecap: round`, and
`stroke-linejoin: round`; there must be no arrowhead, path-drawing animation,
dash pattern, glow, or pulse.

Position the connector layer exactly from the existing route geometry:

| Layout                          | `inset-block-start` | `inset-inline-start` |   Width | Segment height |
| ------------------------------- | ------------------: | -------------------: | ------: | -------------: |
| Desktop                         |              `60px` |               `16px` | `104px` |         `88px` |
| `@container (max-width: 500px)` |              `64px` |               `12px` |  `82px` |        `104px` |

The desktop layer is therefore `352px` high and the mobile layer is `416px`
high. Keep the SVG `viewBox` unchanged on mobile and let
`preserveAspectRatio="none"` scale the same topology into the narrower, taller
segment. This produces the same rounded connector grammar without introducing a
second path definition for the static lines.

Give every connector a directly inspectable `data-status`:

- `waiting`: later than the current handoff;
- `active`: matches `snapshot.event.handoffIndex` while the event is visible;
- `complete`: earlier than the current handoff, or every connector when the
  snapshot is synchronized.

Use the existing stage tokens:

| Connector state | Stroke                                                |
| --------------- | ----------------------------------------------------- |
| `waiting`       | `var(--etl-line-strong)` (`#696862`) at `0.6` opacity |
| `active`        | `var(--etl-event)` at full opacity                    |
| `complete`      | `var(--etl-line-strong)` (`#696862`) at full opacity  |

Only `stroke` and `opacity` may transition, for `160ms` with
`var(--etl-ease-out)`. The active semantic color identifies the live handoff;
completed paths settle back to strong neutral instead of leaving a colored
trail.

Derive those states without a second timeline:

```ts
const status =
  snapshot.isComplete || index < snapshot.event.handoffIndex
    ? "complete"
    : snapshot.event.visible && index === snapshot.event.handoffIndex
      ? "active"
      : "waiting";
```

Render one HTML payload above the SVG layer. Its outer `.etl-flow-event-leg` has
the same dimensions as one connector and moves atomically to the selected
segment:

```tsx
style={{
  "--etl-handoff-index": snapshot.event.handoffIndex,
  "--etl-hop-progress": snapshot.event.hopProgress,
  opacity: snapshot.event.visible ? 1 : 0,
}}
data-from={snapshot.event.from}
data-to={snapshot.event.to}
data-hop-state={snapshot.event.state}
data-moving={snapshot.event.state === "traveling" ? "true" : "false"}
```

Use `transform: translateY(calc(var(--etl-handoff-index) * 100%))` on that outer
leg with no transition. At a phase boundary the previous path's endpoint and the
next path's start point are the same actor-center coordinate, so changing the
segment and resetting progress from `1` to `0` must produce no visible jump.

The inner `.etl-flow-event-payload` follows the full connector, including both
stubs, with CSS Motion Path:

```css
.etl-flow-event-payload {
  offset-path: path("M 104 0 H 88 C 36 0 36 88 88 88 H 104");
  offset-distance: calc(var(--etl-hop-progress) * 100%);
  offset-anchor: 100% 50%;
  offset-rotate: 0deg;
}
```

At `@container (max-width: 500px)`, override only the motion path with the
scaled coordinates:

```css
offset-path: path("M 82 0 H 69.385 C 28.385 0 28.385 104 69.385 104 H 82");
```

The payload's right edge follows the path so it docks against each actor without
covering the logo. Keep it upright. Use one restrained two-line capsule:

```text
id 42
commit | CDC | Kafka | HDFS
```

The second line comes from the selected handoff's `payload` field and changes
only at the actor-center phase boundary. Target a maximum `50×28px` capsule on
desktop and `44×26px` on mobile so it remains readable without dominating the
connector. Keep the existing event background/ink tokens; do not add another
semantic color.

Request-animation-frame remains the only progress driver. Do not add a CSS
transition or keyframe to `offset-distance` or to the leg transform. Do not add
`offset-distance` to `will-change`; keep it `auto` while settled, and retain the
existing traveling-only `will-change: transform, opacity` hint only if rendered
profiling shows that it prevents stutter. Keep the existing `120ms` opacity
transition with `cubic-bezier(0.23, 1, 0.32, 1)`.

### Synchronized actor language

The per-actor secondary label must describe work in progress while its actor is
active, not claim completion before the hop lands. Update `detailForActor` to
use the supplied `status` with these exact labels:

| Actor    | Waiting                | Active                  | Complete           |
| -------- | ---------------------- | ----------------------- | ------------------ |
| MySQL    | `Source row`           | `Committing update`     | `Committed update` |
| Brooklin | `Awaiting commit`      | `Capturing change`      | `Captured change`  |
| Kafka    | `Awaiting produce`     | `Receiving event`       | `Published event`  |
| Gobblin  | `Awaiting Kafka event` | `Consuming and writing` | `Written to HDFS`  |
| Opal     | `Offline row`          | `Applying update`       | `Applied update`   |

Do not change the actor names, roles, technical values, figure title,
description, final announcement, or quantified final summary.

## Repo conventions to follow

- `src/components/DataRetentionCascadeDemo.tsx:117-140` is the closest local SVG
  route-layer exemplar. It uses an inline SVG, `preserveAspectRatio="none"`,
  semantic status attributes, and `vectorEffect="non-scaling-stroke"`.
- `src/components/DataRetentionCascadeDemo.tsx:289-315` is the closest local
  payload-motion exemplar. It derives presentation from deterministic model
  progress and exposes `data-moving` from semantic event status.
- `src/styles/app.css:2038-2060` keeps `will-change` at `auto` while settled and
  enables it only for a traveling event. Follow the same performance boundary.
- `src/components/IncrementalEtlFlowDemo.tsx:328-403` already owns finite
  request-animation-frame playback, the 100ms frame-delta cap, visibility
  pause/resume, live motion-preference changes, and cleanup. Preserve this
  lifecycle.
- `src/demos/incremental-etl-flow/model.test.ts:89-139` already proves the Opal
  application boundary. Extend these tests; do not weaken or replace them.
- Component styling remains in the canonical
  `/* Finite online-to-offline incremental ETL flow */` section of
  `src/styles/app.css`. Edit that section in place.
- The figure remains a `workbench` with one `data-graphic-stage="flush"`, Replay
  outside the stage, and an `aria-hidden` animated stage backed by static
  descriptive text.

## Steps

1. In `src/demos/incremental-etl-flow/model.ts`, replace the event `position`
   field with the handoff contract above. Add the four handoff specifications,
   exact `0.25`/`0.75` travel boundaries, and deterministic dwell/travel/arrival
   derivation without changing the global phase boundaries or duration.
2. In `src/demos/incremental-etl-flow/model.test.ts`, update initial, decisive
   middle, and complete snapshot expectations for the new event shape. Add a
   table-driven test covering the start, midpoint, arrival, and continuous phase
   boundary for all four hops.
3. In `src/components/IncrementalEtlFlowDemo.tsx`, replace the straight rail
   with four stacked inline SVG connector segments. Derive each connector's
   waiting/active/complete status from `handoffIndex`, expose the event's
   `data-from`, `data-to`, and `data-hop-state`, and render one compact two-line
   payload whose qualifier comes from the selected handoff.
4. In the same component, make `detailForActor` use the actor `status` and exact
   waiting/active/complete labels specified above.
5. In the canonical ETL section of `src/styles/app.css`, remove the continuous
   rail styles; implement the exact desktop/mobile connector-layer geometry,
   rounded path states, segment selection, and CSS Motion Path above. Preserve
   the existing stage tokens, opacity timing, responsive row sizes, and
   reduced-motion information.
6. Review `src/demos/incremental-etl-flow/component.test.tsx`. Existing
   lifecycle, actor-order, accessibility, and cleanup assertions must continue
   to pass. Change it only if an assertion directly depends on one of the exact
   active labels above; do not broaden the test refactor.

## Boundaries

- This plan was authored against a dirty working tree at commit `a57da4d`.
  `IncrementalEtlFlowDemo.tsx` and `app.css` are modified, and
  `src/demos/incremental-etl-flow/` is untracked. These are user-owned changes.
  Preserve their current content except for the edits explicitly required here.
- Do not touch the concurrent optimistic-locking migration, Data Retention
  changes, icon changes, deleted draft, or any unrelated file.
- Do not change `INCREMENTAL_ETL_DURATION_MS`, the eight phase names, phase
  boundaries, actor order, domain values, palette tokens, icons, row sizes,
  stage dimensions, Replay control, or article prose.
- Use the existing left route column for the connector layer. Do not widen the
  figure or add a page-level lane, control, legend, narration bar, dependency,
  spring, keyframe, ambient pulse, bounce, or scale effect.
- Do not animate layout properties. Drive only the payload's `offset-distance`
  and opacity, the connector's stroke/opacity state transition, and the existing
  real state-change properties.
- Do not make Opal `pro` during the final flight or landing dwell. The mutation
  remains at the transition to `synchronized`.
- Reduced motion must continue to render the complete state immediately with the
  transport token hidden. Keep all four rounded connectors visible in their
  completed strong-neutral state so the causal topology remains legible without
  travel.
- Do not stage, commit, push, or deploy.
- If the current source no longer matches the excerpts and structure cited in
  this plan, stop and report the drift instead of improvising.

## Verification

- **Mechanical**:
  1. Run
     `deno task test src/demos/incremental-etl-flow/model.test.ts src/demos/incremental-etl-flow/component.test.tsx`;
     expect all focused tests to pass.
  2. Run `deno task typecheck`; expect zero TypeScript errors.
  3. Run `deno task pre-commit`; expect formatting, typecheck, and the complete
     test suite to pass.
  4. Run `git diff --check`; expect no whitespace errors.
- **Rendered browser check**:
  1. Reuse the active Portless server and open
     `https://wcygan.localhost/change-data-capture?inspect=graphics` at
     `1440×900`.
  2. Replay once and record the complete 16-second sequence. Scrub the recording
     frame by frame; this is request-animation-frame motion, so do not claim
     DevTools Animations playback controls slowed it.
  3. Before Replay, and again on the first replay frame, confirm all four
     rounded paths are already visible: MySQL → Brooklin, Brooklin → Kafka,
     Kafka → Gobblin, and Gobblin → Opal. There must be no continuous vertical
     rail.
  4. Confirm every path's two endpoints meet the left actor boundary at the
     vertical centers of its source and destination within `1px`. Its short
     horizontal stubs must meet the actor border without a gap or overlap, and
     its rounded curve must remain wholly inside the existing route gutter.
  5. Confirm the first payload starts docked at MySQL at about `6.857s`, remains
     there until about `7.429s`, follows the MySQL → Brooklin connector
     centerline, lands at Brooklin around `8.571s`, and remains there until the
     publishing phase. Sample the source, curve midpoint, and destination; the
     payload anchor must remain within `1px` of the rendered SVG path.
  6. Confirm the next three handoffs begin at the exact endpoint where the
     preceding handoff landed. The compact payload qualifier must change at that
     landing boundary in this order: `commit` → `CDC` → `Kafka` → `HDFS`. No
     boundary may jump, reverse, cross an actor without landing, or briefly show
     the wrong qualifier.
  7. Confirm waiting connectors are quiet neutral, only the current connector is
     semantic event color, and completed connectors settle to strong neutral. In
     the final frame, all four paths remain visible and neutral while the
     payload is hidden.
  8. Confirm the status bar, active actor, event handoff, and secondary actor
     label describe the same phase. In particular, active labels use
     `Capturing`, `Receiving`, `Consuming`, and `Applying`, not premature
     completed language.
  9. During the complete Gobblin → Opal flight and destination dwell, confirm
     MySQL is `pro` and Opal is still `free`. Opal may switch to `pro` only
     after the hop completes and the figure enters `synchronized`.
  10. Confirm the final state persists, the event is hidden, and Replay restores
      the exact initial frame without a stale token transform.
  11. Repeat at `390×844`. Confirm the scaled connector endpoints still meet the
      actor borders within `1px`; the payload remains on the curve and does not
      intersect the stage edge, actor logos, labels, or values; and page-level
      horizontal overflow remains zero.
  12. Toggle normal → reduced → normal motion. Reduced motion must immediately
      show the synchronized conclusion with no payload travel and all four
      completed connector paths visible; returning to normal must restart
      coherently.
  13. Confirm Replay remains at least `44×44px`, keyboard focus is visible, the
      figure has the expected workbench/key/label and exactly one authored
      stage, and browser errors are empty.
- **Done when**: four persistent rounded actor-to-actor paths make the topology
  immediately visible; the compact labeled payload advances along exactly one
  matching path at a time; every handoff has a readable departure, curved
  flight, payload change, and landing; model tests prove continuity and the Opal
  boundary; desktop/mobile geometry is collision free; Replay and reduced motion
  remain coherent; and the repository gate passes.

# 004 — Preserve 2PC message progress through interruptions

- **Status**: TODO
- **Commit**: 575b513
- **Severity**: MEDIUM
- **Category**: Interruptibility; accessibility
- **Estimated scope**: 2 source files, about 40–70 changed lines

## Problem

The two-phase prepare demo loses continuity when motion is interrupted. In
`src/demos/two-phase-prepare/Scene.tsx:175-191`, every `active` change resets
the message timer. When the demo becomes inactive, the message is snapped to its
destination at `y = 0.75`; resuming starts the animation over at the sender.
Pause, document visibility, offscreen visibility, and reduced motion can
therefore make a packet jump to a participant and then travel backward.

Pause also fails immediately after a manual step. The shell's
`src/components/TwoPhasePrepareDemo.tsx:52-53` treats
`transitioning` as active even when `playing` is false. Step starts that
one-shot transition at lines 203-210, while Pause only toggles `playing` at
lines 195-201. Clicking Pause during the 1.3-second transition does not stop
the packet.

## Target

- Keep packet progress and position stable while paused, offscreen, or while
  the document is hidden; resume from the same point without a jump.
- Make Pause stop both autoplay and a one-step animation immediately.
- Keep reduced-motion stepping discrete and understandable. A static in-flight
  cue must remain on the link rather than appearing at the receiver before its
  status says it arrived.
- Preserve the current phase order, vote timing, 1,050ms packet travel, 180ms
  participant stagger, and 1,700ms phase cadence unless a rendered feel check
  shows a concrete problem.

## Repo conventions to follow

- Keep the model/playback state in the React shell and use refs for per-frame
  progress; do not write React state every frame.
- The Fiber scene uses `frameloop="demand"`; invalidate only while a packet is
  moving and after meaningful state changes.
- Follow reduced-motion, visibility, and lazy-scene patterns already used by
  article demos such as `src/components/FailureDetectorDemo.tsx` and
  `src/demos/shared/looping-canvas-engine.ts` where applicable.

## Steps

1. Replace the `started` reset-on-activation logic with progress state that can
   be frozen and resumed without changing packet coordinates.
2. Separate explicit play intent from a one-shot Step transition so Pause
   cancels either immediately. Clear pending timers when playback is paused or
   the demo becomes inactive.
3. Define a stable reduced-motion representation for in-transit messages and
   keep the accessible phase/status copy synchronized with the visible packet.

## Boundaries

- Do not change the protocol states, participant votes, node positions, camera,
  link geometry, or transaction outcome logic.
- Do not add dependencies or change unrelated demos.

## Verification

- **Mechanical**: add focused tests for pause/resume progress preservation,
  immediate pause after Step, hidden-document/offscreen suspension, and reduced
  motion; run `bun run pre-commit`.
- **Feel check**: on `/distributed-transactions`, pause each packet midway and
  resume; it should continue in the same direction from the same point. Click
  Pause immediately after Step; the packet should stop immediately. Hide and
  restore the tab or scroll the figure out and back into view; progress should
  be preserved. Under reduced motion, Step should advance the same states
  without a packet appearing prematurely at its destination.
- **Done when**: no interruption teleports or rewinds a packet, Pause always
  takes effect immediately, and normal/reduced-motion states communicate the
  same protocol phase.

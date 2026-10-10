# 006 — Stop scheduling inactive homepage wordmark frames

- **Status**: TODO
- **Commit**: 575b513
- **Severity**: MEDIUM
- **Category**: Performance; accessibility
- **Estimated scope**: 1 source file, about 20–40 changed lines

## Problem

The homepage wordmark loop in `src/components/IdentityCard.tsx:366-374`
requests another animation frame on every callback, including when the canvas
is offscreen or `prefers-reduced-motion` is enabled. Drawing is skipped in
those states, but the browser still wakes the callback continuously. The loop
starts unconditionally at line 404. This creates background work when the
animation is not useful to the reader.

## Target

- Schedule frames only when the wordmark is visible and motion is allowed.
- Cancel a pending frame when it leaves view or reduced motion is enabled.
- Restart cleanly when it re-enters view or motion is allowed again, retaining
  the settled readable frame under reduced motion.
- Preserve pointer response, resize handling, and the existing particle
  behavior while active.

## Repo conventions to follow

- Reuse the scheduling and visibility approach from
  `src/demos/shared/looping-canvas-engine.ts` where it fits this component.
- Keep the wordmark decorative (`aria-hidden`) and retain its settled frame.
- Cancel pending animation work and disconnect observers/listeners on unmount.

## Steps

1. Introduce one scheduler that requests a frame only when visible and motion
   is enabled; avoid self-scheduling from inactive callbacks.
2. Start/cancel the scheduler from intersection and reduced-motion changes.
3. Preserve resize and pointer redraws without restarting an inactive loop.

## Boundaries

- Do not change homepage identity layout, model media, particle design, or
  accessibility labeling.
- Do not add dependencies or alter other Canvas animations.

## Verification

- **Mechanical**: add focused tests for scheduling, cancellation, visibility,
  preference changes, and cleanup; run `bun run pre-commit`.
- **Feel check**: inspect `/` with normal and reduced motion. Confirm the
  wordmark animates while visible, settles while reduced motion is enabled,
  responds again when motion is restored, and does not schedule frames while
  scrolled away.
- **Done when**: no animation frame remains queued during offscreen or reduced
  motion states, and the visible/reduced-motion wordmark remains readable.

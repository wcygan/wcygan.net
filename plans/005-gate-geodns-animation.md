# 005 — Gate GeoDNS playback by visibility and motion preference

- **Status**: TODO
- **Commit**: 575b513
- **Severity**: MEDIUM
- **Category**: Interruptibility; accessibility
- **Estimated scope**: 2 source files, about 30–50 changed lines

## Problem

`src/components/GeoDnsRoutingDemo.tsx:77-96` starts a permanent 1.6-second
interval whenever the component mounts. It keeps updating the SVG when the
figure is offscreen or the document is hidden. It checks
`prefers-reduced-motion` only once; changing that preference while the page is
open does not stop playback. This spends work outside the reader's view and
continues motion after the reader requests reduced motion.

## Target

- Advance the GeoDNS sequence only while the figure is visible, the document
  is visible, and reduced motion is not requested.
- Preserve the current step when playback is suspended and resume from that
  step when motion is allowed again.
- When reduced motion is enabled, retain a useful static GeoDNS state and all
  explanatory content and controls.

## Repo conventions to follow

- Use `IntersectionObserver`, `visibilitychange`, and a live
  `matchMedia("(prefers-reduced-motion: reduce)")` listener, as demonstrated
  by other article demos.
- Keep the snapshot derived from `stepIndex` via
  `deriveGeoDnsSnapshot`; avoid duplicating phase logic in the component.

## Steps

1. Add figure visibility, document visibility, and current motion preference
   state with matching listener/observer cleanup.
2. Start or stop the interval from those states without resetting `stepIndex`.
3. Choose and document the static reduced-motion step, keeping the state
   description accessible.

## Boundaries

- Do not alter GeoDNS route geometry, protocol phases, phase durations, or the
  derived snapshot model.
- Do not add dependencies or change other autoplay demos.

## Verification

- **Mechanical**: add component tests for interval gating, preference changes,
  cleanup, and preserved step; run `bun run pre-commit`.
- **Feel check**: inspect `/multi-region-data` with the figure onscreen,
  offscreen, and after hiding/restoring the tab. Toggle reduced motion while
  playback is active; verify it stops and retains a meaningful state. Confirm
  it resumes from its prior step when allowed.
- **Done when**: there is no timer-driven state update while hidden, and
  reduced-motion preference changes take effect without reloading.

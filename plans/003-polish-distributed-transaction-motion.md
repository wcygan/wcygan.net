# 003 — Clarify transaction event motion

- **Status**: DONE
- **Commit**: 21d6a60
- **Severity**: MEDIUM
- **Category**: Purpose, physicality, causality
- **Scope**: Distributed transaction shell, scene, presentation helpers, model, tests

## Problem

The five scenes in `src/posts/distributed-transactions.draft.mdx` share a
renderer and event clock. The shell gives every event 2,200ms, leaving local
operations visually frozen. Placement's Separate scenario drops message data
while copying the 2PC frames. The opening layout snaps between one and two
databases. The 3PC recovery query and response travel simultaneously.

## Target

Polish in article order: independent transfer, placement, 2PC, 3PC, Spanner.
Use true cylinders for databases and stable blue/violet group identities.
Pending, prepared, committed, aborted, and offline remain distinct in text.
Retain the warm editorial canvas and the existing lazy WebGL/HTML fallback.

1. Interpolate the opening account positions and cylinder separation with the
   shared progress clock, keeping the camera fixed.
2. Preserve placement traffic and align packets with cylinder surface ports.
3. Give local changes shorter feedback, retaining readable message and explicit
   commit-wait beats. Use refs and demand rendering, never per-frame React state.
4. Sequence the 3PC recovery query before the response within its one event.
5. Distinguish replicated groups and leaders; preserve durable records when a
   replica fails and move the leader marker only when recovery settles.

## Boundaries

No change to protocol guarantees, failure assumptions, recovery gates, or final
balances. Preserve pause, offscreen/document visibility, camera state, and
discrete reduced-motion controls. No dependencies or unrelated demo edits.

## Verification

Check every scenario at 1440×900 and 390×844 for label fit, recognizable
cylinders, contrast, and causal packet motion. Test placement message retention,
event timing, query/reply sequencing, pause/resume, and reduced motion. Run
`deno task pre-commit` and `deno task build`. Record final completion evidence.

## Implemented

The five models were polished and inspected in article order. Database bodies
use rounded cylinders with perimeter rings; rectangular slabs remain row data
and durable log records. Blue and violet identify the two account groups.
Prepared records use amber, pre-commit uses orange, commit uses green, and
abort uses red. Each state retains direct text. See the complete
[before/after palette and contrast audit](003-distributed-transaction-palette.md).

The opening scene smoothly separates its databases and account rows. Placement
retains its Prepare, Yes, and Commit packets. Local events settle in 900ms with
one restrained activity ring; network delivery uses 2,200ms, and the two-beat
3PC recovery exchange uses 3,500ms. Spanner's explicit commit wait retains
2,200ms. These are teaching durations, not database latency measurements.

Packet routes meet database surfaces and detour around intervening replicas.
Spanner labels sit beside the six cylinders, with account balances below them.
A small flag marks each leader. Failed cylinders fade and acquire a cross;
their durable records remain visible. Leadership changes only when recovery
settles. No protocol outcome or recovery assumption changed.

## Completion evidence

- All 11 scenarios exercised at 1440×900 and 390×844 in the MDX article.
  Final default-view labels have no clipping or overlaps, the page has no
  horizontal overflow, and every control is at least 44×44px.
- Intermediate prepared, interrupted, pre-commit, and leader-recovery states
  inspected. The mobile Spanner balance/replica overlap found during measurement
  was corrected and all three Spanner scenarios were rechecked.
- Normal motion, discrete reduced motion, pause, keyboard orbit, camera reset,
  native scrolling into view, and WebGL context-loss fallback exercised.
- 54 focused protocol, geometry, timing, and control tests pass. Full
  `deno task pre-commit`: 620 tests pass, along with formatting and typechecking.
- `deno task build` passes. Draft posts are excluded from publication by design;
  this draft's rendered checks used the isolated development preview at
  `https://transaction-polish.localhost/distributed-transactions`.
- Independent domain and implementation reviews found no actionable regression.
- All 14 palette tokens fit sRGB. Semantic labels meet WCAG AA; structural
  connectors exceed 3:1 against the stage. CSS owns the OKLCH values and resolves
  them to sRGB for Three.js materials.

# Migration Archetypes

Choose the archetype after reading the article, current implementation, and
rendered baseline. These are decision aids, not mandatory layouts.

## Label-Heavy Canvas To DOM/CSS

Use when the old Canvas mostly draws:

- named actors or services;
- SQL, records, rows, logs, or JSON;
- short moving payloads;
- status narration and counters; or
- a small fixed number of lanes or steps.

Move domain state into a deterministic model and render labels as DOM. Use
transforms for the few moving payloads and measure their route with CSS geometry
or refs only when necessary. Typical accepted references are CDC propagation,
WAL/Kafka, incremental ETL, and redo recovery.

Delete the old engine/renderer only after import and route checks pass.

## Retained Canvas With An Editorial Shell

Use when Canvas materially helps:

- dense or continuous geometry;
- many moving objects;
- a simulation whose spatial relationships are the lesson;
- custom drawing that would create excessive DOM/SVG nodes; or
- high-frequency redraw where DOM state would be noisy.

Keep the renderer pure: draw from a typed snapshot and named geometry. Move
title, deck, controls, direct status, and final takeaway to semantic DOM outside
the Canvas. Replace modulo playback with a finite engine when the narrative has
a conclusion. Give reduced motion a useful settled snapshot.

Do not keep Canvas merely because the old file is large.

## Interactive Canvas Or Map

Use when the reader directly changes sliders, presets, map position, or another
input and no narrative autoplay is needed.

Preserve the interaction model. Migrate the shell, tokens, labels, control
targets, metadata, focus, responsive containment, and reduced-motion behavior.
Do not bolt Replay onto a state explorer that has no temporal story.

For Leaflet, motion preference changes may require full instance recreation;
follow current map lifecycle patterns rather than mutating initialization
options in place.

## Discrete DOM/SVG State Explorer

Use when the demo already uses tabs, toggles, presets, or a small number of
discrete states.

Keep state changes reader-controlled after interaction. Remove decorative
autoplay if it competes with inspection. Use short transform/opacity feedback,
preserve the selected state under reduced motion, and ensure every state is
reachable by keyboard.

## Comparison Migration

When two approaches share one input:

1. Align the same actors and boundary.
2. Keep the efficient or settled path visible.
3. Let the slower or failure-prone path expose its extra work.
4. End with an exact count, latency, retry, or state comparison.

Do not turn each side into a dashboard card with its own legend and status
chrome. The shared input and repeated geometry should carry the comparison.

## Ordered Replay Migration

When records, messages, retries, or state mutations are ordered:

1. Keep the source order visible.
2. Mark exactly one current record or handoff.
3. Persist the applied prefix.
4. Update derived state only after the current record applies.
5. Hold the final reconstructed state.

Test every boundary that could update downstream state too early. The commit-log
recovery ledger is the canonical detailed example.

## Cascade Migration

When one event causes several downstream effects:

1. Keep the initiating event visible.
2. Show each consequence in causal order.
3. Distinguish pending, active, and settled structurally.
4. Keep prior consequences settled while later ones proceed.
5. End with a concise count or invariant.

Avoid duplicating the same data into several floating cards. A ledger, route, or
stack with persistent state usually teaches the cascade more clearly.

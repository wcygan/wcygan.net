# Failure Detectors demo reference

Read this when extending or debugging the Failure Detectors scene or building a
continuous heartbeat simulation. This demo focuses on the evidence that triggers
an election; it does not simulate voting, log replication, or a complete failure
detector protocol.

## Source map

| File                                             | Responsibility                                                                                |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `src/posts/failure-detectors.mdx`                | Heartbeat and Raft context, sources, and demo import                                          |
| `src/components/FailureDetectorDemo.tsx`         | Controls, lazy loading, visibility, fallback, keyboard camera commands, and diagnostic dialog |
| `src/demos/failure-detectors/types.ts`           | Typed actions and separate transport, packet, and follower-observation state                  |
| `src/demos/failure-detectors/model.ts`           | Seeded randomness, event ordering, timers, and injected faults                                |
| `src/demos/failure-detectors/playback.ts`        | Continuous simulation clock and event/action notifications                                    |
| `src/demos/failure-detectors/presentation.ts`    | Playback rate, timer formatting, and summaries of evidence and injected faults                |
| `src/demos/failure-detectors/Scene.tsx`          | Node/link layout, hearts, labels, and responsive camera presets                               |
| `src/demos/failure-detectors/model.test.ts`      | Determinism, faults, event ordering, and terminal outcomes                                    |
| `src/demos/failure-detectors/playback.test.ts`   | Clock sampling, bounded state, and playback lifecycle                                         |
| `src/demos/failure-detectors/component.test.tsx` | Component actions, reset, and fallback behavior                                               |
| `src/styles/app.css` (`.fd-*`)                   | Stage, countdowns, link state, diagnostics, and labels                                        |

Keep network transport, in-flight packets, and follower-observed evidence as
separate concepts. The model owns event ordering and outcomes; the renderer
projects that state into moving hearts, timers, and labels.

## Demonstrated behavior and invariants

- B is the leader. Every other node is a follower with its own election timer.
  The default scene has five identical cubes; the node-count control supports
  two through five nodes. Followers are evenly spaced around B.
- Timers use independent seeded randomness. A received heartbeat draws a fresh
  timeout from 3–6 simulation seconds by default. Silence makes a follower
  suspect a failure; an injected crash is not automatically known to it.
- Red hearts represent traveling heartbeats and move at half the simulation
  clock's speed. Timer progress and packet motion use the same clock so they
  remain causally aligned at different display refresh rates.
- The controls are Reset, Crash leader, Cut random link, and Drop random
  heartbeat. A cut prevents delivery and removes packets already in flight on
  that link. Crashing the leader still permits heartbeats already sent to arrive.
- The first expired timer freezes timers and traveling hearts. The diagnostic
  explains the follower's local evidence. Dismissing it or hiding the page does
  not resume the run. Reset clears faults and history while retaining the
  configuration and camera.
- There is no Play/Pause, Step, timing slider, singled-out observer, or
  scoreboard. Do not add controls just because the model has actions.

## Playback, rendering, and fallback

Schedule deterministic simulation events in `model.ts` and expose a continuous
clock through `playback.ts`. Use that clock from `useFrame` for packet positions
and countdown updates; notify React on model events and user actions rather than
using a low-frequency React timer that quantizes motion. Preserve equal-time
event ordering and bounded state.

Share node-center coordinates between meshes, links, packet paths, and midpoint
fault labels. Reuse the procedural heart geometry and material, and discard
completed packets during active runs. Keep the OFFLINE label centered on its cut
link. Red marks an expired timer; keep the Expired text on a white backing for
readability.

Autoplay requires 25% stage visibility and a visible document. Reduced motion
suppresses traveling hearts but keeps timers, faults, and diagnostics. The HTML
fallback must still explain and operate the experiment without WebGL. Arrow keys
rotate or zoom; Home restores the responsive camera pose.

## Change checks

For model or playback changes, cover determinism, faults, equal-time ordering,
60 Hz and 120 Hz sampling, bounded state, lifecycle, reset, and terminal pause.
In the article, check each node count, combined faults, in-flight delivery,
diagnostic dismissal, Reset, reduced motion, WebGL fallback, and smooth heart
motion with two nodes. Confirm that visibility changes never resume a terminal
run.

---
name: 3d-modeling
description: Build, extend, or debug interactive 3D technical demos for wcygan.net using Three.js, React Three Fiber, and Drei. Use for Kafka Partitioning, Failure Detectors, and similar MDX scenes involving procedural models, camera controls, moving messages, and simulation playback.
---

# 3D modeling for technical articles

Build small, inspectable 3D explanations inside the existing blog. Choose the
working example that matches the behavior: **Kafka Partitioning** for routing
records into ordered logs, or **Failure Detectors** for continuous heartbeat
timing and injected network faults. Prefer procedural geometry when boxes,
paths, and labels can explain the system.

## Stack

| Layer            | Technology                              | Responsibility                                                    |
| ---------------- | --------------------------------------- | ----------------------------------------------------------------- |
| 3D engine        | `three`                                 | Geometry, materials, lights, cameras, colors, and WebGL rendering |
| React renderer   | `@react-three/fiber`                    | Declarative scene objects, `Canvas`, `useFrame`, and `useThree`   |
| Scene helpers    | `@react-three/drei`                     | `OrbitControls`, `Html`, `Edges`, and `Line`                      |
| Application      | React 19 and TypeScript                 | Controls, lifecycle, accessible status, and simulation state      |
| Blog integration | TanStack Start/Router and MDX           | SSR article routes and embedded React components                  |
| Styling          | Tailwind CSS 3 and `src/styles/app.css` | Article layout, controls, and HTML labels                         |
| Tooling          | Deno, Vite, and Vitest                  | Dependencies, development, builds, and model tests                |

Read `package.json` and `deno.lock` for current dependency versions before using
an API. Both examples use Three.js 0.186, Fiber 9, and Drei 10. Reuse the
installed stack; a standalone app, physics engine, or external modeling pipeline
is unnecessary for simple systems demos.

## Find working examples

Run these searches from the repository root:

```sh
rg -n '@react-three/(fiber|drei)|from "three"' src
rg -n 'KafkaPartitioningDemo|FailureDetectorDemo' src/components src/posts
rg --files src/demos/kafka-partitioning src/demos/failure-detectors
rg -n '\.(kafka|fd)-' src/styles/app.css
```

Read the owning post, component shell, and relevant backing modules together.

| Example                                    | Start here when working on                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Kafka Partitioning · `/kafka-partitioning` | Keyed versus round-robin routing, partition-local offsets, discrete send/append steps, vertex colors, and log layouts                  |
| Failure Detectors · `/failure-detectors`   | Event-driven simulation, smooth packet motion, independent node timers, random faults, radial layouts, and a frozen diagnostic outcome |

### Kafka Partitioning

| File, relative to repository root            | What to learn                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/posts/kafka-partitioning.mdx`           | Short article introduction, source links, and component import                 |
| `src/components/KafkaPartitioningDemo.tsx`   | Controls, lazy scene loading, playback, visibility, reduced motion, and status |
| `src/demos/kafka-partitioning/model.ts`      | Pure routing and snapshot calculations independent of rendering                |
| `src/demos/kafka-partitioning/model.test.ts` | Domain invariants: key affinity, partition coverage, and local offsets         |
| `src/demos/kafka-partitioning/Scene.tsx`     | Procedural boxes, vertex colors, lighting, labels, camera, and moving records  |
| `src/styles/app.css` (`.kafka-*`)            | Scoped stage, controls, and transparent scene labels                           |

The demo follows nine records using keyed Murmur2 routing or a round-robin
counter. It defaults to three partitions (adjustable from one to five) and 4×
speed. Step animates one record and appends it; Play/Pause, Replay, speed, and
Top view are available. Autoplay requires 50% visibility. Reduced motion starts
at the completed logs and supports discrete steps after Replay.

Changing partition count recomputes routing and offsets at the current step.
This is a hypothetical rerun, not migration of records already stored in Kafka.

### Failure Detectors

| File, relative to repository root                               | What to learn                                                                                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/posts/failure-detectors.mdx`                               | Heartbeat and Raft context, source links, and component import                                                                                |
| `src/components/FailureDetectorDemo.tsx`                        | Lazy loading, visibility, HTML fallback, four fault/reset controls, node-count slider, keyboard camera commands, and native diagnostic dialog |
| `src/demos/failure-detectors/types.ts`                          | Typed actions and separate transport, packet, and follower-observation state                                                                  |
| `src/demos/failure-detectors/model.ts`                          | Seeded randomness, event ordering, independent election timers, faults, and stopping at the first timeout                                     |
| `src/demos/failure-detectors/playback.ts`                       | External store with a continuous clock and React notifications only at simulation events or actions                                           |
| `src/demos/failure-detectors/presentation.ts`                   | Shared playback rate, timer formatting, observed outcomes, and separate injected-fault summaries                                              |
| `src/demos/failure-detectors/Scene.tsx`                         | Shared node/link/heart coordinates, radial spacing, pastel cubes, procedural 3D hearts, countdown labels, and responsive camera presets       |
| `src/demos/failure-detectors/{model,playback,component}.test.*` | Determinism, faults, equal-time ordering, 60/120 Hz clock sampling, bounded state, lifecycle, reset, and fallback behavior                    |
| `src/styles/app.css` (`.fd-*`)                                  | Stage, countdowns, OFFLINE link labels, white-backed Expired text, and diagnostic styling                                                     |

This is a focused leader-heartbeat demo: B is the leader, and every other node
is a follower with its own randomized election timer. It illustrates the trigger
for an election; voting, log replication, and other detector protocols are outside
the current demo.

- Five identical cubes are shown by default; the node-count slider supports two
  through five total nodes. Followers sit at equal radii and angular spacing
  around B. Stable pastel colors identify nodes; red marks an expired timer.
- Red 3D hearts move at ½ speed using the same clock as the timers. A received
  heartbeat draws a fresh timeout from 3–6 simulation seconds by default. Injected faults
  stay separate from the follower's evidence: silence causes suspicion, not
  knowledge of a crash.
- The controls are Reset, Crash leader, Cut random link, and Drop random
  heartbeat. Cuts block delivery and remove in-flight packets on that link;
  a leader crash still permits already-sent heartbeats to arrive. Cut links are
  labeled OFFLINE at their midpoint. There is no singled-out observer, scoreboard,
  Play/Pause, Step, or timing-slider UI; model actions alone do not imply controls.
- The first expired timer freezes all timers and traveling hearts. A dismissible
  native dialog explains the local evidence and asks the reader to Reset.
  Dismissal and visibility changes never resume the settled experiment. Reset
  clears faults and history while retaining configuration and camera.
- Autoplay requires 25% stage visibility and a visible document. Reduced motion
  suppresses traveling hearts but retains working timers, faults, and diagnostics.
  The HTML fallback keeps the experiment usable without WebGL. Arrow keys rotate
  or zoom; Home restores the responsive default view.

Open the affected route on the active checkout's Portless URL. The primary
checkout normally serves `https://wcygan.localhost/kafka-partitioning` and
`https://wcygan.localhost/failure-detectors`; run `just dev` if needed and follow
its assigned URL.

Other visuals use different techniques. `IdentityCard.tsx` uses prerecorded
transparent model videos and posters; consult the sibling
`wcygan-identity-models/SKILL.md` when working on those assets.
`RotatingHotdog.tsx` and `RotatingPenguin.tsx` play ASCII frames from `src/data/`.
Search their MDX imports to locate usage; they are not live Three.js scenes.

## Implementation workflow

1. Read the owning article and identify the one behavior the scene explains.
   Define records, transitions, and settled outcomes in a pure model before
   coupling them to animation. Test meaningful domain invariants.
2. Keep the React shell in `src/components/` and the model, tests, and scene in
   `src/demos/<topic>/`. Follow existing MDX embedding conventions. Lazy-load
   WebGL behind a client-ready boundary, with Suspense and a useful error fallback.
3. Build the scene from simple geometry. Give objects enough vertical depth to
   read from oblique angles. Use restrained lighting and semantic color. The
   Kafka producer demonstrates interpolated vertex colors; its logs average the
   colors of reachable keys. Clamp normalized coordinates before palette indexing
   because floating-point rounding can put them outside the intended range.
4. Use `useFrame` and refs for moving meshes. Keep React state for meaningful
   simulation transitions, not every rendered frame. Put Fiber hooks inside
   `Canvas`. Memoize expensive geometry and clean up manually owned resources.
   For continuous traffic, follow Failure Detectors: schedule model events in
   `playback.ts` and read its continuous clock from `useFrame` for mesh positions
   and countdown refs. A low-frequency React timer must not quantize packet motion.
   Put components using Fiber hooks outside the DOM subtree rendered by `Html`;
   that subtree has a separate React root without Fiber context.
5. Prefer `frameloop="demand"` for a scene that settles. Invalidate while movement
   continues, and ensure controls can trigger rendering. Pause nonessential
   animation when offscreen or the document is hidden; clean up timers and observers.
6. Keep camera state independent of simulation progress. Separate explicit camera
   presets from responsive zoom calculations. Avoid dependencies on changing
   records or unstable size objects that reset the user's orientation. Treat
   “Top view” as a pose change that still permits dragging. Preserve full orbit
   and wheel zoom when the demo offers free exploration.
7. Keep one user action aligned with one meaningful event. In Kafka, Step starts
   a moving record and automatically appends it; one status sentence describes
   both phases. Apply playback speed to both movement and transition timing.
   Keep stable identities where changing configuration should preserve motion.
8. Derive reconfigured state from the model when the lesson calls for it. Kafka
   preserves progress while its partition slider recomputes destinations and
   offsets as a hypothetical rerun. Failure Detectors adds or removes followers
   without replacing surviving timers, packets, or history. Preserve each demo's
   semantics rather than resetting it whenever a control changes.
9. Use one set of node-center coordinates for meshes, connectors, message paths,
   and midpoint fault labels. Failure Detectors shows how this keeps hearts on
   their links while node count and camera angle change. Share heart geometry
   and material between packets and discard completed packets during active runs.

Playback defaults and controls are example-specific. Preserve Kafka's manual
pause intent and Failure Detectors' terminal pause across visibility changes.
Reduced motion must retain the same explanatory information.

## Article integration and verification

- Use a semantic `figure` with `data-graphic-frame="workbench"` for interactive
  demos and exactly one authored `data-graphic-stage` on the scene region.
- Keep controls outside the scene with 44px touch targets and visible keyboard
  focus. Provide meaningful HTML status independent of an `aria-hidden` canvas.
- Use Drei `Html` for scene-anchored labels. Kafka's producer, topic, offset, and
  partition labels have transparent backgrounds; record labels use light fills.
  Failure Detectors' Expired label uses a white background so red text stays
  readable over a red cube. Keep cut-link labels centered and inspect label
  collisions at every supported node count. Scope label CSS so article typography
  rules do not distort the scene.
- Keep Canvas fallback content inert. Detect renderer errors or context loss
  through the existing boundary/callback pattern; mounting fallback JSX must
  not itself mark a working WebGL scene unavailable.
- Inspect the actual article at 1440×900 and 390×844. Check overflow, readable
  labels, keyboard controls, reduced motion, loading failures, offscreen pause,
  replay, and final state. For camera or playback changes, also exercise rotation,
  zoom, and reconfiguration midflight. For Kafka, also test Top view followed by
  dragging and speed changes. For Failure Detectors, check all node counts,
  combined faults, the frozen scene after dismissing the diagnostic, Reset, and
  smooth heart motion with two nodes.
- Run `deno task pre-commit`. Run `deno task build` when changing routes, MDX,
  lazy-loading/SSR behavior, or prerendering. Report the checks and any limitations.

## Official documentation

Read only the sections relevant to the change; match APIs to installed versions.

- [Fiber introduction](https://r3f.docs.pmnd.rs/getting-started/introduction)
  and [first scene](https://r3f.docs.pmnd.rs/getting-started/your-first-scene):
  React scene composition and Three.js primitives.
- [Canvas](https://r3f.docs.pmnd.rs/api/canvas): renderer, camera, and fallback options.
- [Fiber hooks](https://r3f.docs.pmnd.rs/api/hooks): `useFrame`, `useThree`, and invalidation.
- [Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
  and [performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls):
  demand rendering, resource reuse, and frame-loop state management.
- [Drei controls](https://drei.docs.pmnd.rs/controls/introduction): camera interaction.
  Find other helpers in the [official Drei repository](https://github.com/pmndrs/drei)
  by their exported names (`Html`, `Edges`, `Line`).
- [Three.js BoxGeometry](https://threejs.org/docs/pages/BoxGeometry.html)
  and [Color](https://threejs.org/docs/pages/Color.html): procedural dimensions,
  color conversion, and interpolation. Use the Three.js documentation navigation
  for other geometry, material, and camera APIs.

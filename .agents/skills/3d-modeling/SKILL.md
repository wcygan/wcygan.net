---
name: 3d-modeling
description: Create, extend, review, or debug interactive 3D scenes for wcygan.net articles across any topic using Three.js, React Three Fiber, and Drei. Use when a lesson benefits from 3D geometry, spatial relationships, animation, or camera interaction; Kafka Partitioning and Failure Detectors are concrete examples.
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

## Project references

Read the reference for the branch being changed:

| Reference                                                                                        | Read when working on                                                                |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [`references/kafka-partitioning.md`](references/kafka-partitioning.md)                           | Keyed or round-robin routing, partition-local offsets, or discrete record playback  |
| [`references/failure-detectors.md`](references/failure-detectors.md)                             | Continuous heartbeat timing, injected faults, or terminal diagnostic state          |
| [`references/geometry-and-coordinate-systems.md`](references/geometry-and-coordinate-systems.md) | Creating procedural meshes, arranging objects, or connecting them with paths        |
| [`references/camera-and-framing.md`](references/camera-and-framing.md)                           | Choosing a projection, fitting the scene, or changing orbit and zoom behavior       |
| [`references/materials-lighting-and-color.md`](references/materials-lighting-and-color.md)       | Choosing surface materials, lighting, or color encodings                            |
| [`references/spatial-labels.md`](references/spatial-labels.md)                                   | Anchoring 3D labels, adding callouts, or resolving label collisions                 |
| [`references/article-integration.md`](references/article-integration.md)                         | MDX embedding, figure semantics, accessibility, fallbacks, or rendered verification |
| [`references/performance.md`](references/performance.md)                                         | Startup, geometry generation, WebGL setup, or scene loading                         |

## Find working examples

Run these searches from the repository root:

```sh
rg -n '@react-three/(fiber|drei)|from "three"' src
rg -n 'KafkaPartitioningDemo|FailureDetectorDemo' src/components src/posts
rg --files src/demos/kafka-partitioning src/demos/failure-detectors
rg -n '\.(kafka|fd)-' src/styles/app.css
```

Read the owning post, component shell, model, playback module, renderer, tests,
and scoped styles together. The project references above document the canonical
Kafka and Failure Detectors examples.

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
   `src/demos/<topic>/`. Follow existing MDX conventions. Lazy-load WebGL behind
   a client-ready boundary with Suspense and a useful error fallback.
3. Build with simple geometry, enough depth to read from oblique angles,
   restrained lighting, and semantic color.
4. Use `useFrame` and refs for moving meshes. Keep React state for meaningful
   simulation transitions, not every rendered frame. Put Fiber hooks inside
   `Canvas`. Memoize expensive geometry and clean up manually owned resources.
   Schedule simulation events separately from frame-by-frame mesh positions.
5. Prefer `frameloop="demand"` for a scene that settles. Invalidate while motion
   continues and ensure controls can trigger rendering. Pause nonessential
   animation when offscreen or the document is hidden; clean up timers and
   observers.
6. Keep camera state independent of simulation progress. Separate explicit
   camera presets from responsive zoom calculations. Avoid dependencies on
   changing records or unstable size objects that reset the user's orientation.
   Preserve full orbit and wheel zoom when the demo offers free exploration.
7. Keep each user action aligned with a meaningful event. Apply playback speed
   consistently to movement and transition timing. Preserve stable identities
   when configuration changes should retain motion.
8. Derive reconfigured state from the model when the lesson calls for it. Preserve
   surviving state instead of resetting the entire simulation without a domain
   reason.
9. Keep meshes, connectors, labels, and motion paths on shared coordinates.
   Reuse geometry and materials, and remove completed transient objects during
   active runs.

Keep playback behavior aligned with the lesson. Preserve pause and terminal
state across visibility changes. Reduced motion must retain the same explanatory
information.

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

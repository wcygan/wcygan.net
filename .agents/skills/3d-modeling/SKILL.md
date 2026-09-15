---
name: 3d-modeling
description: Build, extend, or debug interactive 3D technical demos for wcygan.net using Three.js, React Three Fiber, and Drei. Use for browser-rendered 3D scenes, procedural models, camera controls, or animated systems explanations embedded in MDX, including demos similar to Kafka Partitioning.
---

# 3D modeling for technical articles

Build small, inspectable 3D explanations inside the existing blog. Start with
the working Kafka example and adapt its boundaries to the new topic. Prefer
procedural geometry when boxes, paths, and labels can explain the system.

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
an API. The initial example uses Three.js 0.186, Fiber 9, and Drei 10. Reuse the
installed stack; a standalone app, physics engine, or external modeling pipeline
is unnecessary for simple systems demos.

## Find working examples

Run these searches from the repository root:

```sh
rg -n '@react-three/(fiber|drei)|from "three"' src
rg -n 'KafkaPartitioningDemo' src/components src/posts
rg --files src/demos/kafka-partitioning
rg -n 'kafka-' src/styles/app.css
```

Read the Kafka files together:

| File, relative to repository root            | What to learn                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/posts/kafka-partitioning.mdx`           | Article context, component import, and limits of the simulation                |
| `src/components/KafkaPartitioningDemo.tsx`   | Controls, lazy scene loading, playback, visibility, reduced motion, and status |
| `src/demos/kafka-partitioning/model.ts`      | Pure routing and snapshot calculations independent of rendering                |
| `src/demos/kafka-partitioning/model.test.ts` | Domain invariants: key affinity, partition coverage, and local offsets         |
| `src/demos/kafka-partitioning/Scene.tsx`     | Procedural boxes, vertex colors, lighting, labels, camera, and moving records  |
| `src/styles/app.css` (`.kafka-*`)            | Scoped stage, controls, and transparent scene labels                           |

Open `/kafka-partitioning` on the active checkout's Portless URL. The primary
checkout normally uses `https://wcygan.localhost/kafka-partitioning`; run
`just dev` if needed and follow its assigned URL.

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
   offsets as a hypothetical rerun. Its article explicitly distinguishes this
   from actual Kafka behavior; do not present that simulation as a real migration.

Kafka's current defaults are autoplay at 50% visibility, 4x speed, and three
partitions adjustable from one to five. These are example-specific choices,
not mandatory defaults for every new explanation. Preserve manual pause intent
across visibility changes. Reduced motion must retain a useful settled explanation.

## Article integration and verification

- Use a semantic `figure` with `data-graphic-frame="workbench"` for interactive
  demos and exactly one authored `data-graphic-stage` on the scene region.
- Keep controls outside the scene with 44px touch targets and visible keyboard
  focus. Provide meaningful HTML status independent of an `aria-hidden` canvas.
- Use Drei `Html` for scene-anchored labels. Kafka's producer, topic, offset, and
  partition labels have transparent backgrounds; record labels use light fills.
  Scope label CSS so article typography rules do not distort the scene.
- Inspect the actual article at 1440×900 and 390×844. Check overflow, readable
  labels, keyboard controls, reduced motion, loading failures, offscreen pause,
  replay, and final state. For camera or playback changes, also exercise rotation,
  zoom, top view followed by dragging, speed changes, and reconfiguration midflight.
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

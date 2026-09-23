# Geometry and coordinate systems

Read this when creating procedural meshes, arranging objects, or connecting
scene objects with paths. The scene is a geometric explanation: its coordinates
should make the system's relationships inspectable.

## Model positions once

- Give each demo an explicit coordinate convention and a small set of named
  dimensions, positions, and spacing functions. The axes can vary by lesson;
  make their meanings clear in the model or path module.
- Reuse the same coordinates for meshes, connectors, packet paths, and label
  anchors. Avoid recalculating a visual object's position independently in each
  renderer component.
- Keep simulation meaning in the pure model and derive world positions in a
  presentation or path module. Rendering should consume those values rather
  than become a second source of domain rules.
- Group objects when they share a meaningful transform. Prefer explicit world
  positions for relationships that must stay aligned as the scene changes.

Failure Detectors uses one node-position map for cubes, links, packets, and
labels. Kafka Partitioning derives partition lanes with `laneZ` and record
destinations with `destination`. Follow these patterns when model changes must
keep connected geometry aligned.

## Choose geometry for meaning

- Start with boxes, planes, cylinders, curves, and lines. Use a custom shape or
  `BufferGeometry` when its silhouette or vertex data explains something a
  primitive cannot.
- Give forms enough thickness to read from the default oblique camera. Use
  edge outlines to separate adjacent neutral forms where lighting alone is
  unreliable.
- Keep paths attached to the same domain endpoints as their objects. For a
  moving object, derive its position along the path from model time or progress;
  don't animate a visually similar but geometrically separate path.
- Build decorative detail only when it carries information. Stable node shapes,
  partitions, logs, packets, and connectors usually explain distributed systems
  better than realistic server illustrations.

## Reuse and lifecycle

Memoize expensive or shared geometry, material, and path calculations. Share
geometry and materials among repeated objects where their appearance is the
same. Dispose manually owned Three.js resources when their owning component
unmounts, and make ownership explicit when a resource is shared.

Use [`performance.md`](performance.md) when geometry generation or renderer
startup shows up in a profile. Deterministic geometry that is costly to build
can be generated ahead of time; preserve its source data and verify the
generated result.

## Check alignment

Inspect the default view and every supported configuration. Check that paths
meet their endpoints, labels point at the intended objects, and responsive
spacing does not cause overlaps. Test reconfiguration during motion when object
positions depend on mutable simulation state.

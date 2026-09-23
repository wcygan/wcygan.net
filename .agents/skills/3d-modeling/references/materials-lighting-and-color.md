# Materials, lighting, and color

Read this when choosing object materials, lighting, or color encodings. Use
surface treatment to clarify structure and state at the article's small stage
size.

## Give color a stable meaning

- Establish the uncolored structure first with warm neutrals, shape, position,
  line treatment, and labels. Reserve stronger color for a domain distinction
  that those channels cannot express clearly.
- Keep identity colors stable across every representation of an entity. A key
  color should match from producer to packet to stored record; a node color
  should remain stable while failure state is shown through a separate signal.
- Distinguish entity identity from transient state. For example, Failure
  Detectors keeps node identity colors while red marks an expired timer.
- Use color averaging or interpolation only when it explains an aggregate.
  Clamp normalized values before mapping them to palette indices.
- Check colors against the article background and neighboring geometry. Use
  outline, lightness, or labels when two colors become hard to distinguish.

Kafka Partitioning maps keys to a compact palette, interpolates vertex colors
on the producer, and uses the reachable keys to tint each log. Its empty lanes
remain neutral; small lightness offsets separate lanes with similar averages.
Treat this as an encoding with visible rules, not as a general requirement to
color every scene.

## Materials and light

Start with `MeshStandardMaterial` for readable, predictable lighting. Use
roughness appropriate to the explanation; technical diagrams usually need
diffuse surfaces instead of reflective finishes. Share material instances when
appearance is shared, and avoid unnecessary material variation across repeated
objects.

Use restrained ambient fill and a directional key light to reveal depth. Add
edge outlines when adjacent forms merge from the default view. Keep line and
outline contrast strong enough at desktop and mobile sizes without turning
every object into a badge.

## Verify the encoding

Inspect the default settled frame, active transitions, and terminal states.
Confirm that color meanings stay consistent after reconfiguration and that the
lesson remains understandable in reduced motion. Check the rendered scene at
the real article sizes, not only in a large development canvas.

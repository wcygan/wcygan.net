# Kafka Partitioning demo reference

Read this when extending or debugging the Kafka Partitioning scene or when
building a routing-to-ordered-logs demo. The central invariant is that keyed
routing preserves key affinity, while round-robin distributes records without
that guarantee. Offsets are local to each partition.

## Source map

| File                                         | Responsibility                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/posts/kafka-partitioning.mdx`           | Article context, sources, and demo import                                      |
| `src/components/KafkaPartitioningDemo.tsx`   | Controls, lazy scene loading, playback, visibility, reduced motion, and status |
| `src/demos/kafka-partitioning/model.ts`      | Pure routing and snapshot calculations                                         |
| `src/demos/kafka-partitioning/model.test.ts` | Key affinity, partition coverage, and local-offset invariants                  |
| `src/demos/kafka-partitioning/Scene.tsx`     | Geometry, colors, labels, camera, and moving records                           |
| `src/styles/app.css` (`.kafka-*`)            | Scoped stage, controls, and scene-label styling                                |

Read the post, component, model, scene, tests, and styles together when changing
the explanation. Keep routing and offset rules in the model so they can be
checked without rendering WebGL.

## Demonstrated behavior

- The scene follows nine records using keyed Murmur2 routing or a round-robin
  counter. It defaults to three partitions; the control supports one through
  five partitions.
- A partition's offset advances independently. The same key continues to route
  to the same partition in keyed mode; round-robin mode makes no such promise.
- Step starts one record moving and appends it when it arrives. The status text
  should describe that single action as one send-and-append event. Play/Pause,
  Replay, speed, and Top view are also available; default playback speed is 4×.
- Changing partition count recomputes destinations and offsets at the current
  step. This depicts a hypothetical rerun; it does not migrate records already
  stored in Kafka.
- The producer uses interpolated vertex colors. A log can show the average color
  of keys it can reach. Clamp normalized coordinates before palette indexing to
  avoid floating-point rounding outside the intended range.

## Playback and camera

Autoplay requires at least 50% stage visibility. Under reduced motion, begin at
the completed logs; Replay and discrete stepping remain available. Preserve a
manual pause when the page becomes hidden or the scene leaves view.

Keep camera state independent of simulation progress. Treat Top view as a pose
change that still permits dragging. Preserve orbit and wheel zoom, and verify
that reconfiguration or new records do not unexpectedly reset the user's view.

## Change checks

When changing routing, offsets, or reconfiguration, run the model tests and
check key affinity, partition coverage, and partition-local offsets. In the
article, exercise Step, Play/Pause, Replay, speed, changing partition count,
Top view followed by dragging, reduced motion, and pause/resume behavior.

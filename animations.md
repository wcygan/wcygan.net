# Animation inventory

Snapshot: 2026-07-15

This is a source inventory for later motion analysis. It records what moves,
where readers encounter it, how it advances, and where its implementation lives.
It does not grade the motion or recommend changes.

## Scope

Count a **motion surface** when a reader-visible element changes over time or
interpolates in response to state, input, or an async result. This includes
Canvas and SVG playback, ASCII flipbooks, CSS animations and transitions, smooth
scrolling, and motion supplied by a UI dependency.

Do not count a `requestAnimationFrame` call by itself. Calls used only to batch
scroll-spy work or defer a resize are listed under exclusions, not as animation.
Likewise, static transforms used to place or rotate artwork are geometry rather
than motion.

| Inventory group                     | Count | Meaning                                                                  |
| ----------------------------------- | ----: | ------------------------------------------------------------------------ |
| Mounted first-party motion surfaces |    23 | Motion implemented in this repository and reachable from a current route |
| Dependency-provided motion surfaces |     2 | Leaflet map interactions and transitions                                 |
| Global UI motion behaviors          |     2 | Smooth anchor scrolling and code-copy affordance transitions             |
| Dormant motion systems              |     5 | Four unmounted sharding prototypes and one orphaned DLQ CSS family       |

The counts are by reader-facing surface, not by keyframe, moving object, or CSS
selector. One complex Canvas demo still counts as one surface.

## Mounted first-party motion

### Continuous and finite playback

| Surface                    | Route and purpose                                                                                               | Motion and timing                                                                                                                                       | Reduced motion                                                             | Source of truth                                                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rotating penguin           | `/`; ambient home-page identity animation                                                                       | `requestAnimationFrame` ASCII flipbook; 60 frames at 50 ms each, about a 3 s loop                                                                       | Holds frame 0                                                              | [`RotatingPenguin.tsx`](src/components/RotatingPenguin.tsx), [`penguin-frames.json`](src/data/penguin-frames.json), ASCII CSS in [`app.css`](src/styles/app.css)                                            |
| Rotating hotdog            | `/ascii-animation`; demonstrates terminal-style frame animation                                                 | `requestAnimationFrame` ASCII flipbook; 120 frames at 33 ms each, about a 3.96 s loop                                                                   | Holds frame 0                                                              | [`RotatingHotdog.tsx`](src/components/RotatingHotdog.tsx), [`hotdog-frames.json`](src/data/hotdog-frames.json), ASCII CSS in [`app.css`](src/styles/app.css)                                                |
| Optimistic locking race    | `/optimistic-locking`; shows two workers reading one version, conflicting, rereading, and retrying              | Canvas packet/state loop, 22.4 s; DOM timeline and status transition for 180 ms as phases change                                                        | Engine stops at progress `0.9`; CSS nearly removes phase transitions       | [`OptimisticLockingRaceDemo.tsx`](src/components/OptimisticLockingRaceDemo.tsx), [`src/demos/optimistic-locking/`](src/demos/optimistic-locking), optimistic-locking CSS in [`app.css`](src/styles/app.css) |
| N+1 round trips            | `/n-plus-one-sql-query`; compares per-row queries with one batch query                                          | Finite 22 s SVG/DOM timeline; packets travel between app and database, counters update, record fill transitions for 160–180 ms; Reset restarts playback | Renders the completed comparison                                           | [`NPlusOneQueryDemos.tsx`](src/components/NPlusOneQueryDemos.tsx), [`src/demos/n-plus-one-query/model.ts`](src/demos/n-plus-one-query/model.ts), N+1 CSS in [`app.css`](src/styles/app.css)                 |
| Workflow and activities    | `/durable-execution`; shows a workflow orchestrating reserve, charge, confirm, and send activities              | Canvas packet/state loop, 17 s                                                                                                                          | Engine stops at progress `0.97`                                            | [`WorkflowActivitiesDemo.tsx`](src/components/WorkflowActivitiesDemo.tsx), [`src/demos/workflow-activities/`](src/demos/workflow-activities), workflow CSS in [`app.css`](src/styles/app.css)               |
| Durable task loop          | `/durable-execution`; shows durable history around queueing, execution, failure, retry, and completion          | Canvas packet/history loop, 34 s                                                                                                                        | Engine stops at progress `0.95`                                            | [`DurableTaskLoopDemo.tsx`](src/components/DurableTaskLoopDemo.tsx), [`src/demos/durable-task-loop/`](src/demos/durable-task-loop), durable-task CSS in [`app.css`](src/styles/app.css)                     |
| Retry and idempotency      | `/durable-execution`; compares an idempotency-key retry with a blind retry                                      | Canvas comparison loop, 15 s; four DOM step cards and their progress fills transition for 180–220 ms                                                    | Engine stops at progress `0.93`; CSS nearly removes step transitions       | [`RetryIdempotencyDemo.tsx`](src/components/RetryIdempotencyDemo.tsx), [`src/demos/retry-idempotency/`](src/demos/retry-idempotency), retry CSS in [`app.css`](src/styles/app.css)                          |
| Worker crash modes         | `/durable-execution`; contrasts workflow-task recovery with activity retry history                              | Canvas two-act playback, 34 s plus a 5 s final hold, 39 s total loop                                                                                    | Engine stops at progress `0.99`                                            | [`WorkerCrashModesDemo.tsx`](src/components/WorkerCrashModesDemo.tsx), [`src/demos/worker-crash-modes/`](src/demos/worker-crash-modes), worker-crash CSS in [`app.css`](src/styles/app.css)                 |
| Entity/home-region routing | `/multi-region-data`; routes a request from the nearest edge to the account's owning region, then replicates it | Canvas packet/state loop, 13.2 s; five DOM step cards and status transition for 180 ms                                                                  | Engine stops at progress `0.92`; CSS nearly removes phase transitions      | [`HomeRegionRoutingDemo.tsx`](src/components/HomeRegionRoutingDemo.tsx), [`src/demos/home-region-routing/`](src/demos/home-region-routing), multi-region demo CSS in [`app.css`](src/styles/app.css)        |
| Replication lag            | `/multi-region-data`; shows a write, delayed replicas, failover to a stale region, and repair                   | Canvas packet/state loop, 12.8 s; six DOM step cards and status transition for 180 ms                                                                   | Engine renders the resolved snapshot; CSS nearly removes phase transitions | [`ReplicationLagDemo.tsx`](src/components/ReplicationLagDemo.tsx), [`src/demos/replication-lag/`](src/demos/replication-lag), multi-region demo CSS in [`app.css`](src/styles/app.css)                      |
| CDC propagation            | `/change-data-capture`; follows a committed database write into a change event                                  | Component-local Canvas loop, 10 s                                                                                                                       | Holds the representative frame at 62%                                      | [`CdcPropagationAnimation.tsx`](src/components/CdcPropagationAnimation.tsx), CDC Canvas CSS in [`app.css`](src/styles/app.css)                                                                              |
| WAL to Kafka               | `/change-data-capture`; shows Debezium reading three WAL records and producing Kafka events                     | Canvas packet/state loop, 16 s                                                                                                                          | Engine holds a snapshot with one event produced                            | [`CdcWalKafkaDemo.tsx`](src/components/CdcWalKafkaDemo.tsx), [`src/demos/cdc-wal-kafka/`](src/demos/cdc-wal-kafka), WAL/Kafka CSS in [`app.css`](src/styles/app.css)                                        |
| Data-retention cascade     | `/change-data-capture`; shows a delete/tombstone propagating through customer, order, and shipment data         | Component-local Canvas loop, 11.5 s                                                                                                                     | Holds the representative frame at 78% after the cascade has fired          | [`DataRetentionCascadeDemo.tsx`](src/components/DataRetentionCascadeDemo.tsx), retention CSS in [`app.css`](src/styles/app.css)                                                                             |
| Incremental ETL flow       | `/change-data-capture`; shows a MySQL update becoming events and landing in downstream stages                   | Component-local Canvas loop, 14 s                                                                                                                       | Holds the representative frame at 90% after the change has landed          | [`IncrementalEtlFlowDemo.tsx`](src/components/IncrementalEtlFlowDemo.tsx), ETL CSS in [`app.css`](src/styles/app.css)                                                                                       |
| MySQL redo replay          | `/commit-log`; replays six redo records into recovered in-memory state                                          | Canvas step loop; about 1.09 s per state change and 7.63 s for the six records plus completed state before reset                                        | Holds after four applied records                                           | [`MySqlRedoReplayDemo.tsx`](src/components/MySqlRedoReplayDemo.tsx), [`src/demos/mysql-redo-log/`](src/demos/mysql-redo-log), redo-replay CSS in [`app.css`](src/styles/app.css)                            |
| Shard request router       | `/sharding-versus-partitioning`; routes four tenant requests through a router to the owning shard               | Continuous SVG path drawing and packet movement; 3.2 s per request, 12.8 s full cycle; related card/path transitions run for 140–180 ms                 | Holds the fourth request at its settled state and hides packet dots        | [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), sharding CSS in [`app.css`](src/styles/app.css)                                                                            |

The nine model-backed Canvas demos use the shared
[`createLoopingCanvasEngine`](src/demos/shared/looping-canvas-engine.ts). That
engine draws an initial frame, uses timestamp deltas, observes resize and
viewport intersection, pauses outside the viewport and while the page is hidden,
listens for reduced-motion changes, and cleans up its frame and observers. The
three component-local CDC/ETL Canvas loops resize correctly and have static
reduced-motion frames, but do not use the shared visibility and intersection
lifecycle.

### Discrete autoplay and interactive state motion

| Surface                 | Route and purpose                                                                                            | Motion and timing                                                                                                                                                                                                        | Reduced motion                                                                                                                       | Source of truth                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GeoDNS routing          | `/multi-region-data`; cycles Seattle, Dallas, and New York lookups to their closest region                   | Discrete step every 1.6 s, 4.8 s full cycle; SVG lines draw over 360–480 ms, packet visibility runs 440–560 ms, and three SMIL `animateMotion` packets travel for 320–360 ms                                             | Holds the New York/Virginia step; removes CSS animation/transitions and leaves the still-running SMIL packets hidden at base opacity | [`GeoDnsRoutingDemo.tsx`](src/components/GeoDnsRoutingDemo.tsx), [`src/demos/geodns-routing/model.ts`](src/demos/geodns-routing/model.ts), GeoDNS CSS in [`app.css`](src/styles/app.css) |
| Range vs. hash splitter | `/sharding-versus-partitioning`; compares range locality with hash distribution                              | Two autoplay states at 3 s each, 6 s full cycle; chip entry is 180 ms with a 30 ms stagger, lanes transition for 180 ms, and the status enters over 220 ms; choosing a tab pauses autoplay                               | Selects the final state and disables CSS animation/most transitions                                                                  | [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), sharding CSS in [`app.css`](src/styles/app.css)                                                         |
| Query planner pruning   | `/sharding-versus-partitioning`; shows which monthly partitions three query shapes scan or skip              | Three autoplay states at 2.6 s each, 7.8 s full cycle; tab/panel/card transitions run 150–220 ms with a 28 ms card stagger; choosing a tab pauses autoplay                                                               | Selects the final state and nearly removes transitions                                                                               | [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), sharding CSS in [`app.css`](src/styles/app.css)                                                         |
| Bad partition key       | `/sharding-versus-partitioning`; compares distribution for `created_at`, `status`, and `tenant_id`           | Three autoplay states at 3 s each, 9 s full cycle; rows enter for 220 ms with a 28 ms stagger, bars resize over 420 ms, and the status enters over 220 ms; choosing a tab pauses autoplay                                | Selects the final state and disables entry animation/most transitions                                                                | [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), sharding CSS in [`app.css`](src/styles/app.css)                                                         |
| Hot tenant              | `/sharding-versus-partitioning`; sliders and presets redistribute a fixed traffic budget across three shards | User-driven state transitions run for 140–260 ms; hot shards lift and three decorative flames loop every 760 ms in alternating directions                                                                                | Removes flame playback and nearly removes covered transitions                                                                        | [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), sharding CSS in [`app.css`](src/styles/app.css)                                                         |
| Live edge check         | `/anton`; visualizes pending, success, opaque, and failure states for a real network probe                   | Click-triggered async state machine; live timer uses `requestAnimationFrame`; spinner 700 ms, indeterminate track 760 ms, status pulse 1.3 s, success pop 200 ms, check draw 400 ms after 100 ms, and result rise 180 ms | CSS removes the named animations and nearly removes covered transitions; elapsed text can still update during a request              | [`EchoLivenessCheck.tsx`](src/components/EchoLivenessCheck.tsx), Anton probe CSS in [`app.css`](src/styles/app.css)                                                                      |
| Software icon cards     | `/really-good-software`; hover feedback for linked software cards                                            | Border, background, and 1 px vertical lift transition for 120 ms on hover                                                                                                                                                | No dedicated reduced-motion rule                                                                                                     | [`SoftwareIconGrid.tsx`](src/components/SoftwareIconGrid.tsx), software-card CSS in [`app.css`](src/styles/app.css)                                                                      |

## Dependency-provided map motion

Both map components import Leaflet's stylesheet through
[`app.css`](src/styles/app.css). Leaflet supplies 200 ms opacity fades and 250
ms transform-based zoom motion, plus interactive pan/zoom behavior. The
repository does not add a `prefers-reduced-motion` integration for either map.

| Surface               | Route                | Reader-visible motion                                                                                   | Source                                                                                        |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| OpenStreetMap         | `/street-maps`       | Dragging, wheel/button zoom, marker popup, tile fade, and Leaflet zoom transforms                       | [`OpenStreetMap.tsx`](src/components/OpenStreetMap.tsx), `leaflet/dist/leaflet.css`           |
| Multi-region data map | `/multi-region-data` | Initial bounds adjustment plus dragging, zooming, marker popups, tile fade, and Leaflet zoom transforms | [`MultiRegionDataMap.tsx`](src/components/MultiRegionDataMap.tsx), `leaflet/dist/leaflet.css` |

## Global UI motion

| Behavior                | Scope                                                            | Motion and timing                                                                                                                                                        | Reduced motion    | Source                                                                                                        |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| Smooth anchor scrolling | Every page; most visible through article table-of-contents links | Native `scroll-behavior: smooth` on `html`                                                                                                                               | No override       | Base element CSS in [`app.css`](src/styles/app.css)                                                           |
| Code-copy affordance    | Every Shiki code block                                           | Copy button fades in on code-block hover or button focus; opacity, border, and color transition for 150 ms. The copied state remains for 2 s before returning to “Copy.” | No dedicated rule | Shiki CSS in [`app.css`](src/styles/app.css), state timer in [`src/routes/__root.tsx`](src/routes/__root.tsx) |

## CSS keyframe registry

There are 15 named CSS keyframes. The table records every definition, including
ones that are not mounted.

| Family            | Keyframes                                                                                                                           | Mounted use                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Anton live probe  | `anton-probe-spin`, `anton-probe-indeterminate`, `anton-probe-dot-pulse`, `anton-probe-pop`, `anton-probe-draw`, `anton-probe-rise` | All six are mounted through `EchoLivenessCheck`                                                               |
| GeoDNS            | `geo-dns-line-draw`, `geo-dns-packet-visible`                                                                                       | Both are mounted through `GeoDnsRoutingDemo`; SVG packet travel itself uses SMIL `animateMotion`              |
| Sharding          | `sp-flame`, `sp-shard-key-record-enter`, `sp-row-enter`, `sp-soft-enter`, `sp-chip-enter`, `sp-fade-enter`                          | The first four are mounted; `sp-chip-enter` and `sp-fade-enter` are currently used only by dormant prototypes |
| Dead-letter queue | `dlq-alert-pulse`                                                                                                                   | Not mounted; the entire `dlq-*` CSS family is orphaned                                                        |

All definitions live in [`src/styles/app.css`](src/styles/app.css).

## Dormant motion systems

These sources ship in the repository but have no current route, MDX import, or
mounted JSX owner. They should be included in code-level analysis, but kept
separate from the reader-visible baseline.

| Dormant system                   | Motion present                                                                                              | Evidence                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `ConsistentHashingRebalanceDemo` | Tab-driven chip entries with 220 ms animation and 22 ms stagger; 220 ms status entry                        | Exported from [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), never imported                  |
| `VirtualNodeBalanceDemo`         | Tab-driven token fades with 220 ms animation and 20 ms stagger; ownership bar transition                    | Exported from [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), never imported                  |
| `RingFailureTakeoverDemo`        | Tab-driven key-card entries with 220 ms animation and 24 ms stagger; 220 ms status entry                    | Exported from [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), never imported                  |
| `ConsistentHashingAddNodeDemo`   | Slider-driven token, key, and table transitions; 220 ms entries with 18–20 ms staggers; 220 ms status entry | Exported from [`ShardingPartitioningDemos.tsx`](src/components/ShardingPartitioningDemos.tsx), never imported                  |
| `dlq-*` CSS family               | A broad 120–260 ms transition system plus a 1.1 s retry pulse and mobile trace transitions                  | Selectors and `dlq-alert-pulse` exist in [`app.css`](src/styles/app.css), but no `dlq-*` class is used outside that stylesheet |

The dormant sharding prototypes share the mounted sharding reduced-motion media
query. The dormant DLQ family also has its own reduced-motion rules.

## Motion-adjacent code that is not animation

- [`ConsistentHashingRingCanvasDemo.tsx`](src/components/ConsistentHashingRingCanvasDemo.tsx)
  is interactive, but slider changes redraw a new Canvas snapshot immediately;
  there is no time progression or interpolation.
- The `requestAnimationFrame` in [`src/routes/$slug.tsx`](src/routes/$slug.tsx)
  batches scroll-spy measurement. It does not animate the active
  table-of-contents state.
- The `requestAnimationFrame` calls in
  [`OpenStreetMap.tsx`](src/components/OpenStreetMap.tsx) and
  [`MultiRegionDataMap.tsx`](src/components/MultiRegionDataMap.tsx) defer
  Leaflet size and bounds work until the next paint. Leaflet's own visible
  motion is inventoried separately above.
- Mermaid diagrams under [`src/diagrams/`](src/diagrams) are compiled to static
  SVG and contain no repository-authored playback.
- Static CSS `transform` declarations used to position the hotdog art and rotate
  map-pin geometry are not animation.

## Refresh checklist

When this inventory is updated, cross-check all of these sources:

1. MDX and route imports of `src/components/`.
2. `requestAnimationFrame`, timers, `animateMotion`, and
   `prefers-reduced-motion` usage in `src/`.
3. `animation`, `transition`, and `@keyframes` declarations in
   `src/styles/app.css`.
4. Exported demo components that have no import site.
5. Dependency styles that contribute reader-visible motion.

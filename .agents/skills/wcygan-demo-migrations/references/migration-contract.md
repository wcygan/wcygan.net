# Demo Migration Contract

Use this reference while planning and accepting a legacy-demo migration.

## Design Authority

Use these sources in order:

1. The owning MDX prose and its technical invariant.
2. `AGENTS.md` and the rendered article shell.
3. `$wcygan-editorial-diagrams`.
4. The closest accepted explanatory pattern below.
5. The legacy demo only as behavioral evidence.

Do not preserve old geometry, aspect ratio, colors, or loop timing merely
because they already exist.

## Accepted Reference Implementations

| Pattern                    | Route                   | Sources                                                                         | Reuse                                                      |
| -------------------------- | ----------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Comparison                 | `/n-plus-one-sql-query` | `NPlusOneQueryDemos.tsx`, `src/demos/n-plus-one-query/`, `/* N+1 query race */` | Parallel lanes, persistent comparison, quantified takeaway |
| Point-to-point propagation | `/change-data-capture`  | `CdcPropagationAnimation.tsx`, `src/demos/cdc-propagation/`                     | Direct boundary crossing and synchronized endpoint state   |
| Ordered log publication    | `/change-data-capture`  | `CdcWalKafkaDemo.tsx`, `src/demos/cdc-wal-kafka/`                               | Ordered records and downstream append                      |
| Causal cascade             | `/change-data-capture`  | `DataRetentionCascadeDemo.tsx`, `src/demos/data-retention-cascade/`             | One event producing several ordered consequences           |
| Multi-stage pipeline       | `/change-data-capture`  | `IncrementalEtlFlowDemo.tsx`, `src/demos/incremental-etl-flow/`                 | Compact actor route and apply boundary                     |
| State reconstruction       | `/commit-log`           | `MySqlRedoReplayDemo.tsx`, `src/demos/mysql-redo-log/`                          | Ordered ledger plus persistent derived state               |

Treat these as craft and lifecycle references, not component templates.

## Old To New Mapping

| Legacy signal                                         | Migration target                                                                           |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fixed light Canvas or saturated dashboard palette     | Warm-neutral article stage with restrained semantic color                                  |
| Renderer draws labels, cards, counters, and narration | DOM/CSS owns label-heavy structure; renderer, if retained, draws only specialized geometry |
| `% 1` timeline or automatic revival                   | Clamped finite progress with an observable complete state                                  |
| No Replay or a reset that interpolates from stale CSS | Discoverable Replay that restores the exact first frame immediately                        |
| Reduced motion freezes an arbitrary percentage        | Complete or representative static conclusion                                               |
| Motion preference checked once                        | Mounted change listener with coherent normal → reduced → normal behavior                   |
| Frame work continues offscreen, hidden, or complete   | Visibility-aware scheduling and explicit completion stop                                   |
| Decorative actor colors plus legend                   | Direct actor names, roles, values, boundaries, and persistent state                        |
| Canvas accessibility label describes the whole movie  | Figure title, concise static description, hidden redundant motion, final live announcement |
| Fixed portrait dimensions                             | Responsive geometry inside the `644px` reading column                                      |
| Controls inside the visual stage                      | Controls outside the one authored stage                                                    |
| New CSS appended after old rules                      | One canonical scoped section replacing superseded selectors                                |

## Discover The Current Queue

Do not treat an old inventory as proof that a demo still needs migration. Start
with mounted imports and current runtime signals:

```bash
rg -n "createLoopingCanvasEngine|% 1|setInterval|<canvas" \
  src/components src/demos
rg -n "from \"~/components/.*Demo\"" src/posts
```

At the time this skill was created, the highest-confidence finite-playback
queue was:

- `/optimistic-locking`: `OptimisticLockingRaceDemo`;
- `/durable-execution`: `WorkflowActivitiesDemo`, `DurableTaskLoopDemo`,
  `RetryIdempotencyDemo`, and `WorkerCrashModesDemo`; and
- `/multi-region-data`: `HomeRegionRoutingDemo` and `ReplicationLagDemo`.

GeoDNS and the mounted sharding demos also contain autoplay or old prototype
visual patterns, but require separate representation judgment. Do not migrate
unmounted prototype exports merely because they share a source file.

Re-run the audit helper for the chosen component and verify its MDX import
before assigning ownership.

## Article-Native Visual Contract

Use local semantic variables based on:

| Role        | Value     |
| ----------- | --------- |
| Canvas      | `#181817` |
| Panel       | `#20201e` |
| Raised      | `#292927` |
| Line        | `#3f3f3b` |
| Strong line | `#696862` |
| Primary ink | `#f4f3ee` |
| Muted ink   | `#aaa9a2` |
| Paper       | `#efeee9` |
| Paper ink   | `#20201d` |

Keep `#466eaa` reserved for focus. Add at most the semantic hues needed for the
actual state mutation, failure, or decision. Pair every color cue with text,
shape, position, pattern, or line treatment.

Use Inter for editorial labels and Lilex for code, identifiers, records, and
terminal-native values. Reset article-prose list and code styles inside the
canonical component section when they interfere with diagram geometry.

## Playback Contract

A time-based explanatory migration normally has:

1. Establishment: enough time to read the input, actors, and initial values.
2. Action: the originating request or mutation becomes visible.
3. Causal handoffs: one active actor or boundary at a time.
4. Decisive middle: source state has changed while downstream state has not.
5. Apply boundary: downstream state changes only when the matching payload
   arrives.
6. Final settle: concise result remains inspectable.

Use strong ease-in-out for visible travel and
`cubic-bezier(0.23, 1, 0.32, 1)` for enters, exits, and control feedback.
Reader-facing UI feedback should normally stay within `100–160ms`; diagram
state feedback should normally stay within `240ms`. Narrative travel may take
longer when the causal beat needs time to read.

`DemoReplayButton` currently includes an automatic completion countdown. Do not
use it blindly. If the requirement says the final state must persist until
manual Replay, use a finite native Replay control or change the shared behavior
only when that broader scope is explicitly authorized.

## Architecture Contract

Prefer:

```text
src/components/ExampleDemo.tsx
src/demos/example/model.ts
src/demos/example/model.test.ts
src/demos/example/component.test.tsx  # when lifecycle behavior needs coverage
src/styles/app.css                    # one canonical section
```

Add `engine.ts`, `render-canvas.ts`, or `viewport.ts` only when the retained
medium requires them.

The model owns domain state and causal snapshots. The component owns semantics,
controls, lifecycle, measurement, and accessible text. CSS owns layout and
responsive presentation. A renderer draws from a snapshot; it does not own
business truth.

Delete obsolete engines and renderers only after proving there are no remaining
imports. Do not remove shared infrastructure used by other demos.

## Acceptance Matrix

| Evidence       | Required proof                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Source         | Scoped diff, no duplicate canonical CSS, no `transition: all`, no unintended loop                     |
| Model          | Exact first/middle/final values and strict actor/boundary order                                       |
| Replay         | Immediate readable first frame and deterministic rerun                                                |
| Reduced motion | Immediate conclusion, hidden travel, live preference changes, cleanup                                 |
| Desktop        | `1440x900`, real article, key phases, correct frame/stage contract, zero overflow/errors              |
| Mobile         | `390x844`, readable labels, no packet/text collision, no page overflow                                |
| Accessibility  | Stable title/description, current semantic values only, final announcement, focus, `44x44px` controls |
| Geometry       | Computed text-to-border and moving-token clearance                                                    |
| Project        | Focused tests, typecheck, `deno task pre-commit`; build when route/prerender scope changes            |

Reject a migration that passes tests but was not rendered, looks polished while
teaching the wrong order, depends on a legend, or hides the conclusion behind
continued motion.

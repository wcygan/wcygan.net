# Temporal introduction research

Researched on October 1, 2026; reconciled to the twelve-demo draft on October 2,
2026, including a new check of the official parallel-execution guide. Scope: a
beginner product introduction, six conceptual 2D explainers, six conceptual 3D
explainers, and a local TypeScript experiment. Sources are Temporal's official
documentation, first-party articles, or maintained sample code. Commands are
researched instructions; runtime verification is recorded separately.

## Practical answer

Temporal coordinates application work that must survive process failure or
wait for other systems. A Workflow describes the sequence in ordinary code;
Activities perform external operations. The Temporal Service persists the
execution's history and schedules work. Your Workers execute your code.
Temporal Cloud operates the Service for you, while a self-hosted deployment
puts that responsibility on your team. [Platform overview](https://docs.temporal.io/temporal),
[Cloud architecture](https://docs.temporal.io/evaluate/cloud)

The implemented local lab is `examples/temporal-intro`: a fake reservation
Activity, a durable wait, and a fake fulfillment Activity. Kill the Worker
while the Workflow is waiting and restart it after the timer deadline. Inspect
history to see the completed reservation result reused. This exercises recovery
following a recorded completion; it does not test external effect idempotency.

The existing `src/posts/durable-execution.mdx` already covers the underlying
durable execution mechanism, the Workflow/Activity boundary, replay,
idempotency, worker failures, and LinkedIn's order placement. The new draft
should link to `/durable-execution` and provide the hands-on product
introduction, fit assessment, waiting/message examples, and deployment choices.
Avoid inventing a first-person production anecdote.

## Claim-source ledger

| Topic                | Supported claim and important limit                                                                                                                                                                                                                                                                                                                                      | Primary source                                                                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Product              | Temporal provides durable Workflow Execution. Its platform combines a Service with SDK-based Worker processes. Treat durability as recorded progress and recovery; avoid the marketing shorthand that application bugs or permanent business failures cannot happen.                                                                                                     | [What is Temporal?](https://docs.temporal.io/temporal)                                                                                                       |
| Workflow vs Activity | Workflows coordinate steps; Activities execute operations such as API requests and database writes. Activity attempts may repeat, so write operations should be idempotent. There are also standalone/local Activities, which are outside the beginner lesson.                                                                                                           | [Workflows](https://docs.temporal.io/workflows), [Activities](https://docs.temporal.io/activities)                                                           |
| Replay               | The SDK reruns Workflow code against Event History to reconstruct state, using recorded Activity outcomes rather than making recorded-complete external calls again. It is not a snapshot of the process's RAM. A cached Workflow can avoid full replay.                                                                                                                 | [How Workflow replay works](https://docs.temporal.io/workflows#how-workflow-replay-works)                                                                    |
| Determinism          | The same history must produce a compatible sequence of Workflow commands. Put ordinary external I/O in Activities and use SDK-supported Workflow APIs. Existing long-running Workflows need a deployment/versioning strategy when code changes.                                                                                                                          | [Workflow Definition](https://docs.temporal.io/workflow-definition#deterministic-constraints)                                                                |
| Workers              | Workers poll queues, execute your registered application code, and return results to the Service. Temporal Cloud does not execute that code on the Service's machines. Blocked Workflows need not remain in Worker memory.                                                                                                                                               | [Workers](https://docs.temporal.io/workers)                                                                                                                  |
| Task Queues          | Workflow and Activity tasks persist until Workers can process them. Workers on the same named queue share work; queues are created on demand. This is task dispatch, not an application-wide ordered event stream.                                                                                                                                                       | [Task Queues](https://docs.temporal.io/task-queue)                                                                                                           |
| Parallel execution   | TypeScript Activity proxies return Promises. Schedule independent Activities before awaiting their results; `Promise.all()` joins successful results, while `Promise.allSettled()` can collect partial outcomes. Actual overlap depends on Worker capacity. `Promise.all()` rejecting does not automatically compensate completed operations or cancel other Activities. | [Parallel Execution](https://docs.temporal.io/design-patterns/parallel-execution), [Worker performance](https://docs.temporal.io/develop/worker-performance) |
| Timers               | Workflow timers persist and do not tie up the Worker process while waiting. If the deadline passes during downtime, code continues when the Service and Worker are available again; do not promise work executes during an outage.                                                                                                                                       | [TypeScript timers](https://docs.temporal.io/develop/typescript/workflows/timers)                                                                            |
| Messages             | Signals change state asynchronously, Queries read state without mutation, and Updates can change state and return a result. TypeScript handlers use `defineSignal`/`defineQuery`/`defineUpdate` and `setHandler`.                                                                                                                                                        | [TypeScript message passing](https://docs.temporal.io/develop/typescript/workflows/message-passing)                                                          |
| Retry policy         | Activities retry by default with exponential backoff. Entire Workflow Executions do not retry by default. Permanent application failures need explicit policy/handling, and a finite overall timeout can bound retries.                                                                                                                                                  | [Retry policies](https://docs.temporal.io/encyclopedia/retry-policies)                                                                                       |
| Timeouts             | Start-to-Close bounds one Activity attempt; Schedule-to-Close bounds the overall Activity including queueing and retries. A server cannot infer an Activity Worker's crash immediately; a timeout/heartbeat detects lack of progress. An Activity must set Start-to-Close or Schedule-to-Close.                                                                          | [Detecting Activity failures](https://docs.temporal.io/encyclopedia/detecting-activity-failures)                                                             |
| External effects     | A Worker can perform a side effect and crash before reporting completion. Retrying may perform it again. Deduplication must be enforced by the external system, for example a stable idempotency key or unique database constraint. Temporal's recorded completion does not create exactly-once external effects.                                                        | [Activity idempotency](https://docs.temporal.io/activity-definition#idempotency)                                                                             |
| Compensation         | A Saga uses explicit business operations to compensate previous work. It is different from restoring a database snapshot and does not supply cross-system isolation. Register compensation before the operation when its outcome could be ambiguous; compensation should tolerate an absent effect. Compensation can itself fail.                                        | [Saga compensating actions](https://temporal.io/blog/compensating-actions-part-of-a-complete-breakfast-with-sagas)                                           |
| Deployment           | Cloud manages orchestration and durable storage; you manage Workers and dependencies. Self-hosting the Service also requires operating persistence, upgrades, scaling, and availability. Development `start-dev` is not a production deployment.                                                                                                                         | [Cloud overview](https://docs.temporal.io/evaluate/cloud), [CLI server reference](https://docs.temporal.io/cli/command-reference/server)                     |
| Fit                  | First-party guidance suggests order/payment orchestration, onboarding with approvals, provisioning, document/media pipelines, and multi-step AI agents. It suggests alternatives for simple request-response, stream processing, single-database logic, and pure compute. These are qualitative fit examples, not hard performance limits.                               | [Decision framework](https://go.temporal.io/platform-hub/decision-framework)                                                                                 |

## Local TypeScript baseline

The current SDK setup guide says Node.js 20 or later. The pinned SDK's package
requires at least 20.3, and its supported runtime list includes Node 20, 22,
and 24. The lab recommends Node 22 or 24 and runs with npm/Node independently
of the blog's Bun dependencies. [SDK setup](https://docs.temporal.io/develop/typescript/set-up-your-local-typescript),
[SDK runtime requirements](https://github.com/temporalio/sdk-typescript#requirements).

On macOS, install the CLI with `brew install temporal`. From the repository
root, `cd examples/temporal-intro` and `npm ci`. The lab's
[README](../examples/temporal-intro/README.md) owns complete instructions.
Its Workflow runs `reserveInventory(orderId)`, `sleep(waitSeconds * 1_000)`,
and `fulfillOrder(orderId, reservation)`. These Activities only log fake work.

Use three terminals in the lab directory:

```sh
# Terminal 1: persist this disposable local Service across restarts
temporal server start-dev --db-filename ./temporal.db

# Terminal 2: the application Worker
npm run worker

# Terminal 3: start, inspect, and await the named execution
npm run order -- order-001 60
npm run history -- order-001
npm run result -- order-001
```

Default service/UI ports are 7233/8233. Without `--db-filename`, the dev
Service loses its in-memory state on exit. Stop only the Worker for the crash
exercise, then inspect the same execution ID. [CLI server reference](https://docs.temporal.io/cli/command-reference/server).

The original official hello-world scaffold is another starting point:
`npx @temporalio/create@latest temporal-lab --sample hello-world`.
It is not the order lab's setup command. [Maintained samples](https://github.com/temporalio/samples-typescript/blob/main/README.md).

Runtime verification is recorded separately in the lab's
[verification record](../examples/temporal-intro/VERIFICATION.md): a real
30-second order timer fired after its Node Worker was killed; the restarted
Worker fulfilled the same execution with one recorded completion for each
Activity. This observation supports the bounded experiment, not arbitrary
exactly-once external operations.

## Current draft verification

`src/posts/temporal.draft.mdx` imports twelve explainers: six from
`TemporalDemos.tsx` and six from `TemporalSpatialDemos.tsx`. Browser discovery
confirmed twelve semantic figures, each with one authored stage, and one page
`h1`. The October 2 revision passed `bun run pre-commit` (996 tests in 130
files) and `bun run build`. The six focused Temporal test files contain 44
passing tests covering domain transitions, routed geometry, playback, and UI.

Rendered checks at 1440×900 desktop and 390×844 mobile covered every default
causal step, final outcomes, retry exhaustion, and compensation failure.
Nonempty SVG node text stayed within its bounds. Spatial labels stayed within
their stages without label collisions, including camera orbit/zoom/reset
checks. Controls retained their 44px minimum height and the page did not
overflow horizontally. History selection showed the stored event payload.

Automatic packet playback was observed before destination acknowledgment;
pausing retained progress. Offscreen playback suspended. Both startup and
dynamic reduced-motion preferences disabled Play while preserving Next in all
twelve lessons. A real WebGL context loss preserved fallback manual stepping;
Retry 3D restored the view. The final loading overlay computes to the dark
canvas, and the actual R3F event source plus its canvas compute to `pan-y` so
vertical article scrolling remains available. Temporary browser emulation was
cleared. The draft remains excluded from production publication.

The visuals are teaching simulations. The separately executed SDK lab's
existing verification record supplies the real crash-and-recovery evidence;
the visual expansion does not change that experiment or its observed result.

## Twelve implemented visualization lessons

All timing, task counts, scene geometry, and failure schedules are conceptual
examples, rather than measurements or literal server internals.

| Dimension | Explainer                        | Teaching invariant and boundary                                                                                                                                                                                                                                                                                                                        |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2D        | A crash between order steps      | Compare memory-only progress with recorded completion. A Worker crash loses its local variables, while acknowledged reservation/payment results remain durable. External effects persist in both paths; the memory-only process has no other recovery store in this illustration.                                                                      |
| 2D        | Workflow and Activities          | Workflow commands coordinate four sequential external operations. Recorded Activity results allow the next step. Activity code runs on application Workers and does not automatically gain database transaction semantics.                                                                                                                             |
| 2D        | A durable timer                  | The Service remains available and records timer expiry while an application Worker is offline. Timer expiry and processing the resulting Workflow Task are separate events; execution resumes after a Worker processes the pending task.                                                                                                               |
| 2D        | Approval by Signal               | A Client's approval is accepted and recorded while the Worker is offline. Acceptance does not mean the Workflow has processed the Signal. The returned Worker handles the pending task before application state advances.                                                                                                                              |
| 2D        | Timeout, backoff, retry          | A five-second Start-to-Close timeout detects each unreported Activity attempt, followed by one- and two-second backoffs. Three maximum attempts include the first attempt; the final attempt succeeds or the retry budget is exhausted. This is an illustrative attempt timeline with immediate dispatch, not a complete persisted history of retries. |
| 2D        | One payment, two attempts        | Crash after provider acceptance but before recorded completion leads to a retry. A provider honoring the same operation key returns its existing charge; unguarded calls can create two charges. Provider key scope and retention must fit the business process.                                                                                       |
| 3D        | Temporal Architecture            | The Service stores history and queues; application Workers poll and execute code that calls external systems. Worker RPCs use the Service API, not direct access to Service persistence. Spatial placement represents responsibility, not one component per machine.                                                                                   |
| 3D        | Task Queues and Workers          | Separate Workflow and Activity queue types can share a name. Compatible Workers poll for work and acknowledge results. Pending work survives a Worker outage; an unacknowledged Activity can retry after timeout. The illustration makes no global FIFO promise.                                                                                       |
| 3D        | What Event History Stores        | Inspect ordered inputs, scheduled work, acknowledged results, timers, and completion independently from temporary Worker memory. The selected history omits task/start events and is not a raw export or full intermediate retry trail.                                                                                                                |
| 3D        | How Replay Rebuilds State        | Replacement Workflow code consumes the recorded reserve result to reconstruct its local variable without scheduling another reserve Activity. New payment work follows only after replay catches up. Recorded completion, rather than an external side effect alone, permits result reuse.                                                             |
| 3D        | Parallel Activities and the Join | Independent inventory and risk Activities can overlap. Fulfillment remains blocked until both successful results are acknowledged. Scheduling both branches does not guarantee simultaneous execution, and `Promise.all()` does not supply cancellation or compensation.                                                                               |
| 3D        | Compensation Is New Work         | Refund and inventory release are new Activities that retain the earlier successful history. This example assumes failed shipping created no shipment. In its refund-failure scenario, every refund attempt is rejected before any refund occurs; the policy stops for manual recovery while payment remains captured and inventory remains reserved.   |

## Publication caveats

The sources include product language such as "never fail," "exactly once," and
"automatic rollback." The detailed documentation gives the necessary limits:
replay reconstructs Workflow state, Activity attempts can run multiple times,
permanent failures remain application concerns, and compensations are authored
business logic. Prefer those precise descriptions in the draft.

Avoid pricing, global throughput, uptime/SLA, SDK-version, Node-lifecycle, or
performance thresholds unless separately verified when publishing. No numeric
adoption or comparative-performance claim is necessary for this introduction.

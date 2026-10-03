# Temporal order lab

An order reserves fake inventory, waits on a durable timer, then fulfills the
fake order. Stop the Worker during the wait and restart it: the recorded
reservation result lets the Workflow continue without repeating that completed
Activity.

This is a learning example. The Activities only print `[FAKE reserve]` and
`[FAKE fulfill]`; they do not call a database, payment service, or shipping API.
They do not demonstrate production idempotency. An Activity can run again if an
external effect happens but its completion does not reach Temporal. A real
reservation or payment needs an idempotency strategy at the external system.

## Setup

Use Node.js 22 or 24 and npm. The current Temporal TypeScript SDK supports
Node 20, 22, and 24; Worker execution requires Node-specific APIs, so run this
lab with Node rather than the blog's Bun runtime.

Install the Temporal CLI on macOS:

```sh
brew install temporal
```

For other platforms, follow the [official CLI installation guide](https://docs.temporal.io/cli).
Then, from the repository root:

```sh
cd examples/temporal-intro
npm ci
npm run check
```

All terminals below use this directory.

## Run an order

Terminal 1 starts the development Service and Web UI:

```sh
temporal server start-dev --db-filename ./temporal.db
```

Keep this process running. The SQLite file preserves Workflow state if the
Service is restarted with the same file. Without `--db-filename`, the dev
Service uses memory and loses that state on exit. This server is for local
development.

Terminal 2 starts your application Worker:

```sh
npm run worker
```

Terminal 3 starts an order with a 30-second timer:

```sh
npm run order -- order-001 30
npm run history -- order-001
npm run result -- order-001
```

The `order` command starts the Workflow and exits. The `result` command waits
for completion; it does not execute the Workflow itself. Its eventual output is:

```json
{
  "orderId": "order-001",
  "reservation": "reservation-order-001",
  "status": "fulfilled"
}
```

Open [the local Web UI](http://localhost:8233) and select `order-001` in the
`default` namespace to inspect its Event History. Or print the full history:

```sh
temporal workflow show --workflow-id order-001
```

The lab rejects reuse of an existing Workflow ID, including a completed one.
Choose a fresh ID for every new order; the ID represents one business operation.
The timer defaults to 30 seconds if its argument is omitted.

## Stop the Worker during the timer

1. Start a fresh order with enough time to inspect it:

   ```sh
   npm run order -- crash-order-001 60
   npm run history -- crash-order-001
   ```

2. Wait until history shows `reserveInventory` completed once and `Timer started`.
   Press `Ctrl+C` in the Worker terminal. Leave the Temporal Service running.
   For an abrupt crash instead, identify the Node Worker PID with `ps` and send
   `kill -KILL <that PID>`; kill only the Worker you started.

3. Wait until the 60-second timer has elapsed. Inspect again:

   ```sh
   npm run history -- crash-order-001
   ```

   `Timer fired` can appear while the Worker is offline. No fulfillment can run
   until a Worker polls the task queue.

4. Restart the Worker, then retrieve the same order:

   ```sh
   # Worker terminal
   npm run worker

   # Client terminal
   npm run result -- crash-order-001
   npm run history -- crash-order-001
   ```

The history summary should end with:

```json
{
  "completed": {
    "reserveInventory": 1,
    "fulfillOrder": 1
  },
  "timerStarted": true,
  "timerFired": true,
  "workflowCompleted": true
}
```

These counts describe recorded completed Activity events in this experiment.
They do not prove exactly-once external side effects. The crash occurs during
the timer, after Temporal has recorded the reservation's completion.

## If the default ports are occupied

Keep an unrelated Service running and choose another pair of local ports:

```sh
temporal server start-dev --port 7333 --ui-port 8333 --db-filename ./temporal.db
```

Set the address in each Worker/client terminal before running npm commands:

```sh
export TEMPORAL_ADDRESS=localhost:7333
```

The UI is then at [localhost:8333](http://localhost:8333), and CLI inspection
needs `--address localhost:7333`. The optional `TEMPORAL_NAMESPACE` and
`TEMPORAL_TASK_QUEUE` variables default to `default` and `temporal-intro-orders`.
The Service must have the namespace created, and the Worker and clients must
use the same queue and namespace.

## What each file does

- `workflows.ts`: deterministic orchestration; an Activity, a timer, an Activity.
- `activities.ts`: fake external operations executed by your Worker.
- `worker.ts`: connects to Temporal and polls the task queue.
- `client.ts`: starts a Workflow, awaits its result, or summarizes its history.
- `config.ts`: local connection and task queue settings.

The dependencies are pinned together to SDK version `1.24.0`; `package-lock.json`
makes `npm ci` reproducible. The database and `node_modules` stay out of Git.
Each Activity has a 10-second limit per attempt, a one-minute total budget, and
at most three attempts. These limits are explicit so the example does not retry
indefinitely; its fake Activities normally succeed on their first attempt.

## References

- [Temporal TypeScript local setup](https://docs.temporal.io/develop/typescript/set-up-your-local-typescript)
- [SDK requirements and supported runtimes](https://github.com/temporalio/sdk-typescript#requirements)
- [Development Service flags and persistence](https://docs.temporal.io/cli/command-reference/server)
- [Durable execution and replay](https://docs.temporal.io/workflow-execution)
- [Activity execution and retries](https://docs.temporal.io/activity-execution)

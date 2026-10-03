# Local verification

The example was executed against a real local Temporal development Service.
The article visuals are separate simulations; these results come from the SDK
and Service running the files in this directory.

## Environment

- Node.js `24.19.0`, macOS arm64.
- Temporal CLI `1.7.0`, embedded Server `1.31.0`, Web UI `2.49.1`.
- Temporal TypeScript packages `1.24.0` (all pinned to the same version).
- Local Service at `127.0.0.1:7233`, UI at `127.0.0.1:8233`.
- SQLite store in a disposable directory outside the repository.

`npm ci` and `npm run check` completed successfully. The Worker compiled its
Workflow bundle and entered `RUNNING` state using Node. A second start with an
already completed Workflow ID was rejected with
`WorkflowExecutionAlreadyStartedError`, as intended.

## Crash and recovery

The final example uses a 10-second Activity attempt timeout, one-minute total
Activity budget, and three maximum attempts. A 30-second order was started:

```sh
npm run order -- bounded-crash-demo-20261001 30
```

Before the crash, history contained:

```text
event 5: Activity scheduled (reserveInventory)
event 7: Activity completed (reserveInventory)
event 11: Timer started
```

The application Worker was killed with `SIGKILL` after event 11. The local
Service stayed running. Once the timer elapsed, history recorded event 12,
`Timer fired`, while the Workflow remained incomplete and no Worker was
available to fulfill the order.

After restarting the Worker, the client returned:

```json
{
  "orderId": "bounded-crash-demo-20261001",
  "reservation": "reservation-bounded-crash-demo-20261001",
  "status": "fulfilled"
}
```

The final history summary was:

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

The first Worker printed one `[FAKE reserve] ... attempt=1`. The restarted
Worker printed one `[FAKE fulfill] ... attempt=1`, with no repeated reservation.
This verifies replay after an acknowledged Activity completion and recovery
after a Worker crash during a timer. It does not establish exactly-once external
effects, production idempotency, or behavior when an Activity crashes between
performing an effect and reporting completion.

## Service persistence

A prior completed order's history was retrieved after stopping the local
Service and starting it again with the same SQLite file. The history still
contained the completed reservation, fired timer, completed fulfillment, and
completed Workflow. This checks the README's persistent development setup.

Only the disposable Worker and Service processes started for this experiment
were stopped. The lab does not use cloud credentials or external business APIs.

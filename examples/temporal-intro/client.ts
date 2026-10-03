import { Client, Connection } from "@temporalio/client";
import { address, namespace, taskQueue } from "./config";
import type { orderWorkflow } from "./workflows";

async function main() {
  const [command, orderId, seconds = "30"] = process.argv.slice(2);
  if (!orderId || !["start", "result", "history"].includes(command ?? "")) {
    throw new Error(
      "Usage: npm run order|result|history -- ORDER_ID [WAIT_SECONDS]",
    );
  }
  const waitSeconds = Number(seconds);
  if (
    command === "start" &&
    (!Number.isFinite(waitSeconds) || waitSeconds <= 0)
  ) {
    throw new Error("WAIT_SECONDS must be a finite positive number");
  }

  const connection = await Connection.connect({ address });
  const client = new Client({ connection, namespace });
  try {
    if (command === "start") {
      const handle = await client.workflow.start<typeof orderWorkflow>(
        "orderWorkflow",
        {
          workflowId: orderId,
          taskQueue,
          args: [orderId, waitSeconds],
          // Keep a completed ID from silently becoming a second order in this lab.
          workflowIdReusePolicy: "REJECT_DUPLICATE",
        },
      );
      console.log(
        `Started ${handle.workflowId}; run=${handle.firstExecutionRunId}`,
      );
      console.log(
        `Durable wait: ${waitSeconds}s. Inspect: npm run history -- ${orderId}`,
      );
      return;
    }

    const handle = client.workflow.getHandle<typeof orderWorkflow>(orderId);
    if (command === "result") {
      console.log(JSON.stringify(await handle.result(), null, 2));
      return;
    }

    const history = await handle.fetchHistory();
    const scheduled = new Map<string, string>();
    const completed: Record<string, number> = {};
    let timerStarted = false;
    let timerFired = false;
    let workflowCompleted = false;
    for (const event of history.events ?? []) {
      const activity = event.activityTaskScheduledEventAttributes;
      const completion = event.activityTaskCompletedEventAttributes;
      if (activity) {
        const name = activity.activityType?.name ?? "unknown";
        scheduled.set(String(event.eventId), name);
        console.log(`event ${event.eventId}: Activity scheduled (${name})`);
      }
      if (completion) {
        const name =
          scheduled.get(String(completion.scheduledEventId)) ?? "unknown";
        completed[name] = (completed[name] ?? 0) + 1;
        console.log(`event ${event.eventId}: Activity completed (${name})`);
      }
      if (event.timerStartedEventAttributes) {
        timerStarted = true;
        console.log(`event ${event.eventId}: Timer started`);
      }
      if (event.timerFiredEventAttributes) {
        timerFired = true;
        console.log(`event ${event.eventId}: Timer fired`);
      }
      if (event.workflowExecutionCompletedEventAttributes) {
        workflowCompleted = true;
        console.log(`event ${event.eventId}: Workflow completed`);
      }
    }
    console.log(
      JSON.stringify(
        { completed, timerStarted, timerFired, workflowCompleted },
        null,
        2,
      ),
    );
  } finally {
    await connection.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "./activities";

const { reserveInventory, fulfillOrder } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 seconds",
  scheduleToCloseTimeout: "1 minute",
  retry: { maximumAttempts: 3 },
});

export async function orderWorkflow(orderId: string, waitSeconds = 30) {
  const reservation = await reserveInventory(orderId);
  await sleep(waitSeconds * 1_000);
  return fulfillOrder(orderId, reservation);
}

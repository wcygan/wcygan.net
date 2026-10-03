import { activityInfo } from "@temporalio/activity";

export async function reserveInventory(orderId: string): Promise<string> {
  // Logging stands in for I/O. There is no inventory store or idempotency layer.
  console.log(
    `[FAKE reserve] order=${orderId} attempt=${activityInfo().attempt}`,
  );
  return `reservation-${orderId}`;
}

export async function fulfillOrder(
  orderId: string,
  reservation: string,
): Promise<{ orderId: string; reservation: string; status: "fulfilled" }> {
  console.log(
    `[FAKE fulfill] order=${orderId} attempt=${activityInfo().attempt}`,
  );
  return { orderId, reservation, status: "fulfilled" };
}

export const address = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
export const namespace = process.env.TEMPORAL_NAMESPACE ?? "default";
export const taskQueue =
  process.env.TEMPORAL_TASK_QUEUE ?? "temporal-intro-orders";

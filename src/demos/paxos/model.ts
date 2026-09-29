export const REPLICAS = ["A", "B", "C"] as const;
export const COLORS = { X: "#145da0", Y: "#a4420a" };
export type Update = keyof typeof COLORS;
export function snapshot(step: number) {
  return REPLICAS.map((name) => {
    const order: Update[] = name === "B" ? ["Y", "X"] : ["X", "Y"];
    const applied = order.slice(0, Math.max(0, step - 1));
    const value = applied.reduce(
      (value, update) => (update === "X" ? 20 : value + 5),
      10,
    );
    return { name, applied, value, order };
  });
}

export const DELIVERY_BEAT_SECONDS = 4;

/** Fast writes arrive after one beat; slow writes travel continuously for two. */
export function packetProgress(phase: number, elapsed: number, slow: boolean) {
  const time = (phase - 1) * DELIVERY_BEAT_SECONDS + Math.max(0, elapsed);
  return Math.min(
    1,
    Math.max(0, time / (DELIVERY_BEAT_SECONDS * (slow ? 2 : 1))),
  );
}

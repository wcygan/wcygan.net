import { expect, it } from "vitest";
import { historySnapshot } from "./history-model";
it("every replica applies a prefix of the chosen log without reordering or skipping", () => {
  for (let step = 0; step <= 8; step++) {
    const state = historySnapshot(step);
    for (const replica of state.replicas)
      expect(replica.applied).toEqual(
        state.chosen.slice(0, replica.applied.length),
      );
    if (step > 0) {
      const previous = historySnapshot(step - 1);
      expect(state.chosen.slice(0, previous.chosen.length)).toEqual(
        previous.chosen,
      );
      state.replicas.forEach((r, i) =>
        expect(r.applied.length).toBeGreaterThanOrEqual(
          previous.replicas[i].applied.length,
        ),
      );
    }
  }
});
it("a lagging replica catches up in order to the same deterministic result", () => {
  expect(historySnapshot(4).replicas.map((r) => r.value)).toEqual([50, 50, 20]);
  expect(historySnapshot(6).replicas.map((r) => r.value)).toEqual([50, 50, 25]);
  expect(historySnapshot(8).replicas.map((r) => r.value)).toEqual([50, 50, 50]);
});

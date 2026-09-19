import { expect, it } from "vitest";
import { concurrentSnapshot } from "./model";
it("keeps six concurrent writes ordered at every phase boundary", () => {
  const starts = [0, 500, 1000, 1500, 2000, 2500];
  for (let now = 2500; now <= 6000; now += 50) {
    const state = concurrentSnapshot(starts, now);
    expect(state.primary.slice(0, state.replica.length)).toEqual(state.replica);
    expect(state.replica.slice(0, state.applied.length)).toEqual(state.applied);
    expect(state.flights.length + state.applied.length).toBe(6);
  }
  expect(concurrentSnapshot(starts, 5950).done).toBe(true);
});

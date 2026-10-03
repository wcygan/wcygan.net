import { describe, expect, it } from "vitest";
import {
  advanceLookup,
  createBufferPool,
  createLookup,
  lookupSnapshot,
  lookupSteps,
  matchingEntries,
  readPage,
} from "./model";

function finish(scenario: "row" | "covered") {
  let state = createLookup(scenario);
  for (let i = 0; i < lookupSteps(state); i++) state = advanceLookup(state);
  return state;
}

describe("conceptual secondary-index lookup", () => {
  it("keeps both matching primary keys in the secondary entries", () => {
    expect(matchingEntries(1)).toEqual([
      { customer_id: 1, id: 101 },
      { customer_id: 1, id: 102 },
    ]);
    expect(matchingEntries(99)).toEqual([]);
  });
  it("needs the clustered rows for columns absent from the secondary entries", () => {
    const state = finish("row");
    expect(lookupSnapshot(state)).toMatchObject({
      complete: true,
      rowFetches: 2,
      results: [
        { id: 101, total_cents: 2900 },
        { id: 102, total_cents: 4500 },
      ],
    });
    expect(advanceLookup(state)).toEqual(state);
  });
  it("returns indexed columns without any clustered-row lookup", () => {
    let state = createLookup("covered");
    while (!lookupSnapshot(state).complete) {
      expect(lookupSnapshot(state).rowFetches).toBe(0);
      state = advanceLookup(state);
    }
    expect(lookupSnapshot(state).results).toEqual(matchingEntries(1));
    expect(lookupSnapshot(state).rowFetches).toBe(0);
  });
});

describe("conceptual buffer pool", () => {
  it("counts one miss then one hit for a repeated read without duplicate pages", () => {
    const initial = createBufferPool();
    const cold = readPage(initial, 1);
    const warm = readPage(cold, 1);
    expect(cold.last).toEqual({ page: 1, outcome: "miss" });
    expect(warm).toMatchObject({
      requests: 2,
      hits: 1,
      misses: 1,
      resident: [1],
    });
    expect(initial.resident).toEqual([]);
  });
  it("keeps independent pages and accounts for every logical request", () => {
    let state = createBufferPool();
    for (const page of [1, 2, 1, 2, 2] as const) state = readPage(state, page);
    expect(state.resident).toEqual([1, 2]);
    expect(state).toMatchObject({ requests: 5, hits: 3, misses: 2 });
    expect(state.requests).toBe(state.hits + state.misses);
    expect(createBufferPool()).toEqual({
      resident: [],
      requests: 0,
      hits: 0,
      misses: 0,
      last: null,
    });
  });
});

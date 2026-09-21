import { describe, expect, it } from "vitest";
import { createState, infectRandom, neighbors, nextTurn, TOTAL } from "./model";
describe("turn-based epidemic", () => {
  it("starts with exactly one random infection", () => {
    const state = infectRandom(() => 0.5);
    expect(state.infected.filter(Boolean)).toHaveLength(1);
    expect(state.infected[18]).toBe(true);
  });
  it("uses orthogonal neighbors without wrapping around rows", () => {
    expect(neighbors(0)).toEqual([1, 6]);
    expect(neighbors(5)).toEqual([11, 4]);
    expect(neighbors(14)).toEqual([8, 15, 20, 13]);
  });
  it("does not let new infections spread during the same turn", () => {
    const start = infectRandom(() => 0);
    const end = nextTurn(start, () => 0);
    expect(end.infected.filter(Boolean)).toHaveLength(3);
    expect(end.transmissions).toEqual([
      { from: 0, to: 1 },
      { from: 0, to: 6 },
    ]);
    expect(start.infected.filter(Boolean)).toHaveLength(1);
  });
  it("can have an unsuccessful turn and never recovers infected nodes", () => {
    const start = infectRandom(() => 0);
    const end = nextTurn(start, () => 0.75);
    expect(end.infected).toEqual(start.infected);
    expect(end.turn).toBe(1);
    expect(end.transmissions).toEqual([]);
  });
  it("settles when everyone is infected and does nothing before starting", () => {
    const empty = createState();
    expect(nextTurn(empty)).toBe(empty);
    const full = { ...empty, infected: Array(TOTAL).fill(true) };
    expect(nextTurn(full)).toBe(full);
  });
  it("deduplicates targets reached by multiple neighbors", () => {
    const state = createState();
    state.infected[0] = state.infected[2] = true;
    const draws = [0, 0.99, 0.99, 0.99, 0];
    const end = nextTurn(state, () => draws.shift()!);
    expect(end.transmissions).toEqual([{ from: 0, to: 1 }]);
    expect(end.infected.filter(Boolean)).toHaveLength(3);
    expect(draws).toHaveLength(0);
  });
  it("rolls separately for each uninfected neighbor at the 50% boundary", () => {
    const state = createState();
    state.infected[14] = true;
    const draws = [0.49, 0.5, 0.1, 0.9];
    const end = nextTurn(state, () => draws.shift()!);
    expect(end.transmissions).toEqual([
      { from: 14, to: 8 },
      { from: 14, to: 20 },
    ]);
    expect(end.infected.filter(Boolean)).toHaveLength(3);
    expect(draws).toHaveLength(0);
  });
});

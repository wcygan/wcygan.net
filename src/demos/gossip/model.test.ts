import { describe, expect, it } from "vitest";
import { DEFAULT_SPEED, DURATION, exchange, snapshot, STEPS } from "./model";

describe("gossip join story", () => {
  it("shows the existing cluster before E arrives or contacts its seed", () => {
    expect(snapshot(0)).toMatchObject({ ePresent: false, count: 0 });
    expect(STEPS.slice(0, 3)).toEqual([
      { kind: "cluster" },
      { kind: "arrival", node: "E" },
      { kind: "exchange", from: "E", to: "A", role: "seed" },
    ]);
    expect(snapshot(2).knowledge).toEqual({
      A: false,
      B: false,
      C: false,
      D: false,
      E: true,
    });
  });

  it("only informs peers through the scheduled pairwise exchanges", () => {
    expect(snapshot(3).knowledge).toMatchObject({ A: true, B: false });
    expect(snapshot(4).knowledge).toMatchObject({ A: true, B: true, C: false });
    expect(snapshot(5).knowledge).toMatchObject({ B: true, C: true, D: false });
  });

  it("merges peer knowledge without mutating its input", () => {
    const input = snapshot(3).knowledge;
    expect(exchange(input, "A", "B")).toEqual({ ...input, B: true });
    expect(input.B).toBe(false);
  });

  it("converges deterministically in under five seconds", () => {
    expect(DURATION / DEFAULT_SPEED).toBe(4_800);
    expect(snapshot(STEPS.length).knowledge).toEqual({
      A: true,
      B: true,
      C: true,
      D: true,
      E: true,
    });
    expect(snapshot(STEPS.length).done).toBe(true);
  });
});

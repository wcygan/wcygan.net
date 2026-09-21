import { describe, expect, it } from "vitest";
import { exchange, EXCHANGES, NODES, snapshot } from "./model";

describe("gossip knowledge", () => {
  it("starts with knowledge at E and introduces E through the seed", () => {
    expect(snapshot(0).knowledge).toEqual({ A: 0, B: 0, C: 0, D: 0, E: 2 });
    expect(snapshot(1).knowledge).toEqual({ A: 2, B: 0, C: 0, D: 0, E: 2 });
  });
  it("merges both peers without changing other observers or its input", () => {
    const input = snapshot(1).knowledge;
    expect(exchange(input, "B", "A")).toEqual({ ...input, B: 2 });
    expect(input.B).toBe(0);
  });
  it("allows redundant exchanges and never decreases local knowledge", () => {
    expect(snapshot(3).knowledge).toEqual(snapshot(2).knowledge);
    for (let i = 1; i <= EXCHANGES.length; i++) {
      for (const node of NODES)
        expect(snapshot(i).knowledge[node]).toBeGreaterThanOrEqual(
          snapshot(i - 1).knowledge[node],
        );
    }
  });
  it("converges indirectly and rejects a delayed older version", () => {
    expect(snapshot(5).knowledge).toEqual({ A: 2, B: 2, C: 2, D: 2, E: 2 });
    expect(snapshot(6).knowledge).toEqual(snapshot(5).knowledge);
    expect(snapshot(6).done).toBe(true);
  });
});

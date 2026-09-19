import { describe, expect, it } from "vitest";
import { compare, EVENTS, NODES, snapshot } from "./model";
describe("vector clocks", () => {
  it("attributes independent writes to distinct external clients", () => {
    expect(EVENTS[0]).toMatchObject({
      client: "Client 1",
      input: "Write request",
      node: "A",
    });
    expect(EVENTS[1]).toMatchObject({
      client: "Client 2",
      input: "Write request",
      node: "C",
    });
    expect(snapshot(1).status).toContain("Client 1’s Write request");
    expect(snapshot(2).status).toContain("Client 2’s Write request");
    expect(snapshot(2).clocks.B).toEqual([0, 0, 0]);
  });
  it("derives all six events and immutable message snapshots", () => {
    expect(snapshot(0).clocks).toEqual({
      A: [0, 0, 0],
      B: [0, 0, 0],
      C: [0, 0, 0],
    });
    expect(snapshot(6).history).toEqual([
      [1, 0, 0],
      [0, 0, 1],
      [2, 0, 0],
      [2, 1, 0],
      [2, 2, 0],
      [2, 2, 2],
    ]);
    const sent = snapshot(3);
    expect(sent.message?.clock).toEqual([2, 0, 0]);
    expect(sent.message?.clock).not.toBe(sent.clocks.A);
    snapshot(6);
    expect(sent.message?.clock).toEqual([2, 0, 0]);
    expect(snapshot(6).clocks).toEqual({
      A: [2, 0, 0],
      B: [2, 2, 0],
      C: [2, 2, 2],
    });
  });
  it("never decreases any component", () => {
    for (let step = 1; step <= 6; step++)
      for (const node of NODES) {
        snapshot(step).clocks[node].forEach((n, i) =>
          expect(n).toBeGreaterThanOrEqual(snapshot(step - 1).clocks[node][i]),
        );
      }
  });
  it("preserves causality, concurrency, and equality as different relations", () => {
    const h = snapshot(6).history;
    expect(compare(h[0], h[1])).toBe("concurrent");
    expect(compare(h[2], h[3])).toBe("before");
    expect(compare(h[4], h[5])).toBe("before");
    expect(compare(h[0], h[5])).toBe("before");
    expect(compare(h[5], h[0])).toBe("after");
    expect(compare(h[0], h[0])).toBe("equal");
  });
});

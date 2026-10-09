import { describe, expect, it } from "vitest";
import {
  apply,
  captureMessages,
  converged,
  experimentReplicas,
  GUIDED_ACTIONS,
  initialReplicas,
  MESSAGES,
  merge,
  NODES,
  refreshMessages,
  value,
  type Vector,
} from "./model";

function permutations<T>(items: readonly T[]): T[][] {
  return items.length
    ? items.flatMap((item, i) =>
        permutations(items.filter((_, j) => i !== j)).map((rest) => [
          item,
          ...rest,
        ]),
      )
    : [[]];
}

describe("G-Counter", () => {
  it("merges two independent increments without counting replication", () => {
    let replicas = initialReplicas();
    const expected = [
      { A: [1, 0], B: [0, 0] },
      { A: [1, 0], B: [0, 1] },
      { A: [1, 0], B: [1, 1] },
      { A: [1, 1], B: [1, 1] },
    ];
    GUIDED_ACTIONS.forEach((action, i) => {
      replicas = apply(replicas, action);
      expect(replicas).toEqual(expected[i]);
    });
  });

  it("converges under both delivery orders with duplicates", () => {
    const orders = permutations(MESSAGES);
    expect(orders).toHaveLength(2);
    for (const order of orders) {
      let replicas = experimentReplicas();
      for (const message of order) {
        const previous = replicas;
        replicas = apply(replicas, { kind: "deliver", message });
        expect(apply(replicas, { kind: "deliver", message })).toEqual(replicas);
        for (const node of NODES)
          replicas[node].forEach((count, i) =>
            expect(count).toBeGreaterThanOrEqual(previous[node][i]),
          );
      }
      expect(converged(replicas)).toBe(true);
      for (const node of NODES) expect(value(replicas[node])).toBe(2);
    }
  });

  it("captures immutable payloads independent of subsequent source changes", () => {
    const replicas = experimentReplicas();
    const messages = captureMessages(replicas);
    expect(messages[0].vector).not.toBe(replicas.A);
    replicas.A = [9, 9];
    expect(messages[0].vector).toEqual([1, 0]);
    expect(Object.isFrozen(messages[0].vector)).toBe(true);
    expect(Object.isFrozen(messages[0])).toBe(true);
  });

  it("refreshes only the incrementing node's outgoing snapshots", () => {
    let replicas = experimentReplicas();
    const messages = captureMessages(replicas);
    replicas = apply(replicas, {
      kind: "increment",
      node: "A",
      client: "Client 1",
    });
    const refreshed = refreshMessages(messages, replicas, "A");
    expect(refreshed[0].vector).toEqual([2, 0]);
    expect(refreshed[1]).toBe(messages[1]);
    expect(Object.isFrozen(refreshed[0].vector)).toBe(true);
  });

  it("converges in both delivery orders after further increments", () => {
    let replicas = experimentReplicas();
    let messages = captureMessages(replicas);
    for (const node of NODES) {
      replicas = apply(replicas, {
        kind: "increment",
        node,
        client: node === "A" ? "Client 1" : "Client 2",
      });
      messages = refreshMessages(messages, replicas, node);
    }
    for (const order of permutations(messages)) {
      let result = replicas;
      for (const message of order)
        result = apply(result, { kind: "deliver", message });
      expect(result).toEqual({ A: [2, 2], B: [2, 2] });
      expect(converged(result)).toBe(true);
    }
  });

  it("merges commutatively, associatively, and idempotently", () => {
    const vectors: Vector[] = [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 4],
    ];
    for (const a of vectors) {
      expect(merge(a, a)).toEqual(a);
      for (const b of vectors) {
        expect(merge(a, b)).toEqual(merge(b, a));
        for (const c of vectors)
          expect(merge(merge(a, b), c)).toEqual(merge(a, merge(b, c)));
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { enrichmentAt } from "../flink-2d/model";
import {
  barrierSnapshot,
  shuffleSnapshot,
  skewSnapshot,
} from "../flink-spatial/model";
import {
  face,
  shuffleBox,
  shuffleRoute,
  BARRIER_INPUTS,
  BARRIER_OPERATOR,
  barrierInputRoute,
} from "../flink-spatial/geometry";

describe("beginner Flink lessons", () => {
  it("enriches using current context without rewriting prior output", () => {
    expect(enrichmentAt(3).output[1].region).toBe("unknown");
    expect(enrichmentAt(7).output).toEqual([
      { order: "order 1", customer: "Ada", region: "US" },
      { order: "order 2", customer: "Bo", region: "unknown" },
      { order: "order 3", customer: "Ada", region: "CA" },
      { order: "order 4", customer: "Bo", region: "DE" },
    ]);
    expect(enrichmentAt(7).regions).toEqual({ Ada: "CA", Bo: "DE" });
  });
  it("gathers the same key from both sources without losing records", () => {
    const state = shuffleSnapshot(4);
    expect(state.counts).toEqual({ Ada: 2, Cy: 2 });
    expect(new Set(state.delivered.map((r) => r.id)).size).toBe(4);
    for (const key of ["Ada", "Cy"])
      expect(
        state.delivered.filter((r) => r.key === key).map((r) => r.source),
      ).toEqual([0, 1]);
  });
  it("attaches every shuffle and barrier route to actual mesh faces", () => {
    for (const source of [0, 1] as const)
      for (const owner of [0, 1] as const) {
        const path = shuffleRoute(source, owner);
        expect(path[0]).toEqual(face(shuffleBox("source", source), 0, 1));
        expect(path.at(-1)).toEqual(face(shuffleBox("owner", owner), 0, -1));
      }
    for (let lane = 0; lane < 2; lane++) {
      const path = barrierInputRoute(lane);
      expect(path[0]).toEqual(face(BARRIER_INPUTS[lane], 0, 1));
      expect(path.at(-1)).toEqual(face(BARRIER_OPERATOR, 0, -1));
    }
  });
  it("conserves twelve records through both key distributions", () => {
    for (const balanced of [false, true])
      for (let step = 0; step <= 10; step++) {
        const s = skewSnapshot(step, balanced);
        expect(
          s.unread + s.queued.reduce((a, b) => a + b, 0) + s.totalCompleted,
        ).toBe(12);
        expect(s.queued.every((n) => n >= 0)).toBe(true);
      }
    expect(skewSnapshot(3).queued).toEqual([7, 1, 0, 0]);
    expect(skewSnapshot(9).totalCompleted).toBe(11);
    expect(skewSnapshot(10).totalCompleted).toBe(12);
    expect(skewSnapshot(3, true).totalCompleted).toBe(8);
    expect(skewSnapshot(4, true).totalCompleted).toBe(12);
  });
  it("saves the aligned cut only after both barriers and excludes post-barrier data", () => {
    expect(barrierSnapshot(2)).toMatchObject({
      blocked: true,
      bBarrier: false,
      sum: 1,
      saved: null,
    });
    expect(barrierSnapshot(4)).toMatchObject({
      blocked: true,
      buffered: true,
      sum: 3,
      saved: null,
    });
    expect(barrierSnapshot(5)).toMatchObject({
      blocked: false,
      buffered: true,
      sum: 3,
      saved: 3,
    });
    expect(barrierSnapshot(6)).toMatchObject({
      buffered: false,
      sum: 13,
      saved: 3,
    });
  });
});

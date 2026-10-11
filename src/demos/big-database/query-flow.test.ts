import { describe, expect, it } from "vitest";
import {
  FLOW_PATHS,
  FLOW_STEP_MS,
  flowDuration,
  flowSnapshot,
  flowSteps,
  pointOnPath,
} from "./query-flow";

describe("one leaf-page lookup", () => {
  it("returns a cache hit without an SSD read or disk route", () => {
    for (let t = 0; t <= flowDuration("hit"); t += 250) {
      const state = flowSnapshot("hit", t);
      expect(state.current.reads).toBe(0);
      expect(state.path).not.toBe("disk");
      expect(state.path).not.toBe("fill");
    }
    expect(flowSnapshot("hit", flowDuration("hit"))).toMatchObject({
      complete: true,
      current: { node: "row" },
      packet: undefined,
    });
  });
  it("loads an uncached page before returning its row", () => {
    expect(flowSnapshot("miss", 2 * FLOW_STEP_MS)).toMatchObject({
      path: "disk",
      current: { reads: 0 },
    });
    expect(flowSnapshot("miss", 3 * FLOW_STEP_MS)).toMatchObject({
      path: "fill",
      current: { reads: 1 },
    });
    expect(flowSnapshot("miss", 4 * FLOW_STEP_MS)).toMatchObject({
      path: "result",
      current: { reads: 1 },
    });
    expect(flowSnapshot("miss", flowDuration("miss"))).toMatchObject({
      complete: true,
      current: { node: "row", reads: 1 },
      packet: undefined,
    });
  });
  it("moves at constant distance along the exact fill wire, including corners", () => {
    expect(pointOnPath(FLOW_PATHS.fill, 0)).toEqual([60, 290]);
    expect(pointOnPath(FLOW_PATHS.fill, 30 / 190)).toEqual([30, 290]);
    expect(pointOnPath(FLOW_PATHS.fill, 95 / 190)).toEqual([30, 225]);
    expect(pointOnPath(FLOW_PATHS.fill, 1)).toEqual([60, 160]);
  });
  it("hands the secondary entry's primary key to the clustered tree before reading the row", () => {
    expect(
      flowSteps("secondary").flatMap((step) =>
        "path" in step ? [step.path] : [],
      ),
    ).toEqual([
      "secondaryRoot",
      "secondaryLeaf",
      "primaryKey",
      "clusteredRoot",
      "clusteredLeaf",
    ]);
    const entry = flowSnapshot("secondary", 2 * FLOW_STEP_MS);
    expect(entry.current.label).toContain("primary key is 9001");
    expect(entry.current.node).toBe("pool");
    const handoff = flowSnapshot("secondary", 3 * FLOW_STEP_MS);
    expect(handoff.path).toBe("primaryKey");
    expect(handoff.packet).toEqual([75, 300]);
    expect(flowSnapshot("secondary", 5 * FLOW_STEP_MS).path).toBe(
      "clusteredLeaf",
    );
    expect(flowSnapshot("secondary", flowDuration("secondary"))).toMatchObject({
      complete: true,
      current: { node: "row", reads: 0 },
      packet: undefined,
    });
  });
});

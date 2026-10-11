import { describe, expect, it } from "vitest";
import { workingSetSnapshot, WORKING_SET_DURATION } from "./working-set";
describe("working-set reuse", () => {
  it("serves six reads without touching SSD", () => {
    for (let t = 0; t < 12000; t += 100) {
      const state = workingSetSnapshot(t);
      expect(state.ssdReads).toBe(0);
      expect(["lookup", "return"]).toContain(state.phase);
      expect(state.cached).toBe(false);
    }
  });
  it("copies a missing page before returning it and reuses the copy", () => {
    expect(workingSetSnapshot(13000)).toMatchObject({
      phase: "disk",
      page: "P4",
      cached: false,
    });
    expect(workingSetSnapshot(14000)).toMatchObject({
      phase: "fill",
      cached: false,
      ssdReads: 1,
    });
    expect(workingSetSnapshot(15000)).toMatchObject({
      phase: "return",
      cached: true,
    });
    expect(workingSetSnapshot(16000)).toMatchObject({
      phase: "lookup",
      page: "P4",
      cached: true,
      ssdReads: 1,
    });
  });
  it("settles and resets deterministically", () => {
    expect(workingSetSnapshot(WORKING_SET_DURATION + 100)).toMatchObject({
      complete: true,
      cached: true,
      ssdReads: 1,
    });
    expect(workingSetSnapshot(0)).toMatchObject({
      complete: false,
      cached: false,
      ssdReads: 0,
      read: 0,
    });
  });
});

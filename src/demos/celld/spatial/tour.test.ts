import { describe, expect, it } from "vitest";
import { failureSnapshot } from "./failure-domains-model";
import { fleetSnapshot, pageChangeSnapshot } from "./model";
import { initialNamedState, requestCell } from "./named-state-model";
import {
  advanceNamedStateTour,
  ANATOMY_TOUR,
  FAILURE_TOUR,
  failureTourStep,
  FLEET_TOUR,
  NAMED_STATE_TOUR_LENGTH,
  namedStateTourFrame,
  PAGE_TOUR,
} from "./tour";

describe("finite celld spatial tours", () => {
  it("keeps named counters private, survives restart, and continues the saved count", () => {
    const beforeRestart = namedStateTourFrame(3);
    const restarted = namedStateTourFrame(4);
    const conclusion = namedStateTourFrame(NAMED_STATE_TOUR_LENGTH - 1);
    expect(beforeRestart.cells.blue.committedCount).toBe(2);
    expect(beforeRestart.cells.green.committedCount).toBe(1);
    expect(restarted.cells.blue).toMatchObject({
      committedCount: 2,
      volatileCount: 0,
    });
    expect(restarted.cells.green).toMatchObject({
      committedCount: 1,
      volatileCount: 0,
    });
    expect(conclusion.cells.blue).toMatchObject({
      committedCount: 3,
      volatileCount: 1,
    });
    expect(conclusion.cells.green.committedCount).toBe(1);
    expect(conclusion.cells.agent.committedCount).toBe(0);
    expect(namedStateTourFrame(0).cells.blue.committedCount).toBe(0);
  });

  it("continues manual requests without rolling back acknowledged counters", () => {
    let manual = initialNamedState();
    for (let count = 0; count < 8; count++)
      manual = requestCell(manual, "blue");
    for (let count = 0; count < 3; count++)
      manual = requestCell(manual, "green");
    let state = manual;
    for (let beat = 1; beat < NAMED_STATE_TOUR_LENGTH; beat++) {
      const previous = state;
      state = advanceNamedStateTour(state, beat);
      for (const id of ["blue", "green", "agent"] as const) {
        expect(state.cells[id].committedCount).toBeGreaterThanOrEqual(
          previous.cells[id].committedCount,
        );
      }
      if (beat === 4) {
        expect(state.cells.blue.volatileCount).toBe(0);
        expect(state.cells.green.volatileCount).toBe(0);
      }
    }
    expect(state.cells.blue).toMatchObject({
      committedCount: 11,
      volatileCount: 1,
    });
    expect(state.cells.green).toMatchObject({
      committedCount: 4,
      volatileCount: 0,
    });
    expect(manual.cells.blue.committedCount).toBe(8);
    expect(manual.cells.green.committedCount).toBe(3);
  });

  it("introduces temporary execution before private storage and page capture", () => {
    expect(ANATOMY_TOUR.indexOf("handler")).toBeLessThan(
      ANATOMY_TOUR.indexOf("sqlite"),
    );
    expect(ANATOMY_TOUR.indexOf("sqlite")).toBeLessThan(
      ANATOMY_TOUR.indexOf("ltx"),
    );
  });

  it("captures only new images after a commit while retaining the baseline lesson", () => {
    const frames = PAGE_TOUR.map(pageChangeSnapshot);
    expect(frames[0].ltxPageImages).toHaveLength(0);
    expect(frames[1].ltxPageImages).toHaveLength(0);
    expect(frames[2].ltxPageImages.map((page) => page.id)).toEqual([2, 5]);
    expect(frames[2].explanation).toContain("not a complete database");
    for (const id of [1, 3, 4, 6]) {
      expect(frames[2].pages.find((page) => page.id === id)?.image).toBe(1);
    }
  });

  it("moves a hibernated cell only after adding capacity and preserves other owners", () => {
    const initial = fleetSnapshot(FLEET_TOUR[0]);
    const expanded = fleetSnapshot(FLEET_TOUR[1]);
    const conclusion = fleetSnapshot(FLEET_TOUR[2]);
    expect(initial.nodes).toHaveLength(2);
    expect(expanded.nodes).toHaveLength(3);
    expect(expanded.cells.map((cell) => cell.owner)).toEqual(
      initial.cells.map((cell) => cell.owner),
    );
    expect(
      conclusion.cells.find((cell) => cell.name === "room:blue"),
    ).toMatchObject({ owner: "C", hibernated: true });
    expect(conclusion.cells.slice(1).map((cell) => cell.owner)).toEqual(
      initial.cells.slice(1).map((cell) => cell.owner),
    );
  });

  it("compares independent histories rather than resurrecting lost disk copies", () => {
    const frames = FAILURE_TOUR.map(({ layout, phase }) =>
      failureSnapshot(layout, phase),
    );
    expect(frames[1].recovery).toBe("follower-tail");
    expect(frames[2].recovery).toBe("bucket");
    expect(FAILURE_TOUR[2].comparison).toContain("before the same host loss");
    expect(frames[3].ownerLost).toBe(false);
    expect(FAILURE_TOUR[3].comparison).toContain("new comparison");
    expect(frames[4].retainedCopies).toBe(0);
    expect(frames[5]).toMatchObject({
      ownerLost: true,
      followerLost: true,
      bucketCovered: true,
      recovery: "bucket",
    });
    expect(FAILURE_TOUR[5].comparison).toContain("before the same host loss");
    expect(FAILURE_TOUR[5].comparison).toContain("does not restore");
  });

  it("resumes from the selected failure comparison rather than an old cursor", () => {
    for (const layout of ["separate", "shared"] as const) {
      for (const phase of [
        "acknowledged",
        "lose-host",
        "bucket-covered",
      ] as const) {
        const step = failureTourStep(layout, phase);
        expect(step).toBeGreaterThanOrEqual(0);
        expect(FAILURE_TOUR[step]).toMatchObject({ layout, phase });
      }
    }
    const step = failureTourStep("shared", "acknowledged");
    expect(FAILURE_TOUR[step + 1]).toMatchObject({
      layout: "shared",
      phase: "lose-host",
    });
  });
});

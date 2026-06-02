import { describe, expect, it } from "vitest";
import {
  deriveRoutingSnapshot,
  REDUCED_MOTION_PROGRESS,
  ROUTING_REGION_ORDER,
  ROUTING_STEPS,
  routingStepState,
} from "./model";

describe("deriveRoutingSnapshot", () => {
  it("starts at the closest Oregon edge", () => {
    const snapshot = deriveRoutingSnapshot({ progress: 0.08, playing: false });

    expect(snapshot.phase).toBe("enter-edge");
    expect(snapshot.regions.map((region) => region.code)).toEqual([
      ...ROUTING_REGION_ORDER,
    ]);
    expect(
      snapshot.regions.find((region) => region.code === "OR"),
    ).toMatchObject({
      role: "entry",
      status: "receiving",
      version: 18,
    });
    expect(snapshot.packets[0]).toMatchObject({
      from: "user",
      to: "oregon",
      tone: "request",
    });
  });

  it("routes the write to the Virginia home region", () => {
    const snapshot = deriveRoutingSnapshot({ progress: 0.42, playing: false });

    expect(snapshot.phase).toBe("route-write");
    expect(snapshot.homeRegion).toBe("VA");
    expect(snapshot.packets[0]).toMatchObject({
      from: "oregon",
      to: "virginia",
      tone: "write",
    });
  });

  it("returns the home-region lookup back to Oregon", () => {
    const snapshot = deriveRoutingSnapshot({ progress: 0.28, playing: false });

    expect(snapshot.phase).toBe("lookup-home");
    expect(snapshot.packets).toContainEqual(
      expect.objectContaining({
        from: "directory",
        to: "oregon",
        label: "home = Virginia",
        tone: "lookup",
      }),
    );
  });

  it("commits at the home before every replica catches up", () => {
    const snapshot = deriveRoutingSnapshot({ progress: 0.7, playing: false });

    expect(snapshot.accountVersion).toBe(19);
    expect(
      snapshot.regions.map((region) => [region.code, region.version]),
    ).toEqual([
      ["VA", 19],
      ["TX", 18],
      ["OR", 18],
    ]);
  });

  it("uses the reduced-motion frame as the final current state", () => {
    const snapshot = deriveRoutingSnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("replicate");
    expect(snapshot.regions.every((region) => region.version === 19)).toBe(
      true,
    );
    expect(routingStepState(snapshot.phase, 4)).toBe("complete");
  });

  it("holds the final state after every region catches up", () => {
    const snapshot = deriveRoutingSnapshot({ progress: 0.87, playing: false });

    expect(snapshot.phase).toBe("replicate");
    expect(snapshot.regions.every((region) => region.version === 19)).toBe(
      true,
    );
    expect(
      ROUTING_STEPS.map((_, index) => routingStepState(snapshot.phase, index)),
    ).toEqual(["complete", "complete", "complete", "complete", "complete"]);
  });
});

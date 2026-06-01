import { describe, expect, it } from "vitest";
import {
  deriveLagSnapshot,
  LAG_STEPS,
  lagStepState,
  REDUCED_MOTION_PROGRESS,
} from "./model";

describe("deriveLagSnapshot", () => {
  it("starts with a write to the Virginia primary", () => {
    const snapshot = deriveLagSnapshot({ progress: 0.1, playing: false });

    expect(snapshot.phase).toBe("write");
    expect(snapshot.committedVersion).toBe(18);
    expect(snapshot.packets[0]).toMatchObject({
      from: "user",
      to: "virginia",
      tone: "write",
    });
  });

  it("shows Texas current while Oregon is still lagging", () => {
    const snapshot = deriveLagSnapshot({ progress: 0.45, playing: false });

    expect(snapshot.phase).toBe("texas-catches-up");
    expect(
      snapshot.replicas.map((replica) => [replica.code, replica.version]),
    ).toEqual([
      ["VA", 19],
      ["TX", 19],
      ["OR", 18],
    ]);
  });

  it("chooses Texas as the safe failover target when Virginia fails", () => {
    const snapshot = deriveLagSnapshot({ progress: 0.64, playing: false });

    expect(snapshot.phase).toBe("stale-window");
    expect(snapshot.safeFailoverTarget).toBe("TX");
    expect(snapshot.staleReadVisible).toBe(true);
    expect(
      snapshot.replicas.find((replica) => replica.code === "OR"),
    ).toMatchObject({
      status: "lagging",
      version: 18,
    });
  });

  it("uses the reduced-motion frame as the resolved state", () => {
    const snapshot = deriveLagSnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("resolved");
    expect(snapshot.replicas.every((replica) => replica.version === 19)).toBe(
      true,
    );
    expect(lagStepState(snapshot.phase, 5)).toBe("complete");
  });

  it("holds the resolved state after Oregon repairs", () => {
    const snapshot = deriveLagSnapshot({ progress: 0.87, playing: false });

    expect(snapshot.phase).toBe("resolved");
    expect(snapshot.replicas.every((replica) => replica.version === 19)).toBe(
      true,
    );
    expect(
      LAG_STEPS.map((_, index) => lagStepState(snapshot.phase, index)),
    ).toEqual([
      "complete",
      "complete",
      "complete",
      "complete",
      "complete",
      "complete",
    ]);
  });
});

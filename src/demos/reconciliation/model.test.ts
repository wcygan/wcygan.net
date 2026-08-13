import { describe, expect, it } from "vitest";
import {
  COMPLETE_INGESTION_SNAPSHOT,
  COMPLETE_REPAIR_SNAPSHOT,
  deriveIngestionSnapshot,
  deriveRepairSnapshot,
  INGESTION_HANDOFFS,
  REPAIR_HANDOFFS,
} from "./model";

describe("reconciliation ingestion timeline", () => {
  it("moves one source version through the complete CDC path", () => {
    expect(INGESTION_HANDOFFS.map((handoff) => handoff.payload)).toEqual([
      "row v7",
      "CDC v7",
      "offset 81",
      "order v7",
    ]);

    const snapshots = INGESTION_HANDOFFS.map(({ start, end }) =>
      deriveIngestionSnapshot((start + end) / 2),
    );

    expect(snapshots.map(({ event }) => event.handoffIndex)).toEqual([
      0, 1, 2, 3,
    ]);
    expect(snapshots.every(({ event }) => event.state === "traveling")).toBe(
      true,
    );
  });

  it("stores the trusted version only after the final handoff", () => {
    expect(deriveIngestionSnapshot(0.89).lakeVersion).toBeNull();
    expect(deriveIngestionSnapshot(0.9).lakeVersion).toBe(7);
    expect(COMPLETE_INGESTION_SNAPSHOT.completedHandoffs).toBe(4);
    expect(COMPLETE_INGESTION_SNAPSHOT.isComplete).toBe(true);
  });

  it("clamps progress and holds the completed state", () => {
    expect(deriveIngestionSnapshot(-1).phase).toBe("establishing");
    expect(deriveIngestionSnapshot(2)).toEqual(COMPLETE_INGESTION_SNAPSHOT);
  });
});

describe("reconciliation repair timeline", () => {
  it("starts with an explicit version mismatch", () => {
    const snapshot = deriveRepairSnapshot(0);

    expect(snapshot.mysqlVersion).toBe(6);
    expect(snapshot.mysqlState).toBe("pending");
    expect(snapshot.actors.lake).toBe("complete");
    expect(snapshot.status).toContain("Hadoop retains version 7");
  });

  it("schedules the scan before it publishes repair intent", () => {
    const scheduling = deriveRepairSnapshot(0.16);
    const scanning = deriveRepairSnapshot(0.32);
    const detected = deriveRepairSnapshot(0.46);

    expect(scheduling.phase).toBe("scheduling");
    expect(scheduling.actors.airflow).toBe("active");
    expect(scanning.phase).toBe("scanning");
    expect(scanning.actors.trino).toBe("active");
    expect(detected.phase).toBe("detecting");
    expect(detected.mismatchFound).toBe(true);
    expect(detected.repairPublished).toBe(false);
  });

  it("moves versioned repair intent through Kafka and Flink", () => {
    expect(REPAIR_HANDOFFS.map((handoff) => handoff.payload)).toEqual([
      "repair v7",
      "repair v7",
      "apply v7",
    ]);

    const snapshots = REPAIR_HANDOFFS.map(({ start, end }) =>
      deriveRepairSnapshot((start + end) / 2),
    );

    expect(snapshots.map(({ event }) => event.handoffIndex)).toEqual([0, 1, 2]);
    expect(snapshots.every(({ event }) => event.state === "traveling")).toBe(
      true,
    );
  });

  it("changes MySQL only when the repair reaches the database", () => {
    const inTransit = deriveRepairSnapshot(0.92);
    const applied = deriveRepairSnapshot(0.93);

    expect(inTransit.mysqlVersion).toBe(6);
    expect(inTransit.mysqlState).toBe("pending");
    expect(applied.mysqlVersion).toBe(7);
    expect(applied.mysqlState).toBe("paid");
  });

  it("finishes with the invariant restored and no moving event", () => {
    expect(COMPLETE_REPAIR_SNAPSHOT).toMatchObject({
      phase: "complete",
      mysqlVersion: 7,
      mysqlState: "paid",
      completedHandoffs: 3,
      isComplete: true,
      event: { visible: false, state: "hidden" },
    });
    expect(
      Object.values(COMPLETE_REPAIR_SNAPSHOT.actors).every(
        (status) => status === "complete",
      ),
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import {
  COMPLETE_INCREMENTAL_ETL_SNAPSHOT,
  deriveIncrementalEtlSnapshot,
  INCREMENTAL_ETL_DURATION_MS,
  INCREMENTAL_ETL_FINAL_SUMMARY,
  INCREMENTAL_ETL_PHASE_ORDER,
  INCREMENTAL_ETL_STEP_DURATION_MS,
  INITIAL_INCREMENTAL_ETL_SNAPSHOT,
} from "./model";

function progressAtElapsedMs(elapsedMs: number) {
  return elapsedMs / INCREMENTAL_ETL_DURATION_MS;
}

function progressAtStep(step: number) {
  return progressAtElapsedMs(step * INCREMENTAL_ETL_STEP_DURATION_MS);
}

describe("deriveIncrementalEtlSnapshot", () => {
  it("starts with both online and offline rows on plan free", () => {
    expect(INCREMENTAL_ETL_STEP_DURATION_MS).toBeGreaterThan(2_000);
    expect(INCREMENTAL_ETL_DURATION_MS).toBe(16_000);
    expect(INITIAL_INCREMENTAL_ETL_SNAPSHOT).toMatchObject({
      phase: "establishing",
      mysqlPlan: "free",
      opalPlan: "free",
      event: {
        visible: false,
        handoffIndex: 0,
        from: "mysql",
        to: "brooklin",
        payload: "commit",
        hopProgress: 0,
        state: "hidden",
      },
      isComplete: false,
      summary: null,
    });
  });

  it("aligns MySQL activity with the commit instead of SQL submission", () => {
    expect(deriveIncrementalEtlSnapshot(progressAtStep(1.5))).toMatchObject({
      phase: "submitting",
      actors: { mysql: "waiting" },
      status: "Application submits the update for users.id = 42",
    });
    expect(deriveIncrementalEtlSnapshot(progressAtStep(2))).toMatchObject({
      phase: "committing",
      actors: { mysql: "active" },
      status: "MySQL commits id 42 with plan pro",
    });
    expect(deriveIncrementalEtlSnapshot(progressAtStep(3))).toMatchObject({
      phase: "capturing",
      actors: { mysql: "complete", brooklin: "active" },
    });
  });

  it("names each intermediate system's input and output", () => {
    expect(deriveIncrementalEtlSnapshot(progressAtStep(3))).toMatchObject({
      phase: "capturing",
      status: "Brooklin captures the committed MySQL change",
    });
    expect(deriveIncrementalEtlSnapshot(progressAtStep(4))).toMatchObject({
      phase: "publishing",
      status:
        "Brooklin publishes it; Kafka accepts and records it in app.public.users",
    });
    expect(deriveIncrementalEtlSnapshot(progressAtStep(5))).toMatchObject({
      phase: "consuming",
      status: "Gobblin reads app.public.users and writes the record to HDFS",
    });
  });

  it("holds every readable phase for two seconds in strict order", () => {
    const readablePhases = INCREMENTAL_ETL_PHASE_ORDER.slice(0, -1);

    for (const [index, phase] of readablePhases.entries()) {
      const startMs = index * INCREMENTAL_ETL_STEP_DURATION_MS;
      const endMs = (index + 1) * INCREMENTAL_ETL_STEP_DURATION_MS - 1;

      expect(
        deriveIncrementalEtlSnapshot(progressAtElapsedMs(startMs)).phase,
      ).toBe(phase);
      expect(
        deriveIncrementalEtlSnapshot(progressAtElapsedMs(endMs)).phase,
      ).toBe(phase);
    }

    expect(
      deriveIncrementalEtlSnapshot(
        progressAtElapsedMs(INCREMENTAL_ETL_DURATION_MS),
      ).phase,
    ).toBe("synchronized");
  });

  it("shows the decisive middle with MySQL pro while Opal remains free", () => {
    const middleSnapshot = deriveIncrementalEtlSnapshot(progressAtStep(3.5));
    expect(middleSnapshot).toMatchObject({
      phase: "capturing",
      mysqlPlan: "pro",
      opalPlan: "free",
      actors: {
        mysql: "complete",
        brooklin: "active",
        kafka: "waiting",
        gobblin: "waiting",
        opal: "waiting",
      },
      event: {
        visible: true,
        handoffIndex: 0,
        from: "mysql",
        to: "brooklin",
        payload: "commit",
        state: "traveling",
      },
    });
    expect(middleSnapshot.event.hopProgress).toBeCloseTo(0.5);
  });

  it("dwells, travels, and lands continuously across all four handoffs", () => {
    const handoffs = [
      {
        step: 3,
        handoffIndex: 0,
        from: "mysql",
        to: "brooklin",
        payload: "commit",
      },
      {
        step: 4,
        handoffIndex: 1,
        from: "brooklin",
        to: "kafka",
        payload: "CDC",
      },
      {
        step: 5,
        handoffIndex: 2,
        from: "kafka",
        to: "gobblin",
        payload: "Kafka",
      },
      {
        step: 6,
        handoffIndex: 3,
        from: "gobblin",
        to: "opal",
        payload: "HDFS",
      },
    ] as const;

    for (const handoff of handoffs) {
      const { step, ...eventIdentity } = handoff;
      const snapshotAt = (localProgress: number) =>
        deriveIncrementalEtlSnapshot(progressAtStep(step + localProgress));

      expect(snapshotAt(0).event).toMatchObject({
        ...eventIdentity,
        visible: true,
        hopProgress: 0,
        state: "departing",
      });
      const midpointEvent = snapshotAt(0.5).event;
      expect(midpointEvent).toMatchObject({
        ...eventIdentity,
        state: "traveling",
      });
      expect(midpointEvent.hopProgress).toBeCloseTo(0.5);
      expect(snapshotAt(0.75).event).toMatchObject({
        ...eventIdentity,
        hopProgress: 1,
        state: "arrived",
      });

      const nextBoundary = snapshotAt(1).event;
      if (handoff.handoffIndex < 3) {
        expect(nextBoundary).toMatchObject({
          visible: true,
          handoffIndex: handoff.handoffIndex + 1,
          from: handoff.to,
          hopProgress: 0,
          state: "departing",
        });
      } else {
        expect(nextBoundary).toMatchObject({
          visible: false,
          handoffIndex: 3,
          from: "gobblin",
          to: "opal",
          hopProgress: 1,
          state: "hidden",
        });
      }
    }
  });

  it("keeps Opal free while the event is published, consumed, and applying", () => {
    for (const endStep of [5, 6, 7]) {
      const elapsedMs = endStep * INCREMENTAL_ETL_STEP_DURATION_MS - 1;
      const snapshot = deriveIncrementalEtlSnapshot(
        progressAtElapsedMs(elapsedMs),
      );

      expect(snapshot.mysqlPlan).toBe("pro");
      expect(snapshot.opalPlan).toBe("free");
      expect(snapshot.isComplete).toBe(false);
      expect(snapshot.summary).toBeNull();
    }
  });

  it("shows Gobblin processing the Kafka event before Opal applies it", () => {
    expect(deriveIncrementalEtlSnapshot(progressAtStep(5))).toMatchObject({
      phase: "consuming",
      actors: { gobblin: "active", opal: "waiting" },
      status: "Gobblin reads app.public.users and writes the record to HDFS",
    });
    expect(deriveIncrementalEtlSnapshot(progressAtStep(6))).toMatchObject({
      phase: "applying",
      actors: { gobblin: "complete", opal: "active" },
      status: "Opal on HDFS applies the update",
    });
  });

  it("synchronizes Opal only at the application boundary", () => {
    expect(
      deriveIncrementalEtlSnapshot(
        progressAtElapsedMs(INCREMENTAL_ETL_DURATION_MS - 1),
      ),
    ).toMatchObject({
      phase: "applying",
      opalPlan: "free",
    });
    expect(COMPLETE_INCREMENTAL_ETL_SNAPSHOT).toMatchObject({
      phase: "synchronized",
      mysqlPlan: "pro",
      opalPlan: "pro",
      event: {
        visible: false,
        handoffIndex: 3,
        from: "gobblin",
        to: "opal",
        payload: "HDFS",
        hopProgress: 1,
        state: "hidden",
      },
      actors: {
        mysql: "complete",
        brooklin: "complete",
        kafka: "complete",
        gobblin: "complete",
        opal: "complete",
      },
      summary: INCREMENTAL_ETL_FINAL_SUMMARY,
      isComplete: true,
    });
  });

  it("clamps progress outside the finite timeline", () => {
    expect(deriveIncrementalEtlSnapshot(-1)).toEqual(
      INITIAL_INCREMENTAL_ETL_SNAPSHOT,
    );
    expect(deriveIncrementalEtlSnapshot(2)).toEqual(
      COMPLETE_INCREMENTAL_ETL_SNAPSHOT,
    );
  });
});

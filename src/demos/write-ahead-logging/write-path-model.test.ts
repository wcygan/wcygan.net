import { describe, expect, it } from "vitest";
import {
  deriveWalWritePathSnapshot,
  INITIAL_WAL_WRITE_PATH_STATE,
  REDUCED_MOTION_WAL_WRITE_PATH_STATE,
  WAL_WRITE_SQL,
  WAL_WRITE_TIMING,
} from "./write-path-model";

describe("deriveWalWritePathSnapshot", () => {
  it("starts with the CDC SQL update and unchanged memory", () => {
    const snapshot = deriveWalWritePathSnapshot(INITIAL_WAL_WRITE_PATH_STATE);

    expect(snapshot.sql.lines).toEqual(WAL_WRITE_SQL);
    expect(snapshot.walRecord.status).toBe("pending");
    expect(snapshot.memoryRow).toMatchObject({
      id: 42,
      plan: "free",
      status: "waiting-for-wal",
    });
  });

  it("starts writing the WAL before memory changes", () => {
    const snapshot = deriveWalWritePathSnapshot({
      progress: WAL_WRITE_TIMING.sqlAcceptedAt + 0.08,
      playing: true,
    });

    expect(snapshot.phase).toBe("writing-wal");
    expect(snapshot.walRecord.status).toBe("writing");
    expect(snapshot.memoryRow.plan).toBe("free");
  });

  it("marks the WAL durable while memory is still free", () => {
    const snapshot = deriveWalWritePathSnapshot({
      progress: WAL_WRITE_TIMING.walDurableAt + 0.02,
      playing: true,
    });

    expect(snapshot.walRecord.status).toBe("durable");
    expect(snapshot.memoryRow).toMatchObject({
      plan: "free",
      status: "applying",
    });
  });

  it("changes memory to pro only after the memory apply phase completes", () => {
    const beforeApply = deriveWalWritePathSnapshot({
      progress: WAL_WRITE_TIMING.memoryAppliedAt - 0.01,
      playing: true,
    });
    const afterApply = deriveWalWritePathSnapshot({
      progress: WAL_WRITE_TIMING.memoryAppliedAt + 0.01,
      playing: true,
    });

    expect(beforeApply.walRecord.status).toBe("durable");
    expect(beforeApply.memoryRow.plan).toBe("free");
    expect(afterApply.memoryRow).toMatchObject({
      plan: "pro",
      status: "current",
    });
  });

  it("fills the timeline when the memory animation completes", () => {
    const beforeApply = deriveWalWritePathSnapshot({
      progress: WAL_WRITE_TIMING.memoryAppliedAt - 0.01,
      playing: true,
    });
    const afterApply = deriveWalWritePathSnapshot({
      progress: WAL_WRITE_TIMING.memoryAppliedAt,
      playing: true,
    });

    expect(beforeApply.timelineProgress).toBeLessThan(1);
    expect(afterApply.timelineProgress).toBe(1);
  });

  it("keeps packet travel aligned with the active timeline segment", () => {
    const walLegProgress =
      (WAL_WRITE_TIMING.sqlAcceptedAt + WAL_WRITE_TIMING.walDurableAt) / 2;
    const memoryLegProgress =
      (WAL_WRITE_TIMING.walDurableAt + WAL_WRITE_TIMING.memoryAppliedAt) / 2;
    const walSnapshot = deriveWalWritePathSnapshot({
      progress: walLegProgress,
      playing: true,
    });
    const memorySnapshot = deriveWalWritePathSnapshot({
      progress: memoryLegProgress,
      playing: true,
    });
    const appendMarker =
      WAL_WRITE_TIMING.sqlAcceptedAt / WAL_WRITE_TIMING.memoryAppliedAt;
    const memoryMarker =
      WAL_WRITE_TIMING.walDurableAt / WAL_WRITE_TIMING.memoryAppliedAt;

    expect(walSnapshot.packet).toMatchObject({
      stage: "database-to-wal",
      progress: 0.5,
    });
    expect(
      (walSnapshot.timelineProgress - appendMarker) /
        (memoryMarker - appendMarker),
    ).toBeCloseTo(0.5);
    expect(memorySnapshot.packet).toMatchObject({
      stage: "database-to-memory",
      progress: 0.5,
    });
    expect(
      (memorySnapshot.timelineProgress - memoryMarker) / (1 - memoryMarker),
    ).toBeCloseTo(0.5);
  });

  it("keeps the default and reduced-motion snapshots deterministic", () => {
    const initial = deriveWalWritePathSnapshot(INITIAL_WAL_WRITE_PATH_STATE);
    const initialAgain = deriveWalWritePathSnapshot(
      INITIAL_WAL_WRITE_PATH_STATE,
    );
    const reduced = deriveWalWritePathSnapshot(
      REDUCED_MOTION_WAL_WRITE_PATH_STATE,
    );

    expect(initial).toEqual(initialAgain);
    expect(reduced.walRecord.status).toBe("durable");
    expect(reduced.memoryRow.plan).toBe("free");
  });
});

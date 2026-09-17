import { describe, expect, it } from "vitest";
import {
  LAST_STEP,
  traversal,
  lookupPosition,
  layout,
  MATCH_ID,
  packetForStep,
  PRIMARY_ENTRIES,
  RESULT,
  SECONDARY_ENTRIES,
  visibleRowVersion,
  ROW_VERSIONS,
  READ_TS,
  VISIBLE_VERSION,
} from "./model";
import { createPlayback, SPEEDS, STEP_DURATION_MS } from "./playback";

describe("secondary-index read", () => {
  it("seeks a logical range before extracting its handle and reading the visible row", () => {
    expect(traversal(3, false)).toMatchObject({
      seeking: true,
      row: -1,
    });
    expect(SECONDARY_ENTRIES[traversal(5, false).row].email).toBe(
      "will@example.com",
    );
    expect(SECONDARY_ENTRIES[traversal(6, false).row].id).toBe(MATCH_ID);
    expect(traversal(9, true)).toMatchObject({ seeking: true, row: -1 });
    expect(traversal(10, true).row).toBe(-1);
    expect(PRIMARY_ENTRIES[traversal(11, true).row].name).toBe("Will");
    expect(PRIMARY_ENTRIES[traversal(12, true).row].id).toBe(MATCH_ID);
    expect(packetForStep(11, false)?.to).toEqual(
      packetForStep(13, false)?.from,
    );
    expect(packetForStep(11, false)?.to).not.toEqual(
      packetForStep(13, false)?.to,
    );
  });

  it("selects the newest committed version at or before the read timestamp", () => {
    expect(visibleRowVersion(ROW_VERSIONS, MATCH_ID, 79)).toBeUndefined();
    expect(visibleRowVersion(ROW_VERSIONS, MATCH_ID, 80)?.name).toBe("Will C.");
    expect(visibleRowVersion(ROW_VERSIONS, MATCH_ID, 99)?.commitTs).toBe(80);
    expect(visibleRowVersion(ROW_VERSIONS, MATCH_ID, 100)?.name).toBe("Will");
    expect(VISIBLE_VERSION).toMatchObject({ name: "Will", commitTs: 100 });
    expect(visibleRowVersion(ROW_VERSIONS, MATCH_ID, 140)?.name).toBe(
      "William",
    );
    expect(visibleRowVersion(ROW_VERSIONS, -1, READ_TS)).toBeUndefined();
  });

  it("preserves the snapshot result when compaction moves versions between files", () => {
    const compacted = ROW_VERSIONS.toReversed().map((version) => ({
      ...version,
      source: "SST B" as const,
    }));
    expect(visibleRowVersion(compacted, MATCH_ID, READ_TS)).toEqual({
      ...VISIBLE_VERSION,
      source: "SST B",
    });
    expect(visibleRowVersion(compacted, MATCH_ID, 140)?.name).toBe("William");
  });

  it("orders two independent key ranges and resolves the full row through its ID", () => {
    expect(SECONDARY_ENTRIES.map((r) => r.id)).toEqual([
      812, 180, 730, 210, 940, 105, 310, 427, 620,
    ]);
    expect(PRIMARY_ENTRIES.map((r) => r.id)).toEqual([
      105, 180, 210, 310, 427, 620, 730, 812, 940,
    ]);
    expect(SECONDARY_ENTRIES.every((entry) => !("name" in entry))).toBe(true);
    expect(MATCH_ID).toBe(427);
    expect(RESULT).toEqual({
      id: 427,
      email: "will@example.com",
      name: "Will",
    });
  });
  it.each([false, true])(
    "returns the ID through TiDB before requesting the full record (mobile=%s)",
    (mobile) => {
      const idReply = packetForStep(7, mobile)!;
      const rowRequest = packetForStep(8, mobile)!;
      expect(idReply.label).toBe("ID 427");
      expect(rowRequest.label).toBe("ID 427");
      expect(idReply.to).toEqual(rowRequest.from);
      expect(rowRequest.to).toEqual(lookupPosition(layout(mobile).primary));
      const clock = createPlayback();
      clock.setSpeed(1);
      clock.play();
      clock.advance(STEP_DURATION_MS * 6);
      expect(clock.getSnapshot().step).toBe(7);
      clock.advance(STEP_DURATION_MS - 1);
      expect(clock.getSnapshot().step).toBe(7);
      clock.advance(1);
      expect(clock.getSnapshot().step).toBe(8);
      clock.advance(STEP_DURATION_MS * 5);
      expect(clock.getSnapshot().step).toBe(13);
      clock.advance(STEP_DURATION_MS - 1);
      expect(clock.getSnapshot().step).toBe(13);
      clock.advance(1);
      expect(clock.getSnapshot()).toMatchObject({
        step: LAST_STEP,
        moving: false,
        playing: false,
      });
    },
  );
  it.each(SPEEDS)(
    "uses a single clock at %sx and preserves midflight progress on pause",
    (speed) => {
      const clock = createPlayback();
      clock.setSpeed(speed);
      clock.play();
      clock.advance(600 / speed);
      expect(clock.progress()).toBe(0.25);
      clock.pause();
      clock.advance(100000);
      expect(clock.progress()).toBe(0.25);
      clock.setSpeed(4);
      expect(clock.progress()).toBe(0.25);
      clock.play();
      clock.advance(150);
      expect(clock.progress()).toBe(0.5);
    },
  );
  it("finishes a midflight step, then runs exactly one step to its boundary", () => {
    const clock = createPlayback();
    clock.play();
    clock.advance(300);
    clock.step();
    expect(clock.getSnapshot()).toMatchObject({
      step: 1,
      settled: true,
      moving: false,
      playing: false,
    });
    expect(clock.progress()).toBe(1);
    clock.step();
    expect(clock.getSnapshot()).toMatchObject({
      step: 2,
      moving: true,
      playing: false,
    });
    clock.advance(100000);
    expect(clock.getSnapshot()).toMatchObject({
      step: 2,
      settled: true,
      moving: false,
    });
    clock.play();
    expect(clock.getSnapshot().step).toBe(3);
  });
  it("stops at the result and replay preserves speed while clearing progress", () => {
    const clock = createPlayback();
    clock.setSpeed(2);
    clock.play();
    clock.advance(100000);
    expect(clock.getSnapshot()).toMatchObject({
      step: LAST_STEP,
      playing: false,
      moving: false,
    });
    clock.step();
    clock.advance(100000);
    expect(clock.getSnapshot().step).toBe(LAST_STEP);
    clock.replay();
    expect(clock.getSnapshot()).toMatchObject({
      step: 1,
      speed: 2,
      moving: true,
    });
    expect(clock.progress()).toBe(0);
  });
  it("publishes boundaries rather than every animation frame", () => {
    const clock = createPlayback();
    let notifications = 0;
    const unsubscribe = clock.subscribe(() => notifications++);
    clock.play();
    for (let i = 0; i < 30; i++) clock.advance(16);
    expect(notifications).toBe(1);
    unsubscribe();
    clock.pause();
    expect(notifications).toBe(1);
  });
});

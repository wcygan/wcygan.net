import { describe, expect, it } from "vitest";
import {
  deriveMultiplierSnapshot,
  INITIAL_MULTIPLIER_SNAPSHOT,
  MULTIPLIER_DATABASE_HANDOFF_MS,
  MULTIPLIER_DOWNSTREAM_INTERVAL_MS,
  MULTIPLIER_DOWNSTREAM_REQUEST_COUNT,
  MULTIPLIER_DOWNSTREAM_TRAVEL_MS,
  MULTIPLIER_INPUT_INTERVAL_MS,
  MULTIPLIER_INPUT_TRAVEL_MS,
  MULTIPLIER_READ_INTERVAL_MS,
  MULTIPLIER_READS_PER_REQUEST,
} from "./model";

describe("fanout multiplier model", () => {
  it("starts the input stream at the stated cadence", () => {
    expect(INITIAL_MULTIPLIER_SNAPSHOT).toMatchObject({
      elapsedMs: 0,
      inputRequestsStarted: 1,
      downstreamRequestsStarted: 0,
      databaseReadsStarted: 0,
    });
    expect(INITIAL_MULTIPLIER_SNAPSHOT.packets).toMatchObject([
      { id: "input-0", kind: "input", inputIndex: 0, progress: 0 },
    ]);
  });

  it("keeps the simplified streams at 5, 15, and 30 events per second", () => {
    const t =
      MULTIPLIER_INPUT_TRAVEL_MS +
      MULTIPLIER_DOWNSTREAM_TRAVEL_MS +
      MULTIPLIER_DATABASE_HANDOFF_MS +
      1_000;
    const snapshot = deriveMultiplierSnapshot(t);

    expect(snapshot.inputRequestsStarted).toBe(
      Math.floor(t / MULTIPLIER_INPUT_INTERVAL_MS) + 1,
    );
    expect(snapshot.downstreamRequestsStarted).toBe(
      Math.floor(
        (t - MULTIPLIER_INPUT_TRAVEL_MS) / MULTIPLIER_DOWNSTREAM_INTERVAL_MS +
          1e-9,
      ) + 1,
    );
    expect(snapshot.databaseReadsStarted).toBe(
      Math.floor(
        (t -
          MULTIPLIER_INPUT_TRAVEL_MS -
          MULTIPLIER_DOWNSTREAM_TRAVEL_MS -
          MULTIPLIER_DATABASE_HANDOFF_MS) /
          MULTIPLIER_READ_INTERVAL_MS +
          1e-9,
      ) + 1,
    );
  });

  it("preserves each input's three-child and two-read causality", () => {
    const databaseStart =
      MULTIPLIER_INPUT_TRAVEL_MS +
      MULTIPLIER_DOWNSTREAM_TRAVEL_MS +
      MULTIPLIER_DATABASE_HANDOFF_MS;
    const downstreamSnapshot = deriveMultiplierSnapshot(
      MULTIPLIER_INPUT_TRAVEL_MS + MULTIPLIER_DOWNSTREAM_INTERVAL_MS * 2 + 1,
    );
    const readsSnapshot = deriveMultiplierSnapshot(
      databaseStart + MULTIPLIER_READ_INTERVAL_MS + 1,
    );
    const downstream = downstreamSnapshot.packets.filter(
      (packet) => packet.kind === "downstream",
    );
    const reads = readsSnapshot.packets.filter(
      (packet) => packet.kind === "db-read",
    );

    expect(downstream).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          inputIndex: 0,
          childIndex: 0,
          downstreamIndex: 0,
        }),
        expect.objectContaining({
          inputIndex: 0,
          childIndex: 2,
          downstreamIndex: 2,
        }),
      ]),
    );
    expect(reads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          inputIndex: 0,
          childIndex: 0,
          readIndex: 0,
        }),
        expect.objectContaining({
          inputIndex: 0,
          childIndex: 0,
          readIndex: 1,
        }),
      ]),
    );
    expect(MULTIPLIER_DOWNSTREAM_REQUEST_COUNT).toBe(3);
    expect(MULTIPLIER_READS_PER_REQUEST).toBe(2);
  });

  it("continues past eight seconds without a reset or terminal packet set", () => {
    const snapshot = deriveMultiplierSnapshot(8_001);
    const later = deriveMultiplierSnapshot(60_000);

    expect(snapshot.elapsedMs).toBe(8_001);
    expect(snapshot.downstreamRequestsStarted).toBeGreaterThan(3);
    expect(snapshot.databaseReadsStarted).toBeGreaterThan(6);
    expect(snapshot.packets.length).toBeLessThan(24);
    expect(later.elapsedMs).toBe(60_000);
    expect(later.packets.length).toBeLessThan(24);
    expect(later.packets.some((packet) => packet.progress === 1)).toBe(false);
  });
});

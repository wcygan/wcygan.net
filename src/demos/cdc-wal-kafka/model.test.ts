import { describe, expect, it } from "vitest";
import {
  arrivalTimeForRecord,
  COMPLETE_WAL_KAFKA_SNAPSHOT,
  deriveWalKafkaSnapshot,
  INITIAL_WAL_KAFKA_SNAPSHOT,
  recordStartTime,
  WAL_KAFKA_ACCEPTANCE_DURATION_MS,
  WAL_KAFKA_DURATION_MS,
  WAL_KAFKA_INTRO_MS,
  WAL_KAFKA_RECORD_DURATION_MS,
  WAL_RECORDS,
} from "./model";

describe("deriveWalKafkaSnapshot", () => {
  it("starts with ordered committed WAL records and empty Kafka slots", () => {
    expect(INITIAL_WAL_KAFKA_SNAPSHOT.walRows).toMatchObject([
      { lsn: "24023128", status: "pending" },
      { lsn: "24023144", status: "pending" },
      { lsn: "24023160", status: "pending" },
    ]);
    expect(
      INITIAL_WAL_KAFKA_SNAPSHOT.kafkaRows.map((row) => row.status),
    ).toEqual(["empty", "empty", "empty"]);
    expect(INITIAL_WAL_KAFKA_SNAPSHOT.activeIndex).toBeUndefined();
    expect(INITIAL_WAL_KAFKA_SNAPSHOT.cursorLsn).toBeUndefined();
    expect(INITIAL_WAL_KAFKA_SNAPSHOT.payload).toBeUndefined();
  });

  it("preserves exact LSN order and UPDATE and DELETE meanings", () => {
    expect(WAL_RECORDS).toMatchObject([
      {
        lsn: "24023128",
        id: 42,
        operation: "UPDATE",
        summary: "UPDATE users #42",
        detail: "plan: free → pro",
      },
      {
        lsn: "24023144",
        id: 7,
        operation: "DELETE",
        summary: "DELETE users #7",
        detail: "row removed",
      },
      {
        lsn: "24023160",
        id: 9,
        operation: "UPDATE",
        summary: "UPDATE users #9",
        detail: "plan: free → team",
      },
    ]);
  });

  it("activates only the next WAL record and points the cursor to its LSN", () => {
    for (let recordIndex = 0; recordIndex < WAL_RECORDS.length; recordIndex++) {
      const snapshot = deriveWalKafkaSnapshot(recordStartTime(recordIndex) + 1);
      const activeRows = snapshot.walRows.filter(
        (row) => row.status === "active",
      );

      expect(activeRows).toHaveLength(1);
      expect(activeRows[0].lsn).toBe(WAL_RECORDS[recordIndex].lsn);
      expect(snapshot.activeIndex).toBe(recordIndex);
      expect(snapshot.cursorLsn).toBe(WAL_RECORDS[recordIndex].lsn);
    }
  });

  it("keeps each payload tied to its source record across both travel legs", () => {
    for (let recordIndex = 0; recordIndex < WAL_RECORDS.length; recordIndex++) {
      const startMs = recordStartTime(recordIndex);
      const inbound = deriveWalKafkaSnapshot(startMs + 1_300).payload;
      const outbound = deriveWalKafkaSnapshot(startMs + 3_400).payload;

      expect(inbound).toMatchObject({
        recordIndex,
        sourceLsn: WAL_RECORDS[recordIndex].lsn,
        operation: WAL_RECORDS[recordIndex].operation,
        leg: "wal-to-debezium",
        progress: 0.5,
      });
      expect(outbound).toMatchObject({
        recordIndex,
        sourceLsn: WAL_RECORDS[recordIndex].lsn,
        operation: WAL_RECORDS[recordIndex].operation,
        leg: "debezium-to-kafka",
        progress: 0.5,
      });
    }
  });

  it("gives every record two smooth 1.6s travel legs and clear processing holds", () => {
    expect(WAL_KAFKA_INTRO_MS).toBe(1_200);
    expect(WAL_KAFKA_RECORD_DURATION_MS).toBe(5_000);
    expect(WAL_KAFKA_DURATION_MS).toBe(16_200);

    const startMs = recordStartTime(0);
    expect(deriveWalKafkaSnapshot(startMs + 499).phase).toBe("selecting");
    expect(deriveWalKafkaSnapshot(startMs + 500).phase).toBe("reading");
    expect(deriveWalKafkaSnapshot(startMs + 2_099).phase).toBe("reading");
    expect(deriveWalKafkaSnapshot(startMs + 2_100).phase).toBe("encoding");
    expect(deriveWalKafkaSnapshot(startMs + 2_599).phase).toBe("encoding");
    expect(deriveWalKafkaSnapshot(startMs + 2_600).phase).toBe("emitting");
    expect(deriveWalKafkaSnapshot(startMs + 4_199).phase).toBe("emitting");
    expect(deriveWalKafkaSnapshot(startMs + 4_200).phase).toBe("accepting");
    expect(deriveWalKafkaSnapshot(startMs + 4_949).phase).toBe("accepting");
    expect(deriveWalKafkaSnapshot(startMs + 4_950).phase).toBe("settling");
  });

  it("appends each Kafka event at the exact payload-arrival timestamp", () => {
    for (let recordIndex = 0; recordIndex < WAL_RECORDS.length; recordIndex++) {
      const arrivalMs = arrivalTimeForRecord(recordIndex);
      const beforeArrival = deriveWalKafkaSnapshot(arrivalMs - 1);
      const atArrival = deriveWalKafkaSnapshot(arrivalMs);
      const afterArrival = deriveWalKafkaSnapshot(arrivalMs + 1);

      expect(beforeArrival.kafkaRows[recordIndex].event).toBeUndefined();
      expect(beforeArrival.appendedCount).toBe(recordIndex);
      expect(atArrival.appendedCount).toBe(recordIndex + 1);
      expect(atArrival.kafkaRows[recordIndex]).toMatchObject({
        slot: recordIndex,
        status: "accepting",
        event: {
          offset: recordIndex,
          sourceLsn: WAL_RECORDS[recordIndex].lsn,
          operation: WAL_RECORDS[recordIndex].operation,
        },
      });
      expect(atArrival.payload).toMatchObject({
        sourceLsn: WAL_RECORDS[recordIndex].lsn,
        leg: "arrived",
        progress: 1,
        opacity: 1,
      });
      expect(afterArrival.payload?.opacity).toBeLessThan(1);
    }
  });

  it("keeps every acceptance highlight active for the shared 750ms minimum", () => {
    expect(WAL_KAFKA_ACCEPTANCE_DURATION_MS).toBe(750);

    for (let recordIndex = 0; recordIndex < WAL_RECORDS.length; recordIndex++) {
      const arrivalMs = arrivalTimeForRecord(recordIndex);
      const atArrival = deriveWalKafkaSnapshot(arrivalMs);
      const atLastHighlightedMillisecond = deriveWalKafkaSnapshot(
        arrivalMs + WAL_KAFKA_ACCEPTANCE_DURATION_MS - 1,
      );
      const afterHighlight = deriveWalKafkaSnapshot(
        arrivalMs + WAL_KAFKA_ACCEPTANCE_DURATION_MS,
      );

      expect(atArrival.kafkaRows[recordIndex].status).toBe("accepting");
      expect(atLastHighlightedMillisecond.kafkaRows[recordIndex].status).toBe(
        "accepting",
      );
      expect(afterHighlight.kafkaRows[recordIndex].status).toBe("accepted");
    }
  });

  it("never skips an active record or exposes a non-prefix Kafka log", () => {
    for (let elapsedMs = 0; elapsedMs <= WAL_KAFKA_DURATION_MS; elapsedMs++) {
      const snapshot = deriveWalKafkaSnapshot(elapsedMs);
      const activeRows = snapshot.walRows.filter(
        (row) => row.status === "active",
      );
      const visibleOffsets = snapshot.kafkaRows.flatMap(
        (row) => row.event?.offset ?? [],
      );

      expect(activeRows.length).toBeLessThanOrEqual(1);
      expect(visibleOffsets).toEqual(
        Array.from({ length: snapshot.appendedCount }, (_, index) => index),
      );
    }
  });

  it("settles on the exact LSN-to-offset mapping", () => {
    expect(
      COMPLETE_WAL_KAFKA_SNAPSHOT.kafkaRows.map((row) => ({
        lsn: row.event?.sourceLsn,
        offset: row.event?.offset,
        status: row.status,
      })),
    ).toEqual([
      { lsn: "24023128", offset: 0, status: "accepted" },
      { lsn: "24023144", offset: 1, status: "accepted" },
      { lsn: "24023160", offset: 2, status: "accepted" },
    ]);
    expect(COMPLETE_WAL_KAFKA_SNAPSHOT.cursorLsn).toBe("24023160");
    expect(COMPLETE_WAL_KAFKA_SNAPSHOT.payload).toBeUndefined();
    expect(COMPLETE_WAL_KAFKA_SNAPSHOT.isComplete).toBe(true);
  });

  it("clamps invalid progress to a safe initial or final snapshot", () => {
    expect(deriveWalKafkaSnapshot(-100)).toEqual(INITIAL_WAL_KAFKA_SNAPSHOT);
    expect(deriveWalKafkaSnapshot(Number.NEGATIVE_INFINITY)).toEqual(
      INITIAL_WAL_KAFKA_SNAPSHOT,
    );
    expect(deriveWalKafkaSnapshot(Number.NaN)).toEqual(
      INITIAL_WAL_KAFKA_SNAPSHOT,
    );
    expect(deriveWalKafkaSnapshot(WAL_KAFKA_DURATION_MS + 100)).toEqual(
      COMPLETE_WAL_KAFKA_SNAPSHOT,
    );
    expect(deriveWalKafkaSnapshot(Number.POSITIVE_INFINITY)).toEqual(
      COMPLETE_WAL_KAFKA_SNAPSHOT,
    );
  });

  it("uses the complete neutral snapshot for reduced motion", () => {
    const reducedMotionSnapshot = deriveWalKafkaSnapshot(WAL_KAFKA_DURATION_MS);

    expect(reducedMotionSnapshot).toEqual(COMPLETE_WAL_KAFKA_SNAPSHOT);
    expect(
      reducedMotionSnapshot.kafkaRows.some((row) => row.status === "accepting"),
    ).toBe(false);
    expect(reducedMotionSnapshot.payload).toBeUndefined();
  });
});

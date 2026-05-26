import { describe, expect, it } from "vitest";
import { deriveWalKafkaSnapshot, progressForProducedCount } from "./model";

describe("deriveWalKafkaSnapshot", () => {
  it("starts by reading the first WAL update", () => {
    const snapshot = deriveWalKafkaSnapshot({ progress: 0, playing: false });

    expect(snapshot.activeUpdate.lsn).toBe("24023128");
    expect(snapshot.emittedCount).toBe(0);
    expect(snapshot.updates.map((update) => update.status)).toEqual([
      "reading",
      "pending",
      "pending",
    ]);
  });

  it("assigns compact Kafka offsets to produced events", () => {
    const snapshot = deriveWalKafkaSnapshot({
      progress: progressForProducedCount(2),
      playing: false,
    });

    expect(snapshot.emittedCount).toBe(2);
    expect(snapshot.updates.map((update) => update.offset)).toEqual([
      0,
      1,
      undefined,
    ]);
  });

  it("models the second WAL entry as a delete event", () => {
    const snapshot = deriveWalKafkaSnapshot({
      progress: progressForProducedCount(2),
      playing: false,
    });

    expect(snapshot.updates[1]).toMatchObject({
      operation: "DELETE",
      walSummary: "DELETE users #7",
      kafkaSummary: "user 7 deleted",
      offset: 1,
    });
  });

  it("shows a Kafka-bound packet while Debezium emits the active update", () => {
    const snapshot = deriveWalKafkaSnapshot({
      progress: 0.18,
      playing: true,
    });

    expect(snapshot.packet?.stage).toBe("debezium-to-kafka");
    expect(snapshot.packet?.update.lsn).toBe("24023128");
  });
});

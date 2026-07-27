import { describe, expect, it } from "vitest";
import { CHANGE_HIGHLIGHT_MIN_DURATION_MS } from "../shared/change-highlight";
import {
  CASCADE_ENTITIES,
  CASCADE_PURGE_EVENTS,
  type CascadeEntityKey,
  type CascadePurgeEventKey,
  COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT,
  DATA_RETENTION_CASCADE_DURATION_MS,
  DATA_RETENTION_CASCADE_EVENT_STAGGER_MS,
  DATA_RETENTION_CASCADE_EVENT_TRAVEL_DURATION_MS,
  DATA_RETENTION_CASCADE_FINAL_HOLD_MS,
  DATA_RETENTION_CASCADE_HIGHLIGHT_DURATION_MS,
  DATA_RETENTION_CASCADE_INTRO_MS,
  DATA_RETENTION_CASCADE_SETTLED_AT_MS,
  DATA_RETENTION_CASCADE_SUMMARY,
  type DataRetentionCascadeSnapshot,
  deriveDataRetentionCascadeSnapshot,
  eventTimeFor,
  INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT,
  REDUCED_MOTION_DATA_RETENTION_CASCADE_SNAPSHOT,
} from "./model";

function entity(snapshot: DataRetentionCascadeSnapshot, key: CascadeEntityKey) {
  const match = snapshot.entities.find((candidate) => candidate.key === key);
  if (!match) throw new Error(`Missing entity ${key}`);
  return match;
}

function event(
  snapshot: DataRetentionCascadeSnapshot,
  key: CascadePurgeEventKey,
) {
  const match = snapshot.events.find((candidate) => candidate.key === key);
  if (!match) throw new Error(`Missing event ${key}`);
  return match;
}

describe("deriveDataRetentionCascadeSnapshot", () => {
  it("uses a finite ten-second timeline with perceptible causal beats", () => {
    expect(DATA_RETENTION_CASCADE_INTRO_MS).toBe(1_200);
    expect(DATA_RETENTION_CASCADE_EVENT_TRAVEL_DURATION_MS).toBe(2_200);
    expect(DATA_RETENTION_CASCADE_EVENT_STAGGER_MS).toBe(300);
    expect(DATA_RETENTION_CASCADE_HIGHLIGHT_DURATION_MS).toBe(900);
    expect(DATA_RETENTION_CASCADE_HIGHLIGHT_DURATION_MS).toBeGreaterThanOrEqual(
      CHANGE_HIGHLIGHT_MIN_DURATION_MS,
    );
    expect(DATA_RETENTION_CASCADE_SETTLED_AT_MS).toBe(8_900);
    expect(DATA_RETENTION_CASCADE_FINAL_HOLD_MS).toBe(1_100);
    expect(DATA_RETENTION_CASCADE_DURATION_MS).toBe(10_000);
  });

  it("starts with the exact customer, orders, and shipments live", () => {
    expect(
      INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT.entities.map(
        ({ label, state }) => ({ label, state }),
      ),
    ).toEqual([
      { label: "Customer #91", state: "live" },
      { label: "Order #7012", state: "live" },
      { label: "Order #7013", state: "live" },
      { label: "Shipment #5012", state: "live" },
      { label: "Shipment #5013", state: "live" },
    ]);
    expect(
      INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT.events.every(
        (purgeEvent) =>
          purgeEvent.status === "pending" && !purgeEvent.isVisible,
      ),
    ).toBe(true);
    expect(INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT.deletedCounts).toEqual({
      customers: 0,
      orders: 0,
      shipments: 0,
    });
    expect(INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT.summary).toBeUndefined();
  });

  it("holds the customer deletion highlight before emitting purge events", () => {
    const beforeDeletion = deriveDataRetentionCascadeSnapshot(1_199);
    const deletionStarts = deriveDataRetentionCascadeSnapshot(1_200);
    const lastHighlightedMillisecond =
      deriveDataRetentionCascadeSnapshot(2_099);
    const deleted = deriveDataRetentionCascadeSnapshot(2_100);

    expect(entity(beforeDeletion, "customer-91").state).toBe("live");
    expect(entity(deletionStarts, "customer-91")).toMatchObject({
      state: "deleting",
      deletionProgress: 0,
      isHighlighted: true,
    });
    expect(entity(lastHighlightedMillisecond, "customer-91")).toMatchObject({
      state: "deleting",
      isHighlighted: true,
    });
    expect(entity(deleted, "customer-91")).toMatchObject({
      state: "deleted",
      deletionProgress: 1,
      isHighlighted: false,
    });
    expect(event(deleted, "customer-91-to-order-7012")).toMatchObject({
      status: "traveling",
      travelProgress: 0,
      isVisible: true,
    });
    expect(event(deleted, "customer-91-to-order-7013")).toMatchObject({
      status: "queued",
      travelProgress: 0,
      isVisible: true,
    });
  });

  it("keeps every event tied to its source and matching child", () => {
    expect(
      CASCADE_PURGE_EVENTS.map(
        ({ sourceKey, targetKey, label, emittedAtMs, travelStartMs }) => ({
          sourceKey,
          targetKey,
          label,
          emittedAtMs,
          travelStartMs,
        }),
      ),
    ).toEqual([
      {
        sourceKey: "customer-91",
        targetKey: "order-7012",
        label: "Customer #91 deleted",
        emittedAtMs: 2_100,
        travelStartMs: 2_100,
      },
      {
        sourceKey: "customer-91",
        targetKey: "order-7013",
        label: "Customer #91 deleted",
        emittedAtMs: 2_100,
        travelStartMs: 2_400,
      },
      {
        sourceKey: "order-7012",
        targetKey: "shipment-5012",
        label: "Order #7012 deleted",
        emittedAtMs: 5_500,
        travelStartMs: 5_500,
      },
      {
        sourceKey: "order-7013",
        targetKey: "shipment-5013",
        label: "Order #7013 deleted",
        emittedAtMs: 5_500,
        travelStartMs: 5_800,
      },
    ]);
  });

  it("moves event tokens linearly and exposes local arrival progress", () => {
    const key = "customer-91-to-order-7012";
    const timing = eventTimeFor(key);
    const travelMidpoint =
      timing.travelStartMs + (timing.arriveAtMs - timing.travelStartMs) / 2;
    const arrivalMidpoint =
      timing.arriveAtMs + (timing.deliveredAtMs - timing.arriveAtMs) / 2;

    expect(
      event(deriveDataRetentionCascadeSnapshot(travelMidpoint), key),
    ).toMatchObject({
      status: "traveling",
      localProgress: 0.5,
      travelProgress: 0.5,
      arrivalProgress: 0,
      isVisible: true,
    });
    expect(
      event(deriveDataRetentionCascadeSnapshot(arrivalMidpoint), key),
    ).toMatchObject({
      status: "arrived",
      localProgress: 0.5,
      travelProgress: 1,
      arrivalProgress: 0.5,
      isVisible: true,
    });
    expect(
      event(deriveDataRetentionCascadeSnapshot(timing.deliveredAtMs), key),
    ).toMatchObject({
      status: "delivered",
      localProgress: 1,
      travelProgress: 1,
      arrivalProgress: 1,
      isVisible: false,
    });
  });

  it("delivers both customer purge events before either order tombstones", () => {
    const orderEvents = CASCADE_PURGE_EVENTS.filter(
      (purgeEvent) =>
        purgeEvent.targetKey === "order-7012" ||
        purgeEvent.targetKey === "order-7013",
    );
    const latestArrivalMs = Math.max(
      ...orderEvents.map((purgeEvent) => purgeEvent.arriveAtMs),
    );
    const earliestTombstoneMs = Math.min(
      ...orderEvents.map((purgeEvent) => purgeEvent.deliveredAtMs),
    );
    const bothArrived = deriveDataRetentionCascadeSnapshot(latestArrivalMs);

    expect(latestArrivalMs).toBeLessThan(earliestTombstoneMs);
    expect(entity(bothArrived, "order-7012").state).toBe("receiving");
    expect(entity(bothArrived, "order-7013").state).toBe("receiving");
  });

  it("tombstones each child only after its own purge event arrives", () => {
    for (const purgeEvent of CASCADE_PURGE_EVENTS) {
      expect(
        purgeEvent.deliveredAtMs - purgeEvent.arriveAtMs,
      ).toBeGreaterThanOrEqual(DATA_RETENTION_CASCADE_HIGHLIGHT_DURATION_MS);

      const emitted = deriveDataRetentionCascadeSnapshot(
        purgeEvent.emittedAtMs,
      );
      const beforeArrival = deriveDataRetentionCascadeSnapshot(
        purgeEvent.arriveAtMs - 1,
      );
      const atArrival = deriveDataRetentionCascadeSnapshot(
        purgeEvent.arriveAtMs,
      );
      const lastHighlightedMillisecond = deriveDataRetentionCascadeSnapshot(
        purgeEvent.deliveredAtMs - 1,
      );
      const delivered = deriveDataRetentionCascadeSnapshot(
        purgeEvent.deliveredAtMs,
      );

      expect(entity(emitted, purgeEvent.sourceKey).state).toBe("deleted");
      expect(entity(beforeArrival, purgeEvent.targetKey).state).toBe("live");
      expect(entity(atArrival, purgeEvent.targetKey)).toMatchObject({
        state: "receiving",
        deletionProgress: 0,
        isHighlighted: true,
      });
      expect(event(atArrival, purgeEvent.key).status).toBe("arrived");
      expect(
        entity(lastHighlightedMillisecond, purgeEvent.targetKey),
      ).toMatchObject({
        state: "receiving",
        isHighlighted: true,
      });
      expect(entity(delivered, purgeEvent.targetKey)).toMatchObject({
        state: "deleted",
        deletionProgress: 1,
        isHighlighted: false,
      });
      expect(event(delivered, purgeEvent.key).status).toBe("delivered");
    }
  });

  it("emits each shipment event from the matching tombstoned order", () => {
    const beforeOrdersTombstone = deriveDataRetentionCascadeSnapshot(5_499);
    const ordersTombstone = deriveDataRetentionCascadeSnapshot(5_500);
    const secondShipmentEventStarts = deriveDataRetentionCascadeSnapshot(5_800);

    expect(entity(beforeOrdersTombstone, "order-7012").state).toBe("receiving");
    expect(entity(beforeOrdersTombstone, "order-7013").state).toBe("receiving");
    expect(
      beforeOrdersTombstone.events
        .filter((purgeEvent) => purgeEvent.targetKey.startsWith("shipment"))
        .every((purgeEvent) => purgeEvent.status === "pending"),
    ).toBe(true);

    expect(entity(ordersTombstone, "order-7012").state).toBe("deleted");
    expect(entity(ordersTombstone, "order-7013").state).toBe("deleted");
    expect(event(ordersTombstone, "order-7012-to-shipment-5012")).toMatchObject(
      {
        sourceKey: "order-7012",
        targetKey: "shipment-5012",
        status: "traveling",
        travelProgress: 0,
      },
    );
    expect(event(ordersTombstone, "order-7013-to-shipment-5013").status).toBe(
      "queued",
    );

    expect(
      event(secondShipmentEventStarts, "order-7013-to-shipment-5013"),
    ).toMatchObject({
      sourceKey: "order-7013",
      targetKey: "shipment-5013",
      status: "traveling",
      travelProgress: 0,
    });
    expect(
      event(secondShipmentEventStarts, "order-7012-to-shipment-5012").status,
    ).toBe("traveling");
    expect(entity(secondShipmentEventStarts, "shipment-5012").state).toBe(
      "live",
    );
    expect(entity(secondShipmentEventStarts, "shipment-5013").state).toBe(
      "live",
    );
    expect(
      event(beforeOrdersTombstone, "order-7013-to-shipment-5013").status,
    ).toBe("pending");
  });

  it("preserves the parent-before-child invariant at every millisecond", () => {
    for (
      let elapsedMs = 0;
      elapsedMs <= DATA_RETENTION_CASCADE_DURATION_MS;
      elapsedMs += 1
    ) {
      const snapshot = deriveDataRetentionCascadeSnapshot(elapsedMs);

      for (const child of snapshot.entities) {
        if (!child.parentKey || child.state !== "deleted") continue;

        const parent = entity(snapshot, child.parentKey);
        const incomingEvent = snapshot.events.find(
          (candidate) => candidate.targetKey === child.key,
        );

        expect(parent.state).toBe("deleted");
        expect(incomingEvent?.status).toBe("delivered");
      }
    }
  });

  it("settles on the quantified summary and holds it through completion", () => {
    const settled = deriveDataRetentionCascadeSnapshot(
      DATA_RETENTION_CASCADE_SETTLED_AT_MS,
    );

    expect(settled.phase).toBe("settling");
    expect(settled.deletedCounts).toEqual({
      customers: 1,
      orders: 2,
      shipments: 2,
    });
    expect(
      settled.entities.every((candidate) => candidate.state === "deleted"),
    ).toBe(true);
    expect(settled.events.every((candidate) => !candidate.isVisible)).toBe(
      true,
    );
    expect(settled.summary).toBe("1 customer → 2 orders → 2 shipments deleted");
    expect(settled.summary).toBe(DATA_RETENTION_CASCADE_SUMMARY);
    expect(settled.isSettled).toBe(true);
    expect(settled.isComplete).toBe(false);

    expect(COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT).toMatchObject({
      phase: "complete",
      summary: DATA_RETENTION_CASCADE_SUMMARY,
      isSettled: true,
      isComplete: true,
    });
  });

  it("uses the complete understandable state for reduced motion", () => {
    expect(REDUCED_MOTION_DATA_RETENTION_CASCADE_SNAPSHOT).toEqual(
      COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT,
    );
    expect(
      REDUCED_MOTION_DATA_RETENTION_CASCADE_SNAPSHOT.events.some(
        (purgeEvent) => purgeEvent.isVisible,
      ),
    ).toBe(false);
    expect(
      REDUCED_MOTION_DATA_RETENTION_CASCADE_SNAPSHOT.entities.every(
        (candidate) => !candidate.isHighlighted,
      ),
    ).toBe(true);
  });

  it("clamps invalid elapsed time to a deterministic endpoint", () => {
    expect(deriveDataRetentionCascadeSnapshot(-100)).toEqual(
      INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT,
    );
    expect(
      deriveDataRetentionCascadeSnapshot(Number.NEGATIVE_INFINITY),
    ).toEqual(INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT);
    expect(deriveDataRetentionCascadeSnapshot(Number.NaN)).toEqual(
      INITIAL_DATA_RETENTION_CASCADE_SNAPSHOT,
    );
    expect(
      deriveDataRetentionCascadeSnapshot(
        DATA_RETENTION_CASCADE_DURATION_MS + 100,
      ),
    ).toEqual(COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT);
    expect(
      deriveDataRetentionCascadeSnapshot(Number.POSITIVE_INFINITY),
    ).toEqual(COMPLETE_DATA_RETENTION_CASCADE_SNAPSHOT);
  });

  it("keeps the authored hierarchy complete and unambiguous", () => {
    expect(CASCADE_ENTITIES).toHaveLength(5);
    expect(
      CASCADE_ENTITIES.map(({ key, parentKey }) => ({ key, parentKey })),
    ).toEqual([
      { key: "customer-91", parentKey: undefined },
      { key: "order-7012", parentKey: "customer-91" },
      { key: "order-7013", parentKey: "customer-91" },
      { key: "shipment-5012", parentKey: "order-7012" },
      { key: "shipment-5013", parentKey: "order-7013" },
    ]);
  });
});

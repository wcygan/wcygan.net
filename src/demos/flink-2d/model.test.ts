import { describe, expect, it } from "vitest";
import {
  advancePressure,
  boundedAt,
  dataflowAt,
  eventTimeAt,
  initialPressure,
  sinkAt,
  type PressureState,
} from "./model";

describe("keyed purchase totals", () => {
  it("reads a purchase before changing state, then emits the updated total", () => {
    const read = dataflowAt(1);
    expect(read.sourceRead).toBe(1);
    expect(read.totals).toEqual({ Ada: 0, Bea: 0 });
    expect(read.updates).toEqual([]);

    const aggregate = dataflowAt(2);
    expect(aggregate.sourceRead).toBe(1);
    expect(aggregate.totals).toEqual({ Ada: 12, Bea: 0 });
    expect(aggregate.updates).toEqual([]);

    const emit = dataflowAt(3);
    expect(emit.sourceRead).toBe(1);
    expect(emit.totals).toEqual({ Ada: 12, Bea: 0 });
    expect(emit.updates).toEqual([{ customer: "Ada", total: 12 }]);
  });

  it("keeps each customer's state and publishes totals after all three purchases", () => {
    const result = dataflowAt(9);

    expect(result.sourceRead).toBe(3);
    expect(result.totals).toEqual({ Ada: 20, Bea: 7 });
    expect(result.updates).toEqual([
      { customer: "Ada", total: 12 },
      { customer: "Bea", total: 7 },
      { customer: "Ada", total: 20 },
    ]);
    expect(result.complete).toBe(true);
  });
});

describe("bounded and unbounded inputs", () => {
  it("finishes the four-record file while the open stream receives more records", () => {
    expect(boundedAt(3).fileComplete).toBe(false);

    const fileEnd = boundedAt(4);
    expect(fileEnd.fileProcessed).toBe(4);
    expect(fileEnd.fileComplete).toBe(true);
    expect(fileEnd.streamProcessed).toBe(4);
    expect(fileEnd.streamOpen).toBe(true);

    const later = boundedAt(6);
    expect(later.fileProcessed).toBe(4);
    expect(later.fileComplete).toBe(true);
    expect(later.streamProcessed).toBe(6);
    expect(later.streamOpen).toBe(true);
    expect(later.demonstrationComplete).toBe(true);
  });
});

describe("event time and watermarks", () => {
  it("keeps the watermark monotone when timestamps arrive out of order", () => {
    const result = eventTimeAt(5);

    expect(result.arrivals.map((arrival) => arrival.eventTime)).toEqual([
      1, 4, 2, 7, 3,
    ]);
    expect(result.arrivals.map((arrival) => arrival.watermark)).toEqual([
      -1, 2, 2, 5, 5,
    ]);
  });

  it("includes the out-of-order event before closure and discards the later arrival", () => {
    const beforeClosure = eventTimeAt(3);
    expect(beforeClosure.watermark).toBe(2);
    expect(beforeClosure.windowClosed).toBe(false);
    expect(beforeClosure.accepted).toEqual([1, 4, 2]);

    const atClosure = eventTimeAt(4);
    expect(atClosure.watermark).toBe(5);
    expect(atClosure.windowClosed).toBe(true);
    expect(atClosure.accepted).toEqual([1, 4, 2]);
    expect(atClosure.nextWindowCount).toBe(1);
    expect(atClosure.discarded).toEqual([]);

    const lateArrival = eventTimeAt(5);
    expect(lateArrival.accepted).toEqual([1, 4, 2]);
    expect(lateArrival.discarded).toEqual([3]);
    expect(lateArrival.watermark).toBe(5);
    expect(lateArrival.windowClosed).toBe(true);
  });
});

function drainPressure(sinkCapacity: 1 | 3) {
  const states: PressureState[] = [initialPressure()];
  while (states.at(-1)!.completed < 12 && states.length < 100) {
    states.push(advancePressure(states.at(-1)!, sinkCapacity));
  }
  return states;
}

describe("backpressure", () => {
  it.each([1, 3] as const)(
    "conserves the finite input and bounds the buffer with sink capacity %s",
    (sinkCapacity) => {
      const states = drainPressure(sinkCapacity);

      for (const state of states) {
        expect(state.unread + state.buffered + state.completed).toBe(12);
        expect(state.unread).toBeGreaterThanOrEqual(0);
        expect(state.completed).toBeGreaterThanOrEqual(0);
        expect(state.buffered).toBeGreaterThanOrEqual(0);
        expect(state.buffered).toBeLessThanOrEqual(4);
      }

      const drained = states.at(-1)!;
      expect(drained.unread).toBe(0);
      expect(drained.buffered).toBe(0);
      expect(drained.completed).toBe(12);
    },
  );

  it("slows the source and takes longer to drain when the sink is slower", () => {
    const slow = drainPressure(1);
    const fast = drainPressure(3);

    expect(slow.some((state) => state.throttled)).toBe(true);
    expect(slow.at(-1)!.step).toBeGreaterThan(fast.at(-1)!.step);
    expect(slow.at(-1)!.completed).toBe(fast.at(-1)!.completed);
  });
});

describe("sink replay", () => {
  it("appends seven attempts but stores five rows with stable-key deduplication", () => {
    const result = sinkAt(7);

    expect(result.appended).toEqual([1, 2, 3, 4, 5, 4, 5]);
    expect(result.appended).toHaveLength(7);
    expect(result.unique).toEqual([1, 2, 3, 4, 5]);
    expect(result.unique).toHaveLength(5);
    expect(result.ignored).toBe(2);
  });

  it("preserves committed rows throughout replay", () => {
    const committed = sinkAt(5);
    expect(committed.replaying).toBe(false);

    for (const step of [6, 7]) {
      const replay = sinkAt(step);
      expect(replay.replaying).toBe(true);
      expect(replay.appended.slice(0, committed.appended.length)).toEqual(
        committed.appended,
      );
      expect(replay.unique).toEqual(committed.unique);
    }
  });
});

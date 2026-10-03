import { describe, expect, it } from "vitest";
import {
  changeMetricState,
  classicHistogram,
  counterSamples,
  evaluateRecordingRule,
  initialMetricState,
  initialRecordingState,
  INITIAL_OBSERVATIONS,
  RAW_REQUEST_SERIES,
  resetAdjustedSlope,
  scrapeSnapshot,
} from "~/demos/prometheus/2d-model";

describe("Prometheus teaching models", () => {
  it("stores a counter only after a successful scrape, and up=0 after failure", () => {
    expect(scrapeSnapshot(2, false).samples).toEqual([
      { time: 0, up: 1, requests: 8 },
    ]);
    expect(scrapeSnapshot(3, false).samples).toEqual([
      { time: 0, up: 1, requests: 8 },
      { time: 15, up: 1, requests: 12 },
    ]);
    expect(scrapeSnapshot(3, true).samples).toEqual([
      { time: 0, up: 1, requests: 8 },
      { time: 15, up: 0, requests: null },
    ]);
    expect(scrapeSnapshot(100, false).samples).toHaveLength(2);
  });

  it("counts arrivals cumulatively while the in-flight gauge rises and falls", () => {
    const idle = initialMetricState();
    const first = changeMetricState(idle, "start");
    const second = changeMetricState(first, "start");
    const finished = changeMetricState(second, "finish");
    expect(finished.requests).toBe(2);
    expect(finished.inFlight).toBe(1);
    expect(finished.history.map((point) => point.requests)).toEqual([
      0, 1, 2, 2,
    ]);
    expect(finished.history.map((point) => point.inFlight)).toEqual([
      0, 1, 2, 1,
    ]);
    expect(idle.history).toHaveLength(1);
  });

  it("bounds the request demo and never allows a negative gauge", () => {
    let state = initialMetricState();
    expect(changeMetricState(state, "finish")).toBe(state);
    for (let index = 0; index < 100; index++) {
      state = changeMetricState(state, "start");
      state = changeMetricState(state, "finish");
    }
    expect(state.requests).toBe(12);
    expect(state.inFlight).toBe(0);
    expect(state.history).toHaveLength(25);
    let full = initialMetricState();
    for (let index = 0; index < 5; index++)
      full = changeMetricState(full, "start");
    expect(changeMetricState(full, "start")).toBe(full);
  });

  it("corrects a counter reset before calculating the simplified sampled slope", () => {
    const result = resetAdjustedSlope(counterSamples(true));
    expect(result.gain).toBe(100);
    expect(result.perSecond).toBeCloseTo(100 / 60);
    expect(result.rawPerSecond).toBe(-1);
    expect(result.adjusted.map((sample) => sample.value)).toEqual([
      100, 130, 160, 170, 200,
    ]);
    const steady = resetAdjustedSlope(counterSamples(false));
    expect(steady.gain).toBe(120);
    expect(steady.perSecond).toBe(2);
    expect(steady.rawPerSecond).toBe(2);
    expect(resetAdjustedSlope([]).perSecond).toBe(0);
  });

  it("makes histogram buckets cumulative and keeps count/sum consistent", () => {
    const original = classicHistogram(INITIAL_OBSERVATIONS);
    expect(original.buckets.map((bucket) => bucket.count)).toEqual([
      2, 4, 6, 8, 8,
    ]);
    expect(original.count).toBe(8);
    expect(original.sum).toBeCloseTo(2.91);
    const slow = classicHistogram([...INITIAL_OBSERVATIONS, 1.2]);
    expect(slow.buckets.map((bucket) => bucket.count)).toEqual([2, 4, 6, 8, 9]);
    expect(slow.count).toBe(9);
    expect(slow.sum).toBeCloseTo(4.11);
    expect(
      classicHistogram([0.1]).buckets.map((bucket) => bucket.count),
    ).toEqual([1, 1, 1, 1, 1]);
  });

  it("appends one sample per method at each recording evaluation without mutating inputs", () => {
    const originalLabels = JSON.stringify(RAW_REQUEST_SERIES);
    const initial = initialRecordingState();
    const first = evaluateRecordingRule(initial);
    const second = evaluateRecordingRule(first);
    expect(first.series.map((series) => series.samples)).toEqual([
      [{ time: 0, value: 10 }],
      [{ time: 0, value: 3 }],
    ]);
    expect(second.series).toEqual([
      {
        method: "GET",
        samples: [
          { time: 0, value: 10 },
          { time: 15, value: 13 },
        ],
      },
      {
        method: "POST",
        samples: [
          { time: 0, value: 3 },
          { time: 15, value: 5 },
        ],
      },
    ]);
    expect(initial.series.every((series) => series.samples.length === 0)).toBe(
      true,
    );
    expect(first.series.every((series) => series.samples.length === 1)).toBe(
      true,
    );
    expect(JSON.stringify(RAW_REQUEST_SERIES)).toBe(originalLabels);
    const final = evaluateRecordingRule(second);
    expect(final.series.map((series) => series.samples.at(-1)?.value)).toEqual([
      16, 7,
    ]);
    expect(evaluateRecordingRule(final)).toBe(final);
  });
});

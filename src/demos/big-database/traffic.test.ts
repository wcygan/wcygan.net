import { expect, it } from "vitest";
import { trafficSamples, trafficSummary } from "./traffic";

it("preserves the daily arithmetic means and requested peaks over 24 hours", () => {
  expect(trafficSamples[0].hour).toBe(0);
  expect(trafficSamples.at(-1)?.hour).toBe(24);
  for (const series of ["reads", "writes"] as const) {
    const integral = trafficSamples.slice(1).reduce((sum, sample, index) => {
      const previous = trafficSamples[index];
      return (
        sum +
        ((sample[series] + previous[series]) / 2) *
          (sample.hour - previous.hour)
      );
    }, 0);
    expect(integral / 24).toBeCloseTo(trafficSummary[series].average, 8);
    expect(Math.max(...trafficSamples.map((sample) => sample[series]))).toBe(
      trafficSummary[series].peak,
    );
    expect(trafficSamples.every((sample) => sample[series] > 0)).toBe(true);
  }
});

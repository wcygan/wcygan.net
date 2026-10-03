import { describe, expect, it } from "vitest";
import {
  dictionaryRoute,
  partQueryRoute,
  partitionRoute,
  queryRoute,
  type Point,
} from "./model";
import {
  buildRoutePath,
  sampleRoutePath,
  spatialPassFrame,
  travelFraction,
} from "./motion";

describe("route arc-length sampling", () => {
  it("moves by distance through unequal segments instead of by vertex index", () => {
    const path = buildRoutePath([
      [0, 0, 0],
      [3, 0, 0],
      [3, 4, 0],
    ]);
    expect(path.totalLength).toBe(7);
    expect(path.segments.map((segment) => segment.length)).toEqual([3, 4]);
    expect(
      path.segments.map((segment) => [
        segment.startDistance,
        segment.endDistance,
      ]),
    ).toEqual([
      [0, 3],
      [3, 7],
    ]);
    expect(sampleRoutePath(path, 3 / 7)).toEqual([3, 0, 0]);
    expect(sampleRoutePath(path, 0.5)).toEqual([3, 0.5, 0]);
    expect(sampleRoutePath(path, 6 / 7)).toEqual([3, 3, 0]);
    expect(sampleRoutePath(path, 1)).toEqual([3, 4, 0]);
  });

  it("handles diagonal segments with three-dimensional Euclidean distance", () => {
    const path = buildRoutePath([
      [1, 2, 3],
      [3, 5, 9],
    ]);
    expect(path.totalLength).toBe(7);
    expect(sampleRoutePath(path, 0.5)).toEqual([2, 3.5, 6]);
  });

  it("ignores adjacent duplicate vertices without changing the traveled path", () => {
    const path = buildRoutePath([
      [0, 0, 0],
      [0, 0, 0],
      [3, 0, 0],
      [3, 0, 0],
      [3, 4, 0],
      [3, 4, 0],
    ]);
    expect(path.segments).toHaveLength(2);
    expect(path.totalLength).toBe(7);
    expect(sampleRoutePath(path, 0.5)).toEqual([3, 0.5, 0]);
    expect(sampleRoutePath(path, 1)).toEqual([3, 4, 0]);
  });

  it.each([1, 4])(
    "keeps a stationary route with %s identical points at its endpoint",
    (count) => {
      const point: Point = [2, -1, 3];
      const path = buildRoutePath(Array.from({ length: count }, () => point));
      expect(path.segments).toEqual([]);
      expect(path.totalLength).toBe(0);
      for (const fraction of [-1, 0, 0.5, 1, Infinity, NaN]) {
        expect(sampleRoutePath(path, fraction)).toEqual(point);
      }
    },
  );

  it("clamps sampling to exact endpoints and treats NaN as the start", () => {
    const path = buildRoutePath([
      [2, 1, 3],
      [4, 5, 6],
    ]);
    for (const fraction of [-Infinity, -2, 0, NaN]) {
      expect(sampleRoutePath(path, fraction)).toEqual([2, 1, 3]);
    }
    for (const fraction of [1, 2, Infinity]) {
      expect(sampleRoutePath(path, fraction)).toEqual([4, 5, 6]);
    }
  });

  it("does not mutate or retain the caller's vertices", () => {
    const points: Point[] = [
      [0, 0, 0],
      [3, 0, 0],
    ];
    const before = JSON.stringify(points);
    const path = buildRoutePath(points);
    sampleRoutePath(path, 0.5);
    expect(JSON.stringify(points)).toBe(before);
    points[0][0] = 20;
    points[1][0] = 30;
    expect(sampleRoutePath(path, 0)).toEqual([0, 0, 0]);
    expect(sampleRoutePath(path, 1)).toEqual([3, 0, 0]);
    const sample = sampleRoutePath(path, 1);
    sample[0] = 100;
    expect(path.end).toEqual([3, 0, 0]);
  });

  it("rejects an empty route with a clear error", () => {
    expect(() => buildRoutePath([])).toThrow(RangeError);
    expect(() => buildRoutePath([])).toThrow("at least one point");
  });

  it.each([
    ["part", partQueryRoute(1, 2)],
    ["dictionary", dictionaryRoute(10, 0)],
    ["partition", partitionRoute(1)],
    ["cluster", queryRoute(0, "B")],
  ] as const)(
    "preserves both surface-port endpoints of the %s route",
    (_, route) => {
      const path = buildRoutePath(route);
      expect(sampleRoutePath(path, 0)).toEqual(route[0]);
      expect(sampleRoutePath(path, 1)).toEqual(route[route.length - 1]);
      expect(path.totalLength).toBeGreaterThan(0);
      for (let index = 0; index <= 20; index++) {
        expect(sampleRoutePath(path, index / 20).every(Number.isFinite)).toBe(
          true,
        );
      }
    },
  );
});

describe("one finite packet pass", () => {
  it("normalizes travel before the end and clamps negative beat progress", () => {
    expect(travelFraction(-1)).toBe(0);
    expect(travelFraction(0)).toBe(0);
    expect(travelFraction(0.31)).toBe(0.5);
    expect(travelFraction(0.619)).toBeLessThan(1);
    expect(travelFraction(0.2, 0.4)).toBe(0.5);
  });

  it.each([0.62, 0.8, 1, 2, NaN, Infinity, -Infinity])(
    "removes the packet for completed or invalid beat fraction %s",
    (fraction) => {
      expect(travelFraction(fraction)).toBeNull();
    },
  );

  it.each([0, -1, NaN, Infinity, -Infinity])(
    "rejects invalid travel end %s without producing invalid geometry",
    (end) => {
      expect(travelFraction(0.2, end)).toBeNull();
    },
  );

  it("does not restart after the pass finishes", () => {
    const fractions = [0, 0.31, 0.61, 0.62, 0.7, 1].map((fraction) =>
      travelFraction(fraction),
    );
    expect(fractions.slice(0, 3).every((fraction) => fraction !== null)).toBe(
      true,
    );
    expect(fractions.slice(3)).toEqual([null, null, null]);
  });
});

describe("spatial pass visibility and scheduling", () => {
  it("preserves an in-flight route pose through pause and resume", () => {
    const path = buildRoutePath(queryRoute(0, "B"));
    const playing = spatialPassFrame(0.31, true, false, false);
    const paused = spatialPassFrame(0.31, false, false, false);
    const resumed = spatialPassFrame(0.31, true, false, false);
    expect(playing.fraction).toBe(0.5);
    expect(paused.fraction).toBe(playing.fraction);
    expect(resumed.fraction).toBe(playing.fraction);
    expect(sampleRoutePath(path, paused.fraction!)).toEqual(
      sampleRoutePath(path, playing.fraction!),
    );
    expect(sampleRoutePath(path, resumed.fraction!)).toEqual(
      sampleRoutePath(path, playing.fraction!),
    );
    expect(playing.schedule).toBe(true);
    expect(paused.schedule).toBe(false);
    expect(resumed.schedule).toBe(true);
  });

  it("stops scheduling offscreen without hiding the in-flight marker", () => {
    const visible = spatialPassFrame(0.2, true, false, false);
    const offscreen = spatialPassFrame(0.2, false, false, false);
    expect(offscreen.fraction).toBe(visible.fraction);
    expect(offscreen.fraction).not.toBeNull();
    expect(offscreen.schedule).toBe(false);
  });

  it.each([false, true])(
    "hides a settled frame even at beat zero with running=%s",
    (running) => {
      expect(spatialPassFrame(0, running, false, true)).toEqual({
        fraction: null,
        schedule: false,
      });
    },
  );

  it.each([false, true])(
    "hides nonessential packet motion with reduced motion and running=%s",
    (running) => {
      expect(spatialPassFrame(0.31, running, true, false)).toEqual({
        fraction: null,
        schedule: false,
      });
    },
  );

  it.each([0.62, 1, NaN, Infinity, -Infinity])(
    "hides completed or invalid pass %s without scheduling",
    (fraction) => {
      expect(spatialPassFrame(fraction, true, false, false)).toEqual({
        fraction: null,
        schedule: false,
      });
    },
  );
});

import type { Point } from "./model";

export interface RouteSegment {
  start: Point;
  end: Point;
  length: number;
  startDistance: number;
  endDistance: number;
}

export interface RoutePath {
  start: Point;
  end: Point;
  segments: readonly RouteSegment[];
  totalLength: number;
}

/** Cache distances once so each packet moves at a constant speed through bends. */
export function buildRoutePath(points: readonly Point[]): RoutePath {
  if (points.length === 0) {
    throw new RangeError("A route path needs at least one point.");
  }
  const vertices = points.map((point) => [...point] as Point);
  const segments: RouteSegment[] = [];
  let totalLength = 0;
  for (let index = 1; index < vertices.length; index++) {
    const start = vertices[index - 1];
    const end = vertices[index];
    const length = Math.hypot(
      end[0] - start[0],
      end[1] - start[1],
      end[2] - start[2],
    );
    if (length === 0) continue;
    segments.push({
      start,
      end,
      length,
      startDistance: totalLength,
      endDistance: totalLength + length,
    });
    totalLength += length;
  }
  return {
    start: vertices[0],
    end: vertices[vertices.length - 1],
    segments,
    totalLength,
  };
}

/** Fractions measure traveled distance, rather than a share of the vertex count. */
export function sampleRoutePath(path: RoutePath, fraction: number): Point {
  if (Number.isNaN(fraction) || fraction <= 0 || path.totalLength === 0) {
    return [...path.start];
  }
  if (fraction >= 1) return [...path.end];
  const distance = fraction * path.totalLength;
  const segment = path.segments.find((part) => distance <= part.endDistance)!;
  const progress = (distance - segment.startDistance) / segment.length;
  return segment.start.map(
    (value, axis) => value + (segment.end[axis] - value) * progress,
  ) as Point;
}

/** A packet makes one pass during the beat, then disappears instead of looping. */
export function travelFraction(
  beatFraction: number,
  travelEnd = 0.62,
): number | null {
  if (
    !Number.isFinite(beatFraction) ||
    !Number.isFinite(travelEnd) ||
    travelEnd <= 0 ||
    beatFraction >= travelEnd
  ) {
    return null;
  }
  return Math.max(0, beatFraction) / travelEnd;
}

/** Pausing stops future frames without removing the packet at its current pose. */
export function spatialPassFrame(
  beatFraction: number,
  running: boolean,
  reducedMotion: boolean,
  settled: boolean,
): { fraction: number | null; schedule: boolean } {
  const fraction =
    reducedMotion || settled ? null : travelFraction(beatFraction);
  return { fraction, schedule: running && fraction !== null };
}

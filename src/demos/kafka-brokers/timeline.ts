export type Point = readonly [number, number];

export type Move<Kind extends string = string> = {
  kind: Kind;
  label: string;
  points: readonly Point[];
  // Fraction of the beat to wait before departing, so parallel payloads on
  // converging routes stay distinguishable.
  lag?: number;
};

export const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;

export function moveProgress(move: Move, linear: number) {
  const lag = move.lag ?? 0;
  return ease(Math.min(1, Math.max(0, (linear - lag) / (1 - lag))));
}

export type Beat<Scene, Kind extends string = string> = {
  scene: Scene;
  // Shown the moment every payload arrives; the hold then reads as settled.
  after: Scene;
  caption: string;
  moves: readonly Move<Kind>[];
  hold: number;
};

export const SPEED = 137;

export function pathData(points: readonly Point[]) {
  return `M${points.map(([x, y]) => `${x} ${y}`).join(" L")}`;
}

function segments(points: readonly Point[]) {
  return points
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
}

export function pathLength(points: readonly Point[]) {
  return segments(points).reduce((sum, length) => sum + length, 0);
}

export function pointAt(points: readonly Point[], progress: number): Point {
  const lengths = segments(points);
  let distance = pathLength(points) * Math.min(1, Math.max(0, progress));
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i]) {
      const t = lengths[i] ? distance / lengths[i] : 1;
      const [x, y] = points[i];
      const [nx, ny] = points[i + 1];
      return [x + (nx - x) * t, y + (ny - y) * t];
    }
    distance -= lengths[i];
  }
  return points[points.length - 1];
}

// Payloads leave and arrive at node edges without covering node labels.
export function payloadAt(
  points: readonly Point[],
  progress: number,
  inset: number,
): Point {
  const length = pathLength(points);
  if (length <= 2 * inset) return pointAt(points, progress);
  const t = (inset + (length - 2 * inset) * progress) / length;
  return pointAt(points, t);
}

export function travelTime(moves: readonly Move[]) {
  const longest = Math.max(0, ...moves.map((move) => pathLength(move.points)));
  return (longest / SPEED) * 1000;
}

export function createTimeline<Scene, Kind extends string>(
  beats: readonly Beat<Scene, Kind>[],
) {
  const durations = beats.map((beat) => travelTime(beat.moves) + beat.hold);
  const starts = durations.map((_, i) =>
    durations.slice(0, i).reduce((sum, d) => sum + d, 0),
  );
  const total = starts[starts.length - 1];
  return {
    beats,
    starts,
    total,
    // The final beat is the settled result; reaching its start ends playback.
    // `settle` skips travel for reduced motion: each beat shows its result.
    snapshot(elapsed: number, settle = false) {
      const index = Math.max(
        0,
        starts.findLastIndex((start) => elapsed >= start),
      );
      const beat = beats[index];
      const moving = travelTime(beat.moves);
      const linear = moving
        ? Math.min(1, (elapsed - starts[index]) / moving)
        : 1;
      // Ease in and out so the eye can pick up departures and arrivals.
      const progress = ease(linear);
      const arrived = settle || progress >= 1;
      return {
        index,
        beat,
        progress,
        linear,
        scene: arrived ? beat.after : beat.scene,
        moves: arrived ? [] : beat.moves,
        done: index === beats.length - 1,
      };
    },
  };
}

export type Timeline = ReturnType<typeof createTimeline>;

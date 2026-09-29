export type Point = [number, number, number];
export const QUORUM_POSITIONS: Point[] = [
  [-3, 0.45, 3],
  [0, 0.45, 3],
  [3, 0.45, 3],
  [-2, 0.45, -4],
  [2, 0.45, -4],
];
/** Curve away from intervening cylinders; stop outside each endpoint's ring. */
export function quorumPath(a: number, b: number): Point[] {
  const start = QUORUM_POSITIONS[a],
    end = QUORUM_POSITIONS[b];
  const dx = end[0] - start[0],
    dz = end[2] - start[2],
    length = Math.hypot(dx, dz);
  for (const bend of [0, -2, 2, -4, 4, -6, 6]) {
    const points: Point[] = Array.from({ length: 49 }, (_, i) => {
      const t = 0.95 / length + ((1 - 1.9 / length) * i) / 48;
      const offset = 4 * t * (1 - t) * bend;
      return [
        start[0] + dx * t - (dz / length) * offset,
        0.06,
        start[2] + dz * t + (dx / length) * offset,
      ];
    });
    if (
      QUORUM_POSITIONS.every(
        (p, index) =>
          index === a ||
          index === b ||
          points.every((q) => Math.hypot(q[0] - p[0], q[2] - p[2]) > 1.05),
      )
    )
      return points;
  }
  throw new Error("No clear quorum connector");
}

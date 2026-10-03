export type Point = readonly [number, number];
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type Face = "top" | "right" | "bottom" | "left";
export function port(bounds: Bounds, face: Face): Point {
  switch (face) {
    case "top":
      return [bounds.x + bounds.width / 2, bounds.y];
    case "right":
      return [bounds.x + bounds.width, bounds.y + bounds.height / 2];
    case "bottom":
      return [bounds.x + bounds.width / 2, bounds.y + bounds.height];
    case "left":
      return [bounds.x, bounds.y + bounds.height / 2];
  }
}
export function route(
  from: Bounds,
  fromFace: Face,
  to: Bounds,
  toFace: Face,
  bends: readonly Point[] = [],
): readonly Point[] {
  return [port(from, fromFace), ...bends, port(to, toFace)];
}
export function pathData(points: readonly Point[]) {
  return points
    .map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`)
    .join(" ");
}
/** Constant speed on the exact same ordered polyline used to draw the wire. */
export function pointOnRoute(
  points: readonly Point[],
  progress: number,
): Point {
  const lengths = points
    .slice(1)
    .map(([x, y], index) =>
      Math.hypot(x - points[index][0], y - points[index][1]),
    );
  let distance =
    lengths.reduce((sum, length) => sum + length, 0) *
    Math.max(0, Math.min(1, progress));
  for (let index = 0; index < lengths.length; index++) {
    if (distance <= lengths[index]) {
      const proportion = lengths[index] === 0 ? 0 : distance / lengths[index];
      return [
        points[index][0] +
          (points[index + 1][0] - points[index][0]) * proportion,
        points[index][1] +
          (points[index + 1][1] - points[index][1]) * proportion,
      ];
    }
    distance -= lengths[index];
  }
  return points.at(-1) ?? [0, 0];
}

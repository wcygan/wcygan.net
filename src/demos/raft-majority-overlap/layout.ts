import { type Server } from "../raft-election-overview/model";

type Point = readonly [number, number];
export const serverPositions: Record<Server, Point> = {
  A: [200, 42],
  B: [285, 104],
  C: [253, 205],
  D: [147, 205],
  E: [115, 104],
};

// A rounded hull around the selected circles, rather than a bounding box
// that could accidentally include an unselected server.
export function majorityBoundary(group: readonly Server[], padding: number) {
  const points = group.map((server) => serverPositions[server]);
  const center = points.reduce(
    ([x, y], point) => [
      x + point[0] / points.length,
      y + point[1] / points.length,
    ],
    [0, 0],
  );
  points.sort(
    (a, b) =>
      Math.atan2(a[1] - center[1], a[0] - center[0]) -
      Math.atan2(b[1] - center[1], b[0] - center[0]),
  );
  const normals = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const dx = next[0] - point[0],
      dy = next[1] - point[1];
    const length = Math.hypot(dx, dy);
    return [dy / length, -dx / length] as Point;
  });
  const offset = (point: Point, normal: Point) =>
    [point[0] + normal[0] * padding, point[1] + normal[1] * padding]
      .map((coordinate) => coordinate.toFixed(2))
      .join(" ");
  return (
    points
      .map((point, index) => {
        const start = offset(
          point,
          normals[(index + points.length - 1) % points.length],
        );
        const end = offset(point, normals[index]);
        return `${index === 0 ? "M" : "L"}${start} A${padding} ${padding} 0 0 1 ${end}`;
      })
      .join(" ") + " Z"
  );
}

export type Vec3 = readonly [number, number, number];
export interface Point {
  x: number;
  y: number;
  depth: number;
}
export interface Solid {
  id: string;
  center: Vec3;
  size: Vec3;
  tone: "blue" | "orange" | "green" | "yellow" | "red" | "neutral";
}
export interface Face {
  id: string;
  vertices: Vec3[];
  tone: Solid["tone"];
  shade: "top" | "side" | "front";
}

export function corners(solid: Solid): Vec3[] {
  const [x, y, z] = solid.center,
    [w, h, d] = solid.size;
  return [-1, 1].flatMap((a) =>
    [-1, 1].flatMap((b) =>
      [-1, 1].map(
        (c) => [x + (a * w) / 2, y + (b * h) / 2, z + (c * d) / 2] as Vec3,
      ),
    ),
  );
}
/** Orthographic world-space rotation: labels use the very same projection. */
export function rawProject(
  [x, y, z]: Vec3,
  azimuth: number,
  elevation: number,
): Point {
  const horizontal = x * Math.cos(azimuth) - z * Math.sin(azimuth);
  const depth = x * Math.sin(azimuth) + z * Math.cos(azimuth);
  return {
    x: horizontal,
    y: depth * Math.sin(elevation) - y * Math.cos(elevation),
    depth: depth * Math.cos(elevation) + y * Math.sin(elevation),
  };
}
export function projector(
  width: number,
  height: number,
  azimuth: number,
  elevation: number,
  zoom: number,
  extent: Vec3,
) {
  const bounds = corners({
    id: "frame",
    center: [0, extent[1] / 2, 0],
    size: extent,
    tone: "neutral",
  }).map((v) => rawProject(v, azimuth, elevation));
  const left = Math.min(...bounds.map((p) => p.x)),
    right = Math.max(...bounds.map((p) => p.x));
  const top = Math.min(...bounds.map((p) => p.y)),
    bottom = Math.max(...bounds.map((p) => p.y));
  const scale =
    Math.min((width - 64) / (right - left), (height - 110) / (bottom - top)) *
    zoom;
  return (v: Vec3): Point => {
    const p = rawProject(v, azimuth, elevation);
    return {
      x: width / 2 + (p.x - (left + right) / 2) * scale,
      y: height / 2 + (p.y - (top + bottom) / 2) * scale,
      depth: p.depth,
    };
  };
}
export function boxFaces(solid: Solid, azimuth: number): Face[] {
  const [x, y, z] = solid.center,
    [w, h, d] = solid.size;
  const a = x - w / 2,
    b = x + w / 2,
    c = z - d / 2,
    e = z + d / 2,
    lo = y - h / 2,
    hi = y + h / 2;
  const front = Math.cos(azimuth) >= 0 ? e : c,
    side = Math.sin(azimuth) >= 0 ? b : a;
  return [
    {
      id: `${solid.id}-front`,
      vertices: [
        [a, lo, front],
        [b, lo, front],
        [b, hi, front],
        [a, hi, front],
      ],
      tone: solid.tone,
      shade: "front",
    },
    {
      id: `${solid.id}-side`,
      vertices: [
        [side, lo, c],
        [side, lo, e],
        [side, hi, e],
        [side, hi, c],
      ],
      tone: solid.tone,
      shade: "side",
    },
    {
      id: `${solid.id}-top`,
      vertices: [
        [a, hi, c],
        [b, hi, c],
        [b, hi, e],
        [a, hi, e],
      ],
      tone: solid.tone,
      shade: "top",
    },
  ];
}
export function facingPort(source: Solid, target: Solid): Vec3 {
  const delta = target.center.map((v, i) => v - source.center[i]);
  const axis = Math.abs(delta[0]) > Math.abs(delta[2]) ? 0 : 2;
  return source.center.map((v, i) =>
    i === axis ? v + (Math.sign(delta[i]) * source.size[i]) / 2 : v,
  ) as unknown as Vec3;
}
function polygonInterval(
  a: Point,
  b: Point,
  polygon: Point[],
): [number, number] | null {
  const area = polygon.reduce((sum, p, i) => {
    const q = polygon[(i + 1) % polygon.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0);
  const points = area < 0 ? [...polygon].reverse() : polygon;
  let lo = 0,
    hi = 1;
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      q = points[(i + 1) % points.length],
      dx = q.x - p.x,
      dy = q.y - p.y;
    const start = dx * (a.y - p.y) - dy * (a.x - p.x),
      change = dx * (b.y - a.y) - dy * (b.x - a.x);
    if (Math.abs(change) < 1e-8) {
      if (start < 0) return null;
      continue;
    }
    const t = -start / change;
    if (change > 0) lo = Math.max(lo, t);
    else hi = Math.min(hi, t);
    if (lo >= hi) return null;
  }
  return [lo, hi];
}
function surfaceDepth(p: Point, face: Point[]) {
  const [a, b, c] = face;
  const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(denominator) < 1e-8) return -Infinity;
  const u =
    ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / denominator;
  const v =
    ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / denominator;
  return u * a.depth + v * b.depth + (1 - u - v) * c.depth;
}
/** Clip wires exactly where a nearer projected box surface covers them. */
export function visibleSegments(
  a: Point,
  b: Point,
  surfaces: Point[][],
): [number, number][] {
  let visible: [number, number][] = [[0, 1]];
  const at = (t: number) => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    depth: a.depth + (b.depth - a.depth) * t,
  });
  for (const face of surfaces) {
    let hidden = polygonInterval(a, b, face);
    if (!hidden) continue;
    const [lo, hi] = hidden,
      dl = surfaceDepth(at(lo), face) - at(lo).depth,
      dh = surfaceDepth(at(hi), face) - at(hi).depth;
    if (dl <= 0.001 && dh <= 0.001) continue;
    if (dl > 0.001 !== dh > 0.001) {
      const cross = lo + ((hi - lo) * (0.001 - dl)) / (dh - dl);
      hidden = dl > 0.001 ? [lo, cross] : [cross, hi];
    }
    const [start, end] = hidden;
    visible = visible.flatMap(([v0, v1]) =>
      end <= v0 || start >= v1
        ? [[v0, v1] as [number, number]]
        : [
            ...(start > v0 ? [[v0, start] as [number, number]] : []),
            ...(end < v1 ? [[end, v1] as [number, number]] : []),
          ],
    );
  }
  return visible;
}

export interface Label {
  id: string;
  text: string;
  at: Vec3;
  inline?: boolean;
}
export function layoutLabels(
  labels: Label[],
  project: (v: Vec3) => Point,
  width: number,
  height: number,
) {
  const occupied = labels
    .filter((label) => label.inline)
    .map((label) => {
      const anchor = project(label.at);
      return {
        x: anchor.x,
        y: anchor.y,
        w: label.text.length * 8.5 + 12,
        h: 22,
      };
    });
  return labels.map((label) => {
    const anchor = project(label.at),
      w = label.text.length * 8.5 + 12,
      h = 22;
    let x = Math.max(w / 2 + 8, Math.min(width - w / 2 - 8, anchor.x)),
      y = anchor.y;
    if (!label.inline) {
      y = Math.max(20, Math.min(height - 20, y - 16));
      for (let attempt = 0; attempt < 12; attempt++) {
        if (
          !occupied.some(
            (r) =>
              Math.abs(x - r.x) < (w + r.w) / 2 + 5 &&
              Math.abs(y - r.y) < (h + r.h) / 2 + 4,
          )
        )
          break;
        y += y < height / 2 ? -26 : 26;
        if (y < 18 || y > height - 18) {
          y = 30 + attempt * 26;
          x = anchor.x < width / 2 ? w / 2 + 8 : width - w / 2 - 8;
        }
      }
      occupied.push({ x, y, w, h });
    }
    return { ...label, x, y, w, anchor };
  });
}

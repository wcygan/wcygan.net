export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface LabelRequest {
  id: string;
  priority: number;
  width: number;
  height: number;
  anchor: Rect;
  avoid: Rect[];
  fallbackAvoid?: Rect[];
  allowInside?: boolean;
  callout?: boolean;
}
export const overlaps = (a: Rect, b: Rect, gap = 0) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;

/** Prefer space above the silhouette; never clip or overlap another label. */
export function placeLabels(
  requests: LabelRequest[],
  viewport: { width: number; height: number },
) {
  const placed = new Map<string, Rect>();
  for (const item of [...requests].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  )) {
    const { anchor: a, width, height } = item;
    const centerX = a.x + a.width / 2,
      centerY = a.y + a.height / 2;
    // A label for an off-screen object must not imply an on-screen location.
    if (
      centerX < 0 ||
      centerX > viewport.width ||
      centerY < 0 ||
      centerY > viewport.height
    )
      continue;
    const candidates = [
      [centerX - width / 2, a.y - height - 7],
      [centerX - width / 2, a.y + a.height + 7],
      [a.x - width - 7, centerY - height / 2],
      [a.x + a.width + 7, centerY - height / 2],
      [a.x, a.y - height - 7],
      [a.x + a.width - width, a.y - height - 7],
      ...(item.allowInside
        ? [
            [centerX - width / 2, centerY - height / 2],
            [a.x + a.width - width, centerY - height / 2],
            [a.x, centerY - height / 2],
          ]
        : []),
    ];
    // An explanatory callout can reach beyond its immediate neighbors. Keep
    // the nearest free position and connect it to the leader in the overlay.
    if (item.callout) {
      const freeSpace: number[][] = [];
      const xs = [viewport.width - width - 8];
      const ys = [viewport.height - height - 8];
      for (let x = 8; x < xs[0]; x += 12) xs.push(x);
      for (let y = 8; y < ys[0]; y += 12) ys.push(y);
      for (const y of ys) for (const x of xs) freeSpace.push([x, y]);
      const distance = ([x, y]: number[]) =>
        (x + width / 2 - centerX) ** 2 + (y + height / 2 - centerY) ** 2;
      candidates.push(...freeSpace.sort((a, b) => distance(a) - distance(b)));
    }
    const available = candidates
      .map(([x, y]) => ({ x, y, width, height }))
      .filter(
        (rect) =>
          rect.x >= 8 &&
          rect.y >= 8 &&
          rect.x + width <= viewport.width - 8 &&
          rect.y + height <= viewport.height - 8 &&
          ![...placed.values()].some((label) => overlaps(rect, label, 6)),
      );
    const clearOf = (obstacles: Rect[]) =>
      available.find(
        (rect) => !obstacles.some((obstacle) => overlaps(rect, obstacle, 3)),
      );
    // At close zoom, a callout may cover inactive geometry, but never the
    // leader, its replica group, or another label.
    const position =
      clearOf(item.avoid) ??
      (item.fallbackAvoid ? clearOf(item.fallbackAvoid) : undefined);
    if (position) placed.set(item.id, position);
  }
  return placed;
}

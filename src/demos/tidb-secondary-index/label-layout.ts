export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width + 5 &&
  a.x + a.width + 5 > b.x &&
  a.y < b.y + b.height + 5 &&
  a.y + a.height + 5 > b.y;

/** Follow the packet continuously, moving aside when an entry or heading intervenes. */
export function placePacketLabel(
  point: { x: number; y: number },
  label: { width: number; height: number },
  viewport: { width: number; height: number },
  obstacles: Rect[],
): Rect | undefined {
  const maxX = viewport.width - label.width - 8,
    maxY = viewport.height - label.height - 8;
  if (maxX < 8 || maxY < 8) return;
  const xs = [
    point.x - label.width / 2,
    point.x + 12,
    point.x - label.width - 12,
    8,
    maxX,
    ...obstacles.flatMap((r) => [r.x - label.width - 6, r.x + r.width + 6]),
  ];
  const ys = [
    point.y - label.height - 12,
    point.y + 12,
    8,
    maxY,
    ...obstacles.flatMap((r) => [r.y - label.height - 6, r.y + r.height + 6]),
  ];
  let best: Rect | undefined,
    bestDistance = Infinity;
  for (const x of xs)
    for (const y of ys) {
      const rect = {
        x: Math.max(8, Math.min(x, maxX)),
        y: Math.max(8, Math.min(y, maxY)),
        ...label,
      };
      const distance =
        (rect.x + rect.width / 2 - point.x) ** 2 +
        (rect.y + rect.height / 2 - (point.y - 24)) ** 2;
      if (
        distance < bestDistance &&
        !obstacles.some((obstacle) => overlaps(rect, obstacle))
      ) {
        best = rect;
        bestDistance = distance;
      }
    }
  return best;
}

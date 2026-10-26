import type { Page, TreeLink, TreeVisual } from "./visual";

export interface Point {
  x: number;
  y: number;
}

export function linkPoints(
  visual: TreeVisual,
  link: Pick<TreeLink, "from" | "to" | "kind">,
  width: number,
): Point[] {
  const pages = visual.groups.flatMap((group) => group.pages);
  const find = (id: string): Page => pages.find((page) => page.id === id)!;
  const from = find(link.from);
  const to = find(link.to);
  const x = (value: number) => (value * width) / 640;
  if (link.kind === "leaf") {
    return [
      { x: x(from.x + from.width / 2), y: from.y },
      { x: x(to.x - to.width / 2), y: to.y },
    ];
  }
  if (link.kind === "handoff") {
    return [
      { x: x(from.x), y: from.y + from.height / 2 },
      { x: x(from.x), y: to.y },
      { x: x(to.x + to.width / 2), y: to.y },
    ];
  }
  const children = visual.groups
    .flatMap((group) => group.links)
    .filter(
      (candidate) => candidate.kind === "branch" && candidate.from === from.id,
    )
    .map((candidate) => find(candidate.to))
    .sort((left, right) => left.x - right.x);
  const slot = children.findIndex((child) => child.id === to.id);
  const sourceX = x(
    from.x - from.width / 2 + ((slot + 0.5) * from.width) / children.length,
  );
  const sourceY = from.y + from.height / 2;
  const targetY = to.y - to.height / 2;
  const middle = (sourceY + targetY) / 2;
  return [
    { x: sourceX, y: sourceY },
    { x: sourceX, y: middle },
    { x: x(to.x), y: middle },
    { x: x(to.x), y: targetY },
  ];
}

export function routePrefix(
  points: readonly Point[],
  progress: number,
): Point[] {
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(point.x - points[index].x, point.y - points[index].y),
    );
  let remaining =
    lengths.reduce((sum, length) => sum + length, 0) *
    Math.max(0, Math.min(1, progress));
  const prefix = [points[0]];
  for (let index = 0; index < lengths.length; index++) {
    const from = points[index];
    const to = points[index + 1];
    const length = lengths[index];
    if (remaining >= length) {
      prefix.push(to);
      remaining -= length;
    } else {
      const fraction = length === 0 ? 0 : remaining / length;
      prefix.push({
        x: from.x + (to.x - from.x) * fraction,
        y: from.y + (to.y - from.y) * fraction,
      });
      break;
    }
  }
  return prefix;
}

export function routePath(points: readonly Point[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
}

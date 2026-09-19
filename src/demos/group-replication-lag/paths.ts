import type { Flight, MemberId } from "./model";

export type Point = [number, number, number];
export const ROWS: Record<MemberId, number> = { primary: -5.2, a: 0, b: 5.2 };
export const DATABASE_X = -3.35;
export const LOG_X = 1.1;
export const SLOT_START = -1.17;
export const SLOT_SPACING = 0.908;
export const ENTRY_SIZE: Point = [0.58, 0.52, 0.72];
export const LOG_SURFACE_Y = -0.35;

export function slot(index: number, z: number): Point {
  return [
    SLOT_START + index * SLOT_SPACING,
    LOG_SURFACE_Y + ENTRY_SIZE[1] / 2,
    z,
  ];
}

// Each replica owns a lane; the line and its traveling copies use this route.
export function linkPath(member: MemberId): Point[] {
  const laneX = member === "b" ? 5.35 : 4.25;
  return [
    [3.1, -0.07, -7],
    [laneX, -0.07, -7],
    [laneX, -0.07, ROWS[member]],
    [3.725, -0.07, ROWS[member]],
  ];
}

export function flightPath(
  flight: Pick<Flight, "member" | "kind" | "transaction" | "source">,
): Point[] {
  const entry = slot(flight.transaction - 1, ROWS[flight.member]);
  const primaryEntry = slot(flight.transaction - 1, ROWS.primary);
  switch (flight.kind) {
    case "ordering":
      return [...proposalInletPath(), cacheSlot(flight.transaction)];
    case "replicating":
      if (flight.source === "donor")
        return [primaryEntry, ...donorPath(), entry];
      return [cacheSlot(flight.transaction), ...linkPath(flight.member), entry];
    case "committing":
      return [cacheSlot(flight.transaction), primaryEntry];
    case "applying":
      return [entry, [DATABASE_X, 0.85, ROWS[flight.member]]];
  }
}

/** Distance-weighted interpolation keeps copies on every bend in the rail. */
export function measurePath(points: Point[]) {
  const lengths = points
    .slice(1)
    .map((point, index) =>
      Math.hypot(...point.map((value, axis) => value - points[index][axis])),
    );
  return {
    points,
    lengths,
    length: lengths.reduce((sum, value) => sum + value, 0),
  };
}

export function samplePath(
  route: ReturnType<typeof measurePath>,
  progress: number,
): Point {
  let distance = Math.max(0, Math.min(1, progress)) * route.length;
  for (let index = 0; index < route.lengths.length; index++) {
    const length = route.lengths[index];
    if (distance <= length || index === route.lengths.length - 1) {
      const fraction = length === 0 ? 1 : Math.min(1, distance / length);
      return route.points[index].map(
        (value, axis) =>
          value + (route.points[index + 1][axis] - value) * fraction,
      ) as Point;
    }
    distance -= length;
  }
  return route.points[0];
}

export function cacheSlot(transaction: number): Point {
  return [0.2 + (transaction - 1) * 0.5, -0.07, -7];
}
export function donorPath(): Point[] {
  return [
    [3.725, -0.07, ROWS.primary],
    [6.5, -0.07, ROWS.primary],
    [6.5, -0.07, ROWS.b],
    [3.725, -0.07, ROWS.b],
  ];
}
export function interruptedLinkPaths(): Point[][] {
  const points = linkPath("b");
  return [
    [points[0], points[1], [points[1][0], points[1][1], -0.35]],
    [[points[1][0], points[1][1], 0.35], points[2], points[3]],
  ];
}

export function proposalInletPath(): Point[] {
  return [
    [DATABASE_X + 0.9, -0.07, ROWS.primary],
    [-1.9, -0.07, ROWS.primary],
    [-1.9, -0.07, -7],
    [-0.2, -0.07, -7],
  ];
}

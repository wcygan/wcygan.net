import type { Point } from "./raft-election-overview/layout";

export const raftServers = ["B", "A", "C"] as const;
// Both diagrams use the same SVG width and scale, so this gives them the same
// visible pace. Arc length includes the horizontal legs and vertical trunk.
export const payloadUnitsPerSecond = 140;
export function routeLength(route: readonly Point[]) {
  return route
    .slice(1)
    .reduce(
      (length, point, index) =>
        length +
        Math.hypot(point[0] - route[index][0], point[1] - route[index][1]),
      0,
    );
}

export function paceFlights<T extends { start: number; end: number }>(
  authored: readonly T[],
  route: (message: T) => readonly Point[],
  storagePause = 600,
) {
  const ordered = [...authored].sort((a, b) => a.start - b.start);
  const anchors = new Map<number, number>([[0, 0]]);
  let previousEnd = 0;
  let previousAuthoredEnd = 0;
  const messages: T[] = [];
  for (let index = 0; index < ordered.length; ) {
    const authoredStart = ordered[index].start;
    const start =
      previousEnd + Math.max(storagePause, authoredStart - previousAuthoredEnd);
    let groupEnd = start;
    let groupAuthoredEnd = authoredStart;
    // A simultaneous fanout shares a departure, but each route gets its own
    // arrival. Identical payloads share the trunk until their paths branch.
    while (index < ordered.length && ordered[index].start === authoredStart) {
      const message = ordered[index++];
      const end =
        start + (routeLength(route(message)) / payloadUnitsPerSecond) * 1000;
      messages.push({ ...message, start, end });
      anchors.set(message.start, start);
      anchors.set(message.end, Math.max(anchors.get(message.end) ?? 0, end));
      groupEnd = Math.max(groupEnd, end);
      groupAuthoredEnd = Math.max(groupAuthoredEnd, message.end);
    }
    previousEnd = groupEnd;
    previousAuthoredEnd = groupAuthoredEnd;
  }
  const checkpoints = [...anchors].sort(([a], [b]) => a - b);
  const time = (authoredTime: number) => {
    const [before, after] = checkpoints.findLast(
      ([at]) => at <= authoredTime,
    ) ?? [0, 0];
    return after + (authoredTime - before);
  };
  return { messages, time };
}

import { raftServers } from "../raft-transport";
import type { Point } from "../raft-election-overview/layout";
export type RowBounds = { x: number; y: number; width: number; height: number };
export const recordHeight = 84;
export function logRowLayout(compact: boolean, timers = false) {
  const width = compact ? 360 : 600;
  const payloadWidth = compact ? 112 : 128;
  const x = payloadWidth + 8;
  const rowWidth = width - x - 8;
  const rowHeight = timers ? 164 : 124;
  const entryX = compact ? 88 : 136;
  const cellY = 12;
  const cellWidth = (rowWidth - entryX - 24) / 3;
  const nodes = Object.fromEntries(
    raftServers.map((id, index) => [
      id,
      {
        x,
        y: 8 + index * (rowHeight + 20),
        width: rowWidth,
        height: rowHeight,
      },
    ]),
  ) as Record<(typeof raftServers)[number], RowBounds>;
  const trunk = payloadWidth / 2 + 4;
  const port = (id: (typeof raftServers)[number]): [number, number] => [
    x,
    nodes[id].y + 62,
  ];
  return {
    width,
    payloadWidth,
    height: nodes.C.y + rowHeight + 8,
    nodes,
    entryX,
    cellY,
    cellWidth,
    trunk,
    port,
    wire: `M${port("B").join(" ")}H${trunk}V${port("C")[1]}H${x}M${trunk} ${port("A")[1]}H${x}`,
  };
}

export function logRowRoute(
  layout: Pick<ReturnType<typeof logRowLayout>, "port" | "trunk">,
  from: (typeof raftServers)[number],
  to: (typeof raftServers)[number],
): Point[] {
  const start = layout.port(from),
    end = layout.port(to);
  return [start, [layout.trunk, start[1]], [layout.trunk, end[1]], end];
}

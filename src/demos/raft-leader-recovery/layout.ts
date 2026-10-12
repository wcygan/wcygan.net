import type { Server, Message } from "./model";
import { raftServers as servers } from "../raft-transport";
import { pointOnRoute } from "../raft-election-overview/layout";

export function recoveryLayout(compact: boolean) {
  const width = compact ? 360 : 600;
  const x = compact ? 72 : 144;
  const rowHeight = compact ? 298 : 274;
  const rowWidth = compact ? 276 : 440;
  const trunk = compact ? 32 : 72;
  const rows = Object.fromEntries(
    servers.map((id, index) => [
      id,
      {
        x,
        y: 8 + index * (rowHeight + 24),
        width: rowWidth,
        height: rowHeight,
      },
    ]),
  ) as Record<Server, { x: number; y: number; width: number; height: number }>;
  const port = (id: Server): [number, number] => [
    x,
    rows[id].y + rowHeight / 2,
  ];
  const route = (message: Message): [number, number][] => [
    port(message.from),
    [trunk, port(message.from)[1]],
    [trunk, port(message.to)[1]],
    port(message.to),
  ];
  return {
    width,
    height: rows.C.y + rowHeight + 8,
    rows,
    port,
    route,
    pointOnRoute,
    wire: `M${x} ${port("B")[1]}H${trunk}V${port("C")[1]}H${x}M${trunk} ${port("A")[1]}H${x}`,
  };
}

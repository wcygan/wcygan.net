import { logRowLayout, logRowRoute } from "../raft-log-row/layout";
import type { Message } from "./model";
import { type Point } from "../raft-election-overview/layout";

export function replicationLayout(compact: boolean) {
  const base = logRowLayout(compact);
  const payloadWidth = base.payloadWidth;
  const trunk = payloadWidth / 2 + 4;
  const x = payloadWidth + 8;
  const entryX = base.entryX;
  const nodes = Object.fromEntries(
    Object.entries(base.nodes).map(([id, row]) => [
      id,
      {
        ...row,
        x,
        y: row.y + 72,
        width: base.width - x - 8,
      },
    ]),
  ) as typeof base.nodes;
  const port = (id: keyof typeof nodes): [number, number] => [
    x,
    nodes[id].y + 62,
  ];
  const clientOrigin: Point = [trunk, 28];
  return {
    ...base,
    nodes,
    trunk,
    port,
    entryX,
    cellWidth: (nodes.B.width - entryX - 24) / 3,
    height: base.height + 72,
    payloadWidth,
    clientOrigin,
    wire: `M${clientOrigin.join(" ")}V${port("B")[1]}H${x}M${port("B").join(" ")}H${trunk}V${port("C")[1]}H${x}M${trunk} ${port("A")[1]}H${x}`,
  };
}
export function messageRoute(
  layout: ReturnType<typeof replicationLayout>,
  message: Pick<Message, "from" | "to">,
): Point[] {
  if (message.from === "client")
    return [
      layout.clientOrigin,
      [layout.trunk, layout.port("B")[1]],
      layout.port("B"),
    ];
  return logRowRoute(layout, message.from, message.to);
}
export const payloadHeight = (kind: Message["kind"]) =>
  kind === "command" ? 48 : 64;

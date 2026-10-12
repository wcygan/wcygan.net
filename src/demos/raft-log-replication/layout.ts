import type { Message, Server } from "./model";
import { raftServers as servers } from "../raft-transport";
import { type Point } from "../raft-election-overview/layout";

export function replicationLayout(compact: boolean) {
  const width = compact ? 360 : 600;
  const nodeWidth = compact ? 276 : 440;
  // Center the cards and their shared bus together within the scene.
  const x = compact ? 72 : 144;
  const nodeHeight = compact ? 236 : 212;
  const nodes = Object.fromEntries(
    servers.map((server, index) => [
      server,
      {
        x,
        y: 12 + index * (nodeHeight + 20),
        width: nodeWidth,
        height: nodeHeight,
      },
    ]),
  ) as Record<Server, { x: number; y: number; width: number; height: number }>;
  const trunk = compact ? 32 : 72;
  const port = (server: Server): Point => [x, nodes[server].y + nodeHeight / 2];
  return {
    width,
    height: nodes.C.y + nodeHeight + 12,
    nodes,
    trunk,
    port,
    wire: `M${port("B").join(" ")}H${trunk}V${port("C")[1]}H${x}M${trunk} ${port("A")[1]}H${x}`,
  };
}
export function messageRoute(
  layout: ReturnType<typeof replicationLayout>,
  message: Pick<Message, "from" | "to">,
): Point[] {
  if (message.from === "client")
    return [[0, layout.port("B")[1]], layout.port("B")];
  const from = layout.port(message.from),
    to = layout.port(message.to);
  return [from, [layout.trunk, from[1]], [layout.trunk, to[1]], to];
}

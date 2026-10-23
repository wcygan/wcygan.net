import type { Message } from "./model";
import { logRowLayout } from "../raft-log-row/layout";
import { pointOnRoute } from "../raft-election-overview/layout";
export function recoveryLayout(compact: boolean) {
  const layout = logRowLayout(compact, true);
  const route = (message: Message): [number, number][] => [
    layout.port(message.from),
    [layout.trunk, layout.port(message.from)[1]],
    [layout.trunk, layout.port(message.to)[1]],
    layout.port(message.to),
  ];
  return { ...layout, rows: layout.nodes, route, pointOnRoute };
}

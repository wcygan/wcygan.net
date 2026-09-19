export const NODES = ["A", "B", "C"] as const;
export type NodeId = (typeof NODES)[number];
export type Vector = readonly [number, number, number];
export const COMPONENTS = ["x", "y", "z"] as const;
export const formatVector = (v: Vector) => `[${v.join(", ")}]`;
export function increment(v: Vector, node: NodeId): Vector {
  return v.map(
    (n, i) => n + (i === NODES.indexOf(node) ? 1 : 0),
  ) as unknown as Vector;
}
export function merge(a: Vector, b: Vector): Vector {
  return a.map((n, i) => Math.max(n, b[i])) as unknown as Vector;
}
export function compare(a: Vector, b: Vector) {
  const less = a.some((n, i) => n < b[i]);
  const more = a.some((n, i) => n > b[i]);
  return less && more
    ? "concurrent"
    : less
      ? "before"
      : more
        ? "after"
        : "equal";
}
export const EVENTS = [
  { node: "A", kind: "local", client: "Client 1", input: "Write request" },
  { node: "C", kind: "local", client: "Client 2", input: "Write request" },
  { node: "A", kind: "send", peer: "B" },
  { node: "B", kind: "receive", peer: "A" },
  { node: "B", kind: "send", peer: "C" },
  { node: "C", kind: "receive", peer: "B" },
] as const;
export function snapshot(step: number) {
  const clocks: Record<NodeId, Vector> = {
    A: [0, 0, 0],
    B: [0, 0, 0],
    C: [0, 0, 0],
  };
  const history: Vector[] = [];
  let message: { from: NodeId; to: NodeId; clock: Vector } | null = null;
  let status =
    "Client 1 will send Write request to A. Independently, Client 2 will send Write request to C.";
  for (const event of EVENTS.slice(0, step)) {
    const previous = clocks[event.node];
    if (event.kind === "receive" && message) {
      const merged = merge(previous, message.clock);
      clocks[event.node] = increment(merged, event.node);
      status = `${event.node} receives: max(${formatVector(previous)}, ${formatVector(message.clock)}) = ${formatVector(merged)}, then increments ${event.node} → ${formatVector(clocks[event.node])}.`;
      message = null;
    } else {
      clocks[event.node] = increment(previous, event.node);
      status = `${event.node} ${event.kind === "local" ? `processes ${event.client}’s ${event.input}` : `sends its clock to ${event.peer}`}, incrementing its own entry → ${formatVector(clocks[event.node])}.`;
      if (event.kind === "send")
        message = {
          from: event.node,
          to: event.peer,
          clock: [...clocks[event.node]] as Vector,
        };
    }
    history.push([...clocks[event.node]] as Vector);
  }
  return { clocks, history, message, status, done: step === EVENTS.length };
}

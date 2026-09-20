export const NODES = ["A", "B", "C"] as const;
export type NodeId = (typeof NODES)[number];
export type Vector = readonly [number, number, number];
export type Replicas = Record<NodeId, Vector>;
export const COMPONENTS = ["x", "y", "z"] as const;
export const formatVector = (v: Vector) => `[${v.join(", ")}]`;
export const value = (v: Vector) => v.reduce((sum, count) => sum + count, 0);
export function increment(v: Vector, node: NodeId): Vector {
  return v.map(
    (n, i) => n + (i === NODES.indexOf(node) ? 1 : 0),
  ) as unknown as Vector;
}
export function merge(a: Vector, b: Vector): Vector {
  return a.map((n, i) => Math.max(n, b[i])) as unknown as Vector;
}
export interface Message {
  readonly id: string;
  readonly from: NodeId;
  readonly to: NodeId;
  readonly vector: Vector;
}
export type Action =
  | { kind: "increment"; node: "A" | "C"; client: string }
  | { kind: "deliver"; message: Message };
export const INPUTS: readonly Action[] = [
  { kind: "increment", node: "A", client: "Client 1" },
  { kind: "increment", node: "C", client: "Client 2" },
];
export const initialReplicas = (): Replicas => ({
  A: [0, 0, 0],
  B: [0, 0, 0],
  C: [0, 0, 0],
});
export function apply(replicas: Replicas, action: Action): Replicas {
  const node = action.kind === "increment" ? action.node : action.message.to;
  return {
    ...replicas,
    [node]:
      action.kind === "increment"
        ? increment(replicas[node], node)
        : merge(replicas[node], action.message.vector),
  };
}
export const experimentReplicas = () => INPUTS.reduce(apply, initialReplicas());
/** Capture each payload before any delivery; later merges cannot rewrite it. */
export function captureMessages(replicas: Replicas): readonly Message[] {
  return (
    [
      ["C", "A"],
      ["A", "B"],
      ["C", "B"],
      ["A", "C"],
    ] as const
  ).map(([from, to]) =>
    Object.freeze({
      id: `${from}-${to}`,
      from,
      to,
      vector: Object.freeze([...replicas[from]]) as Vector,
    }),
  );
}
export function refreshMessages(
  messages: readonly Message[],
  replicas: Replicas,
  from: "A" | "C",
): readonly Message[] {
  return messages.map((message) =>
    message.from === from
      ? Object.freeze({
          ...message,
          vector: Object.freeze([...replicas[from]]) as Vector,
        })
      : message,
  );
}
export const MESSAGES = captureMessages(experimentReplicas());
export const GUIDED_ACTIONS: readonly Action[] = [
  ...INPUTS,
  ...MESSAGES.map((message): Action => ({ kind: "deliver", message })),
];
export const converged = (replicas: Replicas) =>
  NODES.every((node) =>
    replicas[node].every((count, i) => count === replicas.A[i]),
  );
export function describe(
  replicas: Replicas,
  action: Action,
  next: Replicas,
): string {
  if (action.kind === "increment")
    return `${action.client} increments ${action.node}: ${formatVector(next[action.node])}. Value: ${value(next[action.node])}.`;
  const { from, to, vector } = action.message;
  const unchanged = replicas[to].every((count, i) => count === next[to][i]);
  return `${to} receives ${from}’s saved state: max(${formatVector(replicas[to])}, ${formatVector(vector)}) = ${formatVector(next[to])}. Value: ${value(next[to])}.${unchanged ? " No change: this update is already included." : " Replication adds no increment."}`;
}

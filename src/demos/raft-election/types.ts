export const NODES = ["A", "B", "C", "D", "E"] as const;
export type NodeId = (typeof NODES)[number];
export type Scenario = "success" | "split";
export interface NodeState {
  role: "follower" | "candidate" | "leader";
  term: number;
  votedFor: NodeId | null;
  votes: NodeId[];
  deadline: number;
  timerDuration: number;
  heartbeatAt: number;
  leader: NodeId | null;
}
export interface Packet {
  id: number;
  from: NodeId;
  to: NodeId;
  term: number;
  kind: "request" | "reply" | "heartbeat";
  granted?: boolean;
  sentAt: number;
  arrivesAt: number;
}
export interface Simulation {
  now: number;
  scenario: Scenario;
  nodes: Record<NodeId, NodeState>;
  packets: Packet[];
  nextId: number;
  crashed: NodeId[];
  recoverAt: Partial<Record<NodeId, number>>;
  splitSeen: boolean;
  election: { term: number; peers: NodeId[] };
  status: string;
}
export type Action =
  | { type: "advance"; to: number }
  | { type: "step" }
  | { type: "crash" }
  | { type: "scenario"; scenario: Scenario }
  | { type: "reset"; scenario?: Scenario };

export const FOLLOWERS = ["A", "C", "D", "E"] as const;
export const NODES = ["B", ...FOLLOWERS] as const;
export type FollowerId = (typeof FOLLOWERS)[number];
export type NodeId = (typeof NODES)[number];

/** All durations are simulation milliseconds. */
export interface Config {
  nodeCount: number;
  interval: number;
  delay: number;
  jitter: number;
  /** The timeout is sampled uniformly from [electionMin, 2 * electionMin]. */
  electionMin: number;
}
export interface Packet {
  id: number;
  from: "B";
  to: FollowerId;
  sentAt: number;
  arrivesAt: number;
}
export interface Observation {
  role: "follower" | "candidate";
  timerSeed: number;
  received: number;
  lastReceived: { id: number; at: number } | null;
  timerStartedAt: number;
  timeoutFraction: number;
  electionStartedAt: number | null;
  /** A bounded record of locally observed arrivals. */
  arrivals: { id: number; at: number }[];
}
export interface Simulation {
  now: number;
  config: Config;
  initialSeed: number;
  networkSeed: number;
  faultSeed: number;
  nextId: number;
  leader: { lastSent: number; sent: number };
  followers: Partial<Record<FollowerId, Observation>> & { A: Observation };
  /** Transport faults are separate from each follower's local observations. */
  transport: {
    crashed: boolean;
    cut: FollowerId[];
    dropNext: FollowerId | null;
    lastDrop: FollowerId | null;
    dropped: number;
  };
  packets: Packet[];
}
export type Action =
  | { type: "advance"; to: number }
  | { type: "tick"; elapsed: number }
  | { type: "step" }
  | { type: "configure"; values: Partial<Config> }
  | { type: "reset" }
  | { type: "cut" }
  | { type: "crash" }
  | { type: "drop" };

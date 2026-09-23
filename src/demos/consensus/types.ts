export type ConsensusTopic =
  | "replication"
  | "partition"
  | "election"
  | "repair"
  | "current-term"
  | "apply"
  | "membership"
  | "snapshot";

export interface LogEntry {
  index: number;
  term: number;
  command: string;
}

export interface ConsensusNode {
  id: string;
  role: "leader" | "follower" | "candidate";
  term: number;
  // Local knowledge: a vote alone does not tell a follower who won an election.
  leader: string | null;
  log: LogEntry[];
  commitIndex: number;
  lastApplied: number;
  value: number;
  note?: string;
  offline?: boolean;
  group?: "left" | "right";
  highlighted?: boolean;
  snapshot?: {
    index: number;
    term: number;
    value: number;
    configuration: string[];
  };
}

export interface ConsensusLink {
  from: string;
  to: string;
  label?: string;
  blocked?: boolean;
}

export interface ConsensusFrame {
  title: string;
  detail: string;
  nodes: ConsensusNode[];
  links?: ConsensusLink[];
  focusIndex?: number;
  // Membership walkthrough: two independent voter sets, never a union quorum.
  configuration?: { old: string[]; next: string[]; acknowledgements: string[] };
}

export interface ConsensusLesson {
  id: ConsensusTopic;
  title: string;
  layout: "logs" | "network" | "membership" | "machines";
  guide: string;
  frames: ConsensusFrame[];
}

export interface ConsensusSceneProps {
  lesson: ConsensusLesson;
  frame: ConsensusFrame;
  frameIndex: number;
  active: boolean;
  reduced: boolean;
  top: boolean;
  cameraCommand: {
    sequence: number;
    action: "left" | "right" | "in" | "out" | "reset";
  };
  onReady: () => void;
  onUnavailable: () => void;
}

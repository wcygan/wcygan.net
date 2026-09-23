export type DemoKind =
  | "independent"
  | "placement"
  | "two-phase"
  | "three-phase"
  | "spanner";
export type NodeId = "coordinator" | "a" | "b" | "a2" | "a3" | "b2" | "b3";
export type TransactionState =
  | "idle"
  | "pending"
  | "prepared"
  | "pre-commit"
  | "committed"
  | "aborted";
export interface AccountState {
  balance: number;
  pending: number;
  locked: boolean;
  state: TransactionState;
  records: string[];
}
export interface ReplicaState {
  id: Exclude<NodeId, "coordinator">;
  group: "a" | "b";
  online: boolean;
  leader: boolean;
  record: string | null;
}
export interface Message {
  from: NodeId;
  to: NodeId;
  label: string;
  /** Zero-based causal beat. Messages in the same beat travel together. */
  beat?: number;
}
export interface TransactionFrame {
  title: string;
  status: string;
  layout: "together" | "split" | "replicated";
  accounts: [AccountState, AccountState];
  coordinator: {
    visible: boolean;
    online: boolean;
    record: string | null;
    role: "dedicated" | "a";
  };
  isolated: boolean;
  replicas: ReplicaState[];
  /** Messages arriving to produce this frame; shown while advancing from the previous frame. */
  messages: Message[];
  /** An explicit protocol wait retains a full teaching beat without traffic. */
  wait?: boolean;
  /** Label the next scripted recovery; autoplay holds here before continuing. */
  recoveryAction?: string;
}
export interface TransactionScenario {
  id: string;
  label: string;
  description: string;
  assumption?: string;
  frames: TransactionFrame[];
}
export interface DemoDefinition {
  title: string;
  scenarios: TransactionScenario[];
}

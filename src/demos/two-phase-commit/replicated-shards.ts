export type ShardId = "a" | "b";
export type ShardRecord = "PREPARE" | "COMMIT" | null;
export type RouteId =
  | "prepare-a"
  | "prepare-b"
  | "replicate-a"
  | "replicate-b"
  | "vote-a"
  | "vote-b"
  | "commit-a"
  | "commit-b";

export interface ReplicatedShardFrame {
  title: string;
  status: string;
  coordinator: string;
  coordinatorRecord: "COMMIT" | null;
  votesReceived: number;
  yesVotesReceived: number;
  records: [ShardRecord[], ShardRecord[]];
  shardStatus: [string, string];
  routes: RouteId[];
}

const emptyRecords = (): [ShardRecord[], ShardRecord[]] => [
  [null, null, null],
  [null, null, null],
];
const preparedRecords = (): [ShardRecord[], ShardRecord[]] => [
  ["PREPARE", "PREPARE", null],
  ["PREPARE", "PREPARE", null],
];
const committedRecords = (): [ShardRecord[], ShardRecord[]] => [
  ["COMMIT", "COMMIT", null],
  ["COMMIT", "COMMIT", null],
];

// A deliberately simplified leader/quorum teaching trace; real systems differ.
export const replicatedShardFrames: ReplicatedShardFrame[] = [
  {
    title: "One transaction, two replicated shards",
    status:
      "Each shard has its own consensus group. The transaction coordinator needs one vote from each shard leader.",
    coordinator: "Ready",
    coordinatorRecord: null,
    votesReceived: 0,
    yesVotesReceived: 0,
    records: emptyRecords(),
    shardStatus: ["No transaction record", "No transaction record"],
    routes: [],
  },
  {
    title: "Prepare reaches both shard leaders",
    status:
      "PREPARE is sent to each leader. The coordinator waits for votes; it does not count delivery as a vote.",
    coordinator: "Waiting for votes",
    coordinatorRecord: null,
    votesReceived: 0,
    yesVotesReceived: 0,
    records: [
      ["PREPARE", null, null],
      ["PREPARE", null, null],
    ],
    shardStatus: ["PREPARE · 1/3", "PREPARE · 1/3"],
    routes: ["prepare-a", "prepare-b"],
  },
  {
    title: "Each shard replicates PREPARE",
    status:
      "Each leader stores PREPARE locally and replicates it to a peer. Two of three copies form a quorum.",
    coordinator: "Waiting for votes",
    coordinatorRecord: null,
    votesReceived: 0,
    yesVotesReceived: 0,
    records: preparedRecords(),
    shardStatus: ["PREPARE quorum · 2/3", "PREPARE quorum · 2/3"],
    routes: ["replicate-a", "replicate-b"],
  },
  {
    title: "Shard A votes YES",
    status:
      "Shard A's prepared record is on a quorum. Its leader sends YES; the coordinator's tally remains 0/2 until arrival.",
    coordinator: "Waiting for votes",
    coordinatorRecord: null,
    votesReceived: 0,
    yesVotesReceived: 0,
    records: preparedRecords(),
    shardStatus: ["Quorum · YES in transit", "PREPARE quorum · 2/3"],
    routes: [],
  },
  {
    title: "Shard A vote arrives",
    status:
      "The coordinator now has one of two participant votes. Shard B has a quorum and has not sent its vote yet.",
    coordinator: "A: YES",
    coordinatorRecord: null,
    votesReceived: 1,
    yesVotesReceived: 1,
    records: preparedRecords(),
    shardStatus: ["YES received", "PREPARE quorum · 2/3"],
    routes: ["vote-a"],
  },
  {
    title: "Shard B votes YES",
    status:
      "Shard B's prepared record is on a quorum. Its leader sends YES; the tally stays 1/2 until arrival.",
    coordinator: "A: YES",
    coordinatorRecord: null,
    votesReceived: 1,
    yesVotesReceived: 1,
    records: preparedRecords(),
    shardStatus: ["YES received", "Quorum · YES in transit"],
    routes: [],
  },
  {
    title: "Both votes arrive",
    status:
      "Both shard leaders voted YES. The coordinator durably records COMMIT before sending it.",
    coordinator: "A: YES · B: YES",
    coordinatorRecord: "COMMIT",
    votesReceived: 2,
    yesVotesReceived: 2,
    records: preparedRecords(),
    shardStatus: ["Prepared · lock held", "Prepared · lock held"],
    routes: ["vote-b"],
  },
  {
    title: "COMMIT reaches both shard leaders",
    status:
      "The coordinator sends its durable decision to both participants. Each leader will replicate the outcome within its shard.",
    coordinator: "COMMIT · saved",
    coordinatorRecord: "COMMIT",
    votesReceived: 2,
    yesVotesReceived: 2,
    records: [
      ["COMMIT", "PREPARE", null],
      ["COMMIT", "PREPARE", null],
    ],
    shardStatus: ["COMMIT · 1/3", "COMMIT · 1/3"],
    routes: ["commit-a", "commit-b"],
  },
  {
    title: "Each shard commits on a quorum",
    status:
      "Both shard groups replicate COMMIT to a quorum, apply their local changes, and release their locks.",
    coordinator: "COMMIT · complete",
    coordinatorRecord: "COMMIT",
    votesReceived: 2,
    yesVotesReceived: 2,
    records: committedRecords(),
    shardStatus: ["COMMIT quorum · 2/3", "COMMIT quorum · 2/3"],
    routes: ["replicate-a", "replicate-b"],
  },
];

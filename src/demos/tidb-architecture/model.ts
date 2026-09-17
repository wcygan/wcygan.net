export type GroupId = "application" | "tidb" | "pd" | "tikv";
export type RegionId = "R1" | "R2" | "R3" | "R4" | "R5" | "R6" | "R7";
export type Point = [number, number, number];
export type OperationKind = "read" | "update";
export type ReadMode = "leader" | "follower-caught-up" | "follower-lagging";

export const GROUPS = {
  application: {
    label: "Application",
    tint: "#eeece5",
    position: [-1.8, 0, -6.2],
    size: [2.2, 0.16, 1.6],
  },
  tidb: {
    label: "TiDB SQL servers",
    tint: "#dce6ec",
    position: [-1.8, 0, -2.9],
    size: [6.8, 0.16, 2.1],
  },
  pd: {
    label: "PD cluster",
    tint: "#e6dfed",
    position: [4, 0, 0.5],
    size: [2, 0.16, 8],
  },
  tikv: {
    label: "TiKV · 9 nodes",
    tint: "#e0e7d9",
    position: [-1.8, 0, 5.8],
    size: [6.8, 0.16, 10.1],
  },
} satisfies Record<
  GroupId,
  { label: string; tint: string; position: Point; size: Point }
>;

export interface ArchitectureNode {
  id: string;
  group: GroupId;
  position: Point;
}
export const NODES: ArchitectureNode[] = [
  {
    id: "Application",
    group: "application",
    position: GROUPS.application.position,
  },
  ...[-2.15, 0, 2.15].map(
    (x, i): ArchitectureNode => ({
      id: `TiDB ${i + 1}`,
      group: "tidb",
      position: [GROUPS.tidb.position[0] + x, 0, GROUPS.tidb.position[2]],
    }),
  ),
  ...[-2.6, 0, 2.6].map(
    (z, i): ArchitectureNode => ({
      id: `PD ${i + 1}`,
      group: "pd",
      position: [GROUPS.pd.position[0], 0, GROUPS.pd.position[2] + z],
    }),
  ),
  ...Array.from(
    { length: 9 },
    (_, i): ArchitectureNode => ({
      id: `TiKV ${i + 1}`,
      group: "tikv",
      position: [
        GROUPS.tikv.position[0] + ((i % 3) - 1) * 2.15,
        0,
        2.3 + Math.floor(i / 3) * 3.5,
      ],
    }),
  ),
];

// One clustered primary key, seven illustrative ranges. Secondary indexes are omitted.
// Five distinct peers per Region; each store holds only three or four of the seven Regions.
export const REGIONS = (
  [
    {
      id: "R1",
      color: "#c89370",
      ink: "#8a4e25",
      stores: [1, 2, 4, 5, 7],
      leader: "TiKV 1",
    },
    {
      id: "R2",
      color: "#87a5bb",
      ink: "#365f7e",
      stores: [2, 3, 5, 6, 8],
      leader: "TiKV 5",
    },
    {
      id: "R3",
      color: "#a0ad87",
      ink: "#536936",
      stores: [1, 3, 6, 7, 9],
      leader: "TiKV 7",
    },
    {
      id: "R4",
      color: "#b4a0bb",
      ink: "#75527f",
      stores: [1, 2, 5, 8, 9],
      leader: "TiKV 9",
    },
    {
      id: "R5",
      color: "#c6b276",
      ink: "#796021",
      stores: [2, 3, 4, 7, 9],
      leader: "TiKV 2",
    },
    {
      id: "R6",
      color: "#89b4ae",
      ink: "#346e65",
      stores: [1, 3, 4, 6, 8],
      leader: "TiKV 6",
    },
    {
      id: "R7",
      color: "#bf939d",
      ink: "#80515f",
      stores: [4, 5, 6, 8, 9],
      leader: "TiKV 4",
    },
  ] as const
).map((region, i) => ({
  ...region,
  start: i * 200 + 1,
  end: (i + 1) * 200 + 1, // Exclusive bound, like a Region's key range.
  replicas: region.stores.map((store) => ({
    nodeId: `TiKV ${store}`,
    leader: `TiKV ${store}` === region.leader,
  })),
}));
export type Region = (typeof REGIONS)[number];
export const USER_ID_MAX = REGIONS.at(-1)!.end - 1;
export const regionForUser = (userId: number): Region => {
  const region = REGIONS.find((r) => userId >= r.start && userId < r.end);
  if (!region || !Number.isInteger(userId))
    throw new RangeError(`User ID must be an integer from 1 to ${USER_ID_MAX}`);
  return region;
};
export const regionsOnNode = (nodeId: string) =>
  REGIONS.filter((r) => r.replicas.some((p) => p.nodeId === nodeId));
export const REPLICA_BLOCK_HEIGHT = 0.24;
export const replicaHeight = (region: Region, nodeId: string) =>
  0.38 + regionsOnNode(nodeId).findIndex((r) => r.id === region.id) * 0.32;
export const nodeById = (id: string) => {
  const node = NODES.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown architecture node: ${id}`);
  return node;
};

/** Background links join component groups, while operation paths join actual nodes. */
export function architectureConnections(): {
  points: [Point, Point];
  dashed: boolean;
}[] {
  const data = (from: GroupId, to: GroupId): [Point, Point] => [
    [
      GROUPS[from].position[0],
      0.14,
      GROUPS[from].position[2] + GROUPS[from].size[2] / 2,
    ],
    [
      GROUPS[to].position[0],
      0.14,
      GROUPS[to].position[2] - GROUPS[to].size[2] / 2,
    ],
  ];
  const coordination = (z: number): [Point, Point] => [
    [GROUPS.tidb.position[0] + GROUPS.tidb.size[0] / 2, 0.14, z],
    [GROUPS.pd.position[0] - GROUPS.pd.size[0] / 2, 0.14, z],
  ];
  return [
    { points: data("application", "tidb"), dashed: false },
    { points: data("tidb", "tikv"), dashed: false },
    { points: coordination(GROUPS.tidb.position[2]), dashed: true },
    {
      points: coordination(GROUPS.pd.position[2] + GROUPS.pd.size[2] / 2),
      dashed: true,
    },
  ];
}

export interface Operation {
  kind: OperationKind;
  userId: number;
  sqlNode: string;
  readMode?: ReadMode;
  dropFollowerMessage?: boolean;
}
export const INITIAL_OPERATION: Operation = {
  kind: "read",
  userId: 427,
  sqlNode: "TiDB 2",
};
export function randomOperation(
  kind: OperationKind,
  random = Math.random,
): Operation {
  return {
    kind,
    userId: 1 + Math.floor(random() * USER_ID_MAX),
    sqlNode: `TiDB ${1 + Math.floor(random() * 3)}`,
  };
}
export const statement = (operation: Operation) =>
  operation.kind === "read"
    ? `SELECT name FROM users WHERE id = ${operation.userId};`
    : `UPDATE users SET name = 'Alex' WHERE id = ${operation.userId};`;

export interface MessagePath {
  from: string;
  to: string;
  kind: "request" | "coordination" | "replication" | "ack" | "result";
  delivery?: "dropped";
  /** Only a request/reply pair shares a step; other messages move in parallel. */
  phase?: 0 | 1;
}
export interface FollowerProgress {
  nodeId: string;
  status: "behind" | "retrying" | "applying" | "caught-up";
}
export interface OperationStep {
  id: string;
  title: string;
  narration: string;
  paths: MessagePath[];
  acknowledged: string[];
  follower?: FollowerProgress;
  /** Local application of a committed entry; no network packet. */
  applying?: string;
  readSafety?: {
    nodeId: string;
    state:
      | "lease"
      | "checking"
      | "confirming"
      | "waiting"
      | "applying"
      | "ready";
    requiredIndex: number;
    appliedIndex: number;
  };
}

export function readNode(operation: Operation): string {
  const region = regionForUser(operation.userId);
  return isFollowerRead(operation)
    ? region.replicas.filter((r) => !r.leader).at(-1)!.nodeId
    : region.leader;
}

function isFollowerRead(operation: Operation): boolean {
  return (
    operation.readMode === "follower-caught-up" ||
    operation.readMode === "follower-lagging"
  );
}

/** A valid lease fast path, or a conservative ReadIndex path with optional lag.
 * Log positions are illustrative and independent of SQL snapshot timestamps.
 */
function readSteps(operation: Operation, region: Region): OperationStep[] {
  const target = readNode(operation);
  const follower = isFollowerRead(operation);
  const lagging = operation.readMode === "follower-lagging";
  const peers = region.replicas.filter((r) => !r.leader);
  const safety = (
    state: NonNullable<OperationStep["readSafety"]>["state"],
    appliedIndex = lagging ? 98 : 100,
    nodeId = target,
  ): OperationStep["readSafety"] => ({
    nodeId,
    state,
    requiredIndex: 100,
    appliedIndex,
  });
  const step = (
    id: string,
    title: string,
    narration: string,
    paths: MessagePath[] = [],
    readSafety?: OperationStep["readSafety"],
  ): OperationStep => ({
    id,
    title,
    narration,
    paths,
    acknowledged: [],
    readSafety,
    // Replica progress persists even while the leader owns the safety callout.
    follower: lagging
      ? {
          nodeId: target,
          status: readSafety?.state === "ready" ? "caught-up" : "behind",
        }
      : undefined,
  });
  return [
    step(
      "route",
      follower ? "Route to a follower" : "Route to the Region leader",
      `User ${operation.userId} belongs to Region ${region.id}. ${operation.sqlNode} uses cached Region locations to send the read to ${follower ? `follower ${target}, rather than the leader on ${region.leader}` : `its leader on ${target}`}.`,
      [{ from: operation.sqlNode, to: target, kind: "request" }],
    ),
    ...(follower
      ? [
          step(
            "read-index",
            "Ask the leader for a safe read position",
            `${target} asks ${region.leader} for a ReadIndex: a safe committed Raft log position. ${lagging ? "This example starts the follower at applied position 98; it cannot return the row yet." : "This follower has already applied through position 100. It still needs the leader’s safe read position before returning the row."}`,
            [{ from: target, to: region.leader, kind: "coordination" }],
            safety("checking"),
          ),
          step(
            "read-confirm",
            "Confirm the leader’s authority",
            `${region.leader} sends Raft heartbeats to its four peers to confirm it still leads ${region.id}. These messages check leadership; they do not fetch copies of the row. This illustrates the quorum-check path.`,
            peers.map((p) => ({
              from: region.leader,
              to: p.nodeId,
              kind: "coordination" as const,
            })),
            safety("confirming", 100, region.leader),
          ),
          step(
            "read-quorum",
            "A majority confirms leadership",
            `Two followers reply. Together with ${region.leader}, they form a three-of-five majority confirming leadership. These are heartbeat replies, not acknowledgments of a new write.`,
            peers.slice(0, 2).map((p) => ({
              from: p.nodeId,
              to: region.leader,
              kind: "coordination" as const,
            })),
            safety("confirming", 100, region.leader),
          ),
          step(
            "read-barrier",
            lagging
              ? "Wait at the read barrier"
              : "The follower is already caught up",
            `${region.leader} returns ReadIndex 100 to ${target}. ${lagging ? "Its applied position is still 98, so the read waits. Receiving a log entry is not enough: the follower must apply committed entries through 100." : "Its applied position is already 100, so the read barrier is satisfied immediately. No catch-up replication is needed for this read."}`,
            [{ from: region.leader, to: target, kind: "coordination" }],
            safety(lagging ? "waiting" : "ready"),
          ),
          ...(lagging
            ? [
                step(
                  "read-catch-up",
                  "Catch up through the required position",
                  `${region.leader} sends the missing committed entries to ${target} through ordinary Raft replication. The read remains blocked while those entries are received and applied. Catch-up and the leadership check can overlap in a real cluster.`,
                  [{ from: region.leader, to: target, kind: "replication" }],
                  safety("applying"),
                ),
                step(
                  "read-ready",
                  "The follower can now read",
                  `${target} has applied through position 100, meeting ReadIndex 100. It can now read user ${operation.userId} at the transaction’s snapshot timestamp. The log position and the snapshot timestamp are different things.`,
                  [],
                  safety("ready", 100),
                ),
              ]
            : []),
        ]
      : [
          step(
            "read-lease",
            "Check the leader lease",
            `${target} has a valid leader lease and has applied the committed entries needed for this read. It can read locally without contacting a majority for each query. An expired or uncertain lease requires a Raft safety check first.`,
            [],
            safety("lease", 100),
          ),
        ]),
    step(
      "storage-result",
      follower ? "Return the row from the follower" : "Read from the leader",
      `${target} reads user ${operation.userId} at the transaction’s snapshot and returns the row directly to ${operation.sqlNode}. ${follower ? "The leader supplied the safe read position; the follower supplies the row." : "This example uses the valid-lease fast path."}`,
      [{ from: target, to: operation.sqlNode, kind: "result" }],
      safety("ready", 100),
    ),
  ];
}

/** Local safety checks have no message path but still have an active component. */
export function stepParticipants(step: OperationStep): Set<string> {
  return new Set([
    ...step.paths.flatMap((p) => [p.from, p.to]),
    ...(step.readSafety ? [step.readSafety.nodeId] : []),
    ...(step.follower ? [step.follower.nodeId] : []),
    ...(step.applying ? [step.applying] : []),
  ]);
}
export function operationSteps(operation: Operation): OperationStep[] {
  const region = regionForUser(operation.userId);
  const withFailure =
    operation.kind === "update" && operation.dropFollowerMessage === true;
  const followers = region.replicas
    .filter((r) => !r.leader)
    .map((r) => r.nodeId);
  // Any two followers can supply the quorum. The optional failure drops one
  // non-quorum delivery and retries it after the response for illustration.
  const quorumSize = Math.floor(region.replicas.length / 2) + 1;
  const responding = followers.slice(0, quorumSize - 1);
  const remaining = followers.slice(quorumSize - 1);
  const quorum = [region.leader, ...responding];
  const delayed = remaining.at(-1)!;
  const behind: FollowerProgress | undefined = withFailure
    ? { nodeId: delayed, status: "behind" }
    : undefined;
  const step = (
    id: string,
    title: string,
    narration: string,
    paths: MessagePath[] = [],
    acknowledged: string[] = [],
    follower?: FollowerProgress,
  ): OperationStep => ({ id, title, narration, paths, acknowledged, follower });
  const path = (
    from: string,
    to: string,
    kind: MessagePath["kind"],
  ): MessagePath => ({ from, to, kind });
  return [
    step(
      "ready",
      "One key, one Region",
      `User ${operation.userId} belongs to ${region.id} (IDs ${region.start}–${region.end - 1}). Five of the nine storage nodes hold this Region. Play to follow the ${operation.kind}.`,
    ),
    step(
      "sql",
      "Send SQL",
      `The application sends the statement to ${operation.sqlNode} using the MySQL protocol.`,
      [path("Application", operation.sqlNode, "request")],
    ),
    step(
      "timestamp",
      "Coordination beside the query",
      `This example shows ${operation.sqlNode} obtaining a transaction start timestamp from PD. Some autocommit clustered-primary-key reads can skip this exchange. It can use cached Region locations; the row never travels through PD.`,
      [
        { ...path(operation.sqlNode, "PD 1", "coordination"), phase: 0 },
        { ...path("PD 1", operation.sqlNode, "coordination"), phase: 1 },
      ],
    ),
    ...(operation.kind === "update"
      ? [
          step(
            "route",
            "Route to the Region leader",
            `User ${operation.userId} belongs to Region ${region.id}. TiDB sends the request to ${region.id}’s leader on ${region.leader}.`,
            [path(operation.sqlNode, region.leader, "request")],
          ),
          step(
            "replicate",
            withFailure
              ? "One follower misses the entry"
              : "Replicate the change",
            withFailure
              ? `${region.leader} appends the entry and sends it to all four followers. This example drops the message to ${delayed}; its ${region.id} replica is behind, not lost.`
              : `${region.leader} appends the entry to its Raft log and sends it to all four followers of ${region.id}: ${followers.join(", ")}.`,
            followers.map((f) => ({
              ...path(region.leader, f, "replication"),
              ...(withFailure && f === delayed
                ? { delivery: "dropped" as const }
                : {}),
            })),
            [region.leader],
            behind,
          ),
          step(
            "majority",
            "A majority commits the change",
            `${region.leader} plus ${responding.join(" and ")} form a three-of-five Raft majority with the entry durably appended. These ACKs confirm log persistence, not application. The entry commits without waiting for ${remaining.join(" or ")}. ${withFailure ? `${delayed} is still behind; ${remaining[0]}’s normal reply is omitted.` : "The other two followers also replicate; their replies are omitted here."}`,
            responding.map((f) => path(f, region.leader, "ack")),
            quorum,
            behind,
          ),
          {
            ...step(
              "leader-apply",
              "Apply the committed entry on the leader",
              `${region.leader} applies the committed Raft entry to its local state machine before replying to TiDB. The follower ACKs establish durable log replication, not that every follower has applied the entry.`,
              [],
              quorum,
              behind,
            ),
            applying: region.leader,
          },
          step(
            "storage-result",
            "Acknowledge the replicated change",
            `After local application, the Region leader acknowledges the replicated change to ${operation.sqlNode}. Transaction coordination is simplified here; a Raft commit is only part of a transactional write.`,
            [path(region.leader, operation.sqlNode, "ack")],
            quorum,
            behind,
          ),
        ]
      : readSteps(operation, region)),
    step(
      "response",
      "Return to the application",
      operation.kind === "update"
        ? `After transaction coordination, TiDB acknowledges the update to the application.${withFailure ? ` ${delayed} is still behind; its reply is not required for success.` : ""}`
        : "TiDB returns the selected user’s name to the application.",
      [path(operation.sqlNode, "Application", "result")],
      operation.kind === "update" ? quorum : [],
      operation.kind === "update" ? behind : undefined,
    ),
    ...(withFailure
      ? [
          step(
            "catch-up",
            "Retry in the background",
            `The application already has its response. ${region.leader} retries the missing Raft entry to ${delayed}. All followers use Raft replication; retries can overlap the response in a real cluster.`,
            [path(region.leader, delayed, "replication")],
            quorum,
            { nodeId: delayed, status: "retrying" },
          ),
          step(
            "follower-appended",
            "Acknowledge the appended entry",
            `${delayed} durably appends the missing entry and sends an ACK to ${region.leader}. Its log has caught up, but the entry has not yet been applied to its state machine.`,
            [path(delayed, region.leader, "ack")],
            [...quorum, delayed],
            { nodeId: delayed, status: "applying" },
          ),
          {
            ...step(
              "follower-apply",
              "Apply on the recovering follower",
              `${delayed} knows the entry is committed and applies committed entries in order. Commit-index propagation is omitted. The earlier append ACK did not prove application; the replica stays marked as applying until this local work finishes.`,
              [],
              [...quorum, delayed],
              { nodeId: delayed, status: "applying" },
            ),
            applying: delayed,
          },
          step(
            "caught-up",
            "The follower catches up",
            `${delayed} has now applied the committed entry and reached the same state for this change. No second application write is needed.`,
            [],
            [...quorum, delayed],
            { nodeId: delayed, status: "caught-up" },
          ),
        ]
      : []),
    step(
      "complete",
      operation.kind === "update"
        ? withFailure
          ? "Update acknowledged · follower caught up"
          : "Update acknowledged"
        : "Read complete",
      operation.kind === "update"
        ? withFailure
          ? `A three-of-five majority let the update succeed while ${delayed} was behind. Raft retries brought it up to date once delivery succeeded. A follower too far behind the retained log needs a snapshot instead.`
          : `All five replicas received the entry. The leader and two follower ACKs formed a three-of-five majority; the other two replies were not needed for the commit and are omitted.`
        : isFollowerRead(operation)
          ? `Read complete from ${readNode(operation)} after checking ReadIndex. ${operation.readMode === "follower-lagging" ? "Replication lag delayed the read until the required entries were applied." : "The follower was already caught up through the required position; no catch-up wait was needed."} The result respects the transaction’s snapshot.`
          : `Read complete from ${region.id}’s leader on ${region.leader} under a valid lease. No per-read quorum round trip was needed. The result respects the transaction’s snapshot.`,
      [],
      operation.kind === "update"
        ? withFailure
          ? [...quorum, delayed]
          : quorum
        : [],
      withFailure ? { nodeId: delayed, status: "caught-up" } : undefined,
    ),
  ];
}

// Shared endpoint coordinates keep packet motion attached to the actual model.
export function messagePoints(
  path: MessagePath,
  region: Region,
): [Point, Point, Point] {
  const point = (id: string): Point => {
    const node = nodeById(id);
    const [x, , z] = node.position;
    return [
      x,
      node.group === "tikv" ? replicaHeight(region, id) : 0.8,
      z + (node.group === "tikv" ? 0.65 : 0),
    ];
  };
  const from = point(path.from),
    to = point(path.to);
  return [
    from,
    [
      (from[0] + to[0]) / 2,
      Math.max(from[1], to[1]) + (path.kind === "coordination" ? 0.5 : 2),
      (from[2] + to[2]) / 2,
    ],
    to,
  ];
}
export interface ViewCommand {
  kind: "reset" | "left" | "right" | "in" | "out";
  revision: number;
}

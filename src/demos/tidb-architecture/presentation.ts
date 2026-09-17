import {
  nodeById,
  operationSteps,
  regionForUser,
  regionsOnNode,
  stepParticipants,
  type GroupId,
  type FollowerProgress,
  type Operation,
  type OperationStep,
  type ReadMode,
} from "./model";

export const READ_MODE_LABELS: Record<ReadMode, string> = {
  leader: "Leader read",
  "follower-caught-up": "Caught-up follower read",
  "follower-lagging": "Lagging follower read",
};

export const GROUP_LABELS: Record<GroupId, string> = {
  application: "Application",
  tidb: "SQL",
  tikv: "Storage · 9 nodes",
  pd: "PD",
};
export const CONNECTIONS = [
  {
    id: "sql",
    name: "Application ↔ SQL",
    detail:
      "The application sends SQL and receives results over the MySQL protocol.",
  },
  {
    id: "storage",
    name: "SQL ↔ Storage",
    detail:
      "TiDB routes key-value and coprocessor requests to TiKV. Reads go to a Region’s leader by default. Follower reads check a safe Raft log position. A caught-up follower can then serve the row; only a lagging follower needs to wait for more entries to be applied.",
  },
  {
    id: "metadata",
    name: "SQL ↔ PD",
    detail:
      "PD supplies transaction timestamps and Region locations. TiDB can cache locations; the row itself never travels through PD.",
  },
  {
    id: "scheduling",
    name: "Storage ↔ PD",
    detail:
      "TiKV sends heartbeats with store and Region metadata. PD uses them to schedule replica placement and balance the cluster, beside the row's data path.",
  },
] as const;
export type Inspection =
  | { kind: "group"; id: GroupId }
  | { kind: "node"; id: string }
  | { kind: "connection"; id: (typeof CONNECTIONS)[number]["id"] };
export const nodeLabel = (id: string) => id.replace("TiDB ", "SQL ");
const GROUP_DETAILS: Record<GroupId, string> = {
  application:
    "Sends primary-key SQL statements and receives results using the MySQL protocol.",
  tidb: "Three stateless TiDB servers parse, optimize, and execute SQL. They locate the relevant Region and send storage requests to TiKV.",
  tikv: "Nine TiKV nodes hold thirty-five replicas of seven Regions, with three or four Regions per node. Each Region has its own Raft leader and four followers; three of its five replicas form a majority.",
  pd: "Three Placement Driver members coordinate timestamps, Region locations, and replica placement. PD stays beside the data path.",
};
export function inspectionDetails(target: Inspection) {
  if (target.kind === "connection") {
    const connection = CONNECTIONS.find((c) => c.id === target.id)!;
    return { title: connection.name, description: connection.detail };
  }
  if (target.kind === "group")
    return {
      title: GROUP_LABELS[target.id],
      description: GROUP_DETAILS[target.id],
    };
  const node = nodeById(target.id);
  return {
    title: nodeLabel(node.id),
    description:
      node.group === "tikv"
        ? regionsOnNode(node.id)
            .map(
              (r) =>
                `${r.id} (users ${r.start}–${r.end - 1}): ${r.leader === node.id ? "leader" : "follower"}.`,
            )
            .join(" ") +
          " Leadership belongs to each Region, not the storage cluster."
        : node.group === "pd"
          ? `${node.id === "PD 1" ? "The elected PD leader." : "A member of the PD quorum."} ${GROUP_DETAILS.pd}`
          : GROUP_DETAILS[node.group],
  };
}
export interface SceneLabel {
  id: string;
  title: string;
  detail?: string;
  explanation?: string;
  followerStatus?: FollowerProgress["status"];
  readState?: NonNullable<OperationStep["readSafety"]>["state"];
  priority: number;
  anchor: { kind: "group"; id: GroupId } | { kind: "node"; id: string };
}
export const FOLLOWER_STATUS_TEXT: Record<FollowerProgress["status"], string> =
  {
    behind: "Behind",
    retrying: "Retrying",
    applying: "Applying",
    "caught-up": "Caught up",
  };

/** Labels explain the current event; the full inventory lives in HTML. */
export function sceneLabels(operation: Operation, step: number): SceneLabel[] {
  const steps = operationSteps(operation);
  if (step === 0 || step === steps.length - 1)
    return (Object.keys(GROUP_LABELS) as GroupId[]).map((id) => ({
      id: `group:${id}`,
      title: GROUP_LABELS[id],
      priority: 20,
      anchor: { kind: "group", id },
    }));
  const current = steps[step];
  const participants = stepParticipants(current);
  const region = regionForUser(operation.userId);
  const labels: SceneLabel[] = [
    {
      id: operation.sqlNode,
      title: nodeLabel(operation.sqlNode),
      priority: 90,
      anchor: { kind: "node", id: operation.sqlNode },
    },
  ];
  for (const replica of region.replicas) {
    if (operation.kind === "read" && !participants.has(replica.nodeId))
      continue;
    const readSafety =
      current.readSafety?.nodeId === replica.nodeId
        ? current.readSafety
        : undefined;
    const followerStatus =
      current.follower?.nodeId === replica.nodeId
        ? current.follower.status
        : undefined;
    const named = participants.has(replica.nodeId) || Boolean(followerStatus);
    const regionText = `${region.id}${replica.leader ? " · Leader" : followerStatus ? ` · ${operation.kind === "read" ? "Follower · " : ""}${FOLLOWER_STATUS_TEXT[followerStatus]}` : operation.kind === "read" ? " · Follower" : ""}`;
    const explainQuorum =
      replica.leader &&
      operation.kind === "update" &&
      (current.id === "replicate" || current.id === "majority");
    const followerAcks = Math.floor(region.replicas.length / 2);
    labels.push({
      id: replica.nodeId,
      title: named ? replica.nodeId : regionText,
      detail: named ? regionText : undefined,
      followerStatus,
      readState: readSafety?.state,
      explanation: readSafety
        ? readSafetyExplanation(readSafety)
        : current.applying === replica.nodeId
          ? "Applying the committed entry.\nLocal state-machine work;\nno network ACK required."
          : explainQuorum
            ? `Waits for ${followerAcks} follower ACKs.\nLeader + ${followerAcks} = ${followerAcks + 1}/${region.replicas.length} majority\nto commit the Raft entry.`
            : undefined,
      priority: readSafety
        ? 110
        : replica.leader
          ? 100
          : followerStatus
            ? 95
            : named
              ? 80
              : 40,
      anchor: { kind: "node", id: replica.nodeId },
    });
  }
  for (const id of ["Application", "PD 1"]) {
    if (participants.has(id))
      labels.push({
        id,
        title: id,
        priority: 70,
        anchor: { kind: "node", id },
      });
  }
  return labels;
}

function readSafetyExplanation(
  safety: NonNullable<OperationStep["readSafety"]>,
): string {
  switch (safety.state) {
    case "lease":
      return "Valid leader lease.\nCommitted entries applied.\nSafe to read locally.";
    case "checking":
      return `Requesting ReadIndex.\nApplied: ${safety.appliedIndex}\nWaiting for a safe position.`;
    case "confirming":
      return "Confirming leadership.\nLeader + 2 replies = 3/5.\nHeartbeat replies, not rows.";
    case "waiting":
      return `ReadIndex: ${safety.requiredIndex}\nApplied: ${safety.appliedIndex} · read blocked\nWait until applied ≥ ${safety.requiredIndex}.`;
    case "applying":
      return `Catching up to ${safety.requiredIndex}.\nRead stays blocked while\nentries are applied.`;
    case "ready":
      return `Applied ${safety.appliedIndex} / required ${safety.requiredIndex}\nRead the transaction’s\nsnapshot, then return.`;
  }
}

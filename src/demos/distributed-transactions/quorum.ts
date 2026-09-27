import type { ReplicaState } from "./types";

/** Describe the majority visible in a finite replicated-shard teaching frame. */
export function quorumLabel(
  replicas: ReplicaState[],
  group: "a" | "b",
): string {
  const members = replicas.filter((replica) => replica.group === group);
  const online = members.filter((replica) => replica.online).length;
  const majority = Math.floor(members.length / 2) + 1;
  if (online < majority)
    return `${online}/${members.length} online · quorum lost`;

  const record = members.some((replica) => replica.record === "COMMIT")
    ? "COMMIT"
    : members.some((replica) => replica.record === "PREPARE")
      ? "PREPARE"
      : null;
  if (!record) return `${online}/${members.length} online · ready`;

  const stored = members.filter((replica) => replica.record === record).length;
  return `${record} ${stored}/${members.length} · ${
    stored >= majority ? "quorum reached" : "awaiting quorum"
  }`;
}

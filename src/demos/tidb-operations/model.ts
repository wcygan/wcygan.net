/** Illustrative topology, not a cluster simulator or a throughput prediction. */
export type UnavailableReplicas = 0 | 1 | 2;

export function quorumState(unavailable: UnavailableReplicas) {
  const reachable = 3 - unavailable;
  return {
    reachable,
    required: 2,
    canCommit: reachable >= 2,
    // This example keeps the leader reachable and removes followers in order.
    replicas: [true, unavailable < 2, unavailable === 0],
  };
}

export type ScalingScenario = "baseline" | "sql" | "storage";
export type RegionId = "A" | "B" | "C" | "D";
export interface StorageNode {
  id: string;
  regions: readonly RegionId[];
}

export const REGIONS: readonly RegionId[] = ["A", "B", "C", "D"];
const originalStorage: readonly StorageNode[] = [
  { id: "TiKV 1", regions: REGIONS },
  { id: "TiKV 2", regions: REGIONS },
  { id: "TiKV 3", regions: REGIONS },
];
const redistributedStorage: readonly StorageNode[] = [
  { id: "TiKV 1", regions: ["A", "B", "C"] },
  { id: "TiKV 2", regions: ["A", "B", "D"] },
  { id: "TiKV 3", regions: ["A", "C", "D"] },
  { id: "TiKV 4", regions: ["B", "C", "D"] },
];

export function scalingState(scenario: ScalingScenario, redistributed = false) {
  return {
    sqlServers: scenario === "sql" ? 3 : 2,
    storage:
      scenario !== "storage"
        ? originalStorage
        : redistributed
          ? redistributedStorage
          : [...originalStorage, { id: "TiKV 4", regions: [] }],
    redistributed: scenario === "storage" && redistributed,
  };
}

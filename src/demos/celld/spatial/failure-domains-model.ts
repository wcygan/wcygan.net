import type { Point } from "./model";

export type FailureLayout = "separate" | "shared";
export type FailurePhase = "acknowledged" | "lose-host" | "bucket-covered";
export type FailureRecovery =
  | "not-needed"
  | "follower-tail"
  | "tail-unavailable"
  | "bucket";
export type FailureTone = "orange" | "blue" | "green" | "yellow" | "red";

export interface FailureSlot {
  id: "owner" | "follower" | "bucket";
  label: string;
  detail: string;
  state: "retained" | "lost" | "not-uploaded";
  containsWrite: boolean;
  position: Point;
  tone: FailureTone;
}

export interface FailureHost {
  id: "host-a" | "host-b" | "storage";
  label: string;
  position: Point;
  size: Point;
  lost: boolean;
  members: FailureSlot["id"][];
}

export interface FailureSnapshot {
  layout: FailureLayout;
  phase: FailurePhase;
  title: string;
  status: string;

  source: string;
  lossSource: string;
  recovery: FailureRecovery;
  ownerLost: boolean;
  followerLost: boolean;
  bucketCovered: boolean;
  completeFollowerTail: boolean;
  retainedCopies: number;
  slots: FailureSlot[];
  hosts: FailureHost[];
}

// One owner, one current follower, and one recent write. The bucket retains
// earlier cell history in every state; containsWrite concerns this write only.
// A host failure here means permanent loss of its disks, not a process pause,
// expired lease, network partition, or an HTTP error from a follower.
export const FAILURE_POSITIONS = {
  owner: [-2.35, 0, 0] as Point,
  follower: [0.1, 0, 0] as Point,
  bucket: [2.7, 0, 0] as Point,
} as const;

export const FAILURE_SOURCE =
  "https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/docs/guarantees.md#the-takeover-recovery-gate";

export const FAILURE_LOSS_SOURCE =
  "https://github.com/denoland/celld/blob/f2bf648663a610eefde71f3547ad61e9b896b1f0/crates/celld/node_log.rs#L5208-L5254";

export function failureSnapshot(
  layout: FailureLayout,
  phase: FailurePhase,
): FailureSnapshot {
  const ownerLost = phase !== "acknowledged";
  const followerLost = ownerLost && layout === "shared";
  // This alternate outcome uploads the write before the same host loss.
  const bucketCovered = phase === "bucket-covered";
  const completeFollowerTail = !followerLost;
  const recovery: FailureRecovery = bucketCovered
    ? "bucket"
    : !ownerLost
      ? "not-needed"
      : completeFollowerTail
        ? "follower-tail"
        : "tail-unavailable";

  const slots: FailureSlot[] = [
    {
      id: "owner",
      label: "Owner A",
      detail: ownerLost
        ? "Host and local disk lost"
        : "Serving cell · local SQLite copy",
      state: ownerLost ? "lost" : "retained",
      containsWrite: !ownerLost,
      position: FAILURE_POSITIONS.owner,
      tone: ownerLost ? "red" : "blue",
    },
    {
      id: "follower",
      label: "Follower B",
      detail: followerLost
        ? "Same host · retained log lost"
        : "Complete fsynced node-log tail",
      state: followerLost ? "lost" : "retained",
      containsWrite: !followerLost,
      position: FAILURE_POSITIONS.follower,
      tone: followerLost ? "red" : "orange",
    },
    {
      id: "bucket",
      label: "Shared bucket",
      detail: bucketCovered
        ? "Write 42 uploaded · retained"
        : "Through write 41 · write 42 not uploaded",
      state: bucketCovered ? "retained" : "not-uploaded",
      containsWrite: bucketCovered,
      position: FAILURE_POSITIONS.bucket,
      tone: bucketCovered ? "green" : "yellow",
    },
  ];

  const hosts: FailureHost[] =
    layout === "shared"
      ? [
          {
            id: "host-a",
            label: "One host · A + B",
            position: [-1.125, -1.02, 0],
            size: [4.7, 0.16, 2.15],
            lost: ownerLost,
            members: ["owner", "follower"],
          },
        ]
      : [
          {
            id: "host-a",
            label: "Host A",
            position: [-2.35, -1.02, 0],
            size: [2.15, 0.16, 2.15],
            lost: ownerLost,
            members: ["owner"],
          },
          {
            id: "host-b",
            label: "Host B",
            position: [0.1, -1.02, 0],
            size: [2.15, 0.16, 2.15],
            lost: false,
            members: ["follower"],
          },
        ];
  hosts.push({
    id: "storage",
    label: "Storage survives",
    position: [2.7, -1.02, 0],
    size: [2.15, 0.16, 2.15],
    lost: false,
    members: ["bucket"],
  });

  const title =
    phase === "acknowledged"
      ? "Acknowledged before upload"
      : bucketCovered
        ? "Host lost after upload"
        : "Host lost before upload";
  const status =
    recovery === "not-needed"
      ? "Owner and follower retain the write"
      : recovery === "follower-tail"
        ? "Complete follower tail survives"
        : recovery === "tail-unavailable"
          ? "Write 42 has no surviving copy"
          : "The bucket retains this write";

  return {
    layout,
    phase,
    title,
    status,

    source: FAILURE_SOURCE,
    lossSource: FAILURE_LOSS_SOURCE,
    recovery,
    ownerLost,
    followerLost,
    bucketCovered,
    completeFollowerTail,
    retainedCopies: slots.filter((slot) => slot.containsWrite).length,
    slots,
    hosts,
  };
}

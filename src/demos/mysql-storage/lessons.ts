import type { BufferPool, Lookup } from "./model";
export type SpatialKind = "locking" | "recovery" | "replication";
export type StorageState =
  | { kind: "index"; lookup: Lookup }
  | { kind: "buffer"; buffer: BufferPool }
  | { kind: SpatialKind; step: number };
interface Beat {
  next?: string;
  facts: [string, string][];
}
interface Lesson {
  title: string;
  steps: Beat[];
}
/** Deliberately bounded causal scripts. Numbers describe the teaching scenario, not engine telemetry. */
export const SPATIAL_LESSONS: Record<SpatialKind, Lesson> = {
  locking: {
    title: "Two shoppers, one book",
    steps: [
      {
        next: "A locks inventory",
        facts: [
          ["Available stock", "1"],
          ["Lock owner", "None"],
          ["B", "Not started"],
        ],
      },
      {
        next: "B requests same row",
        facts: [
          ["Available stock", "1"],
          ["Lock owner", "A"],
          ["B", "Not started"],
        ],
      },
      {
        next: "A sells and commits",
        facts: [
          ["Available stock", "1"],
          ["Lock owner", "A"],
          ["B", "Waiting"],
        ],
      },
      {
        next: "B checks and rolls back",
        facts: [
          ["Available stock", "0"],
          ["Lock owner", "B"],
          ["B", "Reads 0"],
        ],
      },
      {
        facts: [
          ["Available stock", "0"],
          ["Lock owner", "None"],
          ["Sales", "1"],
        ],
      },
    ],
  },
  recovery: {
    title: "A commit survives a crash",
    steps: [
      {
        next: "Commit stock change",
        facts: [
          ["Memory stock", "2"],
          ["Disk stock", "2"],
          ["Redo", "No new change"],
        ],
      },
      {
        next: "Crash before page flush",
        facts: [
          ["Memory stock", "1"],
          ["Disk stock", "2"],
          ["Redo", "Durable change"],
        ],
      },
      {
        next: "Restart and recover",
        facts: [
          ["Memory stock", "Lost"],
          ["Disk stock", "2"],
          ["Redo", "Survives"],
        ],
      },
      {
        facts: [
          ["Recovered stock", "1"],
          ["Old page stock", "2 before redo"],
          ["Commit", "Preserved"],
        ],
      },
    ],
  },
  replication: {
    title: "A replica can lag",
    steps: [
      {
        next: "Write order 104",
        facts: [
          ["Source orders", "3"],
          ["Replica orders", "3"],
          ["Pending changes", "0"],
        ],
      },
      {
        next: "Receive change",
        facts: [
          ["Source orders", "4"],
          ["Replica orders", "3"],
          ["Pending changes", "1"],
        ],
      },
      {
        next: "Apply on replica",
        facts: [
          ["Source orders", "4"],
          ["Replica orders", "3"],
          ["Relay log", "Change 1"],
        ],
      },
      {
        facts: [
          ["Source orders", "4"],
          ["Replica orders", "4"],
          ["Pending changes", "0"],
        ],
      },
    ],
  },
};

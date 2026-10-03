import type { BufferPool, Lookup } from "./model";
export type SpatialKind = "locking" | "recovery" | "replication";
export type StorageState =
  | { kind: "index"; lookup: Lookup }
  | { kind: "buffer"; buffer: BufferPool }
  | { kind: SpatialKind; step: number };
interface Beat {
  next?: string;
  message: string;
  facts: [string, string][];
}
interface Lesson {
  title: string;
  description: string;
  caption: string;
  steps: Beat[];
}
/** Deliberately bounded causal scripts. Numbers describe the teaching scenario, not engine telemetry. */
export const SPATIAL_LESSONS: Record<SpatialKind, Lesson> = {
  locking: {
    title: "Two shoppers, one book",
    description: "A row lock makes competing locking reads wait.",
    caption:
      "Indexed FOR UPDATE reads wait for the row lock; ordinary snapshot SELECTs may not. Starts with one book. Range locks, deadlocks, timeouts, and retries are omitted.",
    steps: [
      {
        next: "A locks inventory",
        message:
          "One book remains. Neither session holds the inventory row lock.",
        facts: [
          ["Available stock", "1"],
          ["Lock owner", "None"],
          ["B", "Not started"],
        ],
      },
      {
        next: "B requests same row",
        message:
          "Session A holds the row lock and reads stock 1. It can decide whether to reserve the book.",
        facts: [
          ["Available stock", "1"],
          ["Lock owner", "A"],
          ["B", "Not started"],
        ],
      },
      {
        next: "A sells and commits",
        message:
          "Session B's FOR UPDATE waits because A holds the same row lock. B has not read a stock value yet.",
        facts: [
          ["Available stock", "1"],
          ["Lock owner", "A"],
          ["B", "Waiting"],
        ],
      },
      {
        next: "B checks and rolls back",
        message:
          "A decrements stock and commits its sale. A releases the lock; B acquires it and reads the current stock: 0.",
        facts: [
          ["Available stock", "0"],
          ["Lock owner", "B"],
          ["B", "Reads 0"],
        ],
      },
      {
        message:
          "B finds no inventory, creates no order, and rolls back. Only A sold the last book; the lock is released.",
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
    description: "Durable redo restores a committed change after a crash.",
    caption:
      "Assumes innodb_flush_log_at_trx_commit = 1 and storage honoring flushes. Redo records physical changes; undo rolls back unfinished transactions. Undo, doublewrite protection, and checkpoints are omitted. Redo is not a backup.",
    steps: [
      {
        next: "Commit stock change",
        message:
          "The in-memory page and disk page both hold stock 2. No new transaction is active.",
        facts: [
          ["Memory stock", "2"],
          ["Disk stock", "2"],
          ["Redo", "No new change"],
        ],
      },
      {
        next: "Crash before page flush",
        message:
          "A transaction changes stock to 1 and commits after its redo is durably flushed. The modified data page is still in memory; the disk page still holds 2.",
        facts: [
          ["Memory stock", "1"],
          ["Disk stock", "2"],
          ["Redo", "Durable change"],
        ],
      },
      {
        next: "Restart and recover",
        message:
          "The server crashes. Volatile memory is lost, but the durable redo and older disk page remain.",
        facts: [
          ["Memory stock", "Lost"],
          ["Disk stock", "2"],
          ["Redo", "Survives"],
        ],
      },
      {
        message:
          "On restart, recovery applies missing redo to reconstruct stock 1. The committed sale survives even though its data page had not been flushed before the crash.",
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
    description: "A second server applies committed changes later.",
    caption:
      "Asynchronous replication: binary log → relay log → applied rows. Change 1 is illustrative. Binary log differs from redo; other modes have different guarantees. Replicas do not replace backups.",
    steps: [
      {
        next: "Write order 104",
        message:
          "Both servers have orders 101–103. The source accepts writes; the replica can serve reads.",
        facts: [
          ["Source orders", "3"],
          ["Replica orders", "3"],
          ["Pending changes", "0"],
        ],
      },
      {
        next: "Receive change",
        message:
          "Order 104 commits on the source and is recorded in its binary log. A replica read still returns only orders 101–103.",
        facts: [
          ["Source orders", "4"],
          ["Replica orders", "3"],
          ["Pending changes", "1"],
        ],
      },
      {
        next: "Apply on replica",
        message:
          "The replica has received the change in its relay log but has not applied it. Receiving a change does not make the row visible yet.",
        facts: [
          ["Source orders", "4"],
          ["Replica orders", "3"],
          ["Relay log", "Change 1"],
        ],
      },
      {
        message:
          "The replica applies the change. Both servers now return four orders, including 104. Read routing must account for this delay when fresh data matters.",
        facts: [
          ["Source orders", "4"],
          ["Replica orders", "4"],
          ["Pending changes", "0"],
        ],
      },
    ],
  },
};

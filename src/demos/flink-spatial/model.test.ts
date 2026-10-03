import { describe, expect, it } from "vitest";
import {
  KEY_ASSIGNMENT,
  KEY_RECORDS,
  keyedSnapshot,
  recoverySnapshot,
  RUNTIME_CONTROL_EDGES,
  RUNTIME_DATA_EDGES,
  RUNTIME_TASK_MANAGERS,
  runtimeSnapshot,
} from "./model";

describe("keyed state", () => {
  it("keeps a key on one subtask while isolating the counts of colocated keys", () => {
    expect(KEY_RECORDS.map((record) => record.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(KEY_RECORDS.map((record) => record.key)).toEqual([
      "Ada",
      "Bo",
      "Cy",
      "Ada",
      "Cy",
      "Ada",
    ]);
    expect(
      KEY_RECORDS.filter((record) => record.key === "Ada").map(
        (record) => KEY_ASSIGNMENT[record.key],
      ),
    ).toEqual([0, 0, 0]);
    expect(KEY_ASSIGNMENT.Bo).toBe(KEY_ASSIGNMENT.Ada);
    expect(KEY_ASSIGNMENT.Cy).not.toBe(KEY_ASSIGNMENT.Ada);

    for (let step = 1; step <= KEY_RECORDS.length; step += 1) {
      const before = keyedSnapshot(step - 1);
      const after = keyedSnapshot(step);
      const key = KEY_RECORDS[step - 1].key;
      expect(after.processed).toBe(step);
      expect(after.current).toEqual(KEY_RECORDS[step - 1]);
      for (const name of ["Ada", "Bo", "Cy"] as const) {
        expect(after.counts[name] - before.counts[name]).toBe(
          name === key ? 1 : 0,
        );
      }
    }
    expect(keyedSnapshot(6).counts).toEqual({ Ada: 3, Bo: 1, Cy: 2 });
    expect(keyedSnapshot(6).done).toBe(true);
  });

  it("starts empty and clamps the playback index", () => {
    expect(keyedSnapshot(-10)).toEqual(keyedSnapshot(0));
    expect(keyedSnapshot(0).current).toBeNull();
    expect(keyedSnapshot(0).counts).toEqual({ Ada: 0, Bo: 0, Cy: 0 });
    expect(keyedSnapshot(2.9)).toEqual(keyedSnapshot(2));
    expect(keyedSnapshot(99)).toEqual(keyedSnapshot(6));
  });
});

describe("runtime ownership and paths", () => {
  it("assigns each source and count subtask to exactly one TaskManager", () => {
    expect(RUNTIME_TASK_MANAGERS).toEqual([
      { id: "taskmanager-0", subtasks: ["source-0", "count-0"] },
      { id: "taskmanager-1", subtasks: ["source-1", "count-1"] },
    ]);
    const subtasks = RUNTIME_TASK_MANAGERS.flatMap(
      (manager) => manager.subtasks,
    );
    expect(new Set(subtasks).size).toBe(subtasks.length);
    expect(RUNTIME_CONTROL_EDGES.map((edge) => edge.to)).toEqual(
      RUNTIME_TASK_MANAGERS.map((manager) => manager.id),
    );
  });

  it("separates deployment control from record data, including a cross-worker shuffle", () => {
    expect(
      RUNTIME_CONTROL_EDGES.every(
        (edge) => edge.kind === "control" && edge.from === "jobmanager",
      ),
    ).toBe(true);
    expect(
      RUNTIME_DATA_EDGES.every(
        (edge) =>
          edge.kind === "data" &&
          edge.from !== "jobmanager" &&
          edge.to !== "jobmanager",
      ),
    ).toBe(true);
    expect(runtimeSnapshot(0).activeEdgeIds).toEqual(["deploy-0", "deploy-1"]);
    expect(runtimeSnapshot(1).activeEdgeIds).toEqual(["read-0"]);
    expect(runtimeSnapshot(2).activeEdgeIds).toEqual(["shuffle-01"]);
    expect(runtimeSnapshot(3).activeEdgeIds).toEqual(["emit-1"]);
    expect(runtimeSnapshot(3).dataPath).toEqual([
      "input",
      "source-0",
      "count-1",
      "sink",
    ]);
    const crossWorker = RUNTIME_DATA_EDGES.find(
      (edge) => edge.id === "shuffle-01",
    )!;
    const sourceOwner = RUNTIME_TASK_MANAGERS.find((manager) =>
      manager.subtasks.includes("source-0"),
    );
    const countOwner = RUNTIME_TASK_MANAGERS.find((manager) =>
      manager.subtasks.includes("count-1"),
    );
    expect(crossWorker.from).toBe("source-0");
    expect(crossWorker.to).toBe("count-1");
    expect(sourceOwner?.id).not.toBe(countOwner?.id);
    expect(runtimeSnapshot(3).done).toBe(true);
    expect(runtimeSnapshot(99)).toEqual(runtimeSnapshot(3));
  });
});

describe("checkpoint recovery", () => {
  it("persists a completed checkpoint while local count and source position advance", () => {
    expect(recoverySnapshot(0)).toMatchObject({
      count: 0,
      nextOffset: 0,
      checkpoint: null,
    });
    expect(recoverySnapshot(3)).toMatchObject({
      count: 3,
      nextOffset: 3,
      currentOffset: 2,
      checkpoint: null,
    });
    expect(recoverySnapshot(4)).toMatchObject({
      count: 3,
      nextOffset: 3,
      currentOffset: null,
      checkpoint: { count: 3, nextOffset: 3 },
      action: "checkpoint",
    });
    expect(recoverySnapshot(6)).toMatchObject({
      count: 5,
      nextOffset: 5,
      checkpoint: { count: 3, nextOffset: 3 },
    });
  });

  it("loses both local states on crash, restores both together, and replays without overcounting", () => {
    expect(recoverySnapshot(7)).toMatchObject({
      count: null,
      nextOffset: null,
      checkpoint: { count: 3, nextOffset: 3 },
      currentOffset: null,
      action: "crash",
    });
    expect(recoverySnapshot(8)).toMatchObject({
      count: 3,
      nextOffset: 3,
      checkpoint: { count: 3, nextOffset: 3 },
      currentOffset: null,
      action: "restore",
    });
    expect(recoverySnapshot(9)).toMatchObject({
      count: 4,
      nextOffset: 4,
      currentOffset: 3,
      replay: true,
    });
    expect(recoverySnapshot(10)).toMatchObject({
      count: 5,
      nextOffset: 5,
      currentOffset: 4,
      replay: true,
    });
    const final = recoverySnapshot(11);
    expect(final.processedOffsets).toEqual([0, 1, 2, 3, 4, 3, 4]);
    expect(final.processedOffsets).toHaveLength(7);
    expect(new Set(final.processedOffsets).size).toBe(5);
    expect(final.count).toBe(5);
    expect(final.checkpoint).toEqual({ count: 5, nextOffset: 5 });
    expect(final.done).toBe(true);
    expect(final.replay).toBe(false);
    expect(recoverySnapshot(999)).toEqual(final);
  });
});

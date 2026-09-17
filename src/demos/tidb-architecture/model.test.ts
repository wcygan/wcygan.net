import { describe, expect, it } from "vitest";
import {
  INITIAL_OPERATION,
  NODES,
  REGIONS,
  REPLICA_BLOCK_HEIGHT,
  messagePoints,
  nodeById,
  operationSteps,
  randomOperation,
  regionForUser,
  replicaHeight,
  regionsOnNode,
  statement,
  readNode,
  stepParticipants,
} from "./model";

describe("nine-node TiDB topology", () => {
  it("distributes thirty-five replicas across nine stores, with five distinct peers per Region", () => {
    const stores = NODES.filter((n) => n.group === "tikv");
    expect(stores).toHaveLength(9);
    expect(REGIONS).toHaveLength(7);
    expect(REGIONS.flatMap((r) => r.replicas)).toHaveLength(35);
    expect(new Set(REGIONS.map((r) => r.color)).size).toBe(7);
    for (const r of REGIONS) {
      expect(r.replicas).toHaveLength(5);
      expect(new Set(r.replicas.map((p) => p.nodeId)).size).toBe(5);
      expect(r.replicas.filter((p) => p.leader)).toEqual([
        { nodeId: r.leader, leader: true },
      ]);
      for (const p of r.replicas) expect(nodeById(p.nodeId).group).toBe("tikv");
    }
    expect(stores.map((s) => regionsOnNode(s.id).length).sort()).toEqual([
      3, 4, 4, 4, 4, 4, 4, 4, 4,
    ]);
  });

  it("fits the replica blocks inside each cylinder without intersecting", () => {
    for (const store of NODES.filter((n) => n.group === "tikv")) {
      const heights = regionsOnNode(store.id).map((r) =>
        replicaHeight(r, store.id),
      );
      expect(heights[0] - REPLICA_BLOCK_HEIGHT / 2).toBeGreaterThan(0.21);
      expect(heights.at(-1)! + REPLICA_BLOCK_HEIGHT / 2).toBeLessThan(1.52);
      for (let i = 1; i < heights.length; i++)
        expect(heights[i] - heights[i - 1]).toBeGreaterThan(
          REPLICA_BLOCK_HEIGHT,
        );
    }
  });

  it("routes every primary key to exactly one contiguous range, including split boundaries", () => {
    for (let userId = 1; userId <= 1400; userId++) {
      const matches = REGIONS.filter(
        (r) => userId >= r.start && userId < r.end,
      );
      expect(matches).toHaveLength(1);
      expect(regionForUser(userId)).toBe(matches[0]);
    }
    expect(regionForUser(200).id).toBe("R1");
    expect(regionForUser(201).id).toBe("R2");
    expect(regionForUser(427)).toMatchObject({ id: "R3", leader: "TiKV 7" });
    expect(regionForUser(1200).id).toBe("R6");
    expect(regionForUser(1201)).toMatchObject({ id: "R7", leader: "TiKV 4" });
    expect(regionForUser(1400).id).toBe("R7");
    for (const invalid of [0, 1401, 1.5, NaN])
      expect(() => regionForUser(invalid)).toThrow(RangeError);
  });

  it("uses primary-key SQL and can sample both ends of the users table", () => {
    expect(randomOperation("read", () => 0)).toEqual({
      kind: "read",
      userId: 1,
      sqlNode: "TiDB 1",
    });
    expect(randomOperation("update", () => 0.9999)).toEqual({
      kind: "update",
      userId: 1400,
      sqlNode: "TiDB 3",
    });
    expect(statement(INITIAL_OPERATION)).toBe(
      "SELECT name FROM users WHERE id = 427;",
    );
    expect(statement({ ...INITIAL_OPERATION, kind: "update" })).toBe(
      "UPDATE users SET name = 'Alex' WHERE id = 427;",
    );
  });

  it.each(["read", "update"] as const)(
    "keeps row traffic out of PD for every %s Region",
    (kind) => {
      for (const region of REGIONS) {
        const steps = operationSteps({
          kind,
          userId: region.start,
          sqlNode: "TiDB 2",
        });
        for (const path of steps.flatMap((s) => s.paths)) {
          const from = nodeById(path.from),
            to = nodeById(path.to);
          expect(from).not.toBe(to);
          if (from.group === "pd" || to.group === "pd")
            expect(path.kind).toBe("coordination");
          for (const node of [from, to].filter((n) => n.group === "tikv"))
            expect(region.replicas.some((r) => r.nodeId === node.id)).toBe(
              true,
            );
          expect(
            messagePoints(path, region).flat().every(Number.isFinite),
          ).toBe(true);
        }
        expect(steps.find((s) => s.id === "route")!.paths).toEqual([
          { from: "TiDB 2", to: region.leader, kind: "request" },
        ]);
        expect(steps.find((s) => s.id === "timestamp")!.narration).toContain(
          "cached Region locations",
        );
        expect(steps.find((s) => s.id === "response")!.paths[0]).toMatchObject({
          from: "TiDB 2",
          to: "Application",
        });
      }
    },
  );

  it("reads only from a leader, and commits each Region's update with two of four follower acknowledgments", () => {
    const read = operationSteps(INITIAL_OPERATION);
    expect(
      read
        .flatMap((s) => s.paths)
        .filter((p) => ["replication", "ack"].includes(p.kind)),
    ).toHaveLength(0);
    for (const region of REGIONS) {
      const update = operationSteps({
        ...INITIAL_OPERATION,
        kind: "update",
        userId: region.start,
      });
      const followers = region.replicas
        .filter((r) => !r.leader)
        .map((r) => r.nodeId);
      const replication = update.find((s) => s.id === "replicate")!;
      expect(replication.paths).toEqual(
        followers.map((to) => ({
          from: region.leader,
          to,
          kind: "replication",
        })),
      );
      const majority = update.find((s) => s.id === "majority")!;
      expect(majority.paths).toHaveLength(2);
      expect(new Set(majority.paths.map((p) => p.from)).size).toBe(2);
      for (const ack of majority.paths) {
        expect(followers).toContain(ack.from);
        expect(ack).toMatchObject({ to: region.leader, kind: "ack" });
      }
      expect(majority.acknowledged).toEqual([
        region.leader,
        ...majority.paths.map((p) => p.from),
      ]);
      expect(majority.acknowledged).toHaveLength(3);
      expect(majority.narration).toContain("three-of-five Raft majority");
      expect(update.every((s) => !s.follower)).toBe(true);
      expect(update.some((s) => s.id === "catch-up")).toBe(false);
      expect(update.at(-1)!.title).toBe("Update acknowledged");
      expect(
        update.find((s) => s.id === "storage-result")!.narration,
      ).toContain("only part of a transactional write");
    }
  });

  it.each(REGIONS)(
    "guards both read paths before returning a row for $id",
    (region) => {
      const operation = { ...INITIAL_OPERATION, userId: region.start };
      const leaderSteps = operationSteps(operation);
      const lease = leaderSteps.find((s) => s.id === "read-lease")!;
      expect(lease.readSafety).toMatchObject({
        nodeId: region.leader,
        state: "lease",
      });
      expect(lease.paths).toHaveLength(0);
      expect([...stepParticipants(lease)]).toEqual([region.leader]);
      expect(
        leaderSteps
          .flatMap((s) => s.paths)
          .filter((p) => p.kind === "coordination"),
      ).toHaveLength(2); // Only PD; no per-read quorum exchange on the lease fast path.

      const followerOperation = {
        ...operation,
        readMode: "follower-lagging" as const,
      };
      const target = readNode(followerOperation);
      expect(target).not.toBe(region.leader);
      expect(region.replicas.some((r) => r.nodeId === target)).toBe(true);
      const steps = operationSteps(followerOperation);
      const byId = (id: string) => steps.find((s) => s.id === id)!;
      expect(byId("route").paths).toEqual([
        { from: operation.sqlNode, to: target, kind: "request" },
      ]);
      expect(byId("read-index").paths).toEqual([
        { from: target, to: region.leader, kind: "coordination" },
      ]);
      expect(byId("read-confirm").paths).toHaveLength(4);
      const replies = byId("read-quorum").paths;
      expect(new Set([region.leader, ...replies.map((p) => p.from)]).size).toBe(
        3,
      );
      expect(
        replies.every(
          (p) => p.kind === "coordination" && p.to === region.leader,
        ),
      ).toBe(true);
      expect(byId("read-barrier").readSafety).toMatchObject({
        nodeId: target,
        state: "waiting",
        appliedIndex: 98,
        requiredIndex: 100,
      });
      expect(byId("read-catch-up").paths).toEqual([
        { from: region.leader, to: target, kind: "replication" },
      ]);
      const ready = byId("read-ready");
      expect(ready.readSafety!.appliedIndex).toBeGreaterThanOrEqual(
        ready.readSafety!.requiredIndex,
      );
      expect([...stepParticipants(ready)]).toEqual([target]);
      const result = byId("storage-result");
      expect(steps.indexOf(result)).toBeGreaterThan(steps.indexOf(ready));
      expect(result.paths).toEqual([
        { from: target, to: operation.sqlNode, kind: "result" },
      ]);
      expect(
        steps
          .slice(0, steps.indexOf(ready))
          .flatMap((s) => s.paths)
          .some((p) => p.kind === "result"),
      ).toBe(false);
      expect(
        steps.flatMap((s) => s.paths).filter((p) => p.to === "Application"),
      ).toHaveLength(1);
      for (const path of steps.flatMap((s) => s.paths)) {
        expect(messagePoints(path, region).flat().every(Number.isFinite)).toBe(
          true,
        );
        for (const id of [path.from, path.to]) {
          const node = nodeById(id);
          if (node.group === "pd") expect(path.kind).toBe("coordination");
          if (node.group === "tikv")
            expect(region.replicas.some((r) => r.nodeId === id)).toBe(true);
        }
      }
    },
  );

  it.each(REGIONS)(
    "preserves $id follower lag during leadership checks",
    (region) => {
      const operation = {
        ...INITIAL_OPERATION,
        userId: region.start,
        readMode: "follower-lagging" as const,
      };
      const steps = operationSteps(operation);
      const ready = steps.findIndex((s) => s.id === "read-ready");
      for (const current of steps.slice(3, ready)) {
        expect(current.follower).toEqual({
          nodeId: readNode(operation),
          status: "behind",
        });
        expect(stepParticipants(current).has(readNode(operation))).toBe(true);
      }
      expect(steps[ready].follower?.status).toBe("caught-up");
    },
  );

  it.each(REGIONS)(
    "checks ReadIndex without catch-up for an up-to-date $id follower",
    (region) => {
      const operation = {
        ...INITIAL_OPERATION,
        userId: region.start,
        readMode: "follower-caught-up" as const,
      };
      const steps = operationSteps(operation);
      const target = readNode(operation);
      const barrier = steps.find((s) => s.id === "read-barrier")!;
      expect(target).not.toBe(region.leader);
      expect(steps.find((s) => s.id === "read-index")!.paths).toEqual([
        { from: target, to: region.leader, kind: "coordination" },
      ]);
      expect(steps.find((s) => s.id === "read-quorum")!.paths).toHaveLength(2);
      expect(barrier.readSafety).toEqual({
        nodeId: target,
        state: "ready",
        appliedIndex: 100,
        requiredIndex: 100,
      });
      expect(
        steps.some(
          (s) =>
            s.readSafety?.state === "waiting" ||
            s.readSafety?.state === "applying",
        ),
      ).toBe(false);
      expect(
        steps.flatMap((s) => s.paths).some((p) => p.kind === "replication"),
      ).toBe(false);
      expect(
        steps
          .slice(0, steps.indexOf(barrier) + 1)
          .flatMap((s) => s.paths)
          .some((p) => p.kind === "result"),
      ).toBe(false);
      expect(steps[steps.indexOf(barrier) + 1].paths).toEqual([
        { from: target, to: operation.sqlNode, kind: "result" },
      ]);
      expect(steps.at(-1)!.narration).toContain("no catch-up wait was needed");
    },
  );

  it.each(REGIONS)(
    "applies $id writes after commit and before storage success",
    (region) => {
      const steps = operationSteps({
        ...INITIAL_OPERATION,
        kind: "update",
        userId: region.start,
        dropFollowerMessage: true,
      });
      const index = (id: string) => steps.findIndex((s) => s.id === id);
      expect(index("leader-apply")).toBeGreaterThan(index("majority"));
      expect(index("storage-result")).toBeGreaterThan(index("leader-apply"));
      expect(index("follower-appended")).toBeGreaterThan(index("catch-up"));
      expect(index("follower-apply")).toBeGreaterThan(
        index("follower-appended"),
      );
      expect(index("caught-up")).toBeGreaterThan(index("follower-apply"));
      expect(steps[index("follower-appended")].follower?.status).not.toBe(
        "caught-up",
      );
      expect(steps[index("caught-up")].paths).toEqual([]);
    },
  );

  it("commits and responds without the missed delivery, then retries that entry to the same follower", () => {
    for (const region of REGIONS) {
      const steps = operationSteps({
        ...INITIAL_OPERATION,
        kind: "update",
        dropFollowerMessage: true,
        userId: region.start,
      });
      const replication = steps.find((s) => s.id === "replicate")!;
      const missed = replication.paths.filter((p) => p.delivery === "dropped");
      expect(missed).toHaveLength(1);
      const follower = missed[0].to;
      expect(follower).not.toBe(region.leader);
      const responseIndex = steps.findIndex((s) => s.id === "response");
      for (const step of steps.slice(
        steps.indexOf(replication),
        responseIndex + 1,
      )) {
        expect(step.follower).toEqual({ nodeId: follower, status: "behind" });
        expect(step.acknowledged).not.toContain(follower);
        expect(step.paths.some((p) => p.from === follower)).toBe(false);
      }
      expect(steps[responseIndex].acknowledged).toHaveLength(3);
      const retry = steps[responseIndex + 1];
      expect(retry).toMatchObject({
        id: "catch-up",
        paths: [{ from: region.leader, to: follower, kind: "replication" }],
        follower: { nodeId: follower, status: "retrying" },
      });
      expect(retry.paths[0].delivery).toBeUndefined();
      expect(retry.acknowledged).not.toContain(follower);
      const appended = steps[responseIndex + 2];
      expect(appended.paths).toEqual([
        { from: follower, to: region.leader, kind: "ack" },
      ]);
      expect(appended.follower?.status).toBe("applying");
      const caughtUp = steps[responseIndex + 4];
      expect(caughtUp).toMatchObject({
        id: "caught-up",
        paths: [],
        follower: { nodeId: follower, status: "caught-up" },
      });
      expect(caughtUp.acknowledged).toContain(follower);
      expect(steps.at(-1)!.follower?.status).toBe("caught-up");
      // Retrying a Raft entry does not issue another SQL update or application response.
      expect(
        steps.flatMap((s) => s.paths).filter((p) => p.to === "Application"),
      ).toHaveLength(1);
      expect(
        steps.flatMap((s) => s.paths).filter((p) => p.from === "Application"),
      ).toHaveLength(1);
    }
    expect(operationSteps(INITIAL_OPERATION).every((s) => !s.follower)).toBe(
      true,
    );
  });
});

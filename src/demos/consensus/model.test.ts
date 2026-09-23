import { describe, expect, it } from "vitest";
import {
  advanceCommitIndex,
  appendEntries,
  applyCommitted,
  compactSnapshot,
  hasJointQuorum,
  hasQuorum,
  installSnapshot,
  isLogUpToDate,
  lastPosition,
  LESSONS,
  quorumSize,
} from "./model";
import type { ConsensusNode, LogEntry } from "./types";

const entry = (index: number, term: number, command = "ADD 1"): LogEntry => ({
  index,
  term,
  command,
});
const base = [entry(1, 1, "SET 5")];
const node = (overrides: Partial<ConsensusNode> = {}): ConsensusNode => ({
  id: "A",
  role: "follower",
  term: 3,
  leader: "B",
  log: base,
  commitIndex: 1,
  lastApplied: 1,
  value: 5,
  ...overrides,
});
const snapshot = {
  index: 2,
  term: 2,
  value: 6,
  configuration: ["A", "B", "C"],
};

describe("Raft's small protocol rules", () => {
  it("counts unique configured voters and requires both joint majorities", () => {
    expect([1, 2, 3, 4, 5].map(quorumSize)).toEqual([1, 2, 2, 3, 3]);
    expect(() => quorumSize(0)).toThrow();
    expect(hasQuorum(["A", "A", "outsider"], ["A", "B", "C"])).toBe(false);
    expect(hasQuorum(["A", "C"], ["A", "B", "C"])).toBe(true);
    const old = ["A", "B", "C"];
    const next = ["C", "D", "E"];
    expect(hasJointQuorum(["A", "B", "C"], old, next)).toBe(false);
    expect(hasJointQuorum(["C", "D", "E"], old, next)).toBe(false);
    expect(hasJointQuorum(["A", "C", "D"], old, next)).toBe(true);
  });

  it("compares last-entry terms before indexes, including compacted logs", () => {
    expect(isLogUpToDate({ term: 2, index: 2 }, { term: 1, index: 30 })).toBe(
      true,
    );
    expect(isLogUpToDate({ term: 1, index: 30 }, { term: 2, index: 2 })).toBe(
      false,
    );
    expect(isLogUpToDate({ term: 2, index: 1 }, { term: 2, index: 2 })).toBe(
      false,
    );
    expect(isLogUpToDate({ term: 2, index: 2 }, { term: 2, index: 2 })).toBe(
      true,
    );
    expect(lastPosition({ log: [], snapshot })).toEqual({ index: 2, term: 2 });
    expect(lastPosition({ log: [] })).toEqual({ index: 0, term: 0 });
  });

  it("rejects stale terms and updates a higher term even when the prefix mismatches", () => {
    const receiver = node({ role: "leader", leader: "A" });
    const request = {
      term: 2,
      leaderId: "B",
      prevLogIndex: 1,
      prevLogTerm: 1,
      entries: [],
      leaderCommit: 1,
    };
    expect(appendEntries(receiver, request)).toEqual({
      accepted: false,
      node: receiver,
    });
    const rejected = appendEntries(receiver, {
      ...request,
      term: 4,
      prevLogTerm: 2,
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.node).toEqual({
      ...receiver,
      term: 4,
      role: "follower",
      leader: "B",
    });
    expect(receiver.role).toBe("leader");
    expect(receiver.term).toBe(3);
    expect(receiver.leader).toBe("A");
  });

  it("learns the announcing leader from a current-term AppendEntries, without inferring it from votes", () => {
    const candidate = node({ role: "candidate", leader: null });
    const request = {
      term: 3,
      leaderId: "C",
      prevLogIndex: 1,
      prevLogTerm: 1,
      entries: [],
      leaderCommit: 1,
    };
    const announced = appendEntries(candidate, request);
    expect(announced.accepted).toBe(true);
    expect(announced.node.role).toBe("follower");
    expect(announced.node.leader).toBe("C");
    expect(announced.node.log).toEqual(candidate.log);
    expect(candidate.leader).toBeNull();
    const stale = appendEntries(announced.node, {
      ...request,
      term: 2,
      leaderId: "B",
    });
    expect(stale.accepted).toBe(false);
    expect(stale.node.leader).toBe("C");
    expect(stale.node).toBe(announced.node);
  });

  it("truncates only at an actual conflict and never replaces committed entries", () => {
    const receiver = node({
      log: [...base, entry(2, 2), entry(3, 2), entry(4, 2)],
    });
    const request = {
      term: 3,
      leaderId: "B",
      prevLogIndex: 1,
      prevLogTerm: 1,
      entries: [entry(2, 3, "SET 9")],
      leaderCommit: 2,
    };
    const appended = appendEntries(receiver, request);
    expect(appended.accepted).toBe(true);
    expect(appended.node.log).toEqual([...base, entry(2, 3, "SET 9")]);
    expect(appended.node.commitIndex).toBe(2);
    expect(appended.node.value).toBe(5);
    expect(receiver.log).toHaveLength(4);
    expect(() =>
      appendEntries({ ...receiver, commitIndex: 2 }, request),
    ).toThrow("committed prefix");
    expect(() =>
      appendEntries(receiver, { ...request, entries: [entry(3, 3)] }),
    ).toThrow("consecutive");
  });

  it("keeps a nonconflicting suffix on retries and bounds commit knowledge to the matched batch", () => {
    const receiver = node({ log: [...base, entry(2, 2), entry(3, 2)] });
    const request = {
      term: 3,
      leaderId: "B",
      prevLogIndex: 1,
      prevLogTerm: 1,
      entries: [entry(2, 2)],
      leaderCommit: 3,
    };
    const retry = appendEntries(receiver, request);
    expect(retry.node.log).toEqual(receiver.log);
    expect(retry.node.commitIndex).toBe(2);
    expect(appendEntries(retry.node, request).node).toEqual(retry.node);
    const heartbeat = appendEntries(receiver, { ...request, entries: [] });
    expect(heartbeat.node.log).toEqual(receiver.log);
    expect(heartbeat.node.commitIndex).toBe(1);
    expect(() =>
      appendEntries(receiver, { ...request, entries: [entry(2, 2, "SET 99")] }),
    ).toThrow("same command");
  });

  it("does not commit old terms by replica counting, but commits their prefix through a current-term entry", () => {
    const leader = node({
      role: "leader",
      term: 4,
      leader: "A",
      log: [...base, entry(2, 2), entry(3, 4)],
    });
    const voters = ["A", "B", "C", "D", "E"];
    expect(
      advanceCommitIndex(leader, { A: 3, B: 2, C: 2, D: 2, E: 2 }, voters),
    ).toBe(1);
    expect(
      advanceCommitIndex(
        leader,
        { A: 3, B: 3, C: 2, D: 0, E: 0, outsider: 3 },
        voters,
      ),
    ).toBe(1);
    expect(
      advanceCommitIndex(leader, { A: 3, B: 3, C: 3, D: 0, E: 0 }, voters),
    ).toBe(3);
    expect(advanceCommitIndex({ ...leader, commitIndex: 3 }, {}, voters)).toBe(
      3,
    );
  });

  it("applies each committed command once in index order and stops at the requested prefix", () => {
    const receiver = node({
      log: [...base, entry(2, 3, "ADD 2"), entry(3, 3, "SET 99")],
      commitIndex: 2,
      lastApplied: 0,
      value: 0,
    });
    const first = applyCommitted(receiver, 1);
    expect(first.value).toBe(5);
    const second = applyCommitted(first);
    expect(second.value).toBe(7);
    expect(second.lastApplied).toBe(2);
    expect(applyCommitted(second)).toEqual(second);
    expect(() => applyCommitted(receiver, 3)).toThrow("committed prefix");
    expect(() => applyCommitted(second, 1)).toThrow("forward");
    expect(() => applyCommitted({ ...receiver, log: [entry(2, 3)] })).toThrow(
      "missing entry",
    );
  });

  it("snapshots exactly the applied prefix, keeps its boundary/configuration, and retains unapplied entries", () => {
    const receiver = node({
      log: [...base, entry(2, 2), entry(3, 3)],
      commitIndex: 3,
      lastApplied: 2,
      value: 6,
    });
    const compacted = compactSnapshot(receiver, ["A", "B", "C"]);
    expect(compacted.snapshot).toEqual(snapshot);
    expect(compacted.log).toEqual([entry(3, 3)]);
    expect(compacted.commitIndex).toBe(3);
    expect(compacted.lastApplied).toBe(2);
    expect(applyCommitted(compacted).value).toBe(7);
    expect(compactSnapshot(compacted, ["A", "B", "C"])).toEqual(compacted);
    expect(() =>
      compactSnapshot({ ...receiver, commitIndex: 1 }, ["A", "B", "C"]),
    ).toThrow("committed state");
    const appended = appendEntries(compacted, {
      term: 3,
      leaderId: "B",
      prevLogIndex: 2,
      prevLogTerm: 2,
      entries: [entry(3, 3), entry(4, 3)],
      leaderCommit: 4,
    });
    expect(appended.accepted).toBe(true);
    expect(applyCommitted(appended.node).value).toBe(8);
  });

  it("installs a newer snapshot, retaining a matching suffix but discarding an uncommitted conflicting one", () => {
    const matching = node({ log: [...base, entry(2, 2), entry(3, 3)] });
    const installed = installSnapshot(matching, snapshot);
    expect(installed.log).toEqual([entry(3, 3)]);
    expect(installed.value).toBe(6);
    expect(installed.lastApplied).toBe(2);
    expect(installed.commitIndex).toBe(2);
    const conflicting = node({ log: [...base, entry(2, 1), entry(3, 1)] });
    expect(installSnapshot(conflicting, snapshot).log).toEqual([]);
    expect(installSnapshot(installed, snapshot)).toEqual(installed);
    expect(() =>
      installSnapshot({ ...conflicting, commitIndex: 2 }, snapshot),
    ).toThrow("committed suffix");
    expect(() =>
      installSnapshot({ ...conflicting, commitIndex: 3 }, snapshot),
    ).toThrow("committed suffix");
  });
});

describe("authored consensus walkthroughs", () => {
  it.each(Object.values(LESSONS))(
    "$id keeps contiguous logs, ordered application and a durable committed prefix",
    (lesson) => {
      const knownCommitted = new Map<number, LogEntry>();
      for (const frame of lesson.frames) {
        expect(frame.nodes.length).toBeGreaterThanOrEqual(3);
        expect(frame.nodes.length).toBeLessThanOrEqual(5);
        for (const current of frame.nodes) {
          if (current.leader !== null) {
            expect(frame.nodes.some((node) => node.id === current.leader)).toBe(
              true,
            );
          }
          if (current.role === "candidate") expect(current.leader).toBeNull();
          if (current.role === "leader")
            expect(current.leader).toBe(current.id);
          const boundary = current.snapshot?.index ?? 0;
          expect(current.log.map((entry) => entry.index)).toEqual(
            current.log.map((_, index) => boundary + index + 1),
          );
          expect(current.lastApplied).toBeGreaterThanOrEqual(boundary);
          expect(current.lastApplied).toBeLessThanOrEqual(current.commitIndex);
          expect(current.commitIndex).toBeLessThanOrEqual(
            lastPosition(current).index,
          );
          expect(current.log.every((entry) => entry.term <= current.term)).toBe(
            true,
          );
          const restored = applyCommitted(
            {
              ...current,
              lastApplied: boundary,
              value: current.snapshot?.value ?? 0,
            },
            current.lastApplied,
          );
          expect(restored.value).toBe(current.value);
          for (const entry of current.log) {
            if (entry.index <= current.commitIndex) {
              const previous = knownCommitted.get(entry.index);
              if (previous) expect(entry).toEqual(previous);
              knownCommitted.set(entry.index, entry);
            }
          }
        }
        for (const current of frame.nodes) {
          // A lagging node may retain an uncommitted conflict, but no later
          // leader or committed/application prefix may replace a decided value.
          for (const entry of current.log) {
            if (entry.index <= current.commitIndex)
              expect(entry).toEqual(knownCommitted.get(entry.index));
          }
        }
      }
      for (let index = 1; index < lesson.frames.length; index++) {
        for (const before of lesson.frames[index - 1].nodes) {
          const after = lesson.frames[index].nodes.find(
            (node) => node.id === before.id,
          )!;
          expect(after.commitIndex).toBeGreaterThanOrEqual(before.commitIndex);
          expect(after.lastApplied).toBeGreaterThanOrEqual(before.lastApplied);
          for (const entry of before.log.filter(
            (entry) => entry.index <= before.commitIndex,
          )) {
            if (entry.index <= (after.snapshot?.index ?? 0)) continue;
            expect(
              after.log.find((candidate) => candidate.index === entry.index),
            ).toEqual(entry);
          }
        }
      }
    },
  );

  it("uses intersecting majority acknowledgements before the leader learns commitment", () => {
    const frames = LESSONS.replication.frames;
    const stored = frames[2];
    expect(
      stored.nodes
        .filter((node) => node.log.length === 2)
        .map((node) => node.id),
    ).toEqual(["A", "B", "C"]);
    expect(stored.nodes.every((node) => node.commitIndex === 1)).toBe(true);
    expect(frames[3].nodes[0].commitIndex).toBe(2);
    expect(frames[3].nodes[0].value).toBe(5);
    expect(frames[3].nodes.slice(1).every((node) => node.value === 0)).toBe(
      true,
    );
    expect(frames[4].nodes.every((node) => node.value === 5)).toBe(true);
  });

  it.each([
    { index: 2, command: "SET 5", before: 0, after: 5 },
    { index: 3, command: "ADD 2", before: 5, after: 7 },
    { index: 4, command: "ADD 3", before: 7, after: 10 },
    { index: 5, command: "ADD -1", before: 10, after: 9 },
  ])(
    "replicates index $index before committing and announcing it",
    ({ index, command, before, after }) => {
      const stages = LESSONS.replication.frames.filter(
        (frame) => frame.focusIndex === index,
      );
      expect(stages).toHaveLength(4);
      const [proposed, stored, applied, announced] = stages;
      expect(
        proposed.nodes.filter((node) => node.log.length === index),
      ).toHaveLength(1);
      expect(proposed.nodes[0].log.at(-1)!.command).toBe(command);
      expect(
        proposed.nodes.every(
          (node) => node.value === before && node.commitIndex === index - 1,
        ),
      ).toBe(true);
      const copies = stored.nodes.filter((node) => node.log.length === index);
      expect(copies).toHaveLength(3);
      expect(
        hasQuorum(
          copies.map((node) => node.id),
          stored.nodes.map((node) => node.id),
        ),
      ).toBe(true);
      expect(
        stored.nodes.every(
          (node) =>
            node.commitIndex === index - 1 && node.lastApplied === index - 1,
        ),
      ).toBe(true);
      expect(applied.nodes[0].commitIndex).toBe(index);
      expect(applied.nodes[0].lastApplied).toBe(index);
      expect(applied.nodes[0].value).toBe(after);
      expect(
        applied.nodes
          .slice(1)
          .every(
            (node) => node.lastApplied === index - 1 && node.value === before,
          ),
      ).toBe(true);
      expect(
        announced.nodes.every(
          (node) =>
            node.log.length === index &&
            node.commitIndex === index &&
            node.lastApplied === index &&
            node.value === after,
        ),
      ).toBe(true);
    },
  );

  it("grows through five entries and finishes with identical logs and counter values", () => {
    const frames = LESSONS.replication.frames;
    expect(new Set(frames.map((frame) => frame.nodes[0].log.length))).toEqual(
      new Set([1, 2, 3, 4, 5]),
    );
    const final = frames.at(-1)!;
    expect(final.nodes).toHaveLength(5);
    const commands = ["SET 0", "SET 5", "ADD 2", "ADD 3", "ADD -1"];
    for (const node of final.nodes) {
      expect(node.log.map((entry) => entry.command)).toEqual(commands);
      expect(node.log.map((entry) => entry.index)).toEqual([1, 2, 3, 4, 5]);
      expect(node.commitIndex).toBe(5);
      expect(node.lastApplied).toBe(5);
      expect(node.value).toBe(9);
    }
  });

  it("keeps the isolated old leader unable to commit and steps it down before repair", () => {
    const frames = LESSONS.partition.frames;
    expect(frames[0].nodes.map((node) => node.leader)).toEqual([
      "A",
      "A",
      "A",
      "A",
      "A",
    ]);
    expect(frames[1].nodes.map((node) => node.leader)).toEqual([
      "A",
      "A",
      "A",
      "A",
      "A",
    ]);
    expect(frames[2].nodes.map((node) => node.leader)).toEqual([
      "A",
      "A",
      "C",
      null,
      null,
    ]);
    const divided = frames[3].nodes;
    expect(divided.map((node) => node.leader)).toEqual([
      "A",
      "A",
      "C",
      "C",
      "C",
    ]);
    expect(
      divided
        .filter((node) => node.role === "leader")
        .map((node) => [node.id, node.term]),
    ).toEqual([
      ["A", 2],
      ["C", 3],
    ]);
    expect(
      divided
        .slice(0, 2)
        .every((node) => node.commitIndex === 1 && node.value === 0),
    ).toBe(true);
    expect(
      divided
        .slice(2)
        .every((node) => node.commitIndex === 2 && node.value === 5),
    ).toBe(true);
    expect(frames[4].nodes[0].role).toBe("follower");
    expect(frames[4].nodes.map((node) => node.leader)).toEqual([
      "C",
      "C",
      "C",
      "C",
      "C",
    ]);
    expect(frames[4].nodes[0].log[1].command).toBe("SET 9");
    expect(frames[5].nodes[0].log[1].command).toBe("SET 5");
  });

  it("clears prior leader knowledge on a higher-term election and does not confuse a vote with an announcement", () => {
    const frames = LESSONS.election.frames;
    expect(frames[0].nodes.map((node) => node.leader)).toEqual(["B", "B", "B"]);
    expect(frames[0].nodes[1].role).toBe("leader");
    expect(frames[1].nodes.map((node) => node.leader)).toEqual([
      null,
      null,
      null,
    ]);
    expect(frames[1].nodes.every((node) => node.term === 3)).toBe(true);
    expect(frames[1].nodes[0].role).toBe("candidate");
    expect(frames[1].nodes[1].role).toBe("follower");
    expect(frames[2].nodes.every((node) => node.leader === null)).toBe(true);
    expect(frames[3].nodes.map((node) => node.leader)).toEqual([
      null,
      "B",
      null,
    ]);
    expect(frames[3].nodes.every((node) => node.term === 4)).toBe(true);
  });

  it("recognizes the new leader before repairing an inconsistent log", () => {
    const frames = LESSONS.repair.frames;
    expect(frames[0].nodes[1].leader).toBeNull();
    expect(frames[1].nodes[1].leader).toBe("A");
    expect(frames[1].nodes[1].log).toEqual(frames[0].nodes[1].log);
    expect(frames[3].nodes[1].leader).toBe("A");
    expect(frames[3].nodes[1].log).not.toEqual(frames[0].nodes[1].log);
  });

  it("makes Figure 8's counterexample possible and blocks it after the current-term anchor", () => {
    const frames = LESSONS["current-term"].frames;
    const majority = frames[2].nodes;
    expect(frames[1].nodes.map((node) => node.leader)).toEqual([
      "A",
      "A",
      null,
      null,
      "E",
    ]);
    expect(majority.map((node) => node.leader)).toEqual([
      "A",
      "A",
      "A",
      null,
      "E",
    ]);
    expect(majority[4].offline).toBe(true);
    expect(majority[4].leader).toBe(frames[1].nodes[4].leader);
    expect(majority.filter((node) => node.log[1]?.term === 2)).toHaveLength(3);
    expect(majority.every((node) => node.commitIndex === 1)).toBe(true);
    const e = majority[4];
    expect(
      majority
        .slice(1, 4)
        .every((voter) => isLogUpToDate(lastPosition(e), lastPosition(voter))),
    ).toBe(true);
    expect(frames[3].nodes[1].log[1].command).toBe("SET 9");
    expect(frames[3].nodes.map((node) => node.leader)).toEqual([
      "A",
      "E",
      "E",
      "E",
      "E",
    ]);
    expect(frames[4].nodes).toEqual(majority);
    const settled = frames[6].nodes;
    expect(
      settled
        .slice(0, 3)
        .every((node) => node.commitIndex === 3 && node.value === 7),
    ).toBe(true);
    expect(
      settled
        .slice(0, 3)
        .every((voter) => !isLogUpToDate(lastPosition(e), lastPosition(voter))),
    ).toBe(true);
  });

  it("commits the joint entry using separate majorities before creating the final configuration", () => {
    const frames = LESSONS.membership.frames;
    const insufficient = frames[2].configuration!;
    expect(
      hasQuorum(insufficient.acknowledgements, ["A", "B", "C", "D", "E"]),
    ).toBe(true);
    expect(
      hasJointQuorum(
        insufficient.acknowledgements,
        insufficient.old,
        insufficient.next,
      ),
    ).toBe(false);
    expect(frames[2].nodes.find((node) => node.id === "C")!.commitIndex).toBe(
      1,
    );
    const sufficient = frames[3].configuration!;
    expect(
      hasJointQuorum(
        sufficient.acknowledgements,
        sufficient.old,
        sufficient.next,
      ),
    ).toBe(true);
    expect(frames[3].nodes.find((node) => node.id === "C")!.commitIndex).toBe(
      2,
    );
    expect(frames[3].nodes.every((node) => node.log.length <= 2)).toBe(true);
    expect(
      frames[4].nodes.find((node) => node.id === "C")!.log.at(-1)!.command,
    ).toBe("CDE");
    expect(frames[5].configuration!.old).toEqual([]);
    expect(
      frames[5].nodes.filter((node) => !node.offline).map((node) => node.id),
    ).toEqual(["C", "D", "E"]);
  });

  it("preserves snapshot metadata and reaches the same state from compacted and full logs", () => {
    const frames = LESSONS.snapshot.frames;
    expect(frames[1].nodes[0].snapshot).toEqual({
      index: 3,
      term: 2,
      value: 7,
      configuration: ["A", "B", "C"],
    });
    expect(frames[1].nodes[0].log.map((entry) => entry.index)).toEqual([4]);
    expect(frames[2].nodes[2].snapshot).toEqual(frames[1].nodes[0].snapshot);
    expect(frames[3].nodes[2].value).toBe(7);
    expect(frames[4].nodes.map((node) => node.value)).toEqual([10, 10, 10]);
    expect(frames[4].nodes.map((node) => node.lastApplied)).toEqual([4, 4, 4]);
    expect(frames[4].nodes[1].snapshot).toBeUndefined();
  });
});

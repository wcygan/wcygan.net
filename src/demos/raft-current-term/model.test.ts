import { describe, expect, it } from "vitest";
import {
  canCommitByCounting,
  currentTermFrame,
  currentTermState,
  entryIsCommitted,
  logIsCurrent,
  quorum,
  servers,
  stepCount,
  timeline,
  type Branch,
} from "./model";

describe("three-server adaptation of Raft Figure 8", () => {
  it("cannot count two inherited copies as a new commitment", () => {
    expect(servers).toEqual(["A", "B", "C"]);
    expect(quorum).toBe(2);
    const state = currentTermState(2, "inherited");
    const leader = state.nodes[0];
    const copies = state.nodes.filter((node) => node.log[1]?.term === 2).length;
    expect(copies).toBe(2);
    expect(state.committedThrough).toBe(1);
    expect(leader.log[2].term).toBe(4);
    expect(state.nodes.filter((node) => node.log[2]?.term === 4)).toHaveLength(
      1,
    );
    expect(canCommitByCounting(leader.log, 3, 4, 1)).toBe(false);
    expect(canCommitByCounting(leader.log, 2, 4, copies)).toBe(false);
    expect(canCommitByCounting(leader.log, 2, 2, copies)).toBe(true);
  });

  it("allows each setup election with the remaining two servers' logs", () => {
    const term2 = currentTermState(0, "inherited");
    expect(term2.nodes.filter((node) => node.log[1]?.term === 2)).toHaveLength(
      1,
    );
    expect(logIsCurrent(term2.nodes[2].log, term2.nodes[1].log)).toBe(true);
    const term3 = currentTermState(1, "inherited");
    expect(term3.nodes[0].role).toBe("offline");
    expect(term3.nodes[2].role).toBe("leader");
    expect(logIsCurrent(term3.nodes[0].log, term3.nodes[1].log)).toBe(true);
    const term4 = currentTermState(2, "inherited");
    expect(term4.nodes[2].role).toBe("offline");
    expect(term4.nodes[0].role).toBe("leader");
  });

  it("lets C win because its last-entry term is newer than B's", () => {
    const state = currentTermState(4, "inherited");
    expect(state.nodes[2].role).toBe("leader");
    expect(
      state.nodes.filter((node) => node.vote === "C").map((node) => node.id),
    ).toEqual(["B", "C"]);
    expect(state.nodes[0].vote).toBeUndefined();
    expect(state.nodes[2].log.at(-1)?.term).toBe(3);
    expect(state.nodes[1].log.at(-1)?.term).toBe(2);
  });

  it("only overwrites an uncommitted entry, without pretending term-3 copies commit in term 5", () => {
    const state = currentTermState(5, "inherited");
    expect(state.nodes[0].role).toBe("follower");
    expect(state.nodes[0].log[1].term).toBe(3);
    expect(state.nodes[0].log).toHaveLength(2);
    expect(state.nodes.slice(1).every((node) => node.log[1].term === 3)).toBe(
      true,
    );
    expect(state.committedThrough).toBe(1);
    expect(canCommitByCounting(state.nodes[2].log, 2, 5, 2)).toBe(false);
  });

  it("commits the current-term entry and its matching prefix after two durable copies", () => {
    const state = currentTermState(3, "current");
    const copies = state.nodes.filter((node) => node.log[2]?.term === 4).length;
    expect(copies).toBe(2);
    expect(canCommitByCounting(state.nodes[0].log, 3, 4, copies)).toBe(true);
    expect(canCommitByCounting(state.nodes[0].log, 3, 4, 1)).toBe(false);
    expect(state.committedThrough).toBe(3);
    expect(
      state.nodes.slice(0, 2).every((node) => node.log[1].term === 2),
    ).toBe(true);
    expect(
      entryIsCommitted(state.nodes[0].log[1], 1, state.committedThrough),
    ).toBe(true);
    expect(
      entryIsCommitted(state.nodes[2].log[1], 1, state.committedThrough),
    ).toBe(false);
  });

  it("B blocks C’s stale log after the current-term entry commits", () => {
    const election = currentTermState(4, "current");
    expect(election.nodes[2].role).toBe("candidate");
    expect(
      election.nodes.filter((node) => node.vote === "C").map((node) => node.id),
    ).toEqual(["C"]);
    expect(
      election.nodes
        .filter((node) => node.vote === "refused")
        .map((node) => node.id),
    ).toEqual(["B"]);
    expect(logIsCurrent(election.nodes[1].log, election.nodes[2].log)).toBe(
      true,
    );
    const final = currentTermState(5, "current");
    expect(final.nodes[1].role).toBe("follower");
    expect(final.nodes[2].role).toBe("candidate");
    expect(
      final.nodes.slice(0, 2).every((node) => node.log[1].term === 2),
    ).toBe(true);
    expect(final.committedThrough).toBe(3);
  });

  it("compares last log term before length and length only to break a tie", () => {
    const entry = (term: number) => ({ term, command: "no-op" });
    expect(logIsCurrent([entry(3)], [entry(2), entry(2)])).toBe(true);
    expect(logIsCurrent([entry(2), entry(2)], [entry(3)])).toBe(false);
    expect(logIsCurrent([entry(2)], [entry(2), entry(2)])).toBe(false);
    expect(logIsCurrent([entry(2), entry(2)], [entry(2), entry(2)])).toBe(true);
  });

  it("keeps setup identical and explicitly rewinds before the second ending", () => {
    for (let step = 0; step < 3; step++)
      expect(currentTermState(step, "current")).toEqual(
        currentTermState(step, "inherited"),
      );
    expect(currentTermFrame(5).title).toBe("The old entry is overwritten");
    expect(currentTermFrame(6).phase).toBe(
      "Return to (c) · try the alternative",
    );
    expect(currentTermFrame(6).nodes).toEqual(
      currentTermState(2, "inherited").nodes,
    );
    expect(currentTermFrame(timeline.length - 1).title).toBe(
      "C cannot win with its old log",
    );
    const original = currentTermState(0, "inherited");
    for (const branch of ["inherited", "current"] as Branch[])
      for (let step = 0; step < stepCount; step++)
        currentTermState(step, branch);
    expect(currentTermState(0, "inherited")).toEqual(original);
  });
});

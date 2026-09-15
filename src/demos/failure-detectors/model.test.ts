import { describe, expect, it } from "vitest";
import {
  createSimulation as createDefaultSimulation,
  candidates,
  deadline,
  electionTimeout,
  isSettled,
  nextEventAt,
  transition,
} from "./model";
import { outcome } from "./presentation";
import type { Config, Simulation } from "./types";

// Protocol edge cases use an explicit schedule independent of presentation defaults.
const createSimulation = (config: Partial<Config> = {}, seed?: number) =>
  createDefaultSimulation(
    {
      interval: 1000,
      delay: 200,
      jitter: 50,
      electionMin: 3000,
      ...config,
    },
    seed,
  );

it("uses slower packets and quicker randomized timeouts by default", () => {
  let s = createDefaultSimulation();
  expect(s.config.interval).toBe(650);
  expect(s.packets.every((p) => p.arrivesAt - p.sentAt === 700)).toBe(true);
  s = transition(s, { type: "crash" });
  s = transition(s, { type: "advance", to: 700 });
  for (const id of ["A", "C", "D", "E"] as const) {
    expect(s.followers[id]!.received).toBe(1);
    expect(electionTimeout(s, id)).toBeGreaterThanOrEqual(1500);
    expect(electionTimeout(s, id)).toBeLessThanOrEqual(3000);
  }
  const firstDeadline = Math.min(
    ...Object.values(s.followers).map(
      (p) => p.timerStartedAt + Math.round(1500 * (1 + p.timeoutFraction)),
    ),
  );
  s = transition(s, { type: "advance", to: 10000 });
  expect(s.now).toBe(firstDeadline);
  expect(isSettled(s)).toBe(true);
});

const start = () => createSimulation({ nodeCount: 2, jitter: 0 });
const advance = (s: Simulation, to: number) =>
  transition(s, { type: "advance", to });

describe("leader heartbeats and the follower election timer", () => {
  it("only resets the timer when A receives a heartbeat", () => {
    const initial = start();
    const before = advance(initial, 199);
    expect(before.followers.A).toEqual(initial.followers.A);
    const after = advance(before, 200);
    expect(after.followers.A.received).toBe(1);
    expect(after.followers.A.timerStartedAt).toBe(200);
    expect(after.followers.A.lastReceived).toEqual({ id: 1, at: 200 });
    expect(after.followers.A.timeoutFraction).not.toBe(
      initial.followers.A.timeoutFraction,
    );
    expect(initial.followers.A.received).toBe(0);
  });

  it("draws varying timeouts within the configured range", () => {
    let s = start();
    const durations = new Set<number>();
    for (let to = 200; to < 20000; to += 1000) {
      s = advance(s, to);
      const timeout = electionTimeout(s);
      expect(timeout).toBeGreaterThanOrEqual(3000);
      expect(timeout).toBeLessThanOrEqual(6000);
      durations.add(timeout);
    }
    expect(durations.size).toBeGreaterThan(10);
  });

  it("keeps independent random streams for network delay and A's timer", () => {
    const a = advance(createSimulation({ jitter: 0 }), 500);
    const b = advance(createSimulation({ jitter: 100 }), 500);
    expect(a.followers.A.timeoutFraction).toBe(b.followers.A.timeoutFraction);
    expect(a.followers.A.lastReceived!.at).not.toBe(
      b.followers.A.lastReceived!.at,
    );
  });

  it("does not let injected faults reveal B's condition to A", () => {
    const s = advance(start(), 500);
    const faulty = transition(transition(s, { type: "crash" }), {
      type: "cut",
    });
    expect(faulty.followers.A).toEqual(s.followers.A);
    expect(outcome(faulty)).toBe(outcome(s));
  });

  it("allows an already-sent heartbeat to arrive after the leader crashes", () => {
    let s = transition(start(), { type: "crash" });
    s = advance(s, 200);
    expect(s.followers.A.received).toBe(1);
    expect(s.followers.A.role).toBe("follower");
    expect(advance(s, deadline(s) - 1).followers.A.role).toBe("follower");
    const expired = advance(s, deadline(s));
    expect(expired.followers.A.role).toBe("candidate");
    expect(expired.followers.A.electionStartedAt).toBe(deadline(s));
    expect(expired.leader.sent).toBe(1);
  });

  it("can start an unnecessary election solely because of network delay", () => {
    const s = createSimulation({
      nodeCount: 2,
      electionMin: 1000,
      delay: 2000,
      jitter: 0,
    });
    const expired = advance(s, 10000);
    expect(expired.transport.crashed).toBe(false);
    expect(expired.transport.cut).toEqual([]);
    expect(expired.followers.A.received).toBe(0);
    expect(expired.followers.A.role).toBe("candidate");
    expect(expired.now).toBe(deadline(s));
    expect(outcome(expired)).toContain("not proof");
  });

  it("drops one outgoing heartbeat, then continues normally", () => {
    let s = advance(start(), 500);
    s = transition(s, { type: "drop" });
    expect(s.transport.dropNext).toBe("A");
    s = advance(s, 1200);
    expect(s.transport.dropNext).toBeNull();
    expect(s.transport.dropped).toBe(1);
    expect(s.followers.A.received).toBe(1);
    s = advance(s, 2200);
    expect(s.followers.A.received).toBe(2);
    expect(s.followers.A.lastReceived!.id).toBe(3);
    expect(s.followers.A.role).toBe("follower");
  });

  it("cutting a link drops in-flight packets until Reset restores it", () => {
    let s = transition(start(), { type: "cut" });
    expect(s.packets).toEqual([]);
    s = advance(s, 1500);
    expect(s.followers.A.received).toBe(0);
    s = transition(s, { type: "reset" });
    s = advance(s, 200);
    expect(s.transport.cut).toEqual([]);
    expect(s.followers.A.lastReceived).toEqual({ id: 1, at: 200 });
    expect(s.followers.A.role).toBe("follower");
  });

  it("delivers heartbeats before a deadline at the same timestamp", () => {
    const s = start();
    // Arrange the rare exact boundary schedule without depending on a seed.
    s.packets[0].arrivesAt = deadline(s);
    s.transport.crashed = true;
    const next = advance(s, deadline(s));
    expect(next.followers.A.received).toBe(1);
    expect(next.followers.A.role).toBe("follower");
    expect(deadline(next)).toBeGreaterThan(next.now);
  });

  it("counts out-of-order current-term heartbeats as leader contact", () => {
    const s = start();
    s.packets[0].arrivesAt = 1500;
    const newer = advance(s, 1200);
    expect(newer.followers.A.lastReceived!.id).toBe(2);
    const older = advance(newer, 1500);
    expect(older.followers.A.lastReceived).toEqual({ id: 1, at: 1500 });
    expect(older.followers.A.timerStartedAt).toBe(1500);
  });

  it("stops at the election boundary and requires reset to start a new experiment", () => {
    const s = advance(transition(start(), { type: "cut" }), 10000);
    expect(s.followers.A.role).toBe("candidate");
    expect(advance(s, 20000)).toEqual(s);
    expect(transition(s, { type: "step" })).toEqual(s);
    expect(transition(s, { type: "cut" })).toEqual(s);
    expect(transition(s, { type: "reset" })).toEqual(start());
  });
});

describe("live timing and deterministic replay", () => {
  it("keeps packets, counters, clock and history when changing delay or jitter", () => {
    const s = advance(start(), 1100);
    const tuned = transition(s, {
      type: "configure",
      values: { delay: 2000, jitter: 1000 },
    });
    expect(tuned.now).toBe(s.now);
    expect(tuned.nextId).toBe(s.nextId);
    expect(tuned.packets).toEqual(s.packets);
    expect(tuned.followers.A).toEqual(s.followers.A);
    expect(advance(tuned, 1200).followers.A.lastReceived!.id).toBe(2);
  });

  it("applies a changed election range to the current random draw without restarting the timer", () => {
    const s = advance(start(), 800);
    const tuned = transition(s, {
      type: "configure",
      values: { electionMin: 2000 },
    });
    expect(tuned.followers.A).toEqual(s.followers.A);
    expect(tuned.now).toBe(s.now);
    expect(electionTimeout(tuned)).toBe(
      Math.round(2000 * (1 + s.followers.A.timeoutFraction)),
    );
    expect(deadline(tuned)).toBeLessThan(deadline(s));
  });

  it("starts an election immediately if tuning moves its deadline into the past", () => {
    let s = advance(start(), 200);
    s = transition(s, { type: "crash" });
    s = advance(s, 2400);
    const tuned = transition(s, {
      type: "configure",
      values: { electionMin: 1000 },
    });
    expect(tuned.now).toBe(2400);
    expect(tuned.followers.A.electionStartedAt).toBe(2400);
    expect(tuned.followers.A.received).toBe(s.followers.A.received);
  });

  it("recomputes the next send after interval tuning without catch-up bursts", () => {
    let s = createSimulation({ interval: 3000, jitter: 0 });
    s = advance(s, 2800);
    s = transition(s, { type: "configure", values: { interval: 500 } });
    expect(s.leader.sent).toBe(2);
    expect(s.leader.lastSent).toBe(2800);
    expect(advance(s, 3299).leader.sent).toBe(2);
    expect(advance(s, 3300).leader.sent).toBe(3);
  });

  it("resets faults and history while retaining configuration", () => {
    let s = advance(start(), 2500);
    s = transition(transition(s, { type: "cut" }), { type: "crash" });
    s = transition(s, { type: "configure", values: { delay: 1500 } });
    const reset = transition(s, { type: "reset" });
    expect(reset).toEqual(createSimulation(s.config));
    expect(reset.followers.A.received).toBe(0);
    expect(reset.now).toBe(0);
  });

  it("replays deterministically across clock increments and seeds", () => {
    let incremental = createSimulation();
    for (let to = 50; to <= 10000; to += 50)
      incremental = advance(incremental, to);
    expect(incremental).toEqual(advance(createSimulation(), 10000));
    expect(createSimulation({}, 42)).not.toEqual(createSimulation({}, 43));
  });

  it("bounds history and pending packets during an extended healthy run", () => {
    const s = advance(
      createSimulation({
        nodeCount: 2,
        interval: 500,
        delay: 2000,
        jitter: 1000,
        electionMin: 5000,
      }),
      600000,
    );
    expect(s.now).toBe(600000);
    expect(s.followers.A.received).toBeGreaterThan(1100);
    expect(s.followers.A.arrivals.length).toBeLessThanOrEqual(8);
    expect(s.packets.length).toBeLessThanOrEqual(6);
    expect(s.packets.every((p) => p.arrivesAt > s.now)).toBe(true);
  });
});

describe("changing the number of nodes", () => {
  it("broadcasts to all followers, with independent randomized timers", () => {
    const s = advance(createSimulation({ nodeCount: 5, jitter: 0 }), 200);
    expect(Object.keys(s.followers)).toEqual(["A", "C", "D", "E"]);
    for (const peer of Object.values(s.followers)) {
      expect(peer.received).toBe(1);
      expect(peer.timerStartedAt).toBe(200);
    }
    expect(
      new Set(Object.values(s.followers).map((p) => p.timeoutFraction)).size,
    ).toBe(4);
  });

  it("adds listeners without replacing existing packets, timers, faults or history", () => {
    let s = advance(start(), 1100);
    s = transition(s, { type: "drop" });
    const larger = transition(s, {
      type: "configure",
      values: { nodeCount: 5 },
    });
    expect(larger.now).toBe(1100);
    expect(larger.followers.A).toEqual(s.followers.A);
    expect(larger.packets).toEqual(s.packets);
    expect(larger.nextId).toBe(s.nextId);
    expect(larger.transport).toEqual(s.transport);
    expect(larger.followers.C!.timerStartedAt).toBe(1100);
    expect(larger.followers.C!.received).toBe(0);
    const delivered = advance(larger, 2200);
    expect(delivered.followers.C!.received).toBe(1);
    expect(delivered.followers.D!.received).toBe(1);
    expect(delivered.followers.E!.received).toBe(1);
    expect(delivered.followers.A.received).toBe(2);
  });

  it("removes only departing followers and their traveling packets", () => {
    const s = advance(createSimulation({ nodeCount: 5, jitter: 0 }), 1100);
    const smaller = transition(s, {
      type: "configure",
      values: { nodeCount: 3 },
    });
    expect(Object.keys(smaller.followers)).toEqual(["A", "C"]);
    expect(smaller.followers).toEqual({ A: s.followers.A, C: s.followers.C });
    expect(smaller.packets).toEqual(
      s.packets.filter((p) => ["A", "C"].includes(p.to)),
    );
    expect(smaller.nextId).toBe(s.nextId);
    const addedAgain = transition(advance(smaller, 1300), {
      type: "configure",
      values: { nodeCount: 5 },
    });
    expect(addedAgain.followers.D!.received).toBe(0);
    expect(addedAgain.followers.D!.timerStartedAt).toBe(1300);
  });

  it("isolates a random link cut and a single dropped heartbeat to their targets", () => {
    const s = createSimulation({ nodeCount: 5, jitter: 0 });
    const injected = transition(s, { type: "cut" });
    const target = injected.transport.cut[0];
    const cut = advance(injected, 2200);
    for (const [id, peer] of Object.entries(cut.followers))
      expect(peer.received).toBe(id === target ? 0 : 3);
    const pending = transition(s, { type: "drop" });
    const dropTarget = pending.transport.dropNext;
    const dropped = advance(pending, 2200);
    for (const [id, peer] of Object.entries(dropped.followers))
      expect(peer.received).toBe(id === dropTarget ? 2 : 3);
    expect(dropped.transport.dropNext).toBeNull();
    expect(dropped.transport.lastDrop).toBe(dropTarget);
  });

  it("freezes every node at the first follower's election boundary", () => {
    let s = advance(createSimulation({ nodeCount: 5, jitter: 0 }), 200);
    s = transition(s, { type: "crash" });
    // Make C's local deadline earliest; B's in-flight packets already arrived.
    s.followers.A.timeoutFraction = 0.9;
    s.followers.C!.timeoutFraction = 0.1;
    s.followers.D!.timeoutFraction = 0.5;
    s.followers.E!.timeoutFraction = 0.6;
    // A delayed clock update must still stop at C's deadline, not overshoot it.
    const expired = advance(s, 10000);
    expect(expired.now).toBe(3500);
    expect(expired.followers.C!.role).toBe("candidate");
    expect(expired.followers.A.role).toBe("follower");
    expect(outcome(expired)).toContain("Follower C");
    expect(outcome(expired)).toContain("3.3s election timer expired at 3.5s");
    expect(outcome(expired)).toContain("last heartbeat at 0.2s");
    expect(isSettled(expired)).toBe(true);
    expect(nextEventAt(expired)).toBe(Infinity);
    expect(candidates(expired)).toEqual(["C"]);
    for (const id of ["A", "D", "E"] as const)
      expect(expired.followers[id]).toEqual(s.followers[id]);
    expect(advance(expired, 20000)).toBe(expired);
    expect(transition(expired, { type: "cut" })).toBe(expired);
    expect(
      transition(expired, {
        type: "configure",
        values: { nodeCount: 2 },
      }),
    ).toBe(expired);
    expect(expired.leader.sent).toBe(1);
    expect(transition(expired, { type: "reset" })).toEqual(
      createSimulation(s.config),
    );
  });

  it("preserves in-flight heartbeats and simultaneous expirations in the frozen scene", () => {
    const s = createSimulation({
      nodeCount: 5,
      jitter: 0,
      electionMin: 1000,
      delay: 2000,
    });
    s.followers.A.timeoutFraction = 0;
    s.followers.C!.timeoutFraction = 0;
    s.followers.D!.timeoutFraction = 0.5;
    s.followers.E!.timeoutFraction = 0.6;
    const expired = advance(s, 10000);
    expect(expired.now).toBe(1000);
    expect(candidates(expired)).toEqual(["A", "C"]);
    expect(expired.packets).toEqual(s.packets);
    expect(expired.leader.sent).toBe(1);
    expect(outcome(expired)).toContain("the experiment began");
  });

  it("retains node count on reset and clamps it to whole supported sizes", () => {
    const s = transition(start(), {
      type: "configure",
      values: { nodeCount: 3.7 },
    });
    expect(s.config.nodeCount).toBe(4);
    expect(transition(s, { type: "reset" })).toEqual(
      createSimulation(s.config),
    );
    expect(createSimulation({ nodeCount: 99 }).config.nodeCount).toBe(5);
    expect(createSimulation({ nodeCount: 0 }).config.nodeCount).toBe(2);
  });

  it("replays and stays bounded with five nodes over an extended run", () => {
    const initial = createSimulation({
      nodeCount: 5,
      interval: 500,
      delay: 2000,
      jitter: 1000,
      electionMin: 5000,
    });
    let incremental = initial;
    for (let to = 50; to <= 10000; to += 50)
      incremental = advance(incremental, to);
    expect(incremental).toEqual(advance(initial, 10000));
    const long = advance(initial, 600000);
    expect(long.now).toBe(600000);
    expect(long.packets.length).toBeLessThanOrEqual(24);
    for (const peer of Object.values(long.followers)) {
      expect(peer.received).toBeGreaterThan(1100);
      expect(peer.arrivals.length).toBeLessThanOrEqual(8);
    }
  });
});

describe("random fault selection", () => {
  it("cuts distinct active links and preserves other traveling packets", () => {
    const initial = createSimulation();
    let s = initial;
    for (let i = 0; i < 4; i++) {
      s = transition(s, { type: "cut" });
      expect(s.transport.cut).toHaveLength(i + 1);
      expect(s.packets.every((p) => !s.transport.cut.includes(p.to))).toBe(
        true,
      );
      expect(s.followers).toEqual(initial.followers);
    }
    expect(new Set(s.transport.cut).size).toBe(4);
    expect(transition(s, { type: "cut" })).toEqual(s);
    expect(transition(s, { type: "drop" }).transport.dropNext).toBeNull();
  });

  it("replays random targets without disturbing network or timer randomness", () => {
    const initial = createSimulation();
    const dropped = transition(initial, { type: "drop" });
    expect(dropped.networkSeed).toBe(initial.networkSeed);
    expect(dropped.followers).toEqual(initial.followers);
    expect(transition(initial, { type: "drop" })).toEqual(dropped);
    expect(transition(dropped, { type: "drop" })).toEqual(dropped);
    const targets = [1, 1234, 14731, 123456, 987654321].map(
      (seed) =>
        transition(createSimulation({}, seed), { type: "drop" }).transport
          .dropNext,
    );
    expect(new Set(targets).size).toBeGreaterThan(1);
  });

  it("cleans up faults when nodes leave or the leader crashes", () => {
    let s = createSimulation();
    for (let i = 0; i < 3; i++) s = transition(s, { type: "cut" });
    s = transition(s, { type: "drop" });
    const smaller = transition(s, {
      type: "configure",
      values: { nodeCount: 2 },
    });
    expect(smaller.transport.cut.every((id) => id === "A")).toBe(true);
    expect([null, "A"]).toContain(smaller.transport.dropNext);
    const crashed = transition(s, { type: "crash" });
    expect(crashed.transport.dropNext).toBeNull();
    expect(transition(crashed, { type: "drop" })).toEqual(crashed);
    expect(transition(crashed, { type: "cut" })).toEqual(crashed);
  });
});

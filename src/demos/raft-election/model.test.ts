import { describe, expect, it } from "vitest";
import {
  createSimulation,
  currentLeader,
  RECOVERY_DELAY,
  receive,
  transition,
} from "./model";
import { NODES, type Packet, type Scenario } from "./types";
const reply = (values: Partial<Packet> = {}): Packet => ({
  id: 99,
  from: "D",
  to: "A",
  term: 2,
  kind: "reply",
  granted: true,
  sentAt: 0,
  arrivesAt: 0,
  ...values,
});
describe("Raft elections", () => {
  it.each(["success", "split"] as Scenario[])(
    "elects through messages: %s",
    (scenario) => {
      let s = transition(createSimulation(scenario), { type: "crash" });
      const votes = new Map<string, string>();
      for (let i = 0; i < 35; i++) {
        s = transition(s, { type: "step" });
        const leaders = new Set<number>();
        for (const id of NODES) {
          const n = s.nodes[id];
          if (n.role === "leader") {
            expect(leaders.has(n.term)).toBe(false);
            leaders.add(n.term);
          }
          if (n.votedFor) {
            const key = `${id}-${n.term}`;
            if (votes.has(key)) expect(n.votedFor).toBe(votes.get(key));
            votes.set(key, n.votedFor);
          }
        }
      }

      expect(s.nodes.A.role).toBe("leader");
      expect(s.nodes.A.term).toBe(scenario === "split" ? 3 : 2);
      expect(s.splitSeen).toBe(scenario === "split");
      expect(s.nodes.A.votes.length).toBeGreaterThanOrEqual(3);
      const later = transition(s, { type: "advance", to: 100000 });
      expect(later.now).toBe(100000);
      expect(later.nodes.A.term).toBe(s.nodes.A.term);
      expect(later.nextId).toBeGreaterThan(s.nextId);
    },
  );
  it("counts unique current-term replies and requires three of five", () => {
    const s = transition(transition(createSimulation(), { type: "crash" }), {
      type: "advance",
      to: 2200,
    });
    expect(s.nodes.A.role).toBe("candidate");
    receive(s, reply());
    receive(s, reply());
    receive(s, reply({ from: "E", term: 1 }));
    expect(s.nodes.A.votes).toEqual(["A", "D"]);
    expect(s.nodes.A.role).toBe("candidate");
    receive(s, reply({ from: "E" }));
    expect(s.nodes.A.role).toBe("leader");
  });
  it("steps down on higher terms and rejects a second candidate", () => {
    const s = createSimulation();
    receive(s, reply({ to: "B", term: 3 }));
    expect(s.nodes.B.role).toBe("follower");
    expect(s.nodes.B.term).toBe(3);
    receive(s, reply({ kind: "request", from: "A", to: "D", term: 3 }));
    receive(s, reply({ kind: "request", from: "C", to: "D", term: 3 }));
    expect(s.nodes.D.votedFor).toBe("A");
    expect(s.packets.at(-1)?.granted).toBe(false);
  });
  it("delivers an already-sent heartbeat after the crash and resets deterministically", () => {
    let s = transition(createSimulation("split"), { type: "crash" });
    s = transition(s, { type: "step" });
    expect(s.nodes.A.deadline).toBe(2200);
    expect(s.nodes.B.term).toBe(1);
    expect(transition(s, { type: "reset" })).toEqual(createSimulation("split"));
    expect(transition(s, { type: "reset", scenario: "success" })).toEqual(
      createSimulation(),
    );
  });
  it("matches a continuous advance and discrete steps", () => {
    const start = transition(createSimulation("split"), { type: "crash" });
    let s = start;
    for (let i = 0; i < 50; i++) s = transition(s, { type: "step" });
    expect(transition(start, { type: "advance", to: s.now })).toEqual(s);
  });
});

it("recovers each crashed leader with durable term and vote, then rejoins elections", () => {
  let s = createSimulation();
  for (let round = 0; round < 4; round++) {
    const leader = currentLeader(s)!;
    const { term, votedFor } = s.nodes[leader];
    s = transition(s, { type: "crash" });
    const recovery = s.now + RECOVERY_DELAY;
    s = transition(s, { type: "advance", to: recovery - 1 });
    expect(s.crashed).toContain(leader);
    s = transition(s, { type: "step" });
    expect(s.now).toBe(recovery);
    expect(s.crashed).toEqual([]);
    expect(s.nodes[leader].role).toBe("follower");
    expect(s.nodes[leader].term).toBe(term);
    expect(s.nodes[leader].votedFor).toBe(votedFor);
    s = transition(s, { type: "advance", to: s.now + 15000 });
    expect(currentLeader(s)).toBeTruthy();
    expect(currentLeader(s)).not.toBe(leader);
    expect(s.nodes[leader].term).toBeGreaterThan(term);
    expect(s.nodes[leader].leader).toBe(currentLeader(s));
  }
});

it("preserves pending recovery on scenario changes and clears it on reset", () => {
  let s = transition(createSimulation(), { type: "crash" });
  s = transition(s, { type: "advance", to: 500 });
  s = transition(s, { type: "scenario", scenario: "split" });
  expect(s.recoverAt).toEqual({ B: RECOVERY_DELAY });
  expect(transition(s, { type: "reset" }).recoverAt).toEqual({});
});

it("switches scenarios around the current leader without resetting the run", () => {
  let s = transition(transition(createSimulation(), { type: "crash" }), {
    type: "advance",
    to: 15000,
  });
  const before = structuredClone(s);
  s = transition(s, { type: "scenario", scenario: "split" });
  expect(s.now).toBe(before.now);
  expect(s.crashed).toEqual(before.crashed);
  expect(s.packets).toEqual(before.packets);
  expect(s.nextId).toBe(before.nextId);
  for (const id of NODES) {
    expect(s.nodes[id].role).toBe(before.nodes[id].role);
    expect(s.nodes[id].term).toBe(before.nodes[id].term);
    expect(s.nodes[id].votedFor).toBe(before.nodes[id].votedFor);
  }
  expect(s.election.peers).toEqual(["C", "D", "E", "B"]);
  s = transition(s, { type: "crash" });
  for (let i = 0; i < 50 && !s.splitSeen; i++)
    s = transition(s, { type: "step" });
  expect(s.splitSeen).toBe(true);
  expect(s.status).toContain("term 3");
  expect(s.status).toContain("C has 2");
  expect(s.status).toContain("D has 2");
  s = transition(s, { type: "advance", to: s.now + 20000 });
  expect(s.nodes.C.role).toBe("leader");
  expect(s.nodes.C.term).toBe(4);
});

it("preserves votes and messages when switching during candidacy", () => {
  let s = transition(transition(createSimulation(), { type: "crash" }), {
    type: "advance",
    to: 2200,
  });
  expect(s.nodes.A.role).toBe("candidate");
  const before = structuredClone(s);
  s = transition(s, { type: "scenario", scenario: "split" });
  expect(s.nodes.A.votes).toEqual(before.nodes.A.votes);
  expect(s.nodes.A.term).toBe(before.nodes.A.term);
  expect(s.packets).toEqual(before.packets);
  expect(s.now).toBe(before.now);
  s = transition(s, { type: "scenario", scenario: "success" });
  s = transition(s, { type: "advance", to: 15000 });
  expect(s.nodes.A.role).toBe("leader");
});

it.each(["success", "split"] as Scenario[])(
  "lets every node lead across repeated %s elections",
  (scenario) => {
    let s = createSimulation(scenario);
    const leaders = [currentLeader(s)];
    for (let round = 0; round < 5; round++) {
      const previousTerm = s.nodes[currentLeader(s)!].term;
      s = transition(s, { type: "crash" });
      s = transition(s, { type: "advance", to: s.now + 20000 });
      const leader = currentLeader(s)!;
      expect(leader).toBeTruthy();
      expect(s.nodes[leader].votes.length).toBeGreaterThanOrEqual(3);
      expect(s.nodes[leader].term).toBe(
        previousTerm + (scenario === "split" ? 2 : 1),
      );
      expect(s.splitSeen).toBe(scenario === "split");
      leaders.push(leader);
    }
    expect(leaders).toEqual(["B", "A", "C", "D", "E", "B"]);
  },
);

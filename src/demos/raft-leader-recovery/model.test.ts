import { describe, expect, it } from "vitest";
import {
  beats,
  duration,
  getRecoveryLesson,
  logIsCurrent,
  messages,
  nodeTimer,
  recoveryState,
  recoveryTime as time,
  requestVote,
} from "./model";
import { recoveryLayout } from "./layout";

const timerAt = (server: "B" | "A" | "C", at: number) =>
  nodeTimer(
    recoveryState(time(at)).nodes.find((node) => node.id === server)!,
    time(at),
  );

describe("node clocks", () => {
  it.each([false, true])(
    "does not expire C before either heartbeat arrives (compact: %s)",
    (compact) => {
      const lesson = getRecoveryLesson(compact);
      const arrivals = lesson.messages.filter(
        (m) => m.from === "B" && m.to === "C",
      );
      for (const message of arrivals) {
        const at = message.end - 1;
        const c = recoveryState(at, compact).nodes[2];
        expect(c.role).toBe("Follower");
        expect(nodeTimer(c, at, compact).interval).toBeCloseTo(6000);
        expect(nodeTimer(c, at, compact).progress).toBeLessThan(1);
      }
      const deadline = arrivals.at(-1)!.end + 6000;
      expect(lesson.time(8000)).toBeCloseTo(deadline);
      expect(recoveryState(deadline - 1, compact).nodes[2].role).toBe(
        "Follower",
      );
      expect(recoveryState(deadline, compact).nodes[2].role).toBe("Candidate");
    },
  );
  it("keeps paced heartbeat sends and arrivals aligned with timers", () => {
    for (const message of messages.filter((message) => message.from === "B")) {
      expect(
        nodeTimer(recoveryState(message.start).nodes[0], message.start).elapsed,
      ).toBe(0);
      const follower = recoveryState(message.end).nodes.find(
        (node) => node.id === message.to,
      )!;
      expect(nodeTimer(follower, message.end).elapsed).toBe(0);
    }
  });
  it("stops offline clocks and resets on restart and received entries", () => {
    expect(timerAt("B", 3900).kind).toBe("heartbeat");
    expect(timerAt("B", 4000)).toMatchObject({ kind: "offline", progress: 0 });
    expect(timerAt("B", 31999).interval).toBe(0);
    expect(timerAt("B", 32000)).toMatchObject({ kind: "election", elapsed: 0 });
    expect(timerAt("B", 33000).elapsed).toBe(0);
  });
  it("makes C expire first and does not reset A on a refused vote", () => {
    expect(timerAt("C", 7999).progress).toBeGreaterThan(0.99);
    expect(timerAt("C", 8000).elapsed).toBe(0);
    expect(timerAt("A", 7999).progress).toBeLessThan(1);
    expect(timerAt("A", 9200).elapsed).toBe(
      time(9200) -
        messages.filter((m) => m.from === "B" && m.to === "A").at(-1)!.end,
    );
    expect(timerAt("A", 15999).progress).toBeGreaterThan(0.99);
    expect(timerAt("A", 16000).elapsed).toBe(0);
    expect(timerAt("A", 18000)).toMatchObject({
      kind: "heartbeat",
      elapsed: 0,
    });
  });
  it("resets on votes and leader messages, not acknowledgement replies", () => {
    for (const at of [17000, 19000, 21000, 23000, 29000, 31000])
      expect(timerAt("C", at).elapsed).toBe(0);
    expect(timerAt("C", 25000).elapsed).toBeGreaterThan(0);
    for (let at = 0; at <= duration; at += 100)
      for (const node of recoveryState(at).nodes) {
        const timer = nodeTimer(node, at);
        expect(timer.progress).toBeGreaterThanOrEqual(0);
        expect(timer.progress).toBeLessThanOrEqual(1);
      }
  });
});

describe("voting restrictions", () => {
  it("retains B's self-vote across a crash and rejects a second candidate in term 5", () => {
    const [b, a] = recoveryState(time(0)).nodes;
    expect(b.vote).toBe("B");
    expect(a.vote).toBe("B");
    expect(requestVote(b, a)).toBe(false);
    expect(requestVote(b, b)).toBe(true);
    expect(recoveryState(time(31999)).nodes[0].vote).toBe("B");
    const restarted = recoveryState(time(32000)).nodes[0];
    expect(restarted.vote).toBe("B");
    expect(requestVote(restarted, a)).toBe(false);
    expect(recoveryState(time(33000)).nodes[0].vote).toBeNull();
  });
  it("compares last entry term before length", () => {
    expect(logIsCurrent({ term: 7, index: 2 }, { term: 5, index: 4 })).toBe(
      true,
    );
    expect(logIsCurrent({ term: 5, index: 9 }, { term: 7, index: 2 })).toBe(
      false,
    );
    expect(logIsCurrent({ term: 5, index: 3 }, { term: 5, index: 4 })).toBe(
      false,
    );
    expect(logIsCurrent({ term: 5, index: 4 }, { term: 5, index: 4 })).toBe(
      true,
    );
  });
  it("rejects a stale candidate despite its newer election term", () => {
    const [, a, c] = recoveryState(time(8000)).nodes;
    expect(requestVote(a, c)).toBe(false);
    expect(a.term).toBe(6);
    expect(a.vote).toBeNull();
    expect(recoveryState(time(12000)).votes).toBe("C: 1 vote · needs 2");
  });
  it("allows only one candidate per term, retains the vote on retry, and resets it in a later term", () => {
    const [b, a, c] = recoveryState(time(0)).nodes;
    a.term = 6;
    expect(requestVote(c, a)).toBe(true);
    expect(requestVote(c, a)).toBe(true);
    b.term = 6;
    expect(requestVote(c, b)).toBe(false);
    b.term = 7;
    expect(requestVote(c, b)).toBe(true);
    a.term = 6;
    expect(requestVote(c, a)).toBe(false);
    c.offline = true;
    expect(requestVote(c, b)).toBe(false);
  });
});

it("counts C's vote only when its reply arrives", () => {
  const [, a, c] = recoveryState(time(17000)).nodes;
  expect(c.vote).toBe("A");
  expect(a.role).toBe("Candidate");
  expect(recoveryState(time(17999)).votes).toBe("A: 1 vote · needs 2");
  expect(recoveryState(time(18000)).nodes[1].role).toBe("Leader");
});
it("separates delivery, persistence, acknowledgement, and local commitment", () => {
  expect(recoveryState(time(21000)).nodes[2]).toMatchObject({
    stored: 3,
    commit: 3,
    writing: true,
  });
  expect(recoveryState(time(21600)).nodes[2]).toMatchObject({
    stored: 5,
    commit: 4,
    writing: false,
  });
  expect(recoveryState(time(24999)).nodes[1].commit).toBe(4);
  expect(recoveryState(time(25000)).nodes[1].commit).toBe(5);
  expect(recoveryState(time(28999)).nodes[2].commit).toBe(4);
  expect(recoveryState(time(29000)).nodes[2].commit).toBe(5);
});
it("retains the offline log and durable term, then re-establishes commitment after restart", () => {
  expect(recoveryState(time(31999)).nodes[0]).toMatchObject({
    offline: true,
    term: 5,
    stored: 4,
    commit: 4,
  });
  expect(recoveryState(time(32000)).nodes[0]).toMatchObject({
    offline: false,
    role: "Follower",
    term: 5,
    stored: 4,
    commit: 0,
  });
  expect(recoveryState(time(33000)).nodes[0]).toMatchObject({
    term: 7,
    stored: 4,
    commit: 0,
    writing: true,
  });
  for (const node of recoveryState(duration).nodes)
    expect(node).toMatchObject({
      term: 7,
      stored: 5,
      commit: 5,
      offline: false,
      writing: false,
    });
});
it("keeps commitment within the stored log and every settled beat inspectable", () => {
  for (let at = 0; at <= duration; at += 100)
    for (const node of recoveryState(at).nodes)
      expect(node.commit).toBeLessThanOrEqual(node.stored);
  beats.forEach((beat, index) =>
    expect(recoveryState(beat.settledAt).step).toBe(index),
  );
});
it.each([true, false])(
  "keeps rows and connector endpoints inside the %s layout",
  (compact) => {
    const layout = recoveryLayout(compact);
    for (const row of Object.values(layout.rows)) {
      expect(row.x + row.width).toBeLessThanOrEqual(layout.width);
      expect(row.y + row.height).toBeLessThanOrEqual(layout.height);
    }
    const route = layout.route({
      from: "A",
      to: "B",
      start: 0,
      end: 1,
      label: "",
      short: "",
      payload: [],
    });
    expect(layout.pointOnRoute(route, 0)).toEqual(layout.port("A"));
    expect(layout.pointOnRoute(route, 1)).toEqual(layout.port("B"));
  },
);

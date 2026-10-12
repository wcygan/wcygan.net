import { expect, it } from "vitest";
import {
  beats,
  cycleDuration,
  messages,
  messageProgress,
  replicationState,
  replicationTime as time,
  servers,
  storageDuration,
} from "./model";
import { messageRoute, replicationLayout } from "./layout";
import { pointOnRoute } from "../raft-election-overview/layout";

const node = (time: number, server: string) =>
  replicationState(time).nodes.find((node) => node.server === server)!;

it("persists contiguous entries before sending acknowledgments", () => {
  for (const message of messages) {
    if (message.kind === "ack") {
      expect(node(message.start, message.from).stored).toBe(
        message.storedThrough,
      );
      expect(
        replicationState(message.start).confirmed[message.from],
      ).toBeLessThan(message.storedThrough);
    }
    if (message.kind === "entry") {
      expect(node(message.start, message.to).stored).toBe(
        message.firstIndex - 1,
      );
      expect(node(message.start, "B").stored).toBeGreaterThanOrEqual(
        message.lastIndex,
      );
      expect(node(message.end, message.to).writing).toEqual({
        firstIndex: message.firstIndex,
        lastIndex: message.lastIndex,
      });
      expect(node(message.end + storageDuration - 1, message.to).stored).toBe(
        message.firstIndex - 1,
      );
      expect(node(message.end + storageDuration, message.to).stored).toBe(
        message.lastIndex,
      );
      expect(
        node(message.end + storageDuration, message.to).writing,
      ).toBeNull();
    }
  }
});

it("lets B and A commit two commands while C remains empty", () => {
  for (const index of [1, 2]) {
    const acknowledgment = messages.find(
      (message) =>
        message.kind === "ack" &&
        message.from === "A" &&
        message.storedThrough === index,
    )!;
    expect(replicationState(acknowledgment.end - 1).copies).toBe(1);
    expect(replicationState(acknowledgment.end).copies).toBe(2);
    expect(node(acknowledgment.end, "B").committed).toBe(index);
    expect(node(acknowledgment.end, "A").committed).toBe(index - 1);
    expect(node(acknowledgment.end, "C").stored).toBe(0);
    expect(replicationState(acknowledgment.end).confirmed).toEqual({
      A: index,
      C: 0,
    });
  }
  expect(node(time(22000), "A").committed).toBe(2);
  expect(node(time(22000), "C").committed).toBe(0);
});

it("catches C up in one batch and counts its storage only on acknowledgment arrival", () => {
  const batch = messages.find(
    (message) => message.kind === "entry" && message.to === "C",
  )!;
  expect(batch).toMatchObject({ firstIndex: 1, lastIndex: 2, leaderCommit: 2 });
  const persistedAt = batch.end + storageDuration;
  expect(node(persistedAt - 1, "C").stored).toBe(0);
  expect(node(persistedAt, "C")).toMatchObject({ stored: 2, committed: 2 });
  expect(replicationState(persistedAt).confirmed.C).toBe(0);
  const reply = messages.find(
    (message) => message.kind === "ack" && message.from === "C",
  )!;
  expect(replicationState(reply.end - 1).copies).toBe(2);
  expect(replicationState(reply.end).copies).toBe(3);
  expect(replicationState(reply.end).confirmed.C).toBe(2);
});

it("captures commit indices at send time and applies heartbeats only on delivery", () => {
  for (const message of messages) {
    if (message.kind === "entry" || message.kind === "commit") {
      expect(message.leaderCommit).toBe(node(message.start, "B").committed);
    }
    if (message.kind === "commit") {
      expect(node(message.end - 1, message.to).committed).toBe(
        message.leaderCommit - 1,
      );
      expect(node(message.end, message.to).committed).toBe(
        message.leaderCommit,
      );
    }
  }
  expect(node(time(40600), "A").committed).toBe(3);
  expect(node(time(40600), "C").committed).toBe(2);
});

it("preserves independent prefixes, safe commit indices, and a three-second final hold", () => {
  expect(replicationState(0).confirmed).toEqual({ A: 0, C: 0 });
  for (const initial of replicationState(0).nodes)
    expect(initial).toMatchObject({ stored: 0, committed: 0, term: 5 });
  for (let time = 100; time < cycleDuration; time += 100) {
    const state = replicationState(time);
    const expectedCopies =
      Number(node(time, "B").stored >= state.entry.index) +
      Number(state.confirmed.A >= state.entry.index) +
      Number(state.confirmed.C >= state.entry.index);
    expect(state.copies).toBe(expectedCopies);
    for (const server of servers) {
      const current = node(time, server);
      const previous = node(time - 100, server);
      expect(current.stored).toBeGreaterThanOrEqual(previous.stored);
      expect(current.committed).toBeGreaterThanOrEqual(previous.committed);
      expect(current.committed).toBeLessThanOrEqual(current.stored);
      expect(current.term).toBe(5);
    }
  }
  expect(cycleDuration - beats.at(-1)!.start).toBe(3000);
  for (const server of servers)
    expect(node(cycleDuration - 1, server)).toMatchObject({
      stored: 3,
      committed: 3,
    });
});

it.each([false, true])(
  "aligns equal cards and reverse routes (compact=%s)",
  (compact) => {
    const layout = replicationLayout(compact);
    expect(
      new Set(servers.map((server) => layout.nodes[server].width)).size,
    ).toBe(1);
    expect(
      new Set(servers.map((server) => layout.nodes[server].height)).size,
    ).toBe(1);
    // The widest payload fits the bus gutter without clipping the SVG edge.
    const halfPayload = compact ? 28 : 64;
    expect(layout.trunk - halfPayload).toBeGreaterThanOrEqual(0);
    expect(layout.trunk + halfPayload).toBeLessThan(layout.nodes.B.x);
    for (const message of messages) {
      const route = messageRoute(layout, message);
      expect(route.at(-1)).toEqual(layout.port(message.to));
      if (message.from !== "client")
        expect(route[0]).toEqual(layout.port(message.from));
    }
    for (const follower of ["A", "C"] as const) {
      const outgoing = messages.find(
        (message) => message.kind === "entry" && message.to === follower,
      )!;
      const reply = messages.find(
        (message) => message.kind === "ack" && message.from === follower,
      )!;
      expect(messageRoute(layout, reply)).toEqual(
        messageRoute(layout, outgoing).reverse(),
      );
    }
    for (let time = 0; time < cycleDuration; time += 20) {
      const flights = messages.filter(
        (message) =>
          message.kind === "entry" &&
          time > message.start &&
          time < message.end,
      );
      if (flights.length !== 2) continue;
      const [a, b] = flights.map((message) =>
        pointOnRoute(
          messageRoute(layout, message),
          messageProgress(message, time),
        ),
      );
      const overlapping =
        Math.abs(a[0] - b[0]) < (compact ? 56 : 80) &&
        Math.abs(a[1] - b[1]) < 44;
      expect(overlapping).toBe(false);
    }
  },
);

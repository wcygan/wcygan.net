import { expect, it } from "vitest";
import {
  appendEntries,
  conflictLesson,
  conflictState,
  leaderLog,
  returningLog,
} from "./model";
import { payloadUnitsPerSecond, routeLength } from "../raft-transport";
import { pointOnRoute } from "../raft-election-overview/layout";

it("refuses a missing or mismatched preceding entry without changing the log or commitment", () => {
  for (const previous of [
    { index: 4, term: 7 },
    { index: 6, term: 5 },
  ]) {
    expect(appendEntries(returningLog, 3, previous, [], 4)).toEqual({
      accepted: false,
      log: returningLog,
      commit: 3,
    });
  }
});
it("keeps extra entries when a matching heartbeat or matching entry does not introduce a conflict", () => {
  expect(
    appendEntries(returningLog, 3, { index: 3, term: 5 }, [], 3).log,
  ).toEqual(returningLog);
  expect(
    appendEntries(
      returningLog,
      3,
      { index: 3, term: 5 },
      returningLog.slice(3, 4),
      3,
    ).log,
  ).toEqual(returningLog);
});
it("replaces the first conflict and discards every following entry, preserving the committed prefix", () => {
  const result = appendEntries(
    returningLog,
    3,
    { index: 3, term: 5 },
    leaderLog.slice(3),
    99,
  );
  expect(result).toEqual({ accepted: true, log: leaderLog, commit: 4 });
  expect(result.log.slice(0, 3)).toEqual(returningLog.slice(0, 3));
  expect(returningLog).toHaveLength(5);
});
it("rejects an impossible attempt to overwrite a committed entry", () => {
  expect(() =>
    appendEntries(
      returningLog,
      4,
      { index: 3, term: 5 },
      leaderLog.slice(3),
      4,
    ),
  ).toThrow("Committed entries cannot be replaced");
});

it.each([false, true])(
  "separates deletion, reading hold, movement, and durability (compact=%s)",
  (compact) => {
    const lesson = conflictLesson(compact);
    expect(lesson.deletedAt - lesson.deletingAt).toBeCloseTo(1600);
    expect(lesson.replacementAt - lesson.deletedAt).toBeCloseTo(1200);
    expect(lesson.persistedAt - lesson.replacementArrivedAt).toBeCloseTo(800);
    const halfwayDeletion = conflictState(
      (lesson.deletingAt + lesson.deletedAt) / 2,
      compact,
    );
    expect(halfwayDeletion.deletionProgress).toBeCloseTo(0.5);
    expect(halfwayDeletion.nodes[0].log).toEqual(returningLog.slice(0, 3));
    const halfwayCopy = conflictState(
      (lesson.replacementAt + lesson.replacementArrivedAt) / 2,
      compact,
    );
    expect(halfwayCopy.replacementProgress).toBeCloseTo(0.5);
    expect(halfwayCopy.repaired).toBe(false);
    expect(
      routeLength(lesson.replacementRoute) /
        ((lesson.replacementArrivedAt - lesson.replacementAt) / 1000),
    ).toBeCloseTo(payloadUnitsPerSecond);
    expect(conflictState(lesson.replacementArrivedAt, compact).repaired).toBe(
      false,
    );
    expect(conflictState(lesson.persistedAt, compact).repaired).toBe(true);
    const width = lesson.replacementBounds.width;
    const [start, end] = lesson.replacementRoute;
    expect(lesson.replacementRoute).toHaveLength(2);
    expect(start[0]).toBe(end[0]);
    expect(start[1]).toBeGreaterThan(end[1]);
    expect(
      lesson.layout.nodes.A.y -
        lesson.layout.nodes.B.y -
        lesson.layout.nodes.B.height,
    ).toBe(20);
    const entryX = compact ? 12 + 64 : 16 + 72;
    for (let progress = 0; progress <= 1; progress += 0.01) {
      const [x, y] = pointOnRoute(lesson.replacementRoute, progress);
      for (const node of Object.values(lesson.layout.nodes)) {
        const prefixX = node.x + entryX;
        const prefixY = node.y + (compact ? 92 : 68);
        const overlapsPrefix =
          x - width / 2 < prefixX + width &&
          x + width / 2 > prefixX &&
          y - 48 < prefixY + 96 &&
          y + 48 > prefixY;
        expect(overlapsPrefix).toBe(false);
      }
    }
  },
);
it.each([false, true])(
  "keeps replies, persistence, checkpoints, and travel speed consistent (compact=%s)",
  (compact) => {
    const lesson = conflictLesson(compact);
    const b = (at: number) => conflictState(at, compact).nodes[0];
    expect(b(lesson.check.end).log).toEqual(returningLog);
    expect(conflictState(lesson.reject.end - 1, compact).nextIndex).toBe(5);
    expect(conflictState(lesson.reject.end, compact).nextIndex).toBe(4);
    expect(b(lesson.repair.end).log).toEqual(returningLog);
    expect(conflictState(lesson.repair.end, compact).writing).toBe(true);
    expect(b(lesson.deletingAt).log).toEqual(returningLog.slice(0, 3));
    expect(b(lesson.persistedAt - 1).log).toEqual(returningLog.slice(0, 3));
    expect(b(lesson.persistedAt - 1).commit).toBe(3);
    expect(b(lesson.persistedAt)).toMatchObject({ log: leaderLog, commit: 4 });
    expect(lesson.ack.start).toBeGreaterThan(lesson.persistedAt);
    expect(conflictState(lesson.ack.end - 1, compact).confirmed).toBe(0);
    expect(conflictState(lesson.ack.end, compact)).toMatchObject({
      confirmed: 4,
      nextIndex: 5,
    });
    for (const message of lesson.messages)
      expect(
        routeLength(lesson.route(message)) /
          ((message.end - message.start) / 1000),
      ).toBeCloseTo(payloadUnitsPerSecond, 8);
    lesson.beats.forEach((beat, index) =>
      expect(conflictState(beat.settledAt, compact).step).toBe(index),
    );
    for (const node of conflictState(lesson.duration, compact).nodes)
      expect(node).toMatchObject({ log: leaderLog, commit: 4 });
  },
);

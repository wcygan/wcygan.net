import { expect, it } from "vitest";
import { getRecoveryLesson } from "../raft-leader-recovery/model";
import { recoveryLayout } from "../raft-leader-recovery/layout";
import { conflictLesson } from "../raft-log-conflicts/model";
import { pointOnRoute } from "../raft-election-overview/layout";

it.each([false, true])(
  "keeps complete recovery and repair packets within the stage (compact=%s)",
  (compact) => {
    const recovery = getRecoveryLesson(compact);
    const recoveryGeometry = recoveryLayout(compact);
    const repair = conflictLesson(compact);
    for (const lesson of [
      { ...recovery, layout: recoveryGeometry, route: recoveryGeometry.route },
      repair,
    ]) {
      for (const message of lesson.messages) {
        const halfWidth = lesson.layout.payloadWidth / 2;
        const halfHeight =
          (message.payload.length === 2
            ? 48
            : message.payload.length * 18 + 10) / 2;
        for (let sample = 0; sample <= 100; sample++) {
          const [x, y] = pointOnRoute(lesson.route(message), sample / 100);
          expect(x - halfWidth).toBeGreaterThanOrEqual(0);
          expect(x + halfWidth).toBeLessThanOrEqual(lesson.layout.width);
          expect(y - halfHeight).toBeGreaterThanOrEqual(0);
          expect(y + halfHeight).toBeLessThanOrEqual(lesson.layout.height);
        }
      }
    }
  },
);

it("distinguishes RPC terms, previous-entry terms, and commit indices", () => {
  const recovery = getRecoveryLesson(false);
  expect(
    recovery.messages.find((message) => message.short === "4–5")?.payload,
  ).toEqual(["Entries #4–5", "Term: 7", "Commit: 4"]);
  expect(
    recovery.messages.find((message) => message.short === "Vote?")?.payload,
  ).toEqual(["Request vote", "Term: 6", "Last: #3/T5"]);
  const repair = conflictLesson(false);
  expect(
    repair.messages.find((message) => message.kind === "repair")?.payload,
  ).toEqual(["Entry #4", "Term: 7", "Prev: #3/T5", "Commit: 4"]);
  expect(
    repair.messages.find((message) => message.kind === "ack")?.payload,
  ).toEqual(["Ack", "Stored #4", "Term: 7"]);
});

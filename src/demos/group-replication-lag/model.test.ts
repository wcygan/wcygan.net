import { expect, it } from "vitest";
import {
  appendTransaction,
  canWrite,
  majoritySnapshot,
  WRITE_COOLDOWN,
  type Transaction,
} from "./model";

it("certifies before commit and serializes the healthy replica under concurrent writes", () => {
  let writes: readonly Transaction[] = [];
  for (let i = 0; i < 6; i++)
    writes = appendTransaction(writes, i * WRITE_COOLDOWN);
  expect(writes[5].submittedAt).toBeLessThan(writes[0].committedAt);
  for (const [index, write] of writes.entries()) {
    expect(write.orderedAt).toBeLessThan(write.committedAt);
    expect(write.receivedAt).toBeGreaterThanOrEqual(write.orderedAt);
    if (index)
      expect(write.fastApplyAt).toBeGreaterThanOrEqual(
        writes[index - 1].fastAppliedAt,
      );
  }
  expect(
    majoritySnapshot(writes, 100_000).members.map((m) => m.applied),
  ).toEqual([6, 6]);
});
it("bounds writes and enforces the half-second interaction cooldown", () => {
  let writes = appendTransaction([], 0);
  expect(canWrite(writes, WRITE_COOLDOWN - 1)).toBe(false);
  expect(appendTransaction(writes, WRITE_COOLDOWN - 1)).toBe(writes);
  expect(canWrite(writes, WRITE_COOLDOWN)).toBe(true);
  for (let i = 1; i < 6; i++)
    writes = appendTransaction(writes, i * WRITE_COOLDOWN);
  expect(appendTransaction(writes, 100_000)).toBe(writes);
});

it("caches before certification and moves into the committed log only afterward", () => {
  const writes = appendTransaction([], 0);
  const dispatched = majoritySnapshot(writes, 200);
  expect(dispatched.cached).toBe(1);
  expect(dispatched.ordered).toBe(0);
  expect(dispatched.committed).toBe(0);
  expect(dispatched.flights.some((f) => f.kind === "committing")).toBe(false);
  const certified = majoritySnapshot(writes, 700);
  expect(certified.flights.find((f) => f.kind === "committing")?.startsAt).toBe(
    700,
  );
  expect(certified.members[0].received).toBe(0);
  const committed = majoritySnapshot(writes, 900);
  expect(committed.members[0].received).toBe(1);
  expect(committed.cached).toBe(1);
});

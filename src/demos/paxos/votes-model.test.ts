import { expect, it } from "vitest";
import { votesSnapshot } from "./votes-model";
it("chooses when the third acceptor accepts, before its reply arrives", () => {
  expect(votesSnapshot(5).chosen).toBe(false);
  expect(votesSnapshot(6)).toMatchObject({
    accepted: 3,
    replies: 2,
    chosen: true,
    known: false,
  });
  expect(votesSnapshot(7)).toMatchObject({
    accepted: 3,
    replies: 3,
    chosen: true,
    known: true,
  });
});
it("replies never precede durable acceptance", () => {
  for (let step = 0; step <= 7; step++)
    expect(votesSnapshot(step).replies).toBeLessThanOrEqual(
      votesSnapshot(step).accepted,
    );
});

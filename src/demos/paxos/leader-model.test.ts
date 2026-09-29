import { expect, it } from "vitest";
import { leaderSnapshot } from "./leader-model";
it("preserves the chosen value and durable acceptances when the leader disappears", () => {
  expect(leaderSnapshot(0).chosen).toBeNull();
  for (const step of [1, 2, 3, 4, 5])
    expect(leaderSnapshot(step).chosen).toBe("P");
  expect(leaderSnapshot(2).leader).toBe("absent");
  expect(leaderSnapshot(2).voters.map((v) => v.accepted)).toEqual(
    leaderSnapshot(1).voters.map((v) => v.accepted),
  );
});
it("recovers through C in the new majority and carries P forward", () => {
  const recovery = leaderSnapshot(3);
  expect(recovery.leaderValue).toBeNull();
  expect(recovery.consulted).toEqual(["C", "D", "E"]);
  expect(
    recovery.voters
      .filter((v) => recovery.consulted.includes(v.name) && v.accepted)
      .map((v) => v.name),
  ).toEqual(["C"]);
  expect(leaderSnapshot(4).leaderValue).toBe("P");
  const final = leaderSnapshot(5);
  expect(final.leaderValue).toBe("P");
  expect(final.voters.every((v) => v.accepted === "P")).toBe(true);
});

it("keeps leadership within the five servers", () => {
  for (let step = 0; step < 6; step++) {
    const state = leaderSnapshot(step);
    expect(state.voters).toHaveLength(5);
    if (state.leaderId)
      expect(
        state.voters.some((v) => v.name === state.leaderId && v.online),
      ).toBe(true);
  }
  expect(leaderSnapshot(3).leaderId).toBe("D");
  expect(leaderSnapshot(3).voters[0].online).toBe(false);
});

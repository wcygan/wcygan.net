import { expect, it } from "vitest";
import { flightsFor, transportState } from "./transport";
const node = (frame: number, time: number, id: string) =>
  transportState(frame, time).nodes.find((n) => n.id === id)!;
const arrival = (frame: number, index: number) => flightsFor(frame)[index].end;

it("records a vote on request arrival and elects only on reply arrival", () => {
  expect(node(2, arrival(2, 0) - 1, "B").vote).toBeUndefined();
  expect(node(2, arrival(2, 0), "B").vote).toBe("A");
  expect(node(2, arrival(2, 1) - 1, "A").role).toBe("candidate");
  expect(node(2, arrival(2, 1) - 1, "A").log).toHaveLength(2);
  expect(node(2, arrival(2, 1), "A").role).toBe("leader");
  expect(node(2, arrival(2, 1), "A").log.map((entry) => entry.term)).toEqual([
    1, 2, 4,
  ]);
});
it("stores inherited copies on delivery without committing them", () => {
  expect(node(2, arrival(2, 2) - 1, "B").log).toHaveLength(1);
  expect(node(2, arrival(2, 2), "B").log[1].term).toBe(2);
  expect(transportState(2, arrival(2, 3)).committedThrough).toBe(1);
  expect(flightsFor(2)[3].label).toBe("Durably stored · entry 2");
});
it("commits current-term entries only after the durable acknowledgement", () => {
  expect(node(7, arrival(7, 0) - 1, "B").log).toHaveLength(2);
  expect(node(7, arrival(7, 0), "B").log[2].term).toBe(4);
  expect(transportState(7, arrival(7, 1) - 1).committedThrough).toBe(1);
  expect(transportState(7, arrival(7, 1)).committedThrough).toBe(3);
  expect(flightsFor(7)[1].label).toBe("Durably stored · entry 3");
});
it("delivers a denial without electing the stale candidate", () => {
  expect(node(8, arrival(8, 0), "B").vote).toBe("refused");
  expect(
    transportState(8, flightsFor(8)[1].start + 100).activeFlight?.granted,
  ).toBe(false);
  expect(node(8, arrival(8, 1), "C").role).toBe("candidate");
});
it("repairs the conflicting entry on delivery and preserves the committed prefix", () => {
  expect(node(5, arrival(5, 0) - 1, "B").log[1].term).toBe(2);
  expect(node(5, arrival(5, 0), "B").log[1].term).toBe(3);
  expect(transportState(5, arrival(5, 1)).committedThrough).toBe(1);
  expect(node(5, arrival(5, 2) - 1, "A").log[2].term).toBe(4);
  expect(node(5, arrival(5, 2), "A").log.map((entry) => entry.term)).toEqual([
    1, 3,
  ]);
  expect(transportState(5, arrival(5, 3)).committedThrough).toBe(1);
});

it("shows B’s comparison before recording the grant or denial on arrival", () => {
  for (const frame of [4, 8]) {
    const before = transportState(frame, arrival(frame, 0) - 1);
    expect(before.voteComparison?.delivered).toBe(false);
    expect(node(frame, arrival(frame, 0) - 1, "B").vote).toBeUndefined();
    const after = transportState(frame, arrival(frame, 0));
    expect(after.voteComparison).toEqual({
      voterTerm: frame === 4 ? 2 : 4,
      candidateTerm: 3,
      delivered: true,
      granted: frame === 4,
    });
    expect(node(frame, arrival(frame, 0), "B").vote).toBe(
      frame === 4 ? "C" : "refused",
    );
  }
});

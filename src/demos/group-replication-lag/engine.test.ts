import { expect, it } from "vitest";
import {
  advanceSimulation as advance,
  configureSimulation as configure,
  createSimulation,
  EXPEL_TIME,
  DETECTION_TIME,
  nextEventAt,
  simulationSnapshot as snapshot,
  submitWrite as write,
  toggleLink,
  type Simulation,
} from "./engine";
import { WRITE_COOLDOWN } from "./model";

function burst() {
  let state = createSimulation();
  for (let i = 0; i < 6; i++) {
    state = advance(state, i * WRITE_COOLDOWN);
    state = write(state);
  }
  return state;
}
function finish(input: Simulation) {
  let state = input;
  let count = 0;
  while (Number.isFinite(nextEventAt(state))) {
    state = advance(state, nextEventAt(state));
    expect(++count).toBeLessThan(200);
    expect(state.applied).toBeLessThanOrEqual(state.received);
    expect(state.received).toBeLessThanOrEqual(snapshot(state).committed);
    expect(new Set(state.attempts.map((a) => a.transaction)).size).toBe(
      state.attempts.length,
    );
  }
  return state;
}
it("preserves healthy default timing, ordered receipt, and serial application", () => {
  const state = advance(burst(), 2000);
  expect(snapshot(state).members.map((m) => m.received)).toEqual([6, 6, 6]);
  expect(state.applied).toBe(0);
  const complete = finish(state);
  expect(complete.now).toBe(18900);
  expect(snapshot(complete).members.map((m) => m.applied)).toEqual([6, 6, 6]);
});
it.each([0, 100, 200, 500, 899])(
  "cancels undelivered copies at time %s and recovers them from cache",
  (time) => {
    let state = advance(write(createSimulation()), time);
    const original = state.transactions;
    state = toggleLink(state);
    expect(state.attempts).toEqual([]);
    state = advance(state, time + 1000);
    expect(state.received).toBe(0);
    expect(snapshot(state).members[0].applied).toBe(1);
    state = toggleLink(state);
    expect(state.source).toBe("cache");
    expect(state.attempts[0].source).toBe("cache");
    const complete = finish(state);
    expect(complete.received).toBe(1);
    expect(complete.applied).toBe(1);
    expect(complete.transactions).toEqual(original);
  },
);
it("does not cancel receipt completed at the interruption timestamp", () => {
  let state = advance(write(createSimulation()), 900);
  state = toggleLink(state);
  expect(state.received).toBe(1);
  state = advance(state, 3900);
  expect(state.applied).toBe(1);
  expect(state.interruptedAt).toBe(900);
});
it("blocks future writes and still expels with no moving packets", () => {
  let state = toggleLink(createSimulation());
  for (let i = 0; i < 6; i++) state = write(advance(state, i * WRITE_COOLDOWN));
  state = advance(state, DETECTION_TIME);
  expect(state.membership).toBe("suspected");
  state = advance(state, EXPEL_TIME);
  expect(state.membership).toBe("expelled");
  expect(state.received).toBe(0);
  expect(snapshot(state).members.map((m) => m.applied)).toEqual([6, 6, 0]);
  expect(Number.isFinite(nextEventAt(state))).toBe(false);
  state = toggleLink(state);
  expect(state.membership).toBe("rejoining");
  state = advance(state, state.rejoinAt!);
  expect(state.membership).toBe("recovering");
  expect(state.attempts.every((a) => a.source === "donor")).toBe(true);
  expect(finish(state).membership).toBe("online");
});
it("chooses cache before the expulsion boundary and donor at the boundary", () => {
  const interrupted = toggleLink(write(createSimulation()));
  const brief = toggleLink(advance(interrupted, EXPEL_TIME - 1));
  expect(brief.source).toBe("cache");
  const long = toggleLink(advance(interrupted, EXPEL_TIME));
  expect(long.source).toBe("donor");
});
it("preserves partial local application across expulsion and drains it before donor transfer", () => {
  let state = configure(write(createSimulation()), { processingTime: 5000 });
  state = toggleLink(advance(state, 1000));
  state = write(state);
  state = advance(state, 1000 + EXPEL_TIME);
  expect(state.applied).toBe(0);
  expect(state.suspendedProgress).toBeGreaterThan(0);
  const fraction = state.suspendedProgress;
  state = toggleLink(state);
  state = advance(state, state.rejoinAt!);
  expect(state.attempts).toEqual([]);
  expect(
    (state.now - state.application!.startsAt) /
      (state.application!.endsAt - state.application!.startsAt),
  ).toBeCloseTo(fraction);
  state = advance(state, state.application!.endsAt);
  expect(state.applied).toBe(1);
  expect(state.attempts[0].source).toBe("donor");
  expect(finish(state).applied).toBe(2);
});
it("restarts interrupted donor attempts without duplicating received entries, including new writes", () => {
  let state = toggleLink(write(createSimulation()));
  state = toggleLink(advance(state, EXPEL_TIME));
  state = advance(state, state.rejoinAt! + 100);
  state = write(state);
  const attempt = state.attempts[0].id;
  state = toggleLink(state);
  expect(state.attempts).toEqual([]);
  state = advance(state, state.now + 900);
  state = toggleLink(state);
  state = advance(state, state.rejoinAt!);
  expect(state.attempts[0].id).toBeGreaterThan(attempt);
  expect(state.attempts.every((a) => a.source === "donor")).toBe(true);
  const complete = finish(state);
  expect(complete.applied).toBe(2);
  expect(complete.membership).toBe("online");
});
it("preserves packet progress on latency changes and never reconnects on configuration", () => {
  let state = advance(burst(), 850);
  const before = state.attempts.map(
    (a) => (state.now - a.startsAt) / (a.endsAt - a.startsAt),
  );
  state = configure(state, { linkLatency: 2800, processingTime: 400 });
  state.attempts.forEach((a, i) => {
    expect((state.now - a.startsAt) / (a.endsAt - a.startsAt)).toBeCloseTo(
      before[i],
    );
  });
  state = toggleLink(state);
  state = configure(state, { linkLatency: 700 });
  expect(state.interruptedAt).not.toBeNull();
  expect(state.attempts).toEqual([]);
  state = toggleLink(state);
  expect(finish(state).applied).toBe(6);
});
it("reports unavailable snapshots instead of successful reads while disconnected or recovering", () => {
  let state = toggleLink(write(createSimulation()));
  expect(snapshot(state).reads[2].available).toBe(false);
  state = toggleLink(advance(state, EXPEL_TIME));
  expect(snapshot(state).reads[2].available).toBe(false);
  state = finish(state);
  expect(snapshot(state).reads[2].available).toBe(true);
});

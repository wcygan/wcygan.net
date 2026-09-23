import { describe, expect, it } from "vitest";
import { DEMOS } from "./model";
import type { DemoKind, TransactionFrame } from "./types";

const scenario = (kind: DemoKind, id: string) => {
  const found = DEMOS[kind].scenarios.find((item) => item.id === id);
  if (!found) throw new Error(`Missing ${kind}/${id}`);
  return found;
};
const last = (kind: DemoKind, id: string) => scenario(kind, id).frames.at(-1)!;
const balances = (frame: TransactionFrame) =>
  frame.accounts.map((a) => a.balance);
const total = (frame: TransactionFrame) =>
  frame.accounts.reduce((sum, a) => sum + a.balance, 0);
const copies = (
  frame: TransactionFrame,
  group: "a" | "b",
  record: string,
  onlineOnly = false,
) =>
  frame.replicas.filter(
    (replica) =>
      replica.group === group &&
      replica.record === record &&
      (!onlineOnly || replica.online),
  );

it("keeps teaching traces immutable across playback and replay", () => {
  const first = scenario("two-phase", "commit").frames[0];
  const prepared = scenario("two-phase", "commit").frames[2];
  expect(Object.isFrozen(first.accounts[0].records)).toBe(true);
  expect(() => first.accounts[0].records.push("COMMIT")).toThrow();
  expect(() => {
    first.accounts[0].balance = 0;
  }).toThrow();
  expect(balances(first)).toEqual([100, 100]);
  expect(first.accounts[0].records).toEqual([]);
  expect(prepared.accounts[0].records).toEqual(["PREPARE"]);
  expect(prepared.accounts[0]).not.toBe(first.accounts[0]);
});

it("exhibits the missing $10 only when local commits are independent", () => {
  const frames = scenario("independent", "partial-commit").frames;
  expect(frames[0].layout).toBe("together");
  expect(frames[1].layout).toBe("split");
  const done = frames.at(-1)!;
  expect(balances(done)).toEqual([90, 100]);
  expect(total(done)).toBe(190);
  expect(done.accounts.map((a) => a.state)).toEqual(["committed", "aborted"]);
  expect(done.accounts.every((a) => !a.locked && a.pending === 0)).toBe(true);
});

it("changes participant count with placement while preserving the completed transfer", () => {
  const together = scenario("placement", "together").frames;
  const separate = scenario("placement", "separate").frames;
  expect(
    together.every(
      (frame) => frame.layout === "together" && !frame.coordinator.visible,
    ),
  ).toBe(true);
  expect(
    separate.every(
      (frame) => frame.layout === "split" && frame.coordinator.visible,
    ),
  ).toBe(true);
  expect(
    together.every(
      (frame) => frame.accounts[0].state === frame.accounts[1].state,
    ),
  ).toBe(true);
  expect(
    separate.some((frame) =>
      frame.accounts.every((a) => a.state === "prepared"),
    ),
  ).toBe(true);
  expect(balances(together.at(-1)!)).toEqual([90, 110]);
  expect(balances(separate.at(-1)!)).toEqual([90, 110]);
});

it("preserves Prepare, Yes, and Commit messages when placement requires two participants", () => {
  const separate = scenario("placement", "separate").frames;
  const coordinated = scenario("two-phase", "commit").frames;
  expect(separate.map((frame) => frame.messages)).toEqual(
    coordinated.map((frame) => frame.messages),
  );
  expect(
    separate.flatMap((frame) => frame.messages.map((m) => m.label)),
  ).toEqual(["Prepare", "Prepare", "Yes", "Yes", "Commit", "Commit"]);
});

for (const kind of [
  "placement",
  "two-phase",
  "three-phase",
  "spanner",
] as const) {
  describe(`${kind} atomic commit invariants`, () => {
    for (const trace of DEMOS[kind].scenarios) {
      it(`${trace.id}: never mixes committed and aborted participants`, () => {
        for (const frame of trace.frames) {
          const states = frame.accounts.map((a) => a.state);
          expect(
            states.includes("committed") && states.includes("aborted"),
          ).toBe(false);
          for (const [index, a] of frame.accounts.entries()) {
            if (["prepared", "pre-commit"].includes(a.state)) {
              expect(a.locked).toBe(true);
              expect(a.pending).toBe(index === 0 ? -10 : 10);
              expect(a.balance).toBe(100);
              expect(a.records).toContain("PREPARE");
            }
            if (a.state === "committed" || a.state === "aborted") {
              expect(a.locked).toBe(false);
              expect(a.pending).toBe(0);
            }
          }
          if (
            states.every((state) => state === "committed") ||
            states.every((state) => state === "aborted")
          ) {
            expect(total(frame)).toBe(200);
          }
        }
      });

      it(`${trace.id}: never reverses a local outcome or deletes a durable record`, () => {
        for (let i = 1; i < trace.frames.length; i++) {
          const previous = trace.frames[i - 1];
          const frame = trace.frames[i];
          for (const [index, a] of previous.accounts.entries()) {
            if (a.state === "committed" || a.state === "aborted") {
              expect(frame.accounts[index].state).toBe(a.state);
              expect(frame.accounts[index].balance).toBe(a.balance);
            }
            expect(frame.accounts[index].records).toEqual(
              expect.arrayContaining(a.records),
            );
          }
        }
      });
    }
  });
}

describe("two-phase commit", () => {
  it("records Prepare before voting Yes and the decision before applying either write", () => {
    for (const id of ["commit", "interrupted"]) {
      const frames = scenario("two-phase", id).frames;
      const votesAt = frames.findIndex((frame) =>
        frame.messages.some((m) => m.label === "Yes"),
      );
      expect(
        frames[votesAt - 1].accounts.every(
          (a) => a.state === "prepared" && a.records.includes("PREPARE"),
        ),
      ).toBe(true);
      const decisionAt = frames.findIndex(
        (frame) => frame.coordinator.record === "COMMIT",
      );
      const firstApplyAt = frames.findIndex((frame) =>
        frame.accounts.some((a) => a.state === "committed"),
      );
      expect(decisionAt).toBeGreaterThan(votesAt);
      expect(firstApplyAt).toBeGreaterThan(decisionAt);
      expect(balances(frames[decisionAt])).toEqual([100, 100]);
      expect(balances(frames.at(-1)!)).toEqual([90, 110]);
    }
  });

  it("rejects B before it promises to commit and unwinds A's prepared debit", () => {
    const frames = scenario("two-phase", "abort").frames;
    expect(
      frames.every((frame) => !frame.accounts[1].records.includes("PREPARE")),
    ).toBe(true);
    expect(
      frames.some(
        (frame) =>
          frame.accounts[0].state === "prepared" &&
          frame.accounts[1].state === "aborted",
      ),
    ).toBe(true);
    expect(frames.every((frame) => frame.coordinator.record !== "COMMIT")).toBe(
      true,
    );
    expect(balances(frames.at(-1)!)).toEqual([100, 100]);
    expect(frames.at(-1)!.accounts.map((a) => a.state)).toEqual([
      "aborted",
      "aborted",
    ]);
  });

  it("requires recovery while B cannot contact either source of the decision", () => {
    const frames = scenario("two-phase", "interrupted").frames;
    const stoppedAt = frames.findIndex((frame) => frame.recoveryAction);
    const stopped = frames[stoppedAt];
    expect(stopped.recoveryAction).toBe("Recover coordinator");
    expect(stopped.coordinator).toMatchObject({
      online: false,
      record: "COMMIT",
    });
    expect(stopped.isolated).toBe(true);
    expect(stopped.accounts[0].state).toBe("committed");
    expect(stopped.accounts[1]).toMatchObject({
      balance: 100,
      pending: 10,
      locked: true,
      state: "prepared",
    });
    expect(stopped.messages).toEqual([]);
    expect(frames.filter((frame) => frame.recoveryAction)).toHaveLength(1);
    const recovered = frames[stoppedAt + 1];
    expect(recovered.coordinator).toMatchObject({
      online: true,
      record: "COMMIT",
    });
    expect(recovered.isolated).toBe(false);
    expect(recovered.accounts[1].state).toBe("prepared");
    expect(frames[stoppedAt + 2].messages).toEqual([
      { from: "coordinator", to: "b", label: "Commit" },
    ]);
    expect(balances(frames.at(-1)!)).toEqual([90, 110]);
  });
});

describe("three-phase commit", () => {
  it("acknowledges durable Pre-commit before failure and exchanges survivor state before recovery", () => {
    const trace = scenario("three-phase", "recovery");
    const frames = trace.frames;
    expect(trace.assumption).toMatch(/bounded.*connected.*fail-stop/);
    const ackAt = frames.findIndex((frame) =>
      frame.messages.some((m) => m.label === "Ack"),
    );
    expect(
      frames[ackAt - 1].accounts.every((a) => a.records.includes("PRE-COMMIT")),
    ).toBe(true);
    const stoppedAt = frames.findIndex((frame) => frame.recoveryAction);
    expect(stoppedAt).toBeGreaterThan(ackAt);
    expect(frames[stoppedAt].coordinator.online).toBe(false);
    expect(frames[stoppedAt].isolated).toBe(false);
    expect(
      frames[stoppedAt].accounts.every(
        (a) => a.state === "pre-commit" && a.locked,
      ),
    ).toBe(true);
    const exchange = frames[stoppedAt + 1];
    expect(exchange.messages).toEqual([
      { from: "a", to: "b", label: "State?" },
      { from: "b", to: "a", label: "Pre-commit", beat: 1 },
    ]);
    expect(exchange.accounts.every((a) => a.state === "pre-commit")).toBe(true);
    expect(frames.at(-1)!.coordinator.online).toBe(false);
    expect(balances(frames.at(-1)!)).toEqual([90, 110]);
  });

  it("stops unresolved when a partition invalidates reliable failure detection", () => {
    const done = last("three-phase", "partition");
    expect(done.isolated).toBe(true);
    expect(done.coordinator.online).toBe(false);
    expect(done.accounts.map((a) => a.state)).toEqual([
      "pre-commit",
      "prepared",
    ]);
    expect(done.accounts.every((a) => a.locked)).toBe(true);
    expect(done.recoveryAction).toBeUndefined();
    expect(done.messages).toEqual([]);
    expect(balances(done)).toEqual([100, 100]);
  });
});

describe("Spanner replicated participants", () => {
  it("requires a prepare quorum before B votes and a decision quorum before Commit crosses groups", () => {
    for (const trace of DEMOS.spanner.scenarios) {
      expect(
        trace.frames.every(
          (frame) =>
            frame.layout === "replicated" &&
            frame.replicas.length === 6 &&
            frame.coordinator.role === "a",
        ),
      ).toBe(true);
      const voteAt = trace.frames.findIndex((frame) =>
        frame.messages.some(
          (m) => m.from === "b" && m.to === "a" && m.label === "Prepared",
        ),
      );
      expect(
        copies(trace.frames[voteAt - 1], "b", "PREPARE", true),
      ).toHaveLength(2);
      const proposal = trace.frames.find(
        (frame) => copies(frame, "b", "PREPARE").length === 1,
      )!;
      expect(proposal.accounts[1].state).toBe("pending");
      expect(proposal.messages.some((m) => m.label === "Prepared")).toBe(false);
      const decisionAt = trace.frames.findIndex(
        (frame) => frame.coordinator.record === "COMMIT",
      );
      expect(decisionAt).toBeGreaterThan(voteAt);
      expect(
        copies(trace.frames[decisionAt], "a", "COMMIT", true),
      ).toHaveLength(2);
      // The coordinator group skips a separate prepare record in the paper's protocol.
      expect(
        trace.frames.every(
          (frame) => !frame.accounts[0].records.includes("PREPARE"),
        ),
      ).toBe(true);
      for (const frame of trace.frames) {
        if (
          frame.messages.some(
            (m) =>
              ["a", "a2"].includes(m.from) &&
              m.to === "b" &&
              m.label === "Commit",
          )
        ) {
          expect(
            copies(frame, "a", "COMMIT", true).length,
          ).toBeGreaterThanOrEqual(2);
        }
        if (frame.accounts[1].state === "committed") {
          expect(
            copies(frame, "b", "COMMIT", true).length,
          ).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it("recovers the same durable decision through surviving replicas without reviving the failed leader", () => {
    const frames = scenario("spanner", "leader-failure").frames;
    const stoppedAt = frames.findIndex((frame) => frame.recoveryAction);
    const stopped = frames[stoppedAt];
    expect(stopped.recoveryAction).toBe("Elect surviving leader");
    expect(
      stopped.replicas.find((replica) => replica.id === "a"),
    ).toMatchObject({ online: false, leader: false, record: "COMMIT" });
    expect(
      stopped.replicas.filter(
        (replica) => replica.group === "a" && replica.online,
      ),
    ).toHaveLength(2);
    const recovered = frames[stoppedAt + 1];
    expect(
      recovered.replicas.find((replica) => replica.id === "a2"),
    ).toMatchObject({ online: true, leader: true, record: "COMMIT" });
    expect(copies(recovered, "a", "COMMIT", true)).toHaveLength(2);
    expect(recovered.coordinator).toMatchObject({
      online: true,
      role: "a",
      record: "COMMIT",
    });
    const done = frames.at(-1)!;
    expect(done.replicas.find((replica) => replica.id === "a")!.online).toBe(
      false,
    );
    expect(balances(done)).toEqual([90, 110]);
    expect(done.accounts.every((a) => !a.locked)).toBe(true);
  });

  it("preserves the chosen decision but cannot recover with only one surviving replica", () => {
    const done = last("spanner", "quorum-loss");
    expect(copies(done, "a", "COMMIT")).toHaveLength(2);
    expect(copies(done, "a", "COMMIT", true)).toHaveLength(0);
    expect(
      done.replicas.filter(
        (replica) => replica.group === "a" && replica.online,
      ),
    ).toHaveLength(1);
    expect(done.recoveryAction).toBeUndefined();
    expect(done.accounts.every((a) => a.locked)).toBe(true);
    expect(done.accounts[1].state).toBe("prepared");
    expect(balances(done)).toEqual([100, 100]);
    expect(done.coordinator.record).toBe("COMMIT");
  });

  it("completes commit wait before applying the coordinator's writes", () => {
    for (const id of ["commit", "leader-failure"]) {
      const frames = scenario("spanner", id).frames;
      const waitAt = frames.findIndex(
        (frame) => frame.title === "Complete commit wait",
      );
      expect(waitAt).toBeGreaterThan(0);
      expect(frames[waitAt].wait).toBe(true);
      expect(frames[waitAt].accounts[0].state).toBe("pending");
      expect(
        frames.findIndex((frame) => frame.accounts[0].state === "committed"),
      ).toBeGreaterThan(waitAt);
    }
  });
});

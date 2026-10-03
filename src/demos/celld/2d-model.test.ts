import { describe, expect, it } from "vitest";
import {
  advanceRecovery,
  bucketAcknowledgementAllowed,
  cellEpochPrefix,
  claimOwnership,
  deriveDurabilityComparison,
  durabilityDecision,
  HOT_KEY_SCHEDULE,
  INDEPENDENT_KEY_SCHEDULE,
  INITIAL_OWNER,
  INITIAL_RECOVERY,
  RECOVERY_PHASES,
  recoverySnapshot,
  scheduleCellTurns,
  type DurabilityEvidence,
} from "./2d-model";

const unprovedWrite: DurabilityEvidence = {
  mode: "fleet",
  committed: true,
  bucketCovered: false,
  confirmedOwner: false,
  ensembleSize: 2,
  fsyncedFollowers: 0,
  sessionOpen: true,
};

describe("ownership fencing", () => {
  it.each([
    ["B", "C"],
    ["C", "B"],
  ])("admits only one contender when %s races %s", (first, second) => {
    const winner = claimOwnership(INITIAL_OWNER, INITIAL_OWNER.etag, first);
    const loser = claimOwnership(winner.record, INITIAL_OWNER.etag, second);
    expect(winner.accepted).toBe(true);
    expect(loser.accepted).toBe(false);
    expect(loser.record).toEqual({ node: first, epoch: 8, etag: "owner-v8" });
    expect(INITIAL_OWNER.epoch).toBe(7);
  });

  it("keeps a stale writer's prefix separate and blocks its acknowledgement", () => {
    const { record } = claimOwnership(INITIAL_OWNER, INITIAL_OWNER.etag, "B");
    expect(cellEpochPrefix(7)).not.toBe(cellEpochPrefix(record.epoch));
    expect(
      bucketAcknowledgementAllowed({
        owner: record,
        writer: "A",
        epoch: 7,
        covered: true,
      }),
    ).toBe(false);
    expect(
      bucketAcknowledgementAllowed({
        owner: record,
        writer: "B",
        epoch: 7,
        covered: true,
      }),
    ).toBe(false);
    expect(
      bucketAcknowledgementAllowed({
        owner: record,
        writer: "B",
        epoch: 8,
        covered: true,
      }),
    ).toBe(true);
    expect(
      bucketAcknowledgementAllowed({
        owner: record,
        writer: "B",
        epoch: 8,
        covered: false,
      }),
    ).toBe(false);
  });

  it("allows a later takeover only after rereading the winning version", () => {
    const first = claimOwnership(INITIAL_OWNER, INITIAL_OWNER.etag, "B");
    const staleAttempt = claimOwnership(first.record, INITIAL_OWNER.etag, "C");
    expect(staleAttempt.accepted).toBe(false);
    expect(staleAttempt.record).toBe(first.record);
    const refreshedAttempt = claimOwnership(
      first.record,
      first.record.etag,
      "C",
    );
    expect(refreshedAttempt.accepted).toBe(true);
    expect(refreshedAttempt.record).toMatchObject({ node: "C", epoch: 9 });
    expect(first.record).toMatchObject({ node: "B", epoch: 8 });
  });
});

describe("acknowledgement evidence", () => {
  it("keeps bucket coverage and follower persistence ahead of their acknowledgements", () => {
    const localOnly = deriveDurabilityComparison(0);
    expect(localOnly.single.acknowledge).toBe(false);
    expect(localOnly.fleet.acknowledge).toBe(false);

    const uploadComplete = deriveDurabilityComparison(1);
    expect(uploadComplete.single.bucketCovered).toBe(true);
    expect(uploadComplete.single.acknowledge).toBe(false);
    expect(uploadComplete.fleet.followerStored).toBe(false);
    expect(uploadComplete.fleet.acknowledge).toBe(false);

    const acknowledged = deriveDurabilityComparison(2);
    expect(acknowledged.single).toMatchObject({
      bucketCovered: true,
      acknowledge: true,
      proof: "bucket",
    });
    expect(acknowledged.fleet).toMatchObject({
      followerStored: true,
      bucketCovered: false,
      acknowledge: true,
      proof: "fleet",
    });

    const laterUpload = deriveDurabilityComparison(3);
    expect(laterUpload.fleet).toMatchObject({
      bucketCovered: true,
      acknowledge: true,
      proof: "fleet",
    });
  });

  it("requires every current follower, not only one of two", () => {
    expect(
      durabilityDecision({ ...unprovedWrite, fsyncedFollowers: 1 }).acknowledge,
    ).toBe(false);
    expect(
      durabilityDecision({ ...unprovedWrite, fsyncedFollowers: 2 }),
    ).toEqual({ acknowledge: true, proof: "fleet" });
  });

  it("does not mistake zero followers or a sealed log session for a fleet proof", () => {
    expect(
      durabilityDecision({ ...unprovedWrite, ensembleSize: 0 }).acknowledge,
    ).toBe(false);
    expect(
      durabilityDecision({
        ...unprovedWrite,
        fsyncedFollowers: 2,
        sessionOpen: false,
      }).acknowledge,
    ).toBe(false);
  });

  it("requires the current owner check after a bucket proof", () => {
    const stored = { ...unprovedWrite, ensembleSize: 0, bucketCovered: true };
    expect(durabilityDecision(stored).acknowledge).toBe(false);
    expect(durabilityDecision({ ...stored, confirmedOwner: true })).toEqual({
      acknowledge: true,
      proof: "bucket",
    });
  });

  it("honors forced bucket mode and rejects evidence before a local commit", () => {
    expect(
      durabilityDecision({
        ...unprovedWrite,
        mode: "bucket",
        fsyncedFollowers: 2,
      }).acknowledge,
    ).toBe(false);
    expect(
      durabilityDecision({
        ...unprovedWrite,
        committed: false,
        fsyncedFollowers: 2,
        bucketCovered: true,
        confirmedOwner: true,
      }).acknowledge,
    ).toBe(false);
  });
});

describe("takeover recovery gate", () => {
  it("does not claim or restore while a required follower tail is inconclusive", () => {
    let state = INITIAL_RECOVERY;
    state = advanceRecovery(state, "unreachable");
    state = advanceRecovery(state, "unreachable");
    for (let retry = 0; retry < 10; retry++)
      state = advanceRecovery(state, "unreachable");
    expect(state).toEqual({ phase: "log-fenced", blocked: true });
    expect(recoverySnapshot(state)).toMatchObject({
      logSealed: false,
      bucketComplete: false,
      ownershipAcquired: false,
      restored: false,
      serving: false,
    });

    state = advanceRecovery(state, "complete");
    expect(state).toEqual({ phase: "tail-recovered", blocked: false });
    expect(recoverySnapshot(state)).toMatchObject({
      logSealed: true,
      bucketComplete: true,
      ownershipAcquired: false,
    });
  });

  it("finishes recovery before claiming, restores before serving, and stops at the end", () => {
    let state = INITIAL_RECOVERY;
    const phases = [state.phase];
    for (let turn = 0; turn < 6; turn++) {
      state = advanceRecovery(state, "complete");
      phases.push(state.phase);
      const snapshot = recoverySnapshot(state);
      if (snapshot.ownershipAcquired) {
        expect(snapshot.logSealed).toBe(true);
        expect(snapshot.bucketComplete).toBe(true);
      }
      if (snapshot.restored) expect(snapshot.ownershipAcquired).toBe(true);
      if (snapshot.serving) expect(snapshot.restored).toBe(true);
    }
    expect(phases).toEqual(RECOVERY_PHASES);
    expect(advanceRecovery(state, "complete")).toEqual(state);
  });
});

describe("cell work scheduling", () => {
  it("preserves every operation and never runs two turns of one key in a round", () => {
    const keys = ["a", "b", "a", "c", "b", "a"];
    const operations = scheduleCellTurns(keys);
    expect(operations.map((operation) => operation.id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(operations.map((operation) => operation.key)).toEqual(keys);
    const assignments = operations.map(
      (operation) => `${operation.key}:${operation.round}`,
    );
    expect(new Set(assignments).size).toBe(operations.length);
  });

  it("demonstrates independent state boundaries without changing the amount of work", () => {
    expect(HOT_KEY_SCHEDULE).toHaveLength(INDEPENDENT_KEY_SCHEDULE.length);
    expect(Math.max(...HOT_KEY_SCHEDULE.map((item) => item.round))).toBe(6);
    expect(
      Math.max(...INDEPENDENT_KEY_SCHEDULE.map((item) => item.round)),
    ).toBe(2);
  });
});

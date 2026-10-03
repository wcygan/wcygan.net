import { describe, expect, it } from "vitest";
import {
  advanceTransaction,
  applyReplica,
  createReplication,
  createTransaction,
  joinCustomerOrders,
  queryOrders,
  writePrimary,
} from "./model";

describe("bookstore relations and queries", () => {
  it("joins by customer identity without including another customer's order", () => {
    const ada = joinCustomerOrders(1);
    expect(ada.map((row) => [row.id, row.customerName])).toEqual([
      [101, "Ada"],
      [102, "Ada"],
    ]);
    expect(joinCustomerOrders(2).map((row) => row.id)).toEqual([103]);
    expect(joinCustomerOrders(99)).toEqual([]);
  });

  it("adds integer cents after filtering and preserves SQL's empty SUM", () => {
    expect(queryOrders(1).totalCents).toBe(7400);
    expect(queryOrders(2).totalCents).toBe(2900);
    expect(queryOrders(99)).toEqual({ rows: [], totalCents: null });
  });
});

describe("an application-controlled transaction", () => {
  it("keeps both changes pending, then publishes the reservation and order together", () => {
    const initial = createTransaction();
    const begun = advanceTransaction(initial, "begin");
    const reserved = advanceTransaction(begun, "reserve");
    const ordered = advanceTransaction(reserved, "insert");
    for (const state of [begun, reserved, ordered]) {
      expect(state.committed).toEqual(initial.committed);
    }
    expect(ordered.pending).toEqual({
      stock: 1,
      orderIds: [101, 102, 103, 104],
    });
    const committed = advanceTransaction(ordered, "commit");
    expect(committed.committed).toEqual(ordered.pending);
    expect(committed.pending).toBeNull();
    expect(initial.committed).toEqual({ stock: 2, orderIds: [101, 102, 103] });
  });

  it("rolls back the same original data from every uncommitted point", () => {
    const initial = createTransaction();
    const begun = advanceTransaction(initial, "begin");
    const reserved = advanceTransaction(begun, "reserve");
    const ordered = advanceTransaction(reserved, "insert");
    for (const state of [begun, reserved, ordered]) {
      expect(advanceTransaction(state, "rollback")).toEqual({
        phase: "rolled-back",
        committed: initial.committed,
        pending: null,
      });
    }
  });

  it("requires a successful reservation and complete application workflow before commit", () => {
    const begun = advanceTransaction(createTransaction(), "begin");
    expect(advanceTransaction(begun, "insert")).toBe(begun);
    expect(advanceTransaction(begun, "commit")).toBe(begun);
    const reserved = advanceTransaction(begun, "reserve");
    expect(advanceTransaction(reserved, "commit")).toBe(reserved);
    const empty = advanceTransaction(createTransaction(0), "begin");
    const failed = advanceTransaction(empty, "reserve");
    expect(failed.phase).toBe("rolled-back");
    expect(failed.committed.stock).toBe(0);
    expect(advanceTransaction(failed, "insert")).toBe(failed);
  });
});

describe("asynchronous replication", () => {
  it("allows a committed primary change to remain absent on a replica", () => {
    const initial = createReplication();
    const written = writePrimary(initial);
    expect(written.primaryOrderIds).toEqual([101, 102, 103, 104]);
    expect(written.replicaOrderIds).toEqual([101, 102, 103]);
    expect(written.replicaPosition).toBeLessThan(written.primaryPosition);
    expect(initial.primaryOrderIds).toEqual([101, 102, 103]);
  });

  it("applies the missing change once and never gets ahead of the primary", () => {
    const initial = createReplication();
    expect(applyReplica(initial)).toBe(initial);
    const written = writePrimary(initial);
    expect(writePrimary(written)).toBe(written);
    const caughtUp = applyReplica(written);
    expect(caughtUp.replicaOrderIds).toEqual(caughtUp.primaryOrderIds);
    expect(caughtUp.replicaPosition).toBe(caughtUp.primaryPosition);
    expect(applyReplica(caughtUp)).toBe(caughtUp);
  });
});

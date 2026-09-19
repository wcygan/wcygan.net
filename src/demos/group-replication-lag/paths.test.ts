import { expect, it } from "vitest";
import {
  ROWS,
  cacheSlot,
  linkPath,
  flightPath,
  measurePath,
  samplePath,
  slot,
} from "./paths";

it("carries each copy down the dedicated link to its exact log slot", () => {
  for (const member of ["a", "b"] as const) {
    for (let transaction = 1; transaction <= 6; transaction++) {
      const points = flightPath({ member, transaction, kind: "replicating" });
      expect(points).toEqual([
        cacheSlot(transaction),
        ...linkPath(member),
        slot(transaction - 1, ROWS[member]),
      ]);
      const route = measurePath(points);
      expect(samplePath(route, 0)).toEqual(cacheSlot(transaction));
      let distance = 0;
      route.lengths.forEach((length, index) => {
        const midpoint = samplePath(
          route,
          (distance + length / 2) / route.length,
        );
        midpoint.forEach((value, axis) => {
          expect(value).toBeCloseTo(
            (points[index][axis] + points[index + 1][axis]) / 2,
          );
        });
        distance += length;
      });
      samplePath(route, 1).forEach((value, axis) => {
        expect(value).toBeCloseTo(slot(transaction - 1, ROWS[member])[axis]);
      });
    }
  }
});

it("hands the proposal to both delivery paths without a position jump", () => {
  const proposal = flightPath({
    member: "primary",
    transaction: 1,
    kind: "ordering",
  });
  for (const member of ["a", "b"] as const) {
    const delivery = flightPath({
      member,
      transaction: 1,
      kind: "replicating",
    });
    expect(proposal.at(-1)).toEqual(delivery[0]);
  }
});

it("fans out from XCom and takes a separate certified path into the primary log", () => {
  for (let transaction = 1; transaction <= 6; transaction++) {
    const primary = slot(transaction - 1, ROWS.primary);
    const proposal = flightPath({
      member: "primary",
      transaction,
      kind: "ordering",
    });
    expect(proposal.at(-1)).toEqual(cacheSlot(transaction));
    expect(proposal).not.toContainEqual(primary);
    const commit = flightPath({
      member: "primary",
      transaction,
      kind: "committing",
    });
    expect(commit).toEqual([cacheSlot(transaction), primary]);
    for (const member of ["a", "b"] as const) {
      const delivery = flightPath({ member, transaction, kind: "replicating" });
      expect(delivery[0]).toEqual(cacheSlot(transaction));
      expect(delivery).not.toContainEqual(primary);
    }
    const donor = flightPath({
      member: "b",
      transaction,
      kind: "replicating",
      source: "donor",
    });
    expect(donor[0]).toEqual(primary);
  }
});

it("separates replica lanes by more than an entry width and terminates at the right row", () => {
  const a = linkPath("a");
  const b = linkPath("b");
  expect(b[1][0] - a[1][0]).toBeGreaterThan(0.58);
  expect(a[1][0]).toBe(a[2][0]);
  expect(b[1][0]).toBe(b[2][0]);
  expect(a[2][2]).toBe(ROWS.a);
  expect(b[2][2]).toBe(ROWS.b);
});

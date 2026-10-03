import { describe, expect, it } from "vitest";
import { quorumState, REGIONS, scalingState } from "./model";

describe("illustrative Region quorum", () => {
  it("tolerates one unavailable voting replica but not two", () => {
    expect(quorumState(0).canCommit).toBe(true);
    expect(quorumState(1).canCommit).toBe(true);
    expect(quorumState(2).canCommit).toBe(false);
    expect(quorumState(2).replicas.filter(Boolean)).toHaveLength(1);
  });
});

describe("independent SQL and storage scaling", () => {
  it("adds SQL compute without changing storage placement", () => {
    const before = scalingState("baseline");
    const compute = scalingState("sql", true);
    expect(compute.sqlServers).toBe(before.sqlServers + 1);
    expect(compute.storage).toEqual(before.storage);
    expect(compute.redistributed).toBe(false);
  });

  it("starts added storage empty and retains every Region's three copies", () => {
    const added = scalingState("storage");
    const settled = scalingState("storage", true);
    expect(added.sqlServers).toBe(scalingState("baseline").sqlServers);
    expect(added.storage[3].regions).toHaveLength(0);
    expect(settled.storage.every((node) => node.regions.length > 0)).toBe(true);
    for (const state of [scalingState("baseline"), added, settled]) {
      for (const region of REGIONS) {
        expect(
          state.storage.filter((node) => node.regions.includes(region)),
        ).toHaveLength(3);
      }
    }
  });
});

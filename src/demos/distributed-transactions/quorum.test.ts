import { describe, expect, it } from "vitest";
import { DEMOS } from "./model";
import { quorumLabel } from "./quorum";

const commit = DEMOS.spanner.scenarios[0].frames;

describe("replicated shard quorum labels", () => {
  it("shows the transition from one prepared copy to a durable majority", () => {
    expect(quorumLabel(commit[2].replicas, "b")).toBe(
      "PREPARE 1/3 · awaiting quorum",
    );
    expect(quorumLabel(commit[3].replicas, "b")).toBe(
      "PREPARE 2/3 · quorum reached",
    );
    expect(quorumLabel(commit[5].replicas, "a")).toBe(
      "COMMIT 2/3 · quorum reached",
    );
  });

  it("distinguishes stored decisions from a lost online quorum", () => {
    const lost = DEMOS.spanner.scenarios[2].frames[6];
    expect(quorumLabel(lost.replicas, "a")).toBe("1/3 online · quorum lost");
    expect(quorumLabel(lost.replicas, "b")).toBe(
      "PREPARE 2/3 · quorum reached",
    );
  });
});

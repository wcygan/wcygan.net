import { describe, expect, it } from "vitest";
import { replicatedShardFrames } from "./replicated-shards";

describe("replicated shard transaction overview", () => {
  it("requires a local PREPARE quorum before either leader votes", () => {
    const [start, prepare, quorum, voteA, receivedA] = replicatedShardFrames;
    expect(start.votesReceived).toBe(0);
    expect(prepare.votesReceived).toBe(0);
    expect(quorum.records).toEqual([
      ["PREPARE", "PREPARE", null],
      ["PREPARE", "PREPARE", null],
    ]);
    expect(quorum.routes).toEqual(["replicate-a", "replicate-b"]);
    expect(voteA.routes).toEqual([]);
    expect(receivedA.routes).toEqual(["vote-a"]);
    expect(prepare.records).toEqual([
      ["PREPARE", null, null],
      ["PREPARE", null, null],
    ]);
    expect(voteA.votesReceived).toBe(0);
    expect(receivedA.votesReceived).toBe(1);
    expect(receivedA.yesVotesReceived).toBe(1);
  });

  it("waits for the second vote before recording and replicating COMMIT", () => {
    const frames = replicatedShardFrames;
    expect(frames[5].votesReceived).toBe(1);
    expect(frames[5].coordinatorRecord).toBeNull();
    expect(frames[6].votesReceived).toBe(2);
    expect(frames[6].coordinatorRecord).toBe("COMMIT");
    expect(frames[7].routes).toEqual(["commit-a", "commit-b"]);
    expect(frames[8].records).toEqual([
      ["COMMIT", "COMMIT", null],
      ["COMMIT", "COMMIT", null],
    ]);
  });
});

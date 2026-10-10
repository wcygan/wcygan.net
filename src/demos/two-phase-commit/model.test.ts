import { describe, expect, it } from "vitest";
import { decisionFor, participantLabels, protocolFrames } from "./model";

describe("two-phase commit teaching traces", () => {
  it("permits commit only when every vote is yes", () => {
    expect(decisionFor(["yes", "yes"])).toBe("COMMIT");
    for (const votes of [
      ["yes", "no"],
      ["no", "yes"],
      ["no", "no"],
    ] as const)
      expect(decisionFor([...votes])).toBe("ABORT");
  });

  it("stops Prepare at the green ready-to-vote handoff and sends YES only in Phase Two", () => {
    const frames = protocolFrames("prepare", ["no", "no"]);
    expect(frames).toHaveLength(4);
    expect(frames[0].participants).toEqual(["staged", "staged"]);
    expect(frames[1].participants).toEqual(["requested", "requested"]);
    expect(frames[1].coordinator).toBe("Waiting for votes");
    expect(frames[1].status).toContain("not acknowledged separately");
    expect(frames[1].message?.direction).toBe("out");
    expect(frames[2].participants).toEqual(["prepared", "prepared"]);
    expect(frames[2].message).toBeUndefined();
    expect(frames[3].participants).toEqual(["voted-yes", "voted-yes"]);
    expect(frames[3].message).toBeUndefined();
    expect(frames[3].status).toContain("ready to send");
    expect(frames.every((frame) => !frame.decision)).toBe(true);

    const decision = protocolFrames("decision", ["yes", "yes"]);
    expect(decision[0]).toEqual(frames[3]);
    expect(decision[1].message?.labels).toEqual(["YES"]);
    expect(decision[1].message?.targets).toEqual([0]);
    expect(decision[0].yesVotesReceived).toBe(0);
    expect(decision[1].message?.direction).toBe("in");
    expect(decision[2].message?.labels).toEqual(["YES"]);
    expect(decision[2].message?.targets).toEqual([1]);
    expect(decision[2].yesVotesReceived).toBe(2);
    expect(decision[1].participants).toEqual(frames[3].participants);
  });

  it("keeps write locks until rejection or outcome", () => {
    for (const state of [
      "staged",
      "requested",
      "prepared",
      "voted-yes",
    ] as const)
      expect(participantLabels[state].locked).toBe(true);
    for (const state of ["rejected", "committed", "aborted"] as const)
      expect(participantLabels[state].locked).toBe(false);
  });

  it("increments the live tally only as each vote reaches the coordinator", () => {
    const frames = protocolFrames("decision", ["no", "yes"]);
    expect(
      frames.map(({ votesReceived, yesVotesReceived }) => [
        votesReceived,
        yesVotesReceived,
      ]),
    ).toEqual([
      [0, 0],
      [1, 0],
      [2, 1],
      [2, 1],
      [2, 1],
      [2, 1],
      [2, 1],
    ]);
    expect(frames[0].message).toBeUndefined();
    expect(frames[1].message?.labels).toEqual(["NO"]);
    expect(frames[1].message?.targets).toEqual([0]);
    expect(frames[1].yesVotesReceived).toBe(0);
    expect(frames[2].message?.labels).toEqual(["YES"]);
    expect(frames[2].message?.targets).toEqual([1]);
    expect(frames[2].yesVotesReceived).toBe(1);
  });

  it("resumes alternate votes after rejection and delivers abort to both", () => {
    const frames = protocolFrames("decision", ["no", "yes"]);
    expect(frames[0].participants).toEqual(["rejected", "voted-yes"]);
    expect(frames[0].coordinatorState).toBe("collecting");
    expect(frames[0].votesReceived).toBe(0);
    expect(frames[1].yesVotesReceived).toBe(0);
    expect(frames[2].yesVotesReceived).toBe(1);
    expect(frames[3].decision).toBe("ABORT");
    expect(frames[3].coordinatorTone).toBe("no");
    expect(frames[4].message?.tones).toEqual(["no"]);
    expect(frames[4].participants).toEqual(["aborted", "voted-yes"]);
    expect(frames.at(-1)?.participants).toEqual(["aborted", "aborted"]);
    expect(frames.at(-1)?.coordinatorState).toBe("acknowledged");
  });
});

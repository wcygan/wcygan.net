import { lazy } from "react";
import { PaxosDemo } from "./PaxosDemo";
import { leaderSnapshot, LEADER_STAGES } from "~/demos/paxos/leader-model";

const Scene = lazy(() => import("~/demos/paxos/LeaderScene"));
const stages = LEADER_STAGES;
export function PaxosLeader3D() {
  return (
    <PaxosDemo
      title="Leadership Changes Preserve Earlier Decisions"
      graphicKey="leader-keeps-decision-3d"
      stages={stages}
      Scene={Scene}
      caption={
        <>
          Five servers, with leadership moving from A to D. The old majority (A,
          B, C) and the new majority (C, D, E) share C. Durable acceptor memory
          and the Paxos reuse rule preserve P; replacing the leader does not
          start the decision over. This simplified sequence omits proposal
          numbers and most message exchanges. The highlighted report shows why
          the new leader must keep P.
        </>
      }
    >
      {(step) => {
        const state = leaderSnapshot(step);
        const status = [
          "Server A leads and proposes P for one decision. No value has been chosen yet.",
          "A, B, and C accept P. A majority has accepted it, so P is chosen.",
          "A goes offline. A, B, and C retain P in durable storage.",
          "D becomes leader and consults C and E alongside its own stored votes. C reports P; D and E report no earlier acceptance. C connects the old majority to the new one.",
          "C’s report carries the old decision into the new quorum. The new leader must reuse P, rather than choose a different value.",
          "C, D, and E accept P under the new leader. Leadership changed; the chosen value did not.",
        ][step];

        return { status, summary: `Chosen: ${state.chosen ?? "not yet"}` };
      }}
    </PaxosDemo>
  );
}

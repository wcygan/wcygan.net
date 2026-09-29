import { lazy } from "react";
import { PaxosDemo } from "./PaxosDemo";
import { votesSnapshot, VOTE_STAGES, VOTERS } from "~/demos/paxos/votes-model";

const Scene = lazy(() => import("~/demos/paxos/VotesScene"));
const stages = VOTE_STAGES;
export function PaxosVotes3D() {
  return (
    <PaxosDemo
      title="A Majority Must Agree on the Order"
      graphicKey="enough-votes-3d"
      stages={stages}
      Scene={Scene}
      caption={
        <>
          This shows the accept phase for one valid Paxos proposal, after
          prepare. A majority accepting the same proposal chooses its value;
          replies let the proposer learn that outcome. D is still waiting; E is
          unavailable. Yellow outlines mark nonresponders whose acceptance is
          unconfirmed.
        </>
      }
    >
      {(step) => {
        const state = votesSnapshot(step);
        const status = state.known
          ? "Three acceptance replies reached the proposer. It now knows P is chosen."
          : state.chosen
            ? "C has accepted P: a majority has now chosen it. C’s reply is still returning, so the proposer does not know yet."
            : step > 0 && step % 2 === 0
              ? `${VOTERS[Math.floor((step - 1) / 2)]} stores P durably and sends an acceptance reply to the proposer.`
              : "The proposer sends an accept request. An acceptor checks its promise before storing P and replying.";

        return {
          status,
          summary: `${state.accepted} / 3 accepted · ${state.replies} / 3 replies received · ${state.voters.map((v) => `${v.name}: ${v.status}`).join(" · ")}`,
        };
      }}
    </PaxosDemo>
  );
}

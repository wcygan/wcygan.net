import { lazy } from "react";
import { PaxosDemo } from "./PaxosDemo";
import { overlapSnapshot, ROUNDS } from "~/demos/paxos/overlap-model";

const Scene = lazy(() => import("~/demos/paxos/OverlapScene"));
const stages = [
  "Before round 1",
  ...ROUNDS.map((members, i) => `Round ${i + 1} · ${members.join("")}`),
];
export function PaxosOverlap3D() {
  return (
    <PaxosDemo
      title="Any Two Majority Quorums Share a Member"
      graphicKey="majority-overlap-3d"
      stages={stages}
      Scene={Scene}
      caption={
        <>
          Green lines connect the current quorum; dashed lines connect the
          previous one. These show membership, not messages. Green rings mark
          the current majority; dashed rings mark the previous one. Orange marks
          their shared members. Any two groups of three among five must overlap:
          3 + 3 &gt; 5. In Paxos, durable memory and the reuse rule turn that
          overlap into protection for earlier decisions. These rounds show
          quorum membership, not a complete protocol exchange.
        </>
      }
    >
      {(step) => {
        const state = overlapSnapshot(step);
        const status =
          step === 0
            ? "Five servers are ready. No quorum has been established yet."
            : step === 1
              ? "The first majority is A, B, C. Advance to compare it with another majority."
              : `Rounds ${step - 1} and ${step} share ${state.shared.join(" and ")}. ${state.shared.length === 1 ? "This member belongs" : "These members belong"} to both majorities.`;

        return {
          status,
          summary: `Previous: ${state.previous.join(", ") || "—"} · Current: ${state.current.join(", ") || "—"} · Shared: ${state.shared.join(", ") || "—"}`,
        };
      }}
    </PaxosDemo>
  );
}

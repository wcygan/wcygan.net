import { lazy } from "react";
import { PaxosDemo } from "./PaxosDemo";
import { historySnapshot, HISTORY_STAGES } from "~/demos/paxos/history-model";

const Scene = lazy(() => import("~/demos/paxos/HistoryScene"));
const stages = HISTORY_STAGES;
export function PaxosHistory3D() {
  return (
    <PaxosDemo
      title="Agreed Decisions Form the Cluster’s Shared History"
      graphicKey="shared-history-3d"
      stages={stages}
      Scene={Scene}
      caption={
        <>
          Multi-Paxos extends agreement across an ordered log: each slot holds
          one chosen operation. Starting from the same state, replicas apply
          these operations deterministically in slot order. A replica may lag,
          but it catches up by applying the same history. Green blocks are
          applied; outlined blocks are chosen operations still to apply. Quorum
          exchanges are omitted here.
        </>
      }
    >
      {(step) => {
        const state = historySnapshot(step);
        const status = [
          "Slot 1 is chosen and applied: all replicas hold 20.",
          "Slot 2 is chosen. A and B apply Add 5; watch the operation travel to each server.",
          "A and B now hold 25. C still holds 20 and has not applied slot 2.",
          "Slot 3 is chosen. A and B apply Multiply by 2.",
          "A and B now hold 50. C is two operations behind.",
          "C catches up by applying slot 2 first: 20 + 5.",
          "C now holds 25. It still needs slot 3.",
          "C applies slot 3 next: 25 × 2.",
          "All three replicas hold 50 after applying slots 1 → 2 → 3.",
        ][step];

        return {
          status,
          summary: state.replicas
            .map(
              (r) =>
                `${r.name}: slots ${r.applied.map((o) => o.slot).join(" → ")} · value ${r.value}`,
            )
            .join(" | "),
        };
      }}
    </PaxosDemo>
  );
}

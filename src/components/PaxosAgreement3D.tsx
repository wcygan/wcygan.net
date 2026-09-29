import { lazy } from "react";
import { PaxosDemo } from "./PaxosDemo";
import { snapshot } from "~/demos/paxos/model";

const Scene = lazy(() => import("~/demos/paxos/Scene"));
const stages = ["Same data", "Send writes", "Apply first", "Divergent"];
export function PaxosAgreement3D() {
  return (
    <PaxosDemo
      title="Independent Delivery"
      graphicKey="independent-delivery-3d"
      stages={stages}
      Scene={Scene}
      caption={
        <>
          The source sends both writes to every replica, but no shared total
          order is enforced. Each replica applies writes as they arrive.
        </>
      }
    >
      {(step) => {
        const status =
          step === 3
            ? "All writes delivered. Different order. Different state."
            : step === 2
              ? "A and C applied X. B applied Y. The remaining writes are on their way."
              : step === 1
                ? "Each replica receives one fast write and one slow write. X is faster to A and C; Y is faster to B."
                : "All three replicas start at 10. X sets the value to 20; Y adds 5.";

        return {
          status,
          summary: snapshot(step)
            .map(
              (r) =>
                `${r.name}: ${r.value} (${r.applied.join(" → ") || "No writes"})`,
            )
            .join(" · "),
        };
      }}
    </PaxosDemo>
  );
}

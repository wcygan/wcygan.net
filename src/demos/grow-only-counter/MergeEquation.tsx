import { Fragment } from "react";
import { COMPONENTS, type NodeId, type Vector } from "./model";

type Source = NodeId | null;

function EquationVector({
  value,
  sources,
}: {
  value: Vector;
  sources: readonly Source[];
}) {
  return (
    <span className="gc-merge-vector">
      <span>[</span>
      {value.map((count, index) => (
        <Fragment key={index}>
          {index > 0 && <span>,</span>}
          <span
            className={`gc-merge-entry gc-letter-${COMPONENTS[index]}${
              sources[index]
                ? ` gc-merge-entry-${sources[index]?.toLowerCase()}`
                : ""
            }`}
          >
            {count}
          </span>
        </Fragment>
      ))}
      <span>]</span>
    </span>
  );
}

function SourceLabel({ node }: { node: NodeId }) {
  return (
    <span className={`gc-merge-source gc-merge-source-${node.toLowerCase()}`}>
      {node}
    </span>
  );
}

function MergeBrace() {
  return (
    <svg className="gc-merge-brace" viewBox="0 0 20 88" aria-hidden="true">
      <path d="M18 2C8 2 8 14 8 25C8 35 5 42 2 44C5 46 8 53 8 63C8 74 8 86 18 86" />
    </svg>
  );
}

function MergeEquationBody({ order }: { order: readonly [NodeId, NodeId] }) {
  const vectors: Record<NodeId, Vector> = {
    A: [1, 0, 0],
    B: [0, 0, 0],
    C: [0, 0, 1],
  };
  const sources: Record<NodeId, readonly Source[]> = {
    A: ["A", null, null],
    B: [null, null, null],
    C: [null, null, "C"],
  };

  return (
    <div className="gc-merge-equation">
      <div className="gc-merge-operation">
        <span className="gc-merge-label">Merge</span>
        <MergeBrace />
        <div className="gc-merge-operands">
          {order.map((node) => (
            <div className="gc-merge-row" key={node}>
              <SourceLabel node={node} />
              <EquationVector value={vectors[node]} sources={sources[node]} />
            </div>
          ))}
          <div className="gc-merge-rule" />
        </div>
      </div>
      <div className="gc-merge-result">
        <span className="gc-merge-equals">=</span>
        <EquationVector value={[1, 0, 1]} sources={["A", null, "C"]} />
      </div>
    </div>
  );
}

function MergeCalculation({ order }: { order: readonly [NodeId, NodeId] }) {
  return (
    <div className="gc-merge-calculation">
      <p className="gc-merge-order">{order.join(" then ")}</p>
      <MergeEquationBody order={order} />
    </div>
  );
}

export function GrowOnlyCounterMergeEquation() {
  return (
    <figure
      className="gc-merge-figure"
      data-graphic-frame="plate"
      data-graphic-key="grow-only-counter-merge"
      data-graphic-label="A and C merge their grow-only counter vectors"
    >
      <div
        className="gc-merge-paper"
        data-graphic-stage="padded"
        role="img"
        aria-label="A holds 1, 0, 0. C holds 0, 0, 1. Taking the maximum in each column gives 1, 0, 1. The first 1 comes from A and the last 1 comes from C."
      >
        <div aria-hidden="true">
          <MergeEquationBody order={["A", "C"]} />
        </div>
      </div>
      <figcaption>
        Keep the larger count in each column. The first 1 comes from A; the last
        1 comes from C.
      </figcaption>
    </figure>
  );
}

export function GrowOnlyCounterDeliveryOrderEquation() {
  return (
    <figure
      className="gc-merge-figure"
      data-graphic-frame="plate"
      data-graphic-key="grow-only-counter-delivery-order"
      data-graphic-label="Both delivery orders produce the same counter vector"
    >
      <div
        className="gc-merge-paper gc-order-paper"
        data-graphic-stage="padded"
        role="img"
        aria-label="Merging A's vector 1, 0, 0 with C's vector 0, 0, 1 gives 1, 0, 1. Reversing the order and merging C with A also gives 1, 0, 1."
      >
        <div className="gc-order-comparison" aria-hidden="true">
          <MergeCalculation order={["A", "C"]} />
          <MergeCalculation order={["C", "A"]} />
        </div>
        <p className="gc-order-result" aria-hidden="true">
          Same result
        </p>
      </div>
      <figcaption>
        Reversing the delivery order does not change which count wins in each
        column.
      </figcaption>
    </figure>
  );
}

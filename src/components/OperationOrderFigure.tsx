import { useId } from "react";

const operations = ["X = 2", "X += 2", "X *= 2"];

function ReplicaLane({
  name,
  order,
  result,
  variant,
}: {
  name: string;
  order: readonly string[];
  result: string;
  variant: "ordered" | "reordered";
}) {
  return (
    <div
      className={`operation-order-replica operation-order-replica--${variant}`}
    >
      <header className="operation-order-replica-header">
        <p className="operation-order-replica-name">{name}</p>
        <span className="operation-order-replica-state">
          {variant === "ordered" ? "SHARED ORDER" : "REORDERED"}
        </span>
      </header>
      <div className="operation-order-flow">
        {order.map((operation, index) => (
          <div className="operation-order-step" key={`${operation}-${index}`}>
            <span className="operation-order-index">0{index + 1}</span>
            <code>{operation}</code>
            {index < order.length - 1 && (
              <span className="operation-order-connector" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
      <p className="operation-order-result">
        <span>FINAL STATE</span>
        <code>X = {result}</code>
      </p>
    </div>
  );
}

export function OperationOrderFigure() {
  const id = useId();
  return (
    <figure
      className="operation-order-figure"
      data-graphic-frame="plate"
      data-graphic-kind="dom"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          Add first or multiply first?
        </p>
      </header>
      <div className="operation-order-stage" data-graphic-stage="padded">
        <ReplicaLane
          name="Replica A"
          order={operations}
          result="8"
          variant="ordered"
        />
        <ReplicaLane
          name="Replica B"
          order={[operations[0], operations[2], operations[1]]}
          result="6"
          variant="reordered"
        />
      </div>
      <figcaption id={`${id}-caption`}>
        The replicas end up with different values.
      </figcaption>
    </figure>
  );
}

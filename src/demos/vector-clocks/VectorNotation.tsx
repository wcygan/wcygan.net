import { Fragment } from "react";
import { COMPONENTS, NODES, type Vector } from "./model";

export function ClockLetter({ index }: { index: number }) {
  return (
    <span className={`vc-letter vc-letter-${COMPONENTS[index]}`}>
      {NODES[index]}
    </span>
  );
}

export function VectorNotation({
  value,
  previous,
}: {
  value: Vector;
  previous?: Vector;
}) {
  return (
    <span className="vc-vector">
      <span>[</span>
      <span className="vc-entries">
        {value.map((count, index) => (
          <Fragment key={index}>
            {index > 0 && <span className="vc-comma">, </span>}
            <span
              className={`vc-letter vc-letter-${COMPONENTS[index]}${previous && count !== previous[index] ? " vc-changed" : ""}`}
            >
              {count}
            </span>
          </Fragment>
        ))}
      </span>
      <span>]</span>
    </span>
  );
}

/** Apply the same component notation to vectors embedded in model explanations. */
export function VectorText({ text }: { text: string }) {
  const parts = [];
  let start = 0;
  for (const match of text.matchAll(/\[(\d+), (\d+), (\d+)\]/g)) {
    parts.push(text.slice(start, match.index));
    parts.push(
      <VectorNotation
        key={match.index}
        value={[Number(match[1]), Number(match[2]), Number(match[3])]}
      />,
    );
    start = match.index + match[0].length;
  }
  parts.push(text.slice(start));
  return <>{parts}</>;
}

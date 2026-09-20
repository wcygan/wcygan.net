import { useId, useState } from "react";
import { VectorNotation } from "../demos/grow-only-counter/VectorNotation";
import type { Vector } from "../demos/grow-only-counter/model";

const A_STATE: Vector = [1, 0, 0];
const C_INITIAL_STATE: Vector = [0, 0, 1];
const C_MERGED_STATE: Vector = [1, 0, 1];

const EXPLANATIONS = [
  "A and C accept one like each without knowing about the other. A1 and C1 are concurrent.",
  "Server A replicates its counter. The message carries information about the like accepted at A1.",
  "Server C receives A's state and can now show 2 likes. A1 influenced C2, so A1 happened before C2.",
] as const;

function Event({
  x,
  y,
  label,
  detail,
  emphasized = false,
  detailBackdrop = false,
}: {
  x: number;
  y: number;
  label: string;
  detail: string;
  emphasized?: boolean;
  detailBackdrop?: boolean;
}) {
  return (
    <g className={emphasized ? "causal-event is-emphasized" : "causal-event"}>
      <circle cx={x} cy={y} r="9" />
      <text className="causal-event-name" x={x} y={y - 19} textAnchor="middle">
        {label}
      </text>
      <text
        className={
          detailBackdrop
            ? "causal-event-detail has-backdrop"
            : "causal-event-detail"
        }
        x={x}
        y={y + 28}
        textAnchor="middle"
      >
        {detail}
      </text>
    </g>
  );
}

export function CausalRelationshipDemo() {
  const [step, setStep] = useState(0);
  const markerId = useId().replaceAll(":", "");
  const messageVisible = step >= 1;
  const received = step >= 2;
  const cState = received ? C_MERGED_STATE : C_INITIAL_STATE;

  return (
    <figure
      className="causal-demo"
      data-graphic-frame="workbench"
      data-graphic-key="causal-relationships"
      data-graphic-kind="svg"
      aria-label="How replicating a like counter creates a causal relationship"
    >
      <div
        className="causal-stage"
        data-graphic-stage="padded"
        role="img"
        aria-label="Servers A and C independently accept one like, so events A1 and C1 are concurrent. Server A then sends its counter state to C. C2 receives that state and can show two likes, so the like at A1 influenced C2 and happened before it."
      >
        <svg viewBox="0 0 600 290" aria-hidden="true">
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>

          <text className="causal-node-label" x="18" y="85">
            Server A
          </text>
          <text className="causal-node-label" x="18" y="195">
            Server C
          </text>
          <line className="causal-lane" x1="105" y1="80" x2="570" y2="80" />
          <line className="causal-lane" x1="105" y1="190" x2="570" y2="190" />

          <Event
            x={170}
            y={80}
            label="A1"
            detail="like accepted"
            emphasized={received}
          />
          <Event x={170} y={190} label="C1" detail="like accepted" />

          <g className="causal-concurrent-label">
            <rect x="55" y="116" width="230" height="30" rx="15" />
            <text x="170" y="136" textAnchor="middle">
              A1 ∥ C1 · concurrent
            </text>
          </g>

          {messageVisible && (
            <>
              <line
                className={received ? "causal-before-path" : "causal-send-path"}
                x1="179"
                y1="80"
                x2="290"
                y2="80"
              />
              <Event
                x={300}
                y={80}
                label="Send"
                detail="replicate counter"
                emphasized={received}
                detailBackdrop
              />
              <path
                className={
                  received ? "causal-message is-received" : "causal-message"
                }
                d="M 309 86 C 352 103, 402 142, 448 178"
                markerEnd={`url(#${markerId})`}
              />
              <text
                className="causal-message-label"
                x="430"
                y="134"
                textAnchor="middle"
              >
                carries A1's like
              </text>
            </>
          )}

          {received && (
            <>
              <line
                className="causal-local-path"
                x1="179"
                y1="190"
                x2="445"
                y2="190"
              />
              <Event
                x={460}
                y={190}
                label="C2"
                detail="show 2 likes"
                emphasized
              />
              <g className="causal-before-label">
                <rect x="340" y="240" width="240" height="30" rx="15" />
                <text x="460" y="260" textAnchor="middle">
                  A1 → C2 · happened before
                </text>
              </g>
            </>
          )}
        </svg>
      </div>

      <div className="causal-state-strip" aria-label="Current server states">
        <span>
          <strong>A state</strong>
          <VectorNotation value={A_STATE} />
        </span>
        <span>
          <strong>C state</strong>
          <VectorNotation
            value={cState}
            previous={received ? C_INITIAL_STATE : undefined}
          />
        </span>
      </div>

      <div className="causal-controls">
        <button
          type="button"
          onClick={() =>
            setStep((current) => (current === 2 ? 0 : current + 1))
          }
        >
          {step === 2 ? "Replay" : "Step"}
        </button>
        <span>
          {step + 1} of {EXPLANATIONS.length}
        </span>
      </div>
      <p className="causal-explanation" role="status" aria-live="polite">
        {EXPLANATIONS[step]}
      </p>
    </figure>
  );
}

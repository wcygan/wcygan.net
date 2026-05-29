import { useEffect, useRef, useState } from "react";
import { createRetryIdempotencyDemo } from "~/demos/retry-idempotency/engine";
import {
  deriveRetrySnapshot,
  type RetryPhase,
  type RetrySnapshot,
} from "~/demos/retry-idempotency/model";

const RETRY_STEPS = [
  { phase: "send", label: "Send email" },
  { phase: "crash", label: "Crash before ack" },
  { phase: "retry", label: "Temporal retries" },
  { phase: "resolve", label: "Resend vs skip" },
] as const satisfies readonly { phase: RetryPhase; label: string }[];

const INITIAL_SNAPSHOT = deriveRetrySnapshot({ progress: 0, playing: true });

type VisibleRetryState = Pick<RetrySnapshot, "phase" | "phaseLabel"> & {
  naiveOutcome: RetrySnapshot["tracks"]["naive"]["outcome"];
};

export function RetryIdempotencyDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.phaseLabel}:${INITIAL_SNAPSHOT.tracks.naive.outcome}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleRetryState>({
    phase: INITIAL_SNAPSHOT.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
    naiveOutcome: INITIAL_SNAPSHOT.tracks.naive.outcome,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createRetryIdempotencyDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.phase}:${snapshot.phaseLabel}:${snapshot.tracks.naive.outcome}`;
      if (statusKey === statusKeyRef.current) return;

      statusKeyRef.current = statusKey;
      setVisibleState({
        phase: snapshot.phase,
        phaseLabel: snapshot.phaseLabel,
        naiveOutcome: snapshot.tracks.naive.outcome,
      });
    });
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure className="retry-idempotency-demo" data-phase={visibleState.phase}>
      <div className="retry-idempotency-header">
        <h2>One crash, two retry outcomes</h2>
        <p>
          The same sendEmail Activity runs on two tracks. Each sends the email,
          then the Worker crashes before the completion is recorded. Temporal
          retries and runs the code again. Without an idempotency key the email
          is sent twice; with one, the retry sees the work is already done and
          skips the send.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="retry-idempotency-canvas"
        role="img"
        aria-label="Animated comparison of two sendEmail Activities. Both send one email, then the Worker crashes before the completion is recorded, then Temporal retries. The track with no idempotency key resends and ends at two emails sent (a duplicate); the track guarded by idempotency key abc-123 skips the resend and ends at one email sent."
      />

      <ol
        className="retry-idempotency-steps"
        aria-label="Retry and idempotency timeline"
      >
        {RETRY_STEPS.map((step, index) => (
          <li
            key={step.phase}
            data-state={stepState(
              visibleState.phase,
              visibleState.naiveOutcome !== "pending",
              index,
            )}
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="retry-idempotency-status">
        {visibleState.phaseLabel}
      </figcaption>
    </figure>
  );
}

function stepState(currentPhase: RetryPhase, resolved: boolean, index: number) {
  const currentIndex = RETRY_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (index < currentIndex) return "complete";
  if (index === currentIndex && currentPhase === "resolve" && resolved) {
    return "complete";
  }
  if (index === currentIndex) return "active";
  return "pending";
}

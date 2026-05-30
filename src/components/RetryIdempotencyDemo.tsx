import { useEffect, useRef, useState } from "react";
import { createRetryIdempotencyDemo } from "~/demos/retry-idempotency/engine";
import {
  deriveRetrySnapshot,
  type RetryPhase,
  type RetrySnapshot,
} from "~/demos/retry-idempotency/model";

const RETRY_STEPS = [
  { phase: "send", label: "Send + record key" },
  { phase: "crash", label: "Crash before ack" },
  { phase: "retry", label: "Temporal retries" },
  { phase: "resolve", label: "Provider dedupes" },
] as const satisfies readonly { phase: RetryPhase; label: string }[];

const INITIAL_SNAPSHOT = deriveRetrySnapshot({ progress: 0, playing: true });

type VisibleRetryState = Pick<RetrySnapshot, "phase"> & {
  resolved: boolean;
};

function visibleStateFrom(snapshot: RetrySnapshot): VisibleRetryState {
  return {
    phase: snapshot.phase,
    // The fresh track only diverges (a duplicate lands) at the very end, so its
    // resolved outcome marks the final step complete.
    resolved: snapshot.tracks.fresh.outcome !== "pending",
  };
}

export function RetryIdempotencyDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.tracks.fresh.outcome}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleRetryState>(
    visibleStateFrom(INITIAL_SNAPSHOT),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createRetryIdempotencyDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.phase}:${snapshot.tracks.fresh.outcome}`;
      if (statusKey === statusKeyRef.current) return;

      statusKeyRef.current = statusKey;
      setVisibleState(visibleStateFrom(snapshot));
    });
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure className="retry-idempotency-demo">
      <div className="retry-idempotency-header">
        <h2>The provider decides, not the Worker</h2>
        <p>
          One sendEmail Activity POSTs to an email provider with an
          Idempotency-Key, then the Worker crashes before completion is recorded
          and Temporal retries. The provider dedupes on the key it has already
          seen. A stable key (runId + activityId) survives the retry and only
          one email ships; a key regenerated with uuid() looks brand new, so a
          duplicate goes out.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="retry-idempotency-canvas"
        role="img"
        aria-label="Animated comparison of two sendEmail Activities calling an email provider that dedupes on an Idempotency-Key. Both POST the email with a key, the provider records the key and delivers one email returning 200 msg_01, then the Worker crashes before completion is recorded and Temporal retries. The top track uses a stable key derived from runId and activityId, so the retry sends the identical key, the provider finds it already in its keys-seen ledger, returns the cached msg_01, and delivered stays at one. The bottom track regenerates the key with uuid() on every attempt, so the retry arrives with a new key the provider has never seen; the provider records it as a second ledger row and sends msg_02, ending at two emails delivered, a duplicate."
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
              visibleState.resolved,
              index,
            )}
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
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

import { useEffect, useRef, useState } from "react";
import { createRetryIdempotencyDemo } from "~/demos/retry-idempotency/engine";
import {
  deriveRetrySnapshot,
  type RetryPhase,
  type RetrySnapshot,
} from "~/demos/retry-idempotency/model";

const RETRY_STEPS = [
  { phase: "send", label: "Send first email" },
  { phase: "crash", label: "Crash before ack" },
  { phase: "retry", label: "Temporal retries" },
  { phase: "resolve", label: "Provider responds" },
] as const satisfies readonly { phase: RetryPhase; label: string }[];

const INITIAL_SNAPSHOT = deriveRetrySnapshot({ progress: 0, playing: true });

type VisibleRetryState = Pick<RetrySnapshot, "phase"> & {
  resolved: boolean;
};

function visibleStateFrom(snapshot: RetrySnapshot): VisibleRetryState {
  return {
    phase: snapshot.phase,
    // The blind track only diverges (a duplicate lands) at the very end, so its
    // resolved outcome marks the final step complete.
    resolved: snapshot.tracks.blind.outcome !== "pending",
  };
}

export function RetryIdempotencyDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.tracks.blind.outcome}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleRetryState>(
    visibleStateFrom(INITIAL_SNAPSHOT),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createRetryIdempotencyDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.phase}:${snapshot.tracks.blind.outcome}`;
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
    <figure className="retry-idempotency-demo" data-phase={visibleState.phase}>
      <div className="retry-idempotency-header">
        <h2>Design for Idempotency</h2>
        <p>
          When the Worker crashes after sending an email and Temporal retries, a
          stable idempotency key lets the provider recognize the retry and skip
          the resend, while sending no key at all leaves it nothing to match on,
          so a duplicate goes out.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="retry-idempotency-canvas"
        role="img"
        aria-label="Animated comparison of two sendEmail Activities calling an email provider that dedupes on an Idempotency-Key. Both deliver one email on the first attempt returning 200 msg_01, then the Worker crashes before completion is recorded and Temporal retries. The top track sends a stable key derived from runId and activityId, so the retry sends the identical key, the provider finds it already in its keys-seen ledger, returns the cached msg_01, and delivered stays at one. The bottom track sends no Idempotency-Key at all, so the provider has nothing to dedupe on; its keys-seen ledger stays empty and the retry ships a second email msg_02, ending at two emails delivered, a duplicate."
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
            aria-current={
              step.phase === visibleState.phase && !visibleState.resolved
                ? "step"
                : undefined
            }
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
      <figcaption className="retry-idempotency-status">
        {retryPhaseLabel(visibleState.phase, visibleState.resolved)}
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

function retryPhaseLabel(currentPhase: RetryPhase, resolved: boolean) {
  if (currentPhase === "send") {
    return "Both activities send the first email request; only the stable-key path records a dedupe key.";
  }

  if (currentPhase === "crash") {
    return "The Worker crashes after the provider responds, before Temporal records completion.";
  }

  if (currentPhase === "retry") {
    return "Temporal retries the Activity. The stable key matches the first attempt; the blind retry has no key to match.";
  }

  return resolved
    ? "The stable-key path stays at one delivered email, while the blind path sends a duplicate."
    : "The provider is deciding whether the second request is a retry or a new send.";
}

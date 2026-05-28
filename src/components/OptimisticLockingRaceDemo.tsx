import { useEffect, useRef, useState } from "react";
import { createOptimisticLockingRaceDemo } from "~/demos/optimistic-locking/engine";
import {
  deriveRaceSnapshot,
  type RacePhase,
  type RaceSnapshot,
} from "~/demos/optimistic-locking/model";

const RACE_STEPS = [
  { phase: "read", label: "Read v7" },
  { phase: "prepare", label: "Prepare reserves" },
  { phase: "worker-a-commit", label: "A reserves" },
  { phase: "worker-b-conflict", label: "B conflicts" },
  { phase: "worker-b-reread", label: "B rereads v8" },
  { phase: "worker-b-retry", label: "B retries v9" },
] as const satisfies readonly { phase: RacePhase; label: string }[];

const INITIAL_SNAPSHOT = deriveRaceSnapshot({ progress: 0, playing: true });

type VisibleRaceState = Pick<RaceSnapshot, "phase" | "phaseLabel">;

export function OptimisticLockingRaceDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.phaseLabel}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleRaceState>({
    phase: INITIAL_SNAPSHOT.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createOptimisticLockingRaceDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.phase}:${snapshot.phaseLabel}`;
      if (statusKey === statusKeyRef.current) return;

      statusKeyRef.current = statusKey;
      setVisibleState({
        phase: snapshot.phase,
        phaseLabel: snapshot.phaseLabel,
      });
    });
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure
      className="optimistic-locking-race-demo"
      data-phase={visibleState.phase}
    >
      <div className="optimistic-locking-race-header">
        <h2>Two checkout workers reserve inventory</h2>
        <p>
          Two checkout workers read the same available counter at version 7. One
          decrement commits first; the stale worker rereads version 8 and
          retries the same decrement at version 9.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="optimistic-locking-race-canvas"
        role="img"
        aria-label="Animated optimistic locking demo showing two checkout workers reserving the same inventory row, one stale write failing, and a retry succeeding after rereading the latest version"
      />

      <ol
        className="optimistic-locking-race-steps"
        aria-label="Optimistic locking race timeline"
      >
        {RACE_STEPS.map((step, index) => (
          <li
            key={step.phase}
            data-state={stepState(visibleState.phase, index)}
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="optimistic-locking-race-status">
        {visibleState.phaseLabel}
      </figcaption>
    </figure>
  );
}

function stepState(currentPhase: RacePhase, index: number) {
  const currentIndex = RACE_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "active";
  return "pending";
}

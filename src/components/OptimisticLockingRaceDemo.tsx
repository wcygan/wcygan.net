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
  { phase: "worker-b-retry", label: "B retries v8" },
] as const satisfies readonly { phase: RacePhase; label: string }[];

const INITIAL_SNAPSHOT = deriveRaceSnapshot({ progress: 0, playing: true });

type VisibleRaceState = Pick<RaceSnapshot, "phase" | "phaseLabel"> & {
  workerBStatus: RaceSnapshot["workers"]["workerB"]["status"];
};

export function OptimisticLockingRaceDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.phaseLabel}:${INITIAL_SNAPSHOT.workers.workerB.status}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleRaceState>({
    phase: INITIAL_SNAPSHOT.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
    workerBStatus: INITIAL_SNAPSHOT.workers.workerB.status,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createOptimisticLockingRaceDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.phase}:${snapshot.phaseLabel}:${snapshot.workers.workerB.status}`;
      if (statusKey === statusKeyRef.current) return;

      statusKeyRef.current = statusKey;
      setVisibleState({
        phase: snapshot.phase,
        phaseLabel: snapshot.phaseLabel,
        workerBStatus: snapshot.workers.workerB.status,
      });
    });
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure
      data-graphic-frame="plate"
      aria-labelledby="optimistic-locking-race-title"
      className="optimistic-locking-race-demo"
      data-phase={visibleState.phase}
    >
      <div className="optimistic-locking-race-header">
        <p className="article-graphic-title" id="optimistic-locking-race-title">
          Two checkout workers reserve inventory
        </p>
        <p>
          Two checkout workers read the same available counter at version 7. One
          decrement commits first; the stale worker rereads version 8 and
          retries against version 8. If it commits, the row advances to version
          9.
        </p>
      </div>

      <canvas
        data-graphic-stage="flush"
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
            data-state={stepState(
              visibleState.phase,
              visibleState.workerBStatus === "committed",
              index,
            )}
            aria-current={
              step.phase === visibleState.phase ? "step" : undefined
            }
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

function stepState(
  currentPhase: RacePhase,
  workerBRetryCommitted: boolean,
  index: number,
) {
  const currentIndex = RACE_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (index < currentIndex) return "complete";
  if (
    index === currentIndex &&
    currentPhase === "worker-b-retry" &&
    workerBRetryCommitted
  ) {
    return "complete";
  }
  if (index === currentIndex) return "active";
  return "pending";
}

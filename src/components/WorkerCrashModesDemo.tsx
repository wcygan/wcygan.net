import { useEffect, useRef, useState } from "react";
import { createWorkerCrashModesDemo } from "~/demos/worker-crash-modes/engine";
import {
  type CrashPhase,
  type CrashSnapshot,
  deriveCrashSnapshot,
} from "~/demos/worker-crash-modes/model";

const CRASH_STEPS = [
  { phase: "running", label: "Both running" },
  { phase: "crash", label: "Same crash beat" },
  { phase: "recover-1", label: "Replay vs timeout" },
  { phase: "recover-2", label: "Resume vs retry" },
] as const satisfies readonly { phase: CrashPhase; label: string }[];

const INITIAL_SNAPSHOT = deriveCrashSnapshot({ progress: 0, playing: true });

type VisibleCrashState = Pick<CrashSnapshot, "phase" | "phaseLabel"> & {
  taskStatus: CrashSnapshot["task"]["status"];
  activityStatus: CrashSnapshot["activity"]["status"];
};

export function WorkerCrashModesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.phaseLabel}:${INITIAL_SNAPSHOT.task.status}:${INITIAL_SNAPSHOT.activity.status}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleCrashState>({
    phase: INITIAL_SNAPSHOT.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
    taskStatus: INITIAL_SNAPSHOT.task.status,
    activityStatus: INITIAL_SNAPSHOT.activity.status,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createWorkerCrashModesDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.phase}:${snapshot.phaseLabel}:${snapshot.task.status}:${snapshot.activity.status}`;
      if (statusKey === statusKeyRef.current) return;

      statusKeyRef.current = statusKey;
      setVisibleState({
        phase: snapshot.phase,
        phaseLabel: snapshot.phaseLabel,
        taskStatus: snapshot.task.status,
        activityStatus: snapshot.activity.status,
      });
    });
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure className="worker-crash-modes-demo" data-phase={visibleState.phase}>
      <div className="worker-crash-modes-header">
        <h2>Two crashes, two recoveries</h2>
        <p>
          Two Workers crash on the same beat. The one driving a Workflow Task is
          rebuilt from durable Event History, so another Worker replays and
          resumes with no data loss. The one running an Activity left an
          external side effect whose outcome cannot be observed, so Temporal
          waits out the start-to-close timeout and then retries.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="worker-crash-modes-canvas"
        role="img"
        aria-label="Animated demo of two stacked Temporal tracks sharing one timeline. Both Workers start healthy, then crash on the same beat. The top Workflow Task track recovers cleanly as Worker B replays the durable Event History and resumes from the same point. The bottom Activity track cannot observe whether its external side effect happened, so Temporal drains a start-to-close timeout countdown and then retries the Activity as a fresh attempt."
      />

      <ol
        className="worker-crash-modes-steps"
        aria-label="Worker crash recovery timeline"
      >
        {CRASH_STEPS.map((step, index) => (
          <li
            key={step.phase}
            data-state={stepState(
              visibleState.phase,
              visibleState.taskStatus === "resumed" &&
                visibleState.activityStatus === "retrying",
              index,
            )}
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="worker-crash-modes-status">
        {visibleState.phaseLabel}
      </figcaption>
    </figure>
  );
}

function stepState(
  currentPhase: CrashPhase,
  recoveryComplete: boolean,
  index: number,
) {
  const currentIndex = CRASH_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (index < currentIndex) return "complete";
  if (
    index === currentIndex &&
    currentPhase === "recover-2" &&
    recoveryComplete
  ) {
    return "complete";
  }
  if (index === currentIndex) return "active";
  return "pending";
}

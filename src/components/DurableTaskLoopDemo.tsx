import { useEffect, useRef, useState } from "react";
import { createDurableTaskLoopDemo } from "~/demos/durable-task-loop/engine";
import {
  deriveDurableTaskLoopSnapshot,
  type DurableTaskLoopSnapshot,
  type LoopPhase,
} from "~/demos/durable-task-loop/model";

const LOOP_STEPS = [
  { phase: "enqueue", label: "Service enqueues" },
  { phase: "poll", label: "Worker polls" },
  { phase: "execute", label: "Worker executes" },
  { phase: "report", label: "Worker reports" },
  { phase: "append", label: "History appends" },
] as const satisfies readonly { phase: LoopPhase; label: string }[];

const INITIAL_SNAPSHOT = deriveDurableTaskLoopSnapshot({
  progress: 0,
  playing: true,
});

type VisibleLoopState = Pick<DurableTaskLoopSnapshot, "phase" | "phaseLabel">;

export function DurableTaskLoopDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.phaseLabel}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleLoopState>({
    phase: INITIAL_SNAPSHOT.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createDurableTaskLoopDemo(canvas, (snapshot) => {
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
    <figure className="durable-task-loop-demo" data-phase={visibleState.phase}>
      <div className="durable-task-loop-header">
        <h2>One cycle through the task loop</h2>
        <p>
          The Temporal Service stores history and schedules tasks, but it never
          runs your code. A Worker polls the Task Queue, executes the workflow,
          and reports back. Each cycle appends one event to the durable Event
          History.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="durable-task-loop-canvas"
        role="img"
        aria-label="Animated loop showing the Temporal Service placing a workflow task on a Task Queue, a Worker polling and taking the task, the Worker executing workflow code, the Worker reporting commands back to the Service, and the Service appending a new event to the append-only Event History"
      />

      <ol
        className="durable-task-loop-steps"
        aria-label="Durable task loop timeline"
      >
        {LOOP_STEPS.map((step, index) => (
          <li
            key={step.phase}
            data-state={stepState(visibleState.phase, index)}
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="durable-task-loop-status">
        {visibleState.phaseLabel}
      </figcaption>
    </figure>
  );
}

function stepState(currentPhase: LoopPhase, index: number) {
  const currentIndex = LOOP_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "active";
  return "pending";
}

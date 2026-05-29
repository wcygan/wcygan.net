import { useEffect, useRef, useState } from "react";
import { createWorkflowActivitiesDemo } from "~/demos/workflow-activities/engine";
import {
  type ActivitiesSnapshot,
  deriveActivitiesSnapshot,
  type WorkflowPhase,
} from "~/demos/workflow-activities/model";

const WORKFLOW_STEPS = [
  { phase: "dispatch-charge", label: "schedule chargeCard" },
  { phase: "run-charge", label: "chargeCard done" },
  { phase: "dispatch-reserve", label: "schedule reserveSeat" },
  { phase: "run-reserve", label: "reserveSeat done" },
  { phase: "dispatch-send", label: "schedule sendItinerary" },
  { phase: "run-send", label: "sendItinerary done" },
] as const satisfies readonly { phase: WorkflowPhase; label: string }[];

const INITIAL_SNAPSHOT = deriveActivitiesSnapshot({
  progress: 0,
  playing: true,
});

type VisibleWorkflowState = Pick<ActivitiesSnapshot, "phase" | "phaseLabel"> & {
  workflowComplete: boolean;
};

export function WorkflowActivitiesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.phaseLabel}:${INITIAL_SNAPSHOT.workflow.status}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleWorkflowState>({
    phase: INITIAL_SNAPSHOT.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
    workflowComplete: INITIAL_SNAPSHOT.workflow.status === "complete",
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createWorkflowActivitiesDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.phase}:${snapshot.phaseLabel}:${snapshot.workflow.status}`;
      if (statusKey === statusKeyRef.current) return;

      statusKeyRef.current = statusKey;
      setVisibleState({
        phase: snapshot.phase,
        phaseLabel: snapshot.phaseLabel,
        workflowComplete: snapshot.workflow.status === "complete",
      });
    });
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure
      className="workflow-activities-demo"
      data-phase={visibleState.phase}
    >
      <div className="workflow-activities-header">
        <h2>bookTrip() orchestrates three activities</h2>
        <p>
          The bookTrip() workflow does no real work itself. It holds the state
          and dispatches activities in order: chargeCard, reserveSeat, then
          sendItinerary. Each activity performs one unit of work and returns a
          result before the next one starts.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="workflow-activities-canvas"
        role="img"
        aria-label="Animated diagram of a bookTrip workflow on the left orchestrating three activities on the right. The workflow sends a schedule command to chargeCard, which works and returns charged $480, then to reserveSeat which returns seat 14C, then to sendItinerary which returns email sent. Only one activity is active at a time and the workflow ends complete."
      />

      <ol
        className="workflow-activities-steps"
        aria-label="Workflow activity sequence"
      >
        {WORKFLOW_STEPS.map((step, index) => (
          <li
            key={step.phase}
            data-state={stepState(
              visibleState.phase,
              visibleState.workflowComplete,
              index,
            )}
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="workflow-activities-status">
        {visibleState.phaseLabel}
      </figcaption>
    </figure>
  );
}

function stepState(
  currentPhase: WorkflowPhase,
  workflowComplete: boolean,
  index: number,
) {
  const currentIndex = WORKFLOW_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  if (workflowComplete) return "complete";
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "active";
  return "pending";
}

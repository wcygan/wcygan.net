// Animated explainer for the durable-execution blog post.
//
// It depicts a trip-booking workflow (bookTrip) that runs four activities in
// sequence: reserveSeat, chargeCard, confirmSeat, sendItinerary. The payment
// activity (chargeCard) fails on its first attempt and succeeds on the second.
//
// The goal is to show, at a high level, what a workflow execution looks like —
// an orchestrator dispatching activities one at a time — and that it keeps
// making forward progress despite faults, by retrying the failed activity until
// it succeeds. The model and rendering live in ~/demos/workflow-activities.
import { useEffect, useRef, useState } from "react";
import { createWorkflowActivitiesDemo } from "~/demos/workflow-activities/engine";
import {
  type ActivitiesSnapshot,
  deriveActivitiesSnapshot,
  type WorkflowPhase,
} from "~/demos/workflow-activities/model";

const WORKFLOW_STEPS = [
  { phase: "dispatch-reserve", label: "schedule reserveSeat" },
  { phase: "run-reserve", label: "reserveSeat done" },
  { phase: "dispatch-charge", label: "schedule chargeCard" },
  { phase: "run-charge", label: "chargeCard attempt 1", fault: true },
  { phase: "fail-charge", label: "attempt 1 fails", fault: true },
  { phase: "retry-charge", label: "retry chargeCard" },
  { phase: "run-charge-retry", label: "attempt 2 succeeds" },
  { phase: "dispatch-confirm", label: "schedule confirmSeat" },
  { phase: "run-confirm", label: "confirmSeat done" },
  { phase: "dispatch-send", label: "schedule sendItinerary" },
  { phase: "run-send", label: "sendItinerary done" },
] as const satisfies readonly {
  phase: WorkflowPhase;
  label: string;
  fault?: boolean;
}[];

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
        <h2>Trip Booking Workflow</h2>
        <p>
          The bookTrip() workflow does no real work itself. It holds the state
          and dispatches activities in order: reserveSeat, chargeCard,
          confirmSeat, then sendItinerary. Each fills its progress ring to 100%
          and returns a result before the next one starts. chargeCard fails on
          its first attempt, so Temporal retries it after a backoff and the
          second attempt succeeds.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="workflow-activities-canvas"
        role="img"
        aria-label="Animated diagram of a bookTrip workflow on the left orchestrating four activities on the right. The workflow sends a schedule command to reserveSeat, which fills a circular progress ring to 100% and returns seat 14C, then to chargeCard, whose first attempt fails at 50% and shows a red cross; Temporal retries chargeCard after a backoff and the second attempt fills to 100% and returns charged $480. Then confirmSeat returns seat confirmed and sendItinerary returns email sent. Only one activity is active at a time and the workflow ends complete."
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
              step.phase,
              "fault" in step && step.fault === true,
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
  stepPhase: WorkflowPhase,
  fault: boolean,
) {
  const currentIndex = WORKFLOW_STEPS.findIndex(
    (step) => step.phase === currentPhase,
  );

  // A failure step stays red once reached: the failed attempt is part of the
  // history even after the retry succeeds and the workflow completes.
  const reached = workflowComplete || index < currentIndex;
  if (reached) return fault ? "failed" : "complete";

  if (index === currentIndex) {
    // The backoff phase is the moment the failure is on screen; show it red.
    return stepPhase === "fail-charge" ? "failed" : "active";
  }
  return "pending";
}

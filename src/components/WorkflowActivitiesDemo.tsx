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
import { useEffect, useRef } from "react";
import { createWorkflowActivitiesDemo } from "~/demos/workflow-activities/engine";

export function WorkflowActivitiesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createWorkflowActivitiesDemo(canvas);
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure className="workflow-activities-demo">
      <div className="workflow-activities-header">
        <h2>Trip Booking Workflow</h2>
        <p>An example workflow that retries when the payment activity fails</p>
      </div>

      <canvas
        ref={canvasRef}
        className="workflow-activities-canvas"
        role="img"
        aria-label="Animated diagram of a bookTrip workflow on the left orchestrating four activities on the right. The workflow sends a schedule command to reserveSeat, which fills a circular progress ring to 100% and returns seat 14C, then to chargeCard, whose first attempt fails at 50% and shows a red cross; Temporal retries chargeCard after a backoff and the second attempt fills to 100% and returns charged $480. Then confirmSeat returns seat confirmed and sendItinerary returns email sent. Only one activity is active at a time and the workflow ends complete."
      />
    </figure>
  );
}

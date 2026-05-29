// Animated explainer for the durable-execution blog post.
//
// One Worker crash, told as two acts whose Event Histories look OPPOSITE. Act 1
// crashes during a Workflow Task: the task times out (WorkflowTaskTimedOut is
// recorded), is rescheduled, and another Worker replays the durable history and
// completes it — every recovery step is a row. Act 2 crashes during an Activity
// Task: per docs.temporal.io/workflow-execution/event, ActivityTaskScheduled is the
// only Activity event while it retries, so the crash, the start-to-close
// timeout, and the silent retry write nothing; ActivityTaskStarted lands only
// with the terminal ActivityTaskCompleted. The charge may have run twice and
// history will not show it, which is why the Activity must be idempotent. Model
// and rendering live in ~/demos/worker-crash-modes.
import { useEffect, useRef } from "react";
import { createWorkerCrashModesDemo } from "~/demos/worker-crash-modes/engine";

export function WorkerCrashModesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createWorkerCrashModesDemo(canvas);
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure className="worker-crash-modes-demo">
      <div className="worker-crash-modes-header">
        <h2>Two crashes, two histories</h2>
        <p>
          A Worker dies mid-task in both logs. The Workflow Task records its
          whole recovery in Event History; the Activity retry leaves no trace at
          all, which is exactly why it has to be idempotent.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="worker-crash-modes-canvas"
        role="img"
        aria-label="Two side-by-side Event History logs that end up looking opposite. In the left log, a Workflow Task is scheduled and started by Worker A, which crashes; the Workflow Task Timeout elapses and is recorded as WorkflowTaskTimedOut, the task is rescheduled, and Worker B replays the durable history and resumes with WorkflowTaskCompleted — every recovery step is a durable row. In the right log, a completed Workflow Task schedules the chargeCard Activity, ActivityTaskScheduled is written, and a Worker runs attempt 1, but no ActivityTaskStarted is recorded yet. The Worker crashes; the start-to-close timeout fires and Temporal silently retries as attempt 2, writing no new events — ActivityTaskScheduled stays the only Activity event. Only when the retry succeeds do ActivityTaskStarted and ActivityTaskCompleted land. The Workflow Task history is long and shows the recovery; the Activity history is short and hides it, so the side effect may have run twice and the Activity must be idempotent."
      />
    </figure>
  );
}

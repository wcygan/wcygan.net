// Animated explainer for the durable-execution blog post.
//
// It depicts the Temporal task loop as a queue the Worker drains to empty: a
// completed Workflow Task scheduled activity tasks, the Service queues them
// (drawn as a row of slots — capped at four for the visual, not a real Task
// Queue limit), and the Worker polls and runs one activity at a time (a filling
// progress ring), reporting each outcome so the Service can append a durable
// event. Activities — not Workflow Tasks — are the unit that does real work and
// can fail, so three run per loop: the middle one fails its first attempt, backs
// off, and retries to success, so the ring resolves to a green check
// (ActivityTaskCompleted) or a red cross (ActivityTaskFailed). The Worker keeps
// going until the queue is empty and every activity is complete. Model and
// rendering live in ~/demos/durable-task-loop.
import { useEffect, useRef, useState } from "react";
import { createDurableTaskLoopDemo } from "~/demos/durable-task-loop/engine";
import {
  deriveDurableTaskLoopSnapshot,
  type DurableTaskLoopSnapshot,
} from "~/demos/durable-task-loop/model";

const INITIAL_SNAPSHOT = deriveDurableTaskLoopSnapshot({
  progress: 0,
  playing: true,
});

type VisibleTaskLoopState = {
  phase: DurableTaskLoopSnapshot["worker"]["phase"];
  phaseLabel: DurableTaskLoopSnapshot["phaseLabel"];
};

export function DurableTaskLoopDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.worker.phase}:${INITIAL_SNAPSHOT.phaseLabel}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleTaskLoopState>({
    phase: INITIAL_SNAPSHOT.worker.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createDurableTaskLoopDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.worker.phase}:${snapshot.phaseLabel}`;
      if (statusKey === statusKeyRef.current) return;

      statusKeyRef.current = statusKey;
      setVisibleState({
        phase: snapshot.worker.phase,
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
        <h2>The coordination loop</h2>
        <p>
          The Temporal Service queues pending tasks; a Worker processes the
          queue, running each activity and reporting every outcome to the Event
          History.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="durable-task-loop-canvas"
        role="img"
        aria-label="Animated diagram of a durable task loop. After a Workflow Task schedules the work, the Temporal Service places activity tasks into a Task Queue, shown as a row of slots that fill with pending tasks. A Worker polls the queue and runs one activity at a time while a circular progress ring fills from 0 to 100 percent. The first activity completes with a green check; the second fails partway with a red cross, then Temporal waits out a backoff and retries it to success; the third completes too. The Worker keeps draining the queue until it is empty and every activity is complete. After each result the Service appends a new event to a durable, append-only Event History panel that opens with the workflow bootstrap events and then interleaves ActivityTaskScheduled, ActivityTaskStarted, ActivityTaskFailed, and ActivityTaskCompleted as the log grows over time."
      />
      <figcaption className="durable-task-loop-status">
        {visibleState.phaseLabel}
      </figcaption>
    </figure>
  );
}

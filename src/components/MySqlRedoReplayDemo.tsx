import { useEffect, useRef, useState } from "react";
import { createMySqlRedoReplayDemo } from "~/demos/mysql-redo-log/replay-engine";
import {
  deriveReplaySnapshot,
  INITIAL_REPLAY_STATE,
  type ReplaySnapshot,
} from "~/demos/mysql-redo-log/replay-model";

export function MySqlRedoReplayDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<ReplaySnapshot>(() =>
    deriveReplaySnapshot(INITIAL_REPLAY_STATE),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createMySqlRedoReplayDemo(canvas, setSnapshot);
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure
      data-graphic-frame="plate"
      aria-labelledby="mysql-redo-replay-title"
      className="mysql-redo-replay-demo"
      data-phase={replayPhase(snapshot)}
    >
      <div className="mysql-redo-replay-header">
        <p className="article-graphic-title" id="mysql-redo-replay-title">
          High-level InnoDB redo replay
        </p>
        <p>Logical cards stand in for lower-level page redo records.</p>
      </div>

      <canvas
        data-graphic-stage="flush"
        ref={canvasRef}
        className="mysql-redo-replay-canvas"
        role="img"
        aria-label="Animated high-level MySQL redo replay demo showing durable redo records after a checkpoint replayed in LSN order into recovered InnoDB state"
      />

      <figcaption className="mysql-redo-replay-status">
        {snapshot.phaseLabel}
      </figcaption>
    </figure>
  );
}

function replayPhase(snapshot: ReplaySnapshot) {
  if (snapshot.appliedCount === 0) return "checkpoint";
  if (snapshot.activeRecord === undefined) return "complete";
  return "replay";
}

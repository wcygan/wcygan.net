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
    <figure className="mysql-redo-replay-demo">
      <div className="mysql-redo-replay-header">
        <h2>High-level InnoDB redo replay</h2>
        <p>Logical cards stand in for lower-level page redo records.</p>
      </div>

      <canvas
        ref={canvasRef}
        className="mysql-redo-replay-canvas"
        aria-label="Animated high-level MySQL redo replay demo showing durable redo records after a checkpoint replayed in LSN order into recovered InnoDB state"
      />

      <div className="mysql-redo-replay-footer">
        <p className="mysql-redo-replay-status" aria-live="polite">
          {snapshot.phaseLabel}
        </p>
      </div>
    </figure>
  );
}

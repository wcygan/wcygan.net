import { useEffect, useRef, useState } from "react";
import { createWalReplayDemo } from "~/demos/write-ahead-logging/engine";
import {
  deriveReplaySnapshot,
  INITIAL_REPLAY_STATE,
  type ReplaySnapshot,
} from "~/demos/write-ahead-logging/model";

export function WalReplayDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<ReplaySnapshot>(() =>
    deriveReplaySnapshot(INITIAL_REPLAY_STATE),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createWalReplayDemo(canvas, setSnapshot);
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure className="wal-replay-demo">
      <div className="wal-replay-header">
        <h2>WAL replay rebuilds the database in memory</h2>
        <p>
          Recovery reads saved INSERT, UPDATE, and DELETE records from disk and
          applies them to an in-memory copy of the database.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="wal-replay-canvas"
        aria-label="Animated WAL replay demo showing log records on disk updating an in-memory database"
      />

      <div className="wal-replay-footer">
        <p className="wal-replay-status" aria-live="polite">
          {snapshot.phaseLabel}
        </p>
      </div>
    </figure>
  );
}

import { useEffect, useRef, useState } from "react";
import { createWalWritePathDemo } from "~/demos/write-ahead-logging/write-path-engine";
import {
  deriveWalWritePathSnapshot,
  INITIAL_WAL_WRITE_PATH_STATE,
  type WalWritePathSnapshot,
} from "~/demos/write-ahead-logging/write-path-model";

export function WalWritePathDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [snapshot, setSnapshot] = useState<WalWritePathSnapshot>(() =>
    deriveWalWritePathSnapshot(INITIAL_WAL_WRITE_PATH_STATE),
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createWalWritePathDemo(canvas, setSnapshot);
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure className="wal-write-path-demo">
      <div className="wal-write-path-header">
        <h2>The database writes the WAL before changing memory</h2>
        <p>
          The SQL database accepts the update, records it durably in the WAL,
          and only then lets the in-memory row move from free to pro.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="wal-write-path-canvas"
        aria-label="Animated WAL write-path demo showing an UPDATE statement written to the WAL before in-memory state changes"
      />

      <div className="wal-write-path-footer">
        <p className="wal-write-path-status" aria-live="polite">
          {snapshot.phaseLabel}
        </p>
      </div>
    </figure>
  );
}

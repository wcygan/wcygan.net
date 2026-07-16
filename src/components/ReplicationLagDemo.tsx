import { useEffect, useRef, useState } from "react";
import { createReplicationLagDemo } from "~/demos/replication-lag/engine";
import {
  deriveLagSnapshot,
  LAG_STEPS,
  type LagPhase,
  type LagSnapshot,
  lagStepState,
} from "~/demos/replication-lag/model";

const INITIAL_SNAPSHOT = deriveLagSnapshot({ progress: 0, playing: true });

type VisibleLagState = Pick<LagSnapshot, "phase" | "phaseLabel">;

export function ReplicationLagDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.phaseLabel}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleLagState>({
    phase: INITIAL_SNAPSHOT.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createReplicationLagDemo(canvas, (snapshot) => {
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
    <figure
      className="replication-lag-demo"
      data-graphic-frame="plate"
      aria-labelledby="replication-lag-title"
      data-phase={visibleState.phase}
    >
      <div className="replication-lag-header">
        <p className="article-graphic-title" id="replication-lag-title">
          Replication Lag
        </p>
        <p>
          A write may be accepted before every region has copied it, so failover
          has to know which replicas are current enough to serve.
        </p>
      </div>

      <canvas
        data-graphic-stage="flush"
        ref={canvasRef}
        className="replication-lag-canvas"
        role="img"
        aria-label="Animated replication lag demo showing a Seattle user writing version 19, Texas catching up, Virginia failing, Oregon returning stale version 18 to the user, and Oregon repairing from Texas"
      />

      <ol
        className="replication-lag-steps"
        aria-label="Replication lag timeline"
      >
        {LAG_STEPS.map((step, index) => (
          <li
            key={step.phase}
            data-state={lagStepState(visibleState.phase as LagPhase, index)}
            aria-current={
              step.phase === visibleState.phase ? "step" : undefined
            }
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="replication-lag-status">
        {visibleState.phaseLabel}
      </figcaption>
    </figure>
  );
}

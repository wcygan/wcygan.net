import { useEffect, useRef, useState } from "react";
import { createHomeRegionRoutingDemo } from "~/demos/home-region-routing/engine";
import {
  deriveRoutingSnapshot,
  ROUTING_STEPS,
  type RoutingPhase,
  type RoutingSnapshot,
  routingStepState,
} from "~/demos/home-region-routing/model";

const INITIAL_SNAPSHOT = deriveRoutingSnapshot({ progress: 0, playing: true });

type VisibleRoutingState = Pick<RoutingSnapshot, "phase" | "phaseLabel">;

export function HomeRegionRoutingDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.phase}:${INITIAL_SNAPSHOT.phaseLabel}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleRoutingState>({
    phase: INITIAL_SNAPSHOT.phase,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createHomeRegionRoutingDemo(canvas, (snapshot) => {
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
      data-graphic-frame="plate"
      aria-labelledby="home-region-routing-title"
      className="home-region-routing-demo"
      data-phase={visibleState.phase}
    >
      <div className="home-region-routing-header">
        <p className="article-graphic-title" id="home-region-routing-title">
          Entity Routing
        </p>
        <p>
          A request can enter through the nearest healthy edge while account
          writes still route to the region that owns that account.
        </p>
      </div>

      <canvas
        data-graphic-stage="flush"
        ref={canvasRef}
        className="home-region-routing-canvas"
        role="img"
        aria-label="Animated entity routing demo showing a Seattle user request entering Oregon, the account directory returning Virginia as the account home, Oregon routing the write to Virginia, and Virginia replicating the committed version to Texas and Oregon"
      />

      <ol
        className="home-region-routing-steps"
        aria-label="Entity routing timeline"
      >
        {ROUTING_STEPS.map((step, index) => (
          <li
            key={step.phase}
            data-state={routingStepState(
              visibleState.phase as RoutingPhase,
              index,
            )}
            aria-current={
              step.phase === visibleState.phase ? "step" : undefined
            }
          >
            <span>{step.label}</span>
          </li>
        ))}
      </ol>

      <figcaption className="home-region-routing-status">
        {visibleState.phaseLabel}
      </figcaption>
    </figure>
  );
}

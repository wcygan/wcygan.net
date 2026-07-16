import { useEffect, useRef, useState } from "react";
import { createCdcWalKafkaDemo } from "~/demos/cdc-wal-kafka/engine";
import {
  deriveWalKafkaSnapshot,
  type WalKafkaSnapshot,
} from "~/demos/cdc-wal-kafka/model";

const INITIAL_SNAPSHOT = deriveWalKafkaSnapshot({ progress: 0, playing: true });

type VisibleWalKafkaState = {
  phase: WalKafkaSnapshot["activeUpdate"]["status"];
  phaseLabel: WalKafkaSnapshot["phaseLabel"];
  recordLabel: WalKafkaSnapshot["activeUpdate"]["walSummary"];
};

export function CdcWalKafkaDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusKeyRef = useRef(
    `${INITIAL_SNAPSHOT.activeUpdate.status}:${INITIAL_SNAPSHOT.phaseLabel}:${INITIAL_SNAPSHOT.activeUpdate.walSummary}`,
  );
  const [visibleState, setVisibleState] = useState<VisibleWalKafkaState>({
    phase: INITIAL_SNAPSHOT.activeUpdate.status,
    phaseLabel: INITIAL_SNAPSHOT.phaseLabel,
    recordLabel: INITIAL_SNAPSHOT.activeUpdate.walSummary,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createCdcWalKafkaDemo(canvas, (snapshot) => {
      const statusKey = `${snapshot.activeUpdate.status}:${snapshot.phaseLabel}:${snapshot.activeUpdate.walSummary}`;
      if (statusKey === statusKeyRef.current) return;

      statusKeyRef.current = statusKey;
      setVisibleState({
        phase: snapshot.activeUpdate.status,
        phaseLabel: snapshot.phaseLabel,
        recordLabel: snapshot.activeUpdate.walSummary,
      });
    });
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure
      className="cdc-wal-kafka-demo"
      data-graphic-frame="plate"
      aria-labelledby="cdc-wal-kafka-title"
      data-phase={visibleState.phase}
    >
      <div className="cdc-wal-kafka-header">
        <p className="article-graphic-title" id="cdc-wal-kafka-title">
          Debezium reads the WAL in order
        </p>
        <p>
          Postgres writes three row changes to the WAL. Debezium reads them one
          by one and sends each event to Kafka.
        </p>
      </div>

      <canvas
        data-graphic-stage="flush"
        ref={canvasRef}
        className="cdc-wal-kafka-canvas"
        role="img"
        aria-label="Animated demo showing Debezium reading three Postgres WAL row changes and producing Kafka events"
      />

      <div className="cdc-wal-kafka-legend" aria-label="WAL demo legend">
        <span>
          <i data-tone="active" />
          active WAL record
        </span>
        <span>
          <i data-tone="event" />
          event in flight
        </span>
        <span>
          <i data-tone="produced" />
          produced Kafka event
        </span>
      </div>
      <figcaption className="cdc-wal-kafka-status">
        {visibleState.phaseLabel}: {visibleState.recordLabel}
      </figcaption>
    </figure>
  );
}

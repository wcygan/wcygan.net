import { useEffect, useRef } from "react";
import { createCdcWalKafkaDemo } from "~/demos/cdc-wal-kafka/engine";

export function CdcWalKafkaDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createCdcWalKafkaDemo(canvas);
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <figure className="cdc-wal-kafka-demo">
      <div className="cdc-wal-kafka-header">
        <h2>Debezium reads the WAL in order</h2>
        <p>
          Postgres writes three row changes to the WAL. Debezium reads them one
          by one and sends each event to Kafka.
        </p>
      </div>

      <canvas
        ref={canvasRef}
        className="cdc-wal-kafka-canvas"
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
    </figure>
  );
}

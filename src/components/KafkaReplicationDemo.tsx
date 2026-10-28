import { useEffect, useId, useRef, useState } from "react";
import {
  brokers,
  layout,
  logOrigin,
  motionPath,
  position,
  routePoints,
  snapshot,
  stageStarts,
  stages,
  totalDuration,
  type Point,
  type RecordLabel,
} from "~/demos/kafka-replication/model";
import "~/demos/kafka-routing/routing.css";

function RecordBlock({
  x,
  y,
  label,
}: {
  x: number;
  y: number;
  label: RecordLabel;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        width="28"
        height="24"
        rx="4"
        fill={label === "A" ? "#dfecf8" : "#f7ddce"}
        stroke={label === "A" ? "#326d9d" : "#b84612"}
      />
      <text x="14" y="17" fontSize="17" textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
const pathData = (points: readonly Point[]) =>
  `M${points.map((point) => point.join(" ")).join(" L")}`;

export function KafkaReplicationDemo() {
  const figure = useRef<HTMLElement>(null);
  const markerId = useId();
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const complete = elapsed >= totalDuration;
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(motion.matches);
      if (motion.matches) {
        setPlaying(false);
        setElapsed(totalDuration);
      }
    };
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    motion.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    if (figure.current) observer.observe(figure.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);
  useEffect(() => {
    if (!playing || !visible || !documentVisible || reduced || complete) return;
    let previous = 0;
    let frame = 0;
    const tick = (now: number) => {
      const delta = now - previous;
      if (previous)
        setElapsed((value) => Math.min(totalDuration, value + delta));
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, visible, documentVisible, reduced, complete]);
  const { index, state, progress } = snapshot(elapsed);
  const move = state.move;
  const payloadPosition =
    move && progress < 1 ? position(motionPath(state), progress) : undefined;
  const leader = state.leader;
  return (
    <figure
      ref={figure}
      className="kafka-routing-demo kafka-placement"
      data-graphic-frame="workbench"
      data-graphic-key="kafka-replication"
      data-graphic-kind="svg"
      aria-label="Replication and broker failure"
    >
      <div className="kafka-routing-stage" data-graphic-stage="padded">
        <div className="kafka-routing-title">Replication and failover</div>
        <svg
          className="kafka-broker-rows"
          viewBox="0 0 600 320"
          role="img"
          aria-label="One partition replicated across three brokers. Broker 0 fails and Broker 1 becomes leader."
        >
          <defs>
            <marker
              id={markerId}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path
                d="M1 1 L8 5 L1 9"
                fill="none"
                stroke="#8f8c83"
                strokeWidth="1.5"
              />
            </marker>
          </defs>
          {leader !== null && (
            <>
              <path
                d={pathData(routePoints("producer", leader))}
                className="kafka-row-route"
                stroke={move?.from === "producer" ? "#b84a19" : "#c5c4be"}
                markerEnd={`url(#${markerId})`}
              />
              {brokers
                .filter(
                  (broker) =>
                    broker !== leader && !(state.failed && broker === 0),
                )
                .map((broker) => (
                  <path
                    key={broker}
                    d={pathData(routePoints(leader, broker))}
                    className="kafka-row-route"
                    stroke={
                      move &&
                      move.from !== "producer" &&
                      (move.from === broker || move.to === broker)
                        ? "#b84a19"
                        : "#c5c4be"
                    }
                  />
                ))}
            </>
          )}
          <rect
            x="16"
            y="135"
            width="116"
            height="50"
            rx="4"
            className="kafka-row-box"
          />
          <text x="74" y="166" fontSize="18" textAnchor="middle">
            Producer
          </text>
          {brokers.map((broker) => {
            const [x, y] = layout.nodes[broker];
            const failed = state.failed && broker === 0;
            const isLeader = leader === broker;
            const role = failed ? "Offline" : isLeader ? "Leader" : "Follower";
            const [rx, ry] = logOrigin(broker);
            const contents = [...state.logs[broker]];
            if (
              progress === 1 &&
              move &&
              move.label !== "fetch" &&
              move.to === broker
            )
              contents.push(move.label);
            return (
              <g key={broker}>
                <rect
                  x={x}
                  y={y}
                  width={layout.w}
                  height={layout.h}
                  rx="4"
                  fill={failed ? "#f0efeb" : "#fdfdfc"}
                  stroke={isLeader ? "#c85b28" : "#bcbab3"}
                />
                <text x={x + 14} y={y + 26} fontSize="19">
                  Broker {broker}
                </text>
                <text
                  x={x + 14}
                  y={y + 48}
                  fontSize="16"
                  fill={failed ? "#9d4130" : isLeader ? "#a44217" : "#63635e"}
                >
                  P0 · {role}
                </text>
                {contents.map((label, n) => (
                  <RecordBlock
                    key={n}
                    x={rx + n * 36}
                    y={ry}
                    label={label === "A" ? "A" : "B"}
                  />
                ))}
              </g>
            );
          })}
          {payloadPosition &&
            move &&
            (move.label === "fetch" ? (
              <g
                transform={`translate(${payloadPosition[0]} ${payloadPosition[1]})`}
              >
                <rect
                  x="-24"
                  y="-11"
                  width="48"
                  height="22"
                  rx="4"
                  className="kafka-row-box"
                />
                <text x="0" y="5" fontSize="13" textAnchor="middle">
                  fetch
                </text>
              </g>
            ) : (
              <RecordBlock
                x={payloadPosition[0] - 14}
                y={payloadPosition[1] - 12}
                label={move.label}
              />
            ))}
          <text
            x="300"
            y="314"
            textAnchor="middle"
            fontSize="16"
            className="kafka-row-muted"
          >
            {state.name}
          </text>
        </svg>
      </div>
      <div className="kafka-routing-controls">
        <button
          type="button"
          disabled={reduced || complete}
          onClick={() => setPlaying(!playing)}
        >
          {playing && !complete ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={complete}
          onClick={() => {
            setPlaying(false);
            setElapsed(stageStarts[Math.min(index + 1, stages.length - 1)]);
          }}
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => {
            setElapsed(reduced ? totalDuration : 0);
            setPlaying(!reduced);
          }}
        >
          Replay
        </button>
      </div>
      <p className="sr-only" role="status">
        {state.name}.{" "}
        {complete
          ? "Broker 0 is offline with A. Broker 1 leads P0; Brokers 1 and 2 hold A and B."
          : ""}
      </p>
    </figure>
  );
}

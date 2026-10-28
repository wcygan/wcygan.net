import { useEffect, useRef, useState } from "react";
import { murmur2 } from "~/demos/kafka-partitioning/model";
import "~/demos/kafka-routing/routing.css";

const keys = ["order-101", "order-102", "order-105"] as const;
const events = [
  0, 1, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0,
] as const;
const partition = (key: string) => (murmur2(key) & 0x7fffffff) % 3;

export function KafkaHotKeyDemo() {
  const figure = useRef<HTMLElement>(null);
  const [count, setCount] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(motion.matches);
      if (motion.matches) {
        setPlaying(false);
        setCount(events.length);
      }
    };
    update();
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    motion.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.25 },
    );
    if (figure.current) observer.observe(figure.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);
  useEffect(() => {
    if (
      !playing ||
      !visible ||
      !documentVisible ||
      reduced ||
      count === events.length
    )
      return;
    const timer = window.setTimeout(() => setCount(count + 1), 550);
    return () => window.clearTimeout(timer);
  }, [count, playing, visible, documentVisible, reduced]);
  const shown = events.slice(0, count);
  return (
    <figure
      ref={figure}
      className="kafka-routing-demo"
      data-graphic-frame="workbench"
      data-graphic-key="kafka-hot-key"
      data-graphic-kind="dom"
      aria-label="Hot key and partition load"
    >
      <div className="kafka-routing-stage" data-graphic-stage="padded">
        <div className="kafka-routing-title">Hot key</div>
        <div className="kafka-routing-keys">
          {keys.map((key, i) => (
            <div key={key}>
              <span className={i === 0 ? "kafka-routing-hot" : ""}>
                {key} → P{partition(key)}
              </span>
              <span>{shown.filter((x) => x === i).length} records</span>
            </div>
          ))}
        </div>
        <div className="kafka-routing-logs">
          {[0, 1, 2].map((p) => (
            <div className="kafka-routing-log" key={p}>
              <span>P{p}</span>
              <div className="kafka-routing-blocks">
                {shown.map((k, i) =>
                  partition(keys[k]) === p ? (
                    <span
                      key={i}
                      className={
                        k === 0
                          ? "kafka-routing-block-hot"
                          : "kafka-routing-block"
                      }
                    />
                  ) : null,
                )}
              </div>
              <span>
                {shown.filter((k) => partition(keys[k]) === p).length}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="kafka-routing-controls">
        <button
          type="button"
          onClick={() => {
            if (count === events.length) setCount(0);
            setPlaying(!playing || count === events.length);
          }}
          disabled={reduced}
        >
          {playing && count < events.length ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setCount(Math.min(count + 1, events.length));
          }}
          disabled={count === events.length}
        >
          Step
        </button>
        <button
          type="button"
          onClick={() => {
            setCount(reduced ? events.length : 0);
            setPlaying(!reduced);
          }}
        >
          Replay
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {count === events.length
          ? `The hot key ${keys[0]} sent ${shown.filter((k) => k === 0).length} records to partition ${partition(keys[0])}.`
          : ""}
      </p>
    </figure>
  );
}

const records = ["order-101", "order-102", "order-105", "order-101"] as const;
const fills = ["#f7ddce", "#dfecf8", "#e6efe5"] as const;
const strokes = ["#b84612", "#326d9d", "#507b58"] as const;
const recordDuration = 3600;
const recordSpeed = 200;
const partitionerPause = 350;

function RecordBlock({
  id,
  partition: p,
  x,
  y,
}: {
  id: number;
  partition: number;
  x: number;
  y: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x="-16.25"
        y="-9.1"
        width="32.5"
        height="18.2"
        rx="2"
        fill={fills[p]}
        stroke={strokes[p]}
      />
      <text x="0" y="6" textAnchor="middle" fontSize="15.8">
        R{id}
      </text>
    </g>
  );
}

function recordPosition(
  elapsed: number,
  p: number,
  offset: number,
): { position: [number, number]; routed: boolean } {
  const y = 45 + p * 93;
  const points = [
    [98, 135],
    [98, 180],
    [178, 214],
    [290, y + 39],
    [443 + offset * 39, y + 50],
  ];
  let remaining = elapsed;
  for (let i = 0; i < points.length - 1; i++) {
    if (i === 2) {
      if (remaining < partitionerPause)
        return { position: [points[i][0], points[i][1]], routed: true };
      remaining -= partitionerPause;
    }
    const [x, y] = points[i];
    const [nextX, nextY] = points[i + 1];
    const duration = (Math.hypot(nextX - x, nextY - y) / recordSpeed) * 1000;
    if (remaining < duration) {
      const fraction = remaining / duration;
      return {
        position: [x + (nextX - x) * fraction, y + (nextY - y) * fraction],
        routed: i >= 2,
      };
    }
    remaining -= duration;
  }
  const destination = points[points.length - 1];
  return { position: [destination[0], destination[1]], routed: true };
}

export function KafkaBrokerPlacementDemo() {
  const figure = useRef<HTMLElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const totalDuration = records.length * recordDuration;

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
  }, [totalDuration]);

  useEffect(() => {
    if (
      !playing ||
      !visible ||
      !documentVisible ||
      reduced ||
      elapsed >= totalDuration
    )
      return;
    let previous = 0;
    let frame = 0;
    const tick = (now: number) => {
      if (previous)
        setElapsed((value) =>
          Math.min(totalDuration, value + (now - previous)),
        );
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    playing,
    visible,
    documentVisible,
    reduced,
    elapsed >= totalDuration,
    totalDuration,
  ]);

  const completed = Math.min(
    records.length,
    Math.floor(elapsed / recordDuration),
  );
  const key = records[completed];
  const selected = key === undefined ? undefined : partition(key);
  const currentOffset = records
    .slice(0, completed)
    .filter((item) => partition(item) === selected).length;
  const motion =
    selected === undefined
      ? undefined
      : recordPosition(elapsed % recordDuration, selected, currentOffset);

  return (
    <figure
      ref={figure}
      className="kafka-routing-demo kafka-placement"
      data-graphic-frame="workbench"
      data-graphic-key="kafka-broker-placement"
      data-graphic-kind="svg"
      aria-label="Producer sends records to partition leaders on brokers"
    >
      <div className="kafka-routing-stage" data-graphic-stage="padded">
        <div className="kafka-routing-title">Writes to partition leaders</div>
        <svg
          className="kafka-broker-rows"
          viewBox="0 0 600 340"
          role="img"
          aria-label="Producer routes records through a partitioner to leaders on three brokers"
        >
          <rect
            x="18"
            y="67"
            width="160"
            height="68"
            rx="3"
            className="kafka-row-box"
          />
          <text x="98" y="92" textAnchor="middle" fontSize="20">
            Producer
          </text>
          <text
            x="98"
            y="123"
            textAnchor="middle"
            fontSize="15"
            className="kafka-row-muted"
          >
            send(record)
          </text>
          <path
            d="M98 135 L98 180"
            className="kafka-row-route"
            stroke="#777770"
          />
          <rect
            x="18"
            y="180"
            width="160"
            height="68"
            rx="3"
            className="kafka-row-partitioner"
          />
          <text x="98" y="204" textAnchor="middle" fontSize="19">
            Partitioner
          </text>
          <text x="98" y="236" textAnchor="middle" fontSize="13.5">
            {key ? `${key} → P${selected}` : "key → partition"}
          </text>
          {[0, 1, 2].map((p) => {
            const y = 45 + p * 93;
            return (
              <g key={p}>
                <path
                  d={`M178 214 L290 ${y + 39}`}
                  className="kafka-row-route"
                  stroke={
                    selected === p && motion?.routed ? strokes[p] : "#c5c4be"
                  }
                />
                <rect
                  x="290"
                  y={y}
                  width="290"
                  height="78"
                  rx="3"
                  className="kafka-row-box"
                />
                <text x="302" y={y + 23} fontSize="17.5">
                  Broker {p}
                </text>
                <rect
                  x="420"
                  y={y + 10}
                  width="148"
                  height="57"
                  rx="3"
                  fill={fills[p]}
                  stroke={strokes[p]}
                />
                <text x="429" y={y + 29} fontSize="15">
                  P{p} leader
                </text>
                {records
                  .slice(0, completed)
                  .map((item, i) =>
                    partition(item) === p ? (
                      <RecordBlock
                        key={i}
                        id={i + 1}
                        partition={p}
                        x={
                          443 +
                          records
                            .slice(0, i)
                            .filter((prior) => partition(prior) === p).length *
                            39
                        }
                        y={y + 50}
                      />
                    ) : null,
                  )}
              </g>
            );
          })}
          {motion && selected !== undefined && (
            <RecordBlock
              id={completed + 1}
              partition={selected}
              x={motion.position[0]}
              y={motion.position[1]}
            />
          )}
        </svg>
      </div>
      <div className="kafka-routing-controls">
        <button
          type="button"
          disabled={reduced || completed === records.length}
          onClick={() => setPlaying(!playing)}
        >
          {playing && completed < records.length ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={completed === records.length}
          onClick={() => {
            setPlaying(false);
            setElapsed((completed + 1) * recordDuration);
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
        {completed === records.length
          ? "Writes complete. P0 has R2, P1 has R1 and R4, and P2 has R3."
          : `${completed} of ${records.length} records written.`}
      </p>
    </figure>
  );
}

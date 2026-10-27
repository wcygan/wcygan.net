import { useEffect, useRef, useState, type CSSProperties } from "react";
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

const writes = [
  "order-102",
  "order-101",
  "order-105",
  "order-102",
  "order-101",
  "order-105",
] as const;
const routeX = [50, 150, 250] as const;
const routeStartY = 25;
const routeEndY = 82;
function routeArrow(endX: number) {
  const dx = endX - 150;
  const dy = routeEndY - routeStartY;
  const length = Math.hypot(dx, dy);
  const ux = dx / length;
  const uy = dy / length;
  const x = endX - ux * 7;
  const y = routeEndY - uy * 7;
  return `M ${x - uy * 3} ${y + ux * 3} L ${endX} ${routeEndY} L ${x + uy * 3} ${y - ux * 3}`;
}
type PartitionLogs = number[][];
function appendWrite(logs: PartitionLogs, partition: number): PartitionLogs {
  const id = logs.reduce((total, log) => total + log.length, 0) + 1;
  return logs.map((log, index) => (index === partition ? [...log, id] : log));
}
const emptyLogs = (): PartitionLogs => [[], [], []];
const settledLogs = () =>
  writes.reduce<PartitionLogs>(
    (logs, key) => appendWrite(logs, partition(key)),
    emptyLogs(),
  );

export function KafkaBrokerPlacementDemo() {
  const figure = useRef<HTMLElement>(null);
  const [leader, setLeader] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [logs, setLogs] = useState<PartitionLogs>(emptyLogs);
  const [moving, setMoving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReduced(motion.matches);
      if (motion.matches) {
        setPlaying(false);
        setCompleted(writes.length);
        setMoving(false);
        setProcessing(false);
        setLogs((current) =>
          current.some((log) => log.length) ? current : settledLogs(),
        );
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
    if (
      !playing ||
      !visible ||
      !documentVisible ||
      reduced ||
      completed === writes.length
    )
      return;
    const start = window.setTimeout(() => setProcessing(true), 150);
    const dispatch = window.setTimeout(() => {
      setProcessing(false);
      setMoving(true);
    }, 600);
    const finish = window.setTimeout(() => {
      setLogs((current) => appendWrite(current, partition(writes[completed])));
      setCompleted((c) => c + 1);
      setMoving(false);
    }, 1600);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(dispatch);
      window.clearTimeout(finish);
    };
  }, [playing, visible, documentVisible, reduced, completed]);

  const destination = (p: number) => (p === 0 ? leader : p);
  const routeEnd = (p: number) =>
    routeX[destination(p)] + (p === 0 && leader !== 0 ? -6 : 0);
  const currentKey = writes[completed];
  const current = currentKey === undefined ? undefined : partition(currentKey);
  const displayKey = currentKey ?? writes[writes.length - 1];
  const displayPartition = partition(displayKey);
  useEffect(() => {
    figure.current
      ?.querySelectorAll<HTMLElement>(".kafka-broker-records")
      .forEach((log) => {
        log.scrollTop = log.scrollHeight;
      });
  }, [logs, leader]);
  function moveLeader(nextLeader: number) {
    if (nextLeader === leader) return;
    setLeader(nextLeader);
    setMoving(false);
    setProcessing(false);
    setCompleted(0);
    setPlaying(!reduced);
  }
  function restart() {
    setLogs(reduced ? settledLogs() : emptyLogs());
    setMoving(false);
    setProcessing(false);
    setCompleted(reduced ? writes.length : 0);
    setPlaying(!reduced);
  }

  return (
    <figure
      ref={figure}
      className="kafka-routing-demo"
      data-graphic-frame="workbench"
      data-graphic-key="kafka-broker-placement"
      data-graphic-kind="dom"
      aria-label="Producer sends records to partition leaders on brokers"
    >
      <div className="kafka-routing-stage" data-graphic-stage="padded">
        <div className="kafka-routing-title">Writes to partition leaders</div>
        <div className="kafka-broker-diagram">
          <div className="kafka-producer-client">
            <div className="kafka-producer-client-title">Producer client</div>
            <div className="kafka-client-record">
              <span>record · key</span>
              <span className="kafka-client-key" data-processing={processing}>
                "{displayKey}"
              </span>
            </div>
            <pre className="kafka-producer-send">
              <code>
                producer{"."}
                <span className="kafka-rust-method">send</span>(record,
                timeout).<span className="kafka-rust-keyword">await</span>;
              </code>
            </pre>
            <div className="kafka-client-arrow" aria-hidden="true">
              ↓
              {processing && current !== undefined && (
                <span
                  key={completed}
                  className={`kafka-client-token kafka-client-token-${current}`}
                >
                  R{logs.reduce((total, log) => total + log.length, 0) + 1}
                </span>
              )}
            </div>
            <div
              className="kafka-client-partitioner"
              data-processing={processing}
            >
              <span className="kafka-client-partitioner-title">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2 8h4m0 0 4-4h4M6 8l4 4h4" />
                </svg>
                Partitioner
                <span className="kafka-client-partition">
                  P{displayPartition}
                </span>
              </span>
              <span className="kafka-client-config">murmur2_random</span>
            </div>
          </div>
          <svg
            className="kafka-broker-paths"
            viewBox="0 0 300 100"
            aria-hidden="true"
            data-active={current !== undefined}
          >
            <text
              className="kafka-broker-lookup-label"
              x="150"
              y="13"
              textAnchor="middle"
            >
              Leader lookup
            </text>
            {[0, 1, 2].map((p) => (
              <g
                key={p}
                className="kafka-broker-route"
                data-selected={p === current}
              >
                <path
                  className={`kafka-broker-path kafka-broker-path-${p}`}
                  d={`M 150 ${routeStartY} L ${routeEnd(p)} ${routeEndY}`}
                />
                <path
                  d={routeArrow(routeEnd(p))}
                  className={`kafka-broker-arrow kafka-broker-path-${p}`}
                />
              </g>
            ))}
            {current !== undefined && (
              <g
                key={completed}
                className="kafka-broker-payload"
                data-moving={moving}
                style={
                  {
                    "--from-x": "150px",
                    "--to-x": `${routeEnd(current)}px`,
                    "--to-y": `${routeEndY}px`,
                  } as CSSProperties
                }
              >
                <rect
                  x="-12"
                  y="-9"
                  width="24"
                  height="18"
                  rx="2"
                  className={`kafka-broker-record-${current}`}
                />
                <text x="0" y="4" textAnchor="middle">
                  R{logs.reduce((total, log) => total + log.length, 0) + 1}
                </text>
              </g>
            )}
          </svg>
          <div className="kafka-routing-brokers">
            {[0, 1, 2].map((broker) => (
              <div className="kafka-routing-broker" key={broker}>
                <div>Broker {broker}</div>
                <div className="kafka-routing-leaders">
                  {[0, broker === 0 ? null : broker].map((p) =>
                    p === null ? (
                      <div
                        key="empty"
                        className="kafka-broker-empty"
                        aria-hidden="true"
                      />
                    ) : destination(p) !== broker ? (
                      <div
                        key={p}
                        className="kafka-broker-placeholder"
                        aria-hidden="true"
                      >
                        P{p}
                      </div>
                    ) : (
                      <div
                        key={p}
                        className={`kafka-broker-log kafka-broker-leader-${p}`}
                      >
                        <div>P{p} leader</div>
                        <div
                          className="kafka-broker-records"
                          aria-label={`Partition ${p} log`}
                          role="region"
                          tabIndex={0}
                        >
                          {logs[p].map((id, offset) => (
                            <div key={id} className="kafka-broker-log-record">
                              <span>R{id}</span>
                              <span>{offset}</span>
                            </div>
                          ))}
                        </div>
                        <div className="kafka-broker-offset-label">offset</div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="kafka-routing-controls"
        role="group"
        aria-label="Move partition 0 leader"
      >
        <span>P0 leader</span>
        {[0, 1, 2].map((broker) => (
          <button
            type="button"
            key={broker}
            aria-pressed={leader === broker}
            onClick={() => moveLeader(broker)}
          >
            Broker {broker}
          </button>
        ))}
      </div>
      <div className="kafka-routing-controls">
        <button
          type="button"
          disabled={reduced || completed === writes.length}
          onClick={() => {
            setPlaying(!playing);
            setMoving(false);
            setProcessing(false);
          }}
        >
          {playing && completed < writes.length ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          disabled={completed === writes.length}
          onClick={() => {
            setPlaying(false);
            setMoving(false);
            setProcessing(false);
            setLogs((current) =>
              appendWrite(current, partition(writes[completed])),
            );
            setCompleted((c) => Math.min(writes.length, c + 1));
          }}
        >
          Step
        </button>
        <button type="button" onClick={() => restart()}>
          Replay
        </button>
      </div>
      <p className="sr-only" role="status">
        For {displayKey}, the partitioner selects P{displayPartition}; the
        producer sends it to broker {destination(displayPartition)}. P0 leader
        is on broker {leader}.{" "}
        {logs
          .map(
            (log, partition) =>
              `P${partition}: ${log.length} records, leader on broker ${destination(partition)}.`,
          )
          .join(" ")}
      </p>
    </figure>
  );
}

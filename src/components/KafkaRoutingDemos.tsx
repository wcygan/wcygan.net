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

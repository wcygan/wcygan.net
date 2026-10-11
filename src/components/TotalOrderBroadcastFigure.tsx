import { useEffect, useId, useRef, useState } from "react";

type LogEntry = 1 | 2 | 3 | 4 | 5 | 6;

type LogOrderCaseProps = {
  label: string;
  firstLog: readonly LogEntry[];
  secondLog: readonly LogEntry[];
  orderText: string;
};

function LogOrderCase({
  label,
  firstLog,
  secondLog,
  orderText,
}: LogOrderCaseProps) {
  const logsRef = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<string[]>([]);

  useEffect(() => {
    const logs = logsRef.current;
    if (!logs) return;

    const updateConnections = () => {
      const bounds = logs.getBoundingClientRect();
      const rows = logs.querySelectorAll("ol");
      setConnections(
        firstLog.map((entry) => {
          const source = rows[0]
            .querySelector(`[data-entry="${entry}"]`)!
            .getBoundingClientRect();
          const target = rows[1]
            .querySelector(`[data-entry="${entry}"]`)!
            .getBoundingClientRect();
          return `M ${source.left + source.width / 2 - bounds.left} ${source.bottom - bounds.top} L ${target.left + target.width / 2 - bounds.left} ${target.top - bounds.top}`;
        }),
      );
    };

    updateConnections();
    const observer = new ResizeObserver(updateConnections);
    observer.observe(logs);
    return () => observer.disconnect();
  }, [firstLog, secondLog]);

  return (
    <section className="total-order-case">
      <p className="total-order-case-label">{label}</p>
      <div className="total-order-logs" ref={logsRef}>
        <svg className="total-order-connections" aria-hidden="true">
          {connections.map((path, index) => (
            <path key={firstLog[index]} data-entry={firstLog[index]} d={path} />
          ))}
        </svg>
        {[firstLog, secondLog].map((entries, logIndex) => (
          <div className="total-order-log" key={logIndex}>
            <p className="total-order-log-label">Log {logIndex + 1}</p>
            <ol>
              {entries.map((entry, entryIndex) => (
                <li
                  key={`${entry}-${entryIndex}`}
                  data-entry={entry}
                  aria-label={`Entry ${entry}`}
                >
                  {entry}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <p className="total-order-summary">{orderText}</p>
    </section>
  );
}

export function TotalOrderBroadcastFigure() {
  const id = useId();

  return (
    <figure
      className="total-order-figure"
      data-graphic-frame="plate"
      data-graphic-kind="dom"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <header>
        <p className="article-graphic-title" id={`${id}-title`}>
          Comparing two log orders
        </p>
      </header>
      <div className="total-order-stage" data-graphic-stage="padded">
        <LogOrderCase
          label="Not totally ordered"
          firstLog={[1, 2, 3, 4, 5, 6]}
          secondLog={[2, 1, 4, 3, 6, 5]}
          orderText="Same six messages, a different order."
        />
        <LogOrderCase
          label="Totally ordered"
          firstLog={[1, 2, 3, 4, 5, 6]}
          secondLog={[1, 2, 3, 4, 5, 6]}
          orderText="Both logs match at all six positions."
        />
      </div>
      <figcaption id={`${id}-caption`}>
        Total order keeps the same entries in the same order.
      </figcaption>
    </figure>
  );
}

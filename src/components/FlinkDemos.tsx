import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import {
  advancePressure,
  BOUNDED_FILE_RECORDS,
  BOUNDED_STEPS,
  boundedAt,
  DATAFLOW_STEPS,
  dataflowAt,
  EVENT_TIMES,
  eventTimeAt,
  initialPressure,
  PRESSURE_CAPACITY,
  PRESSURE_RECORDS,
  PURCHASES,
  SINK_ATTEMPTS,
  sinkAt,
  ENRICHMENT_EVENTS,
  enrichmentAt,
} from "~/demos/flink-2d/model";
import { useFlinkPlayback } from "~/demos/flink-shared/useFlinkPlayback";
import "~/demos/flink-shared/theme.css";
import "~/demos/flink-2d/styles.css";

function FlinkFigure({
  name,
  title,
  description,
  children,
  controls,
  caption,
  kind = "svg",
}: {
  name: string;
  title: string;
  description: string;
  children: ReactNode;
  controls: ReactNode;
  caption: string;
  kind?: "svg" | "dom";
}) {
  const id = useId();
  return (
    <figure
      className="flink-2d flink-visual"
      data-graphic-key={name}
      data-graphic-kind={kind}
      data-graphic-frame="workbench"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description ${id}-caption`}
    >
      <header className="flink-visual-heading">
        <p className="article-graphic-title" id={`${id}-title`}>
          {title}
        </p>
        <p className="flink-visual-description" id={`${id}-description`}>
          {description}
        </p>
      </header>
      <div className="flink-2d-stage" data-graphic-stage="padded">
        {children}
      </div>
      <div className="flink-2d-controls">{controls}</div>
      <figcaption id={`${id}-caption`}>{caption}</figcaption>
    </figure>
  );
}

function StepControls({
  step,
  total,
  onStep,
  onReset,
  label = "Next step",
}: {
  step: number;
  total: number;
  onStep: () => void;
  onReset: () => void;
  label?: string;
}) {
  const progress = useRef<HTMLSpanElement>(null);
  const playback = useFlinkPlayback({
    targetRef: progress,
    step,
    total,
    onStep,
    onReset,
  });
  const { playing, reduced } = playback;
  return (
    <>
      <button type="button" onClick={playback.advance} disabled={step >= total}>
        {step >= total ? "Complete" : label}
      </button>
      <button type="button" disabled={reduced} onClick={playback.toggle}>
        {playing ? "Pause" : step >= total ? "Replay" : "Play"}
      </button>
      <button type="button" onClick={playback.reset}>
        Restart
      </button>
      <span ref={progress} className="flink-2d-progress">
        {step} / {total} steps
      </span>
    </>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p
      className="flink-2d-status"
      role="status"
      aria-live="off"
      aria-atomic="true"
    >
      {children}
    </p>
  );
}

function useCompactSvg() {
  const ref = useRef<SVGSVGElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const measure = () => setCompact(svg.getBoundingClientRect().width < 460);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  return { ref, compact };
}

interface FlowNode {
  title: string;
  lines: string[];
  active?: boolean;
  tone?: "blue" | "orange" | "green";
}

function FlowDiagram({ nodes, label }: { nodes: FlowNode[]; label: string }) {
  const { ref, compact } = useCompactSvg();
  const marker = `flink-arrow-${useId().replace(/:/g, "")}`;
  const width = compact ? 284 : 160;
  const height = 112;
  const bounds = nodes.map((node, index) => ({
    ...node,
    x: compact ? 8 : 8 + index * 212,
    y: compact ? 8 + index * 144 : 12,
    width,
    height,
  }));
  return (
    <svg
      ref={ref}
      className="flink-2d-flow"
      viewBox={compact ? "0 0 300 416" : "0 0 600 136"}
      role="img"
      aria-label={`${label}. ${nodes.map((node) => `${node.title}: ${node.lines.join(", ")}`).join(". ")}`}
    >
      <defs>
        <marker
          id={marker}
          viewBox="0 -4 8 8"
          refX="8"
          refY="0"
          markerWidth="8"
          markerHeight="8"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M 0 -3 L 8 0 L 0 3" className="flink-2d-arrowhead" />
        </marker>
      </defs>
      {bounds.slice(0, -1).map((node, index) => {
        const next = bounds[index + 1];
        const path = compact
          ? `M ${node.x + width / 2} ${node.y + height} L ${next.x + width / 2} ${next.y}`
          : `M ${node.x + width} ${node.y + height / 2} L ${next.x} ${next.y + height / 2}`;
        return (
          <path
            key={node.title}
            className="flink-2d-wire"
            d={path}
            markerEnd={`url(#${marker})`}
          />
        );
      })}
      {bounds.map((node, index) => (
        <g
          key={node.title}
          data-tone={node.tone ?? ["blue", "orange", "green"][index]}
          data-active={node.active ? "true" : "false"}
        >
          <rect
            className="flink-2d-node"
            x={node.x}
            y={node.y}
            width={width}
            height={height}
            rx="3"
          />
          <rect
            className="flink-2d-node-rail"
            x={node.x}
            y={node.y}
            width="3"
            height={height}
          />
          <text
            className="flink-2d-node-number"
            x={node.x + width - 12}
            y={node.y + 26}
            textAnchor="end"
          >
            {index + 1}
          </text>
          <text className="flink-2d-node-title" x={node.x + 12} y={node.y + 26}>
            {node.title}
          </text>
          {node.lines.map((line, index) => (
            <text
              key={index}
              className="flink-2d-node-line"
              x={node.x + 12}
              y={node.y + 51 + index * 21}
            >
              {line}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}

export function FlinkDataflowDemo() {
  const [step, setStep] = useState(0);
  const state = dataflowAt(step);
  const next = PURCHASES[state.sourceRead];
  const latest = state.updates.at(-1);
  const message = state.complete
    ? "Complete: Ada 20, Bea 7; three sink updates."
    : !state.current
      ? "Read → update the customer's total → emit."
      : state.phase === "read"
        ? `Read ${state.current.customer} +${state.current.amount}; state unchanged.`
        : state.phase === "aggregate"
          ? `${state.current.customer}'s total is ${state.totals[state.current.customer]}; output pending.`
          : `Emitted ${state.current.customer}'s total.`;
  return (
    <FlinkFigure
      name="flink-dataflow"
      title="A stateful dataflow"
      description="Three purchases; a running total per customer."
      controls={
        <StepControls
          step={step}
          total={DATAFLOW_STEPS}
          onStep={() => setStep((value) => value + 1)}
          onReset={() => setStep(0)}
        />
      }
      caption="The operator remembers totals between records. Steps separate reading, updating state, and emitting output; they are teaching beats, not measured durations."
    >
      <div
        className="flink-2d-input"
        aria-label="Input purchases in arrival order"
      >
        {PURCHASES.map((purchase, index) => (
          <span key={purchase.id} data-read={index < state.sourceRead}>
            {purchase.customer} +{purchase.amount}
          </span>
        ))}
      </div>
      <FlowDiagram
        label="Purchase dataflow"
        nodes={[
          {
            title: "Source",
            lines: [
              `Read: ${state.sourceRead} / 3`,
              next
                ? `Next: ${next.customer} +${next.amount}`
                : "No records left",
            ],
            active: state.phase === "read",
          },
          {
            title: "Keyed state",
            lines: [`Ada: ${state.totals.Ada}`, `Bea: ${state.totals.Bea}`],
            active: state.phase === "aggregate",
          },
          {
            title: "Sink",
            lines: [
              `Updates: ${state.updates.length}`,
              latest
                ? `${latest.customer}: ${latest.total}`
                : "Waiting for output",
            ],
            active: state.phase === "emit",
          },
        ]}
      />
      <Status>{message}</Status>
    </FlinkFigure>
  );
}

function RecordSlots({
  count,
  total,
  numbered = true,
}: {
  count: number;
  total: number;
  numbered?: boolean;
}) {
  return (
    <div className="flink-2d-slots" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <span key={index} data-filled={index < count}>
          {index < count ? (numbered ? index + 1 : "●") : "·"}
        </span>
      ))}
    </div>
  );
}

export function FlinkBoundedDemo() {
  const [step, setStep] = useState(0);
  const state = boundedAt(step);
  return (
    <FlinkFigure
      name="flink-bounded"
      kind="dom"
      title="A file ends; a stream stays open"
      description="Same processing; different stopping conditions."
      controls={
        <StepControls
          step={step}
          total={BOUNDED_STEPS}
          label="Receive a record"
          onStep={() => setStep((value) => value + 1)}
          onReset={() => setStep(0)}
        />
      }
      caption="The four-record file finishes. The stream has no declared final record; this illustration stops after six arrivals while its input remains open."
    >
      <div className="flink-2d-comparison">
        <section aria-label="Bounded file" data-tone="green">
          <p className="flink-2d-label">Bounded file</p>
          <RecordSlots
            count={state.fileProcessed}
            total={BOUNDED_FILE_RECORDS}
          />
          <p className="flink-2d-value">{state.fileProcessed} / 4 processed</p>
          <p className="flink-2d-detail">
            {state.fileComplete
              ? "End of input · complete"
              : "Known end · 4 records"}
          </p>
        </section>
        <section aria-label="Ongoing stream" data-tone="blue">
          <p className="flink-2d-label">Ongoing stream</p>
          <RecordSlots count={state.streamProcessed} total={BOUNDED_STEPS} />
          <p className="flink-2d-value">{state.streamProcessed} processed</p>
          <p className="flink-2d-detail">Input open · more may arrive</p>
        </section>
      </div>
      <Status>
        {step < 4
          ? "Both inputs process their first four records."
          : step === 4
            ? "File complete; stream waiting for more."
            : "Only the stream receives new records."}
      </Status>
    </FlinkFigure>
  );
}

function eventClock(minutes: number) {
  if (minutes < 0) return "11:59";
  return `12:${minutes.toString().padStart(2, "0")}`;
}

function EventTimeline({ state }: { state: ReturnType<typeof eventTimeAt> }) {
  const { ref, compact } = useCompactSvg();
  const width = compact ? 300 : 600;
  const left = 24;
  const right = width - 24;
  const x = (minute: number) => left + (minute / 8) * (right - left);
  return (
    <svg
      ref={ref}
      className="flink-2d-timeline"
      viewBox={`0 0 ${width} 152`}
      role="img"
      aria-label={`Event-time window from 12:00 to 12:05: ${state.accepted.length} accepted records, ${state.windowClosed ? "closed" : "open"}. Watermark ${state.watermark === null ? "not emitted" : eventClock(state.watermark)}.`}
    >
      <rect
        className="flink-2d-window"
        x={x(0)}
        y="18"
        width={x(5) - x(0)}
        height="64"
        data-closed={state.windowClosed}
      />
      <text className="flink-2d-window-label" x={x(0) + 8} y="36">
        {state.windowClosed ? "Closed window" : "Open window"}
      </text>
      <path className="flink-2d-axis" d={`M ${left} 82 H ${right}`} />
      {[0, 5, 8].map((minute) => (
        <g key={minute}>
          <path className="flink-2d-axis" d={`M ${x(minute)} 82 v 6`} />
          <text
            className="flink-2d-axis-label"
            x={x(minute)}
            y="105"
            textAnchor={
              minute === 0 ? "start" : minute === 8 ? "end" : "middle"
            }
          >
            {eventClock(minute)}
          </text>
        </g>
      ))}
      {state.arrivals.map((arrival, index) => (
        <g key={index} data-discarded={arrival.discarded}>
          <circle
            className="flink-2d-event"
            cx={x(arrival.eventTime)}
            cy="60"
            r="10"
          />
          <text
            className="flink-2d-event-index"
            x={x(arrival.eventTime)}
            y="64"
            textAnchor="middle"
          >
            {arrival.discarded ? "×" : index + 1}
          </text>
        </g>
      ))}
      {state.watermark !== null && state.watermark >= 0 && (
        <path
          className="flink-2d-watermark-line"
          d={`M ${x(state.watermark)} 10 V 116`}
        />
      )}
      <text className="flink-2d-axis-label" x={left} y="140">
        {compact
          ? "Order: 1–5 · × discarded"
          : "Circles show arrival order; × is discarded"}
      </text>
    </svg>
  );
}

export function FlinkEventTimeDemo() {
  const [step, setStep] = useState(0);
  const state = eventTimeAt(step);
  return (
    <FlinkFigure
      name="flink-event-time"
      title="When should a window close?"
      description="Arrival order differs from event time."
      controls={
        <StepControls
          step={step}
          total={EVENT_TIMES.length}
          label="Next arrival"
          onStep={() => setStep((value) => value + 1)}
          onReset={() => setStep(0)}
        />
      }
      caption="Illustrative policy: one input, five-minute windows, zero allowed lateness. Each arrival advances the watermark to max timestamp minus two minutes. Periodic emission and multi-input coordination omitted."
    >
      <div
        className="flink-2d-input"
        aria-label="Event timestamps in arrival order"
      >
        {EVENT_TIMES.map((time, index) => (
          <span
            key={index}
            data-read={index < step}
            data-discarded={state.arrivals[index]?.discarded}
          >
            {eventClock(time)}
          </span>
        ))}
      </div>
      <EventTimeline state={state} />
      <dl className="flink-2d-metrics">
        <div>
          <dt>Watermark</dt>
          <dd>
            {state.watermark === null
              ? "None yet"
              : eventClock(state.watermark)}
          </dd>
        </div>
        <div>
          <dt>12:00–12:05 count</dt>
          <dd>
            {state.accepted.length}
            {state.windowClosed ? " · final" : " · open"}
          </dd>
        </div>
        <div>
          <dt>Late records discarded</dt>
          <dd>{state.discarded.length}</dd>
        </div>
      </dl>
      <Status>
        {step === 0
          ? "No arrivals; no watermark yet."
          : step === 3
            ? "12:02 arrives out of order; its window is still open."
            : step === 4
              ? "12:07 moves the watermark to 12:05: close the earlier window."
              : step === 5
                ? "12:03 arrives too late; discard it. Final count unchanged."
                : `Accept ${eventClock(EVENT_TIMES[step - 1])}; window open.`}
      </Status>
    </FlinkFigure>
  );
}

export function FlinkBackpressureDemo() {
  const [sinkCapacity, setSinkCapacity] = useState<1 | 3>(1);
  const [state, setState] = useState(initialPressure);
  const complete = state.completed === PRESSURE_RECORDS;
  function selectCapacity(capacity: 1 | 3) {
    if (capacity === sinkCapacity) return;
    setSinkCapacity(capacity);
    setState(initialPressure());
  }
  return (
    <FlinkFigure
      name="flink-backpressure"
      title="A slow sink slows the source"
      description="Twelve records; four buffer slots."
      controls={
        <>
          <StepControls
            key={sinkCapacity}
            step={state.step}
            total={sinkCapacity === 1 ? 13 : 5}
            onStep={() =>
              setState((value) => advancePressure(value, sinkCapacity))
            }
            onReset={() => setState(initialPressure())}
          />
          <div
            className="flink-2d-speed"
            role="group"
            aria-label="Sink capacity; changing it restarts the example"
          >
            <button
              type="button"
              aria-pressed={sinkCapacity === 1}
              onClick={() => selectCapacity(1)}
            >
              Slow sink
            </button>
            <button
              type="button"
              aria-pressed={sinkCapacity === 3}
              onClick={() => selectCapacity(3)}
            >
              Faster sink
            </button>
          </div>
        </>
      }
      caption="Drain the sink, then fill available slots. Unread records stay at this finite replayable source. Real sources need sufficient retention; storage remains bounded."
    >
      <FlowDiagram
        label="Finite source, bounded buffer, and sink"
        nodes={[
          {
            title: "Source",
            lines: [
              `Unread: ${state.unread}`,
              "Can read 3 / step",
              `Read this step: ${state.lastRead}`,
            ],
            active: state.throttled,
          },
          {
            title: "Buffer",
            lines: [
              `Used: ${state.buffered} / ${PRESSURE_CAPACITY}`,
              state.buffered === PRESSURE_CAPACITY
                ? "Full · source waits"
                : "Room to read",
            ],
            active: state.buffered === PRESSURE_CAPACITY,
          },
          {
            title: "Sink",
            lines: [
              `Capacity: ${sinkCapacity} / step`,
              `Completed: ${state.completed}`,
              `This step: ${state.lastCompleted}`,
            ],
          },
        ]}
      />
      <RecordSlots
        count={state.buffered}
        total={PRESSURE_CAPACITY}
        numbered={false}
      />
      <p className="flink-2d-conservation">
        {state.unread} unread + {state.buffered} buffered + {state.completed}{" "}
        completed = 12 records
      </p>
      <Status>
        {complete
          ? `Complete in ${state.step} teaching steps: zero loss, buffer ≤ 4.`
          : state.step === 0
            ? "Read only when the buffer has room."
            : state.throttled
              ? `Source throttled: read ${state.lastRead} of 3; backlog stays upstream.`
              : state.unread === 0
                ? "Source exhausted; drain the buffer."
                : `Read ${state.lastRead} records into free slots.`}
      </Status>
    </FlinkFigure>
  );
}

function SinkRows({
  ids,
  duplicates,
}: {
  ids: readonly number[];
  duplicates?: boolean;
}) {
  return (
    <div
      className="flink-2d-sink-rows"
      aria-label={`Stored event IDs: ${ids.join(", ") || "none"}`}
    >
      {ids.length === 0 && <span className="flink-2d-empty">No rows yet</span>}
      {ids.map((id, index) => (
        <span key={index} data-repeated={duplicates && index >= 5}>
          ID {id}
        </span>
      ))}
    </div>
  );
}

export function FlinkSinkDemo() {
  const [step, setStep] = useState(0);
  const state = sinkAt(step);
  return (
    <FlinkFigure
      name="flink-sink-replay"
      kind="dom"
      title="Replay and external effects"
      description="Same writes; two sink policies."
      controls={
        <StepControls
          step={step}
          total={SINK_ATTEMPTS.length}
          label="Attempt a write"
          onStep={() => setStep((value) => value + 1)}
          onReset={() => setStep(0)}
        />
      }
      caption="Replay IDs 4 and 5. An enforced unique event ID suppresses duplicates. Any separate business effect and its deduplication record must commit atomically."
    >
      <div className="flink-2d-attempt">
        <span>Write attempts: {step} / 7</span>
        <strong>
          {state.currentId === null
            ? "Ready"
            : `${state.replaying ? "Replay" : "Write"} ID ${state.currentId}`}
        </strong>
      </div>
      <div className="flink-2d-comparison">
        <section aria-label="Blind append sink" data-tone="orange">
          <p className="flink-2d-label">Blind append</p>
          <SinkRows ids={state.appended} duplicates />
          <p className="flink-2d-value">{state.appended.length} stored rows</p>
          <p className="flink-2d-detail">Every attempt adds a row</p>
        </section>
        <section
          aria-label="Idempotent sink with unique event ID"
          data-tone="green"
        >
          <p className="flink-2d-label">Unique event ID</p>
          <SinkRows ids={state.unique} />
          <p className="flink-2d-value">{state.unique.length} stored rows</p>
          <p className="flink-2d-detail">
            {state.ignored} duplicate attempts ignored
          </p>
        </section>
      </div>
      <Status>
        {state.complete
          ? "Seven attempts: seven appended rows, five unique rows."
          : state.replaying
            ? `Replay ID ${state.currentId}: append duplicates; unique ID ignores.`
            : step === 5
              ? "Five committed writes survive failure. Next: replay IDs 4 and 5."
              : "Both sinks accept a new event ID."}
      </Status>
    </FlinkFigure>
  );
}

export function FlinkEnrichmentDemo() {
  const [step, setStep] = useState(0);
  const state = enrichmentAt(step);
  const current = state.current;
  return (
    <FlinkFigure
      name="flink-enrichment"
      kind="dom"
      title="Add remembered context"
      description="Each order uses its customer's latest-known region."
      controls={
        <StepControls
          step={step}
          total={ENRICHMENT_EVENTS.length}
          label="Next event"
          onStep={() => setStep((s) => s + 1)}
          onReset={() => setStep(0)}
        />
      }
      caption="One ordered teaching input. Missing context emits ‘unknown’; updates affect future orders only. Latest-known enrichment differs from an event-time temporal join."
    >
      <div
        className="flink-2d-input"
        aria-label="Reference updates and orders in processing order"
      >
        {ENRICHMENT_EVENTS.map((e, i) => (
          <span key={i} data-read={i < step}>
            {e.type === "region"
              ? `${e.customer}→${e.value}`
              : `${e.customer} #${e.value.slice(-1)}`}
          </span>
        ))}
      </div>
      <p className="flink-2d-label">Remembered reference state</p>
      <dl className="flink-2d-enrichment-state">
        {["Ada", "Bo"].map((customer) => (
          <div key={customer}>
            <dt>{customer} region</dt>
            <dd>{state.regions[customer] ?? "Unknown"}</dd>
          </div>
        ))}
      </dl>
      <p className="flink-2d-label">Emitted enriched orders</p>
      <div className="flink-2d-enriched">
        <span>Order</span>
        <span>Customer</span>
        <span>Region</span>
      </div>
      {state.output.map((row) => (
        <div className="flink-2d-enriched" key={row.order}>
          <span>{row.order}</span>
          <span>{row.customer}</span>
          <span data-unknown={row.region === "unknown"}>{row.region}</span>
        </div>
      ))}
      <Status>
        {!current
          ? "Remember a region; attach it to the next order."
          : current.type === "region"
            ? `${current.customer} → ${current.value}; earlier output unchanged.`
            : `${current.value}: ${current.customer} → ${state.output.at(-1)!.region}.`}
      </Status>
    </FlinkFigure>
  );
}

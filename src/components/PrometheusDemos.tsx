import { type ReactNode, useId, useState } from "react";
import { usePrometheusPlayback } from "~/demos/prometheus/playback";
import {
  changeMetricState,
  classicHistogram,
  counterSamples,
  evaluateRecordingRule,
  initialMetricState,
  initialRecordingState,
  INITIAL_OBSERVATIONS,
  MAX_DEMO_IN_FLIGHT,
  MAX_DEMO_REQUESTS,
  MAX_HISTOGRAM_OBSERVATIONS,
  RAW_REQUEST_SERIES,
  RECORDING_EVALUATIONS,
  resetAdjustedSlope,
  scrapeSnapshot,
  SCRAPE_PHASES,
} from "~/demos/prometheus/2d-model";

function Workbench({
  name,
  title,
  controls,
  children,
  caption,
  playback,
  step,
}: {
  name: string;
  title: string;
  controls: ReactNode;
  children: ReactNode;
  caption: ReactNode;
  playback: ReturnType<typeof usePrometheusPlayback>;
  step: number;
}) {
  const id = useId();
  return (
    <figure
      ref={playback.ref}
      className={`prom2d prom2d-${name}`}
      data-playback={
        playback.complete ? "complete" : playback.playing ? "playing" : "paused"
      }
      data-playback-active={playback.active}
      data-playback-step={step}
      data-graphic-frame="workbench"
      data-graphic-key={`prometheus-${name}`}
      data-graphic-kind={"svg"}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <header className="prom2d-header">
        <p className="article-graphic-title" id={`${id}-title`}>
          {title}
        </p>
      </header>
      <div className="prom2d-controls">
        <button
          type="button"
          onClick={playback.toggle}
          disabled={playback.reducedMotion}
          aria-label={`${playback.playing ? "Pause" : "Play"} ${title.toLowerCase()}`}
        >
          {playback.playing ? "Pause" : "Play"}
        </button>
        {controls}
      </div>
      <div className="prom2d-stage" data-graphic-stage="padded">
        {children}
      </div>
      <figcaption id={`${id}-caption`}>{caption}</figcaption>
    </figure>
  );
}

export function PrometheusScrapeDemo() {
  const [step, setStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const playback = usePrometheusPlayback({
    step,
    lastStep: 3,
    onStep: setStep,
    onReset: () => setStep(0),
  });
  const { phase, samples } = scrapeSnapshot(step, failed);
  const arrowId = useId();
  const response = phase >= 2;
  const status =
    phase === 2 && failed ? "The scrape times out" : SCRAPE_PHASES[phase];
  return (
    <Workbench
      name="scrape"
      title="A scrape"
      playback={playback}
      step={step}
      controls={
        <>
          <button
            type="button"
            onClick={() => {
              playback.pause();
              setStep((value) => value + 1);
            }}
            disabled={phase === 3}
          >
            Next step
          </button>
          <button
            type="button"
            onClick={playback.replay}
            aria-label="Replay the scrape"
          >
            Replay
          </button>
          <button
            type="button"
            aria-pressed={failed}
            onClick={() => {
              setFailed((value) => !value);
              playback.replay();
            }}
          >
            {failed ? "Scenario: timeout" : "Scenario: success"}
          </button>
        </>
      }
      caption={
        <>
          Read <code>/metrics</code>, append a sample. Timeout:{" "}
          <code>up=0</code>; no new counter value.
        </>
      }
    >
      <p className="prom2d-status" role="status">
        {phase + 1}/4 · {status}
      </p>
      <svg
        className="prom2d-scrape-flow"
        viewBox="0 0 560 152"
        role="img"
        aria-label={
          phase === 0
            ? "Prometheus will request metrics from the application at the next scrape."
            : response
              ? failed
                ? "The application does not respond to Prometheus."
                : "The application responds to Prometheus with metrics."
              : "Prometheus sends an HTTP GET request to the application."
        }
      >
        <defs>
          <marker
            id={arrowId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M0 0 L8 4 L0 8" fill="currentColor" />
          </marker>
        </defs>
        <rect
          x="8"
          y="48"
          width="180"
          height="76"
          rx="3"
          className="prom2d-node"
        />
        <rect
          x="372"
          y="48"
          width="180"
          height="76"
          rx="3"
          className="prom2d-node"
        />
        <text x="98" y="80" textAnchor="middle" className="prom2d-node-title">
          Prometheus
        </text>
        <text x="98" y="104" textAnchor="middle" className="prom2d-node-detail">
          scrape scheduler
        </text>
        <text x="462" y="80" textAnchor="middle" className="prom2d-node-title">
          Application
        </text>
        <text
          x="462"
          y="104"
          textAnchor="middle"
          className="prom2d-node-detail"
        >
          /metrics
        </text>
        <path
          d={response && !failed ? "M372 86 H188" : "M188 86 H372"}
          className="prom2d-wire"
          markerEnd={`url(#${arrowId})`}
        />
        {(phase === 1 || (phase === 2 && !failed)) && (
          <circle
            key={phase}
            className="prom2d-scrape-packet"
            data-direction={phase === 1 ? "request" : "response"}
            cx={phase === 1 ? 188 : 372}
            cy="86"
            r="5"
          />
        )}
        <text x="280" y="68" textAnchor="middle" className="prom2d-flow-label">
          {response ? (failed ? "timeout" : "HTTP 200") : "GET"}
        </text>
      </svg>
      <div className="prom2d-exposition">
        <span className="prom2d-label">
          {response ? "Scrape result" : "Exposed by the application"}
        </span>
        <code>
          {failed && response
            ? "No metrics received"
            : "http_requests_total 12"}
        </code>
      </div>
      <div className="prom2d-storage">
        <p className="prom2d-label">Local samples · instance="app:8080"</p>
        <table>
          <caption className="sr-only">Stored scrape samples</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">requests_total</th>
              <th scope="col">up</th>
            </tr>
          </thead>
          <tbody>
            {samples.map((sample) => (
              <tr key={sample.time}>
                <th scope="row">{sample.time}s</th>
                <td>{sample.requests ?? "No value · stale"}</td>
                <td>{sample.up}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="prom2d-takeaway">
        {phase === 3
          ? failed
            ? "Timeout: up=0. Earlier counter samples remain."
            : "Two scrapes, two counter samples: 8 → 12."
          : "One scrape stored. The next is underway."}
      </p>
    </Workbench>
  );
}

type ChartLine = { points: { x: number; y: number }[]; corrected?: boolean };

function SampleChart({
  lines,
  maxX,
  maxY,
  ticks,
  label,
}: {
  lines: ChartLine[];
  maxX: number;
  maxY: number;
  ticks: string[];
  label: string;
}) {
  const position = (point: { x: number; y: number }) =>
    `${(point.x / maxX) * 528 + 8},${152 - (point.y / maxY) * 144}`;
  return (
    <div className="prom2d-chart">
      <p className="prom2d-label">{label}</p>
      <div className="prom2d-chart-plot">
        <span className="prom2d-y-max">{maxY}</span>
        <span className="prom2d-y-zero">0</span>
        <svg viewBox="0 0 544 160" aria-hidden="true">
          {[8, 80, 152].map((y) => (
            <line
              key={y}
              x1="8"
              x2="536"
              y1={y}
              y2={y}
              className="prom2d-grid-line"
            />
          ))}
          {lines.map((line, index) => (
            <g
              key={index}
              className={
                line.corrected
                  ? "prom2d-chart-corrected"
                  : "prom2d-chart-stored"
              }
            >
              <polyline
                points={line.points.map(position).join(" ")}
                className="prom2d-chart-line"
              />
              {line.points.map((point) => {
                const [cx, cy] = position(point).split(",");
                return (
                  <circle
                    key={point.x}
                    cx={cx}
                    cy={cy}
                    r="3.5"
                    className="prom2d-chart-point"
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <div className="prom2d-x-ticks">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}

export function PrometheusMetricTypesDemo() {
  const [state, setState] = useState(initialMetricState);
  const sequence = [
    "start",
    "start",
    "finish",
    "start",
    "finish",
    "finish",
    "start",
    "finish",
  ] as const;
  const step = state.history.length - 1;
  const playback = usePrometheusPlayback({
    step,
    lastStep: sequence.length,
    onStep: () =>
      setState((value) =>
        changeMetricState(
          value,
          sequence[step] === "finish" && value.inFlight === 0
            ? "start"
            : sequence[step],
        ),
      ),
    onReset: () => setState(initialMetricState()),
    intervalMs: 1800,
  });
  const change = (action: "start" | "finish") => {
    playback.pause();
    setState((value) => changeMetricState(value, action));
  };
  const chartEnd = Math.max(sequence.length, step);
  const atLimit = state.requests === MAX_DEMO_REQUESTS;
  return (
    <Workbench
      name="metric-types"
      title="Counters and gauges"
      playback={playback}
      step={step}
      controls={
        <>
          <button
            type="button"
            onClick={() => change("start")}
            disabled={atLimit || state.inFlight === MAX_DEMO_IN_FLIGHT}
          >
            Start request
          </button>
          <button
            type="button"
            onClick={() => change("finish")}
            disabled={state.inFlight === 0}
          >
            Finish request
          </button>
          <button
            type="button"
            onClick={playback.replay}
            aria-label="Reset counters and gauges"
          >
            Replay
          </button>
        </>
      }
      caption={<>Start: both rise. Finish: only the gauge falls.</>}
    >
      <div className="prom2d-metric-comparison">
        <div>
          <p className="prom2d-label">Counter · requests received</p>
          <p className="prom2d-value">
            <output aria-live="off">{state.requests}</output>
            <span> total</span>
          </p>
          <SampleChart
            label="Requests · can increase"
            maxX={chartEnd}
            maxY={Math.max(6, state.requests)}
            ticks={[
              "0",
              String(Math.floor(chartEnd / 2)),
              `${chartEnd} actions`,
            ]}
            lines={[
              {
                points: state.history.map((point) => ({
                  x: point.step,
                  y: point.requests,
                })),
              },
            ]}
          />
        </div>
        <div>
          <p className="prom2d-label">Gauge · requests in flight</p>
          <p className="prom2d-value">
            <output aria-live="off">{state.inFlight}</output>
            <span> now</span>
          </p>
          <SampleChart
            label="Requests · can decrease"
            maxX={chartEnd}
            maxY={5}
            ticks={[
              "0",
              String(Math.floor(chartEnd / 2)),
              `${chartEnd} actions`,
            ]}
            lines={[
              {
                points: state.history.map((point) => ({
                  x: point.step,
                  y: point.inFlight,
                })),
              },
            ]}
          />
        </div>
      </div>
      <p className="prom2d-takeaway" role="status">
        {atLimit && state.inFlight === 0
          ? "All 12 requests finished. Counter: 12. Gauge: 0."
          : `Received: ${state.requests}. Finished: ${state.requests - state.inFlight}. Running: ${state.inFlight}.`}
      </p>
    </Workbench>
  );
}

export function PrometheusRateDemo() {
  const [restart, setRestart] = useState(true);
  const [step, setStep] = useState(0);
  const playback = usePrometheusPlayback({
    step,
    lastStep: 5,
    onStep: setStep,
    onReset: () => setStep(0),
  });
  const samples = counterSamples(restart);
  const visibleSamples = samples.slice(0, Math.min(5, step + 1));
  const showCalculation = step === 5;
  const slope = resetAdjustedSlope(samples);
  return (
    <Workbench
      name="rate"
      title="From a counter to a rate"
      playback={playback}
      step={step}
      controls={
        <>
          <button
            type="button"
            disabled={step === 5}
            onClick={() => {
              playback.pause();
              setStep((value) => Math.min(5, value + 1));
            }}
          >
            Next step
          </button>
          <button
            type="button"
            onClick={playback.replay}
            aria-label="Replay the rate calculation"
          >
            Replay
          </button>
          <button
            type="button"
            aria-pressed={restart}
            onClick={() => {
              setRestart((value) => !value);
              playback.replay();
            }}
          >
            {restart ? "Restart at 45s: on" : "Restart at 45s: off"}
          </button>
        </>
      }
      caption={
        <>
          Count increases, handle resets, divide by time. Actual PromQL{" "}
          <code>rate()</code> also extrapolates to window edges.
        </>
      }
    >
      <SampleChart
        label="Cumulative request counter · requests"
        maxX={60}
        maxY={240}
        ticks={["0s", "15s", "30s", "45s", "60s"]}
        lines={[
          {
            points: visibleSamples.map((sample) => ({
              x: sample.time,
              y: sample.value,
            })),
          },
          ...(restart && showCalculation
            ? [
                {
                  corrected: true,
                  points: slope.adjusted.map((sample) => ({
                    x: sample.time,
                    y: sample.value,
                  })),
                },
              ]
            : []),
        ]}
      />
      <p className="prom2d-chart-key">
        <span>Solid: stored counter</span>
        {restart && showCalculation && (
          <span className="prom2d-corrected-key">Dashed: reset correction</span>
        )}
      </p>
      <table className="prom2d-sample-table">
        <caption className="sr-only">
          Counter samples over sixty seconds
        </caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            {samples.map((sample) => (
              <th scope="col" key={sample.time}>
                {sample.time}s
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Value</th>
            {samples.map((sample, index) => (
              <td key={sample.time}>{index <= step ? sample.value : "—"}</td>
            ))}
          </tr>
        </tbody>
      </table>
      {showCalculation && (
        <div className="prom2d-rate-results">
          <p>
            <span className="prom2d-label">Reset-adjusted slope</span>
            <strong>
              {slope.gain} / 60 = {slope.perSecond.toFixed(2)} req/s
            </strong>
          </p>
          <p>
            <span className="prom2d-label">Raw endpoint slope</span>
            <strong>
              {samples[4].value - samples[0].value} / 60 ={" "}
              {slope.rawPerSecond.toFixed(2)} req/s
            </strong>
          </p>
        </div>
      )}
      <p className="prom2d-takeaway" role="status">
        {!showCalculation
          ? step === 3 && restart
            ? "Restart: 160 → 10. The counter starts over."
            : step === 4
              ? "Five samples collected. Next: calculate the rate."
              : `Scrape ${visibleSamples.at(-1)!.time}s: ${visibleSamples.at(-1)!.value} requests so far.`
          : restart
            ? "30 + 30 + 10 + 30 = 100 requests. A reset is not negative traffic."
            : "30 + 30 + 30 + 30 = 120 requests. Both slopes agree."}
      </p>
    </Workbench>
  );
}

export function PrometheusHistogramDemo() {
  const [observations, setObservations] = useState<number[]>(() => [
    ...INITIAL_OBSERVATIONS,
  ]);
  const step = observations.length - INITIAL_OBSERVATIONS.length;
  const playback = usePrometheusPlayback({
    step,
    lastStep: 3,
    onStep: () => setObservations((values) => [...values, 1.2]),
    onReset: () => setObservations([...INITIAL_OBSERVATIONS]),
    intervalMs: 2500,
  });
  const histogram = classicHistogram(observations);
  return (
    <Workbench
      name="histogram"
      title="Cumulative histogram buckets"
      playback={playback}
      step={step}
      controls={
        <>
          <button
            type="button"
            disabled={observations.length >= MAX_HISTOGRAM_OBSERVATIONS}
            onClick={() => {
              playback.pause();
              setObservations((values) => [...values, 1.2]);
            }}
          >
            Observe a 1.2s request
          </button>
          <button
            type="button"
            onClick={playback.replay}
            aria-label="Reset the histogram"
          >
            Replay
          </button>
        </>
      }
      caption={
        <>
          A 1.2s request changes only <code>+Inf</code>, <code>_count</code>,
          and <code>_sum</code>. Finite buckets stay put.
        </>
      }
    >
      <p className="prom2d-label">http_request_duration_seconds_bucket</p>
      <ol className="prom2d-buckets" aria-label="Cumulative bucket counts">
        {histogram.buckets.map((bucket) => (
          <li key={String(bucket.bound)}>
            <span>
              ≤ {Number.isFinite(bucket.bound) ? `${bucket.bound}s` : "+Inf"}
            </span>
            <svg viewBox="0 0 240 20" aria-hidden="true">
              <rect
                x="0"
                y="3"
                width="240"
                height="14"
                className="prom2d-bar-track"
              />
              <rect
                x="0"
                y="3"
                width={(bucket.count / MAX_HISTOGRAM_OBSERVATIONS) * 240}
                height="14"
                className="prom2d-bar"
              />
            </svg>
            <strong>{bucket.count}</strong>
          </li>
        ))}
      </ol>
      <dl className="prom2d-histogram-totals">
        <div>
          <dt>_count</dt>
          <dd>{histogram.count} requests</dd>
        </div>
        <div>
          <dt>_sum</dt>
          <dd>{histogram.sum.toFixed(2)} seconds</dd>
        </div>
      </dl>
      <p className="prom2d-observations">
        <span className="prom2d-label">Observed durations (s)</span>
        {observations.map((duration) => duration.toFixed(2)).join(", ")}
      </p>
      <p className="prom2d-takeaway" role="status">
        {histogram.count > INITIAL_OBSERVATIONS.length
          ? `+${histogram.count - INITIAL_OBSERVATIONS.length} slow request(s). Finite buckets unchanged.`
          : "8 requests · cumulative buckets"}
      </p>
    </Workbench>
  );
}

export function PrometheusRecordingRuleDemo() {
  const [state, setState] = useState(initialRecordingState);
  const playback = usePrometheusPlayback({
    step: state.evaluationCount,
    lastStep: RECORDING_EVALUATIONS.length,
    onStep: () => setState(evaluateRecordingRule),
    onReset: () => setState(initialRecordingState()),
  });
  const evaluation =
    RECORDING_EVALUATIONS[Math.max(0, state.evaluationCount - 1)];
  return (
    <Workbench
      name="recording-rule"
      title="Record an aggregate"
      playback={playback}
      step={state.evaluationCount}
      controls={
        <>
          <button
            type="button"
            disabled={state.evaluationCount === RECORDING_EVALUATIONS.length}
            onClick={() => {
              playback.pause();
              setState(evaluateRecordingRule);
            }}
          >
            Evaluate rule
            {state.evaluationCount > 0 &&
            state.evaluationCount < RECORDING_EVALUATIONS.length
              ? " at next 15s"
              : ""}
          </button>
          <button
            type="button"
            onClick={playback.replay}
            aria-label="Replay recording rule evaluations"
          >
            Replay
          </button>
        </>
      }
      caption={
        <>
          Four inputs → two stored aggregates. Original samples remain;
          retention stays unchanged.
        </>
      }
    >
      <svg
        viewBox="0 0 560 180"
        role="img"
        aria-label="GET rates from two instances sum into one GET series; POST rates sum into one POST series."
      >
        {["GET", "POST"].map((method, row) => (
          <g key={method}>
            {[0, 1].map((instance) => (
              <g key={instance}>
                <rect
                  className="prom2d-node"
                  x={16 + instance * 150}
                  y={16 + row * 88}
                  width="120"
                  height="48"
                  rx="3"
                />
                <text
                  className="prom2d-node-detail"
                  x={76 + instance * 150}
                  y={46 + row * 88}
                  textAnchor="middle"
                >
                  {method} {evaluation.rates[row * 2 + instance]}
                </text>
              </g>
            ))}
            <path
              className="prom2d-wire"
              d={`M76 ${64 + row * 88} V${76 + row * 88} H326 V${40 + row * 88} H350 M286 ${40 + row * 88} H350`}
            />
            <rect
              className="prom2d-node"
              x="350"
              y={16 + row * 88}
              width="190"
              height="48"
              rx="3"
            />
            <text
              className="prom2d-node-title"
              x="445"
              y={46 + row * 88}
              textAnchor="middle"
            >
              {method} Σ{" "}
              {evaluation.rates[row * 2] + evaluation.rates[row * 2 + 1]}
            </text>
          </g>
        ))}
      </svg>
      <p className="prom2d-label">
        Four input series · example rates at {evaluation.time}s
      </p>
      <table>
        <caption className="sr-only">Per-instance request rates</caption>
        <thead>
          <tr>
            <th scope="col">method</th>
            <th scope="col">instance</th>
            <th scope="col">rate · req/s</th>
          </tr>
        </thead>
        <tbody>
          {RAW_REQUEST_SERIES.map((series, index) => (
            <tr key={`${series.method}-${series.instance}`}>
              <th scope="row">{series.method}</th>
              <td>{series.instance}</td>
              <td>{evaluation.rates[index]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="prom2d-rule-expression">
        <span className="prom2d-label">Rule expression</span>
        <code>sum by (method) (rate(http_requests_total[5m]))</code>
        <span className="prom2d-rule-arrow" aria-hidden="true">
          ↓
        </span>
        <span className="prom2d-label">
          New metric: method:http_requests:rate5m
        </span>
      </div>
      <table>
        <caption className="sr-only">Recorded aggregate samples</caption>
        <thead>
          <tr>
            <th scope="col">Label set</th>
            <th scope="col">Recorded samples · time: req/s</th>
          </tr>
        </thead>
        <tbody>
          {state.series.map((series) => (
            <tr key={series.method}>
              <th scope="row">
                <code>{`{method="${series.method}"}`}</code>
              </th>
              <td>
                {series.samples.length === 0
                  ? "Not evaluated yet"
                  : series.samples
                      .map((sample) => `${sample.time}s: ${sample.value}`)
                      .join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="prom2d-takeaway" role="status">
        {state.evaluationCount === 0
          ? "Evaluate to store the first aggregate samples."
          : `4 original series + 2 aggregates · ${state.evaluationCount} recorded sample(s) each`}
      </p>
    </Workbench>
  );
}

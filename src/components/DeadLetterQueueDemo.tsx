import { useEffect, useMemo, useState, type CSSProperties } from "react";

const ISOLATION_STEPS = [
  {
    label: "Flow",
    status: "Checkout events move through the hot path.",
  },
  {
    label: "Fail",
    status: "One checkout event repeatedly fails product enrichment.",
  },
  {
    label: "Retry",
    status: "The worker spends its retry budget on the same event.",
  },
  {
    label: "Park",
    status: "The failed event moves to the DLQ and the hot path keeps moving.",
  },
] as const;

const TRACE_STEPS = [
  {
    id: "checkout",
    label: "Checkout",
    detail: "page viewed",
    status: "The checkout page emits a page-view event.",
  },
  {
    id: "kafka",
    label: "Kafka",
    detail: "event stored",
    status: "Kafka stores the event for independent consumers.",
  },
  {
    id: "worker",
    label: "Worker",
    detail: "event claimed",
    status: "A recommendations worker claims the event.",
  },
  {
    id: "failure",
    label: "Failure",
    detail: "catalog timeout",
    status: "Product enrichment fails for productId=sku_978.",
  },
  {
    id: "dlq",
    label: "DLQ",
    detail: "record written",
    status: "The DLQ stores the original event and failure metadata.",
  },
  {
    id: "replay",
    label: "Replay",
    detail: "ready later",
    status:
      "After the dependency recovers, the event has enough context to replay.",
  },
] as const;

const CHECKOUT_EVENT_FIELDS = [
  { key: "eventName", value: "checkout.page_viewed", visibleAt: 0 },
  { key: "userId", value: "usr_42", visibleAt: 0 },
  { key: "productId", value: "sku_978", visibleAt: 0 },
  { key: "cartId", value: "cart_314", visibleAt: 0 },
  { key: "sessionId", value: "sess_abc", visibleAt: 0 },
  { key: "traceId", value: "trc_7f8", visibleAt: 1 },
] as const;

const FAILURE_METADATA = [
  { key: "sourceTopic", value: "checkout.events", visibleAt: 1 },
  { key: "sourceOffset", value: "000128", visibleAt: 1 },
  { key: "consumer", value: "recommendations-worker", visibleAt: 2 },
  { key: "errorClass", value: "ProductCatalogTimeout", visibleAt: 3 },
  { key: "attempts", value: "3", visibleAt: 3 },
  { key: "dlqTopic", value: "checkout.events.dlq", visibleAt: 4 },
] as const;

const ATTEMPTS = [
  {
    label: "try 1",
    value: "timeout",
    note: "catalog did not respond",
    visibleAt: 2,
  },
  {
    label: "try 2",
    value: "timeout",
    note: "same product lookup failed again",
    visibleAt: 3,
  },
  {
    label: "try 3",
    value: "parked",
    note: "retry budget exhausted",
    visibleAt: 4,
  },
] as const;

const ISOLATION_EVENTS = [
  {
    id: "000126",
    title: "checkout.page_viewed",
    subtitle: "usr_19 / sku_441",
    poison: false,
  },
  {
    id: "000127",
    title: "checkout.page_viewed",
    subtitle: "usr_20 / sku_225",
    poison: false,
  },
  {
    id: "000128",
    title: "checkout.page_viewed",
    subtitle: "usr_42 / sku_978",
    poison: true,
  },
  {
    id: "000129",
    title: "checkout.page_viewed",
    subtitle: "usr_61 / sku_144",
    poison: false,
  },
] as const;

const LAST_ISOLATION_STEP = ISOLATION_STEPS.length - 1;
const LAST_TRACE_STEP = TRACE_STEPS.length - 1;
const ISOLATION_STEP_MS = 1500;
const TRACE_STEP_MS = 1650;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(query.matches);

    function updatePreference(event: MediaQueryListEvent) {
      setPrefersReducedMotion(event.matches);
    }

    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function nextStep(step: number, lastStep: number) {
  return step === lastStep ? 0 : step + 1;
}

function formatStep(step: number) {
  return `0${step + 1}`.slice(-2);
}

interface DemoControlsProps {
  isPlaying: boolean;
  prefersReducedMotion: boolean;
  onPlayToggle: () => void;
  onStep: () => void;
  onReset: () => void;
}

function DemoControls({
  isPlaying,
  prefersReducedMotion,
  onPlayToggle,
  onStep,
  onReset,
}: DemoControlsProps) {
  return (
    <div className="dlq-demo-controls" aria-label="Animation controls">
      <button
        type="button"
        className="dlq-demo-button"
        aria-pressed={isPlaying}
        disabled={prefersReducedMotion}
        onClick={onPlayToggle}
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
      <button
        type="button"
        className="dlq-demo-button dlq-demo-button-secondary"
        onClick={onStep}
      >
        Step
      </button>
      <button
        type="button"
        className="dlq-demo-button dlq-demo-button-secondary"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  );
}

function queueStateFor(event: (typeof ISOLATION_EVENTS)[number], step: number) {
  if (!event.poison) {
    if (step < 3 && event.id === "000129") return "blocked";
    return "processed";
  }

  if (step === 0) return "waiting";
  if (step === 1) return "failed";
  if (step === 2) return "retrying";
  return "parked";
}

export function DeadLetterQueueIsolationDemo() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPlaying(false);
      setActiveStep(LAST_ISOLATION_STEP);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) return;

    const intervalId = window.setInterval(() => {
      setActiveStep((step) => nextStep(step, LAST_ISOLATION_STEP));
    }, ISOLATION_STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, prefersReducedMotion]);

  const active = ISOLATION_STEPS[activeStep];
  const hasFailure = activeStep >= 1;
  const retrying = activeStep >= 2;
  const parked = activeStep >= 3;

  return (
    <section
      className="dlq-demo dlq-isolation-demo"
      aria-labelledby="dlq-isolation-title"
      data-step={activeStep}
    >
      <div className="dlq-demo-header">
        <div>
          <p className="dlq-demo-kicker">Failure isolation</p>
          <h3 id="dlq-isolation-title">
            One bad event should not stop the line
          </h3>
          <p>
            A DLQ protects the hot path by moving repeatedly failed work into a
            separate place that can be inspected later.
          </p>
        </div>

        <DemoControls
          isPlaying={isPlaying}
          prefersReducedMotion={prefersReducedMotion}
          onPlayToggle={() => setIsPlaying((playing) => !playing)}
          onStep={() => {
            setIsPlaying(false);
            setActiveStep((step) => nextStep(step, LAST_ISOLATION_STEP));
          }}
          onReset={() => {
            setIsPlaying(false);
            setActiveStep(0);
          }}
        />
      </div>

      <div className="dlq-demo-status" aria-live={isPlaying ? "off" : "polite"}>
        <span>{active.label}</span>
        <strong>{active.status}</strong>
      </div>

      <div className="dlq-isolation-board" aria-label="DLQ isolation flow">
        <section
          className="dlq-queue-panel"
          aria-labelledby="dlq-hot-topic-title"
        >
          <div className="dlq-panel-heading">
            <p>Hot topic</p>
            <h4 id="dlq-hot-topic-title">checkout.events</h4>
          </div>

          <ol className="dlq-event-stack">
            {ISOLATION_EVENTS.map((event) => {
              const state = queueStateFor(event, activeStep);
              return (
                <li
                  key={event.id}
                  className="dlq-queue-item"
                  data-state={state}
                >
                  <span>{event.id}</span>
                  <strong>{event.title}</strong>
                  <small>{event.subtitle}</small>
                </li>
              );
            })}
          </ol>
        </section>

        <section
          className="dlq-worker-panel"
          aria-labelledby="dlq-worker-title"
          data-failed={hasFailure}
          data-retrying={retrying}
        >
          <div className="dlq-panel-heading">
            <p>Consumer</p>
            <h4 id="dlq-worker-title">recommendations-worker</h4>
          </div>

          <div className="dlq-worker-core">
            <span className="dlq-worker-icon" aria-hidden="true">
              {parked ? "OK" : hasFailure ? "!" : "RUN"}
            </span>
            <strong>
              {parked
                ? "queue unblocked"
                : retrying
                  ? "retry budget burning"
                  : hasFailure
                    ? "handler failed"
                    : "processing"}
            </strong>
            <small>
              {hasFailure
                ? "Product catalog timed out for sku_978."
                : "Events leave the hot topic after successful processing."}
            </small>
          </div>

          <div className="dlq-retry-meter" aria-label="Retry attempts">
            {[0, 1, 2].map((attempt) => (
              <span
                key={attempt}
                data-active={activeStep >= 2 && attempt <= activeStep - 2}
              />
            ))}
          </div>
        </section>

        <section
          className="dlq-quarantine-panel"
          aria-labelledby="dlq-quarantine-title"
          data-visible={parked}
        >
          <div className="dlq-panel-heading">
            <p>Quarantine</p>
            <h4 id="dlq-quarantine-title">checkout.events.dlq</h4>
          </div>

          <div className="dlq-quarantine-record">
            <span>000128</span>
            <strong>parked with failure context</strong>
            <small>original payload + error + attempt count</small>
          </div>
        </section>
      </div>
    </section>
  );
}

function mobilePayloadForStep(step: number) {
  switch (step) {
    case 0:
      return {
        label: "Payload",
        value: "userId=usr_42, productId=sku_978",
      };
    case 1:
      return {
        label: "Topic",
        value: "checkout.events @ offset 000128",
      };
    case 2:
      return {
        label: "Consumer",
        value: "recommendations-worker claimed the event",
      };
    case 3:
      return {
        label: "Failure",
        value: "ProductCatalogTimeout: sku_978",
      };
    case 4:
      return {
        label: "DLQ",
        value: "checkout.events.dlq stores the envelope",
      };
    case 5:
      return {
        label: "Replay",
        value: "safe to retry after catalog recovery",
      };
    default:
      return {
        label: "Trace",
        value: "waiting",
      };
  }
}

export function DeadLetterQueueDemo() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPlaying(false);
      setActiveStep(LAST_TRACE_STEP);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) return;

    const intervalId = window.setInterval(() => {
      setActiveStep((step) => nextStep(step, LAST_TRACE_STEP));
    }, TRACE_STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, prefersReducedMotion]);

  const activeStage = TRACE_STEPS[activeStep];
  const progressRatio = activeStep / LAST_TRACE_STEP;

  const style = useMemo(
    () => ({ "--dlq-progress-ratio": progressRatio }) as CSSProperties,
    [progressRatio],
  );

  return (
    <section
      className="dlq-demo dlq-trace-demo"
      aria-labelledby="dlq-demo-title"
      style={style}
    >
      <div className="dlq-demo-header">
        <div>
          <p className="dlq-demo-kicker">Failure trace</p>
          <h3 id="dlq-demo-title">
            One checkout event, one recoverable failure
          </h3>
          <p>
            Follow the event from the Checkout page into Kafka, through a
            failing consumer, and into the dead-letter record that makes replay
            possible.
          </p>
        </div>

        <DemoControls
          isPlaying={isPlaying}
          prefersReducedMotion={prefersReducedMotion}
          onPlayToggle={() => setIsPlaying((playing) => !playing)}
          onStep={() => {
            setIsPlaying(false);
            setActiveStep((step) => nextStep(step, LAST_TRACE_STEP));
          }}
          onReset={() => {
            setIsPlaying(false);
            setActiveStep(0);
          }}
        />
      </div>

      <div className="dlq-demo-status" aria-live={isPlaying ? "off" : "polite"}>
        <span>Step {formatStep(activeStep)}</span>
        <strong>{activeStage.status}</strong>
      </div>

      <div className="dlq-trace-steps" aria-label="Dead-letter queue stages">
        {TRACE_STEPS.map((stage, index) => {
          const state =
            index < activeStep
              ? "complete"
              : index === activeStep
                ? "active"
                : "waiting";

          return (
            <button
              key={stage.id}
              type="button"
              className="dlq-trace-step"
              data-state={state}
              aria-current={state === "active" ? "step" : undefined}
              onClick={() => {
                setIsPlaying(false);
                setActiveStep(index);
              }}
            >
              <span>{formatStep(index)}</span>
              <strong>{stage.label}</strong>
              <small>{stage.detail}</small>
            </button>
          );
        })}
      </div>

      <ol className="dlq-mobile-trace" aria-label="Compact DLQ flow">
        {TRACE_STEPS.map((stage, index) => {
          const state =
            index < activeStep
              ? "complete"
              : index === activeStep
                ? "active"
                : "waiting";
          const payload = mobilePayloadForStep(index);

          return (
            <li key={stage.id} className="dlq-mobile-step" data-state={state}>
              <button
                type="button"
                className="dlq-mobile-marker"
                aria-label={`Jump to ${stage.label}`}
                aria-current={state === "active" ? "step" : undefined}
                onClick={() => {
                  setIsPlaying(false);
                  setActiveStep(index);
                }}
              >
                {formatStep(index)}
              </button>
              <div className="dlq-mobile-copy">
                <div>
                  <strong>{stage.label}</strong>
                  <small>{stage.detail}</small>
                </div>
                <p>
                  <span>{payload.label}</span>
                  <code>{payload.value}</code>
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="dlq-trace-board">
        <section
          className="dlq-payload-panel"
          aria-labelledby="dlq-payload-title"
        >
          <div className="dlq-panel-heading">
            <p>Checkout page</p>
            <h4 id="dlq-payload-title">event payload</h4>
          </div>

          <dl className="dlq-field-list">
            {CHECKOUT_EVENT_FIELDS.map((field) => (
              <div key={field.key} data-visible={activeStep >= field.visibleAt}>
                <dt>{field.key}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="dlq-processing-panel"
          aria-labelledby="dlq-processing-title"
        >
          <div className="dlq-panel-heading">
            <p>Consumer</p>
            <h4 id="dlq-processing-title">processing attempts</h4>
          </div>

          <div className="dlq-topic-card" data-active={activeStep >= 1}>
            <span>checkout.events</span>
            <strong>key=userId:usr_42</strong>
            <small>offset 000128</small>
          </div>

          <ol className="dlq-attempt-list">
            {ATTEMPTS.map((attempt) => (
              <li
                key={attempt.label}
                data-visible={activeStep >= attempt.visibleAt}
              >
                <span>{attempt.label}</span>
                <strong>{attempt.value}</strong>
                <small>{attempt.note}</small>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="dlq-record-panel"
          aria-labelledby="dlq-record-title"
        >
          <div className="dlq-panel-heading">
            <p>Dead-letter record</p>
            <h4 id="dlq-record-title">replay envelope</h4>
          </div>

          <dl className="dlq-field-list dlq-envelope-list">
            {FAILURE_METADATA.map((field) => (
              <div key={field.key} data-visible={activeStep >= field.visibleAt}>
                <dt>{field.key}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>

          <div className="dlq-replay-strip" data-ready={activeStep >= 5}>
            <span>
              {activeStep >= 5 ? "Replay ready" : "Waiting for DLQ record"}
            </span>
            <strong>
              {activeStep >= 5
                ? "retry checkout.page_viewed after catalog recovery"
                : "preserve the original event before taking action"}
            </strong>
          </div>
        </section>
      </div>
    </section>
  );
}

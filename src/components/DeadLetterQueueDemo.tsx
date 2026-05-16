import { useEffect, useMemo, useState, type CSSProperties } from "react";

const STAGES = [
  {
    id: "checkout",
    label: "Checkout",
    detail: "page view starts",
    status: "Checkout page loaded",
  },
  {
    id: "producer",
    label: "Producer",
    detail: "event assembled",
    status: "Analytics event emitted",
  },
  {
    id: "kafka",
    label: "Kafka",
    detail: "message appended",
    status: "Event is durable",
  },
  {
    id: "consumer",
    label: "Consumer",
    detail: "handler fails",
    status: "Processing failed",
  },
  {
    id: "retry",
    label: "Retry",
    detail: "attempt budget spent",
    status: "Retries exhausted",
  },
  {
    id: "dlq",
    label: "DLQ",
    detail: "message isolated",
    status: "Failure kept for inspection",
  },
] as const;

const LAST_STAGE = STAGES.length - 1;
const STEP_MS = 1800;

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

function nextStep(step: number) {
  return step === LAST_STAGE ? 0 : step + 1;
}

function formatStep(step: number) {
  return `0${step + 1}`.slice(-2);
}

export function DeadLetterQueueDemo() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPlaying(false);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) return;

    const id = window.setInterval(() => {
      setActiveStep((step) => nextStep(step));
    }, STEP_MS);

    return () => window.clearInterval(id);
  }, [isPlaying, prefersReducedMotion]);

  const activeStage = STAGES[activeStep];
  const progress = `${(activeStep / LAST_STAGE) * 100}%`;

  const checkoutEvent = useMemo(
    () => [
      { field: "userId", value: "usr_42", reason: "who opened checkout" },
      { field: "productId", value: "sku_978", reason: "what they may buy" },
      { field: "cartId", value: "cart_314", reason: "checkout context" },
      { field: "sessionId", value: "sess_abc", reason: "browser session" },
      {
        field: "occurredAt",
        value: "2026-05-15T21:04:12Z",
        reason: "event time",
      },
      { field: "traceId", value: "trc_7f8", reason: "debug path" },
    ],
    [],
  );

  const attempts = [
    {
      step: 3,
      time: "try 1",
      value: "timeout",
      note: "product enrichment service did not respond",
    },
    {
      step: 4,
      time: "try 3",
      value: "failed",
      note: "same event still cannot be processed",
    },
    {
      step: 5,
      time: "DLQ",
      value: "stored",
      note: "original payload plus failure metadata is retained",
    },
  ].filter((attempt) => attempt.step <= activeStep);

  return (
    <section
      className="cdc-demo dlq-demo"
      aria-labelledby="dlq-demo-title"
      style={{ "--cdc-progress": progress } as CSSProperties}
    >
      <div className="cdc-demo-header">
        <div>
          <p className="cdc-demo-kicker">DLQ demo</p>
          <h3 id="dlq-demo-title">One checkout event, one failed consumer</h3>
          <p>
            A page-view event is safe in Kafka, but the failed consumer still
            needs a place to put work it cannot finish.
          </p>
        </div>

        <div className="cdc-demo-controls" aria-label="Animation controls">
          <button
            type="button"
            className="cdc-demo-button"
            onClick={() => setIsPlaying((playing) => !playing)}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="cdc-demo-button cdc-demo-button-secondary"
            onClick={() => {
              setIsPlaying(false);
              setActiveStep((step) => nextStep(step));
            }}
          >
            Step
          </button>
          <button
            type="button"
            className="cdc-demo-button cdc-demo-button-secondary"
            onClick={() => {
              setIsPlaying(false);
              setActiveStep(0);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="cdc-demo-stage-status" aria-live="polite">
        <span>Step {formatStep(activeStep)}</span>
        <strong>{activeStage.status}</strong>
      </div>

      <div className="cdc-demo-rail" aria-label="Dead-letter queue stages">
        <div className="cdc-demo-progress" aria-hidden="true" />
        {STAGES.map((stage, index) => {
          const isActive = index === activeStep;
          const isComplete = index < activeStep;

          return (
            <button
              key={stage.id}
              type="button"
              className="cdc-demo-stage"
              data-active={isActive}
              data-complete={isComplete}
              aria-current={isActive ? "step" : undefined}
              onClick={() => {
                setIsPlaying(false);
                setActiveStep(index);
              }}
            >
              <span className="cdc-demo-stage-index">{formatStep(index)}</span>
              <span>
                <strong>{stage.label}</strong>
                <small>{stage.detail}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="cdc-demo-panels">
        <section className="cdc-demo-panel" aria-labelledby="dlq-event-title">
          <div className="cdc-demo-panel-header">
            <p>Checkout page</p>
            <h4 id="dlq-event-title">event payload</h4>
          </div>
          <div
            className="cdc-demo-table"
            role="table"
            aria-label="checkout page event fields"
          >
            <div role="row" className="cdc-demo-table-head">
              <span role="columnheader">field</span>
              <span role="columnheader">value</span>
              <span role="columnheader">why</span>
            </div>
            {checkoutEvent.map((field) => (
              <div
                key={field.field}
                role="row"
                className="cdc-demo-table-row"
                data-active={activeStep >= 1}
              >
                <span role="cell">{field.field}</span>
                <span role="cell" className="cdc-demo-value">
                  {field.value}
                </span>
                <span role="cell">{field.reason}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="cdc-demo-panel" aria-labelledby="dlq-kafka-title">
          <div className="cdc-demo-panel-header">
            <p>Kafka</p>
            <h4 id="dlq-kafka-title">checkout.page_viewed</h4>
          </div>
          <dl className="cdc-demo-event">
            <div data-active={activeStep >= 1}>
              <dt>topic</dt>
              <dd>checkout.events</dd>
            </div>
            <div data-active={activeStep >= 1}>
              <dt>key</dt>
              <dd>userId=usr_42</dd>
            </div>
            <div data-active={activeStep >= 2}>
              <dt>offset</dt>
              <dd>000128 committed</dd>
            </div>
            <div data-active={activeStep >= 3}>
              <dt>error</dt>
              <dd>ProductCatalogTimeout: sku_978</dd>
            </div>
            <div data-active={activeStep >= 5}>
              <dt>dlq</dt>
              <dd>checkout.events.dlq</dd>
            </div>
          </dl>
        </section>

        <section className="cdc-demo-panel" aria-labelledby="dlq-state-title">
          <div className="cdc-demo-panel-header">
            <p>Consumer state</p>
            <h4 id="dlq-state-title">failure trail</h4>
          </div>
          <div className="cdc-demo-search">
            <div className="cdc-demo-document" data-updated={activeStep >= 5}>
              <span>dead-letter topic</span>
              <strong>
                {activeStep >= 5 ? "1 failed event stored" : "0 failed events"}
              </strong>
            </div>
            <ol className="cdc-demo-observations">
              {attempts.map((attempt) => (
                <li key={attempt.time}>
                  <span>{attempt.time}</span>
                  <strong>{attempt.value}</strong>
                  <small>{attempt.note}</small>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </section>
  );
}

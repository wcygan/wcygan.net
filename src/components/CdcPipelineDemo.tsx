import { useEffect, useMemo, useState, type CSSProperties } from "react";

const STAGES = [
  {
    id: "postgres",
    label: "Postgres",
    detail: "row committed",
    status: "Postgres is the source of truth.",
  },
  {
    id: "debezium",
    label: "Debezium",
    detail: "WAL change read",
    status: "Debezium reads the committed row change from Postgres WAL.",
  },
  {
    id: "kafka",
    label: "Kafka",
    detail: "event stored",
    status: "Kafka makes the event durable for downstream readers.",
  },
  {
    id: "indexer",
    label: "Indexer",
    detail: "message mapped",
    status: "The indexer reshapes the event for OpenSearch.",
  },
  {
    id: "opensearch",
    label: "OpenSearch",
    detail: "document updated",
    status: "OpenSearch now has the updated user document.",
  },
  {
    id: "client",
    label: "Client",
    detail: "query observed",
    status: "The same query now observes plan=pro.",
  },
] as const;

const LAST_STAGE = STAGES.length - 1;
const STEP_MS = 1650;

const EVENT_FIELDS = [
  { key: "topic", value: "app.public.users", visibleAt: 1 },
  { key: "key", value: '{ "id": 42 }', visibleAt: 1 },
  { key: "before", value: '{ "id": 42, "plan": "free" }', visibleAt: 1 },
  { key: "after", value: '{ "id": 42, "plan": "pro" }', visibleAt: 1 },
  { key: "op", value: '"u"', visibleAt: 1 },
  { key: "lsn", value: "24023128", visibleAt: 2 },
  { key: "consumer", value: "users-search-indexer", visibleAt: 3 },
] as const;

const OBSERVATIONS = [
  {
    time: "t+0ms",
    value: "free",
    note: "query starts before the event is indexed",
    visibleAt: 0,
  },
  {
    time: "t+900ms",
    value: "free",
    note: "Kafka has the event; OpenSearch is still old",
    visibleAt: 3,
  },
  {
    time: "t+1400ms",
    value: "pro",
    note: "the index catches up to Postgres",
    visibleAt: 5,
  },
] as const;

function mobilePayloadForStep(step: number, activeStep: number) {
  switch (step) {
    case 0:
      return {
        label: "Postgres row",
        value: "users[42].plan: free -> pro",
      };
    case 1:
      return {
        label: "Debezium event",
        value: 'before: "free", after: "pro"',
      };
    case 2:
      return {
        label: "Kafka topic",
        value: "app.public.users @ LSN 24023128",
      };
    case 3:
      return {
        label: "Indexer",
        value: "map event -> users/_doc/42",
      };
    case 4:
      return {
        label: "OpenSearch document",
        value: `plan: ${activeStep >= 4 ? "pro" : "free"}`,
      };
    case 5:
      return {
        label: "Client query",
        value: `observes plan=${activeStep >= 5 ? "pro" : "free"}`,
      };
    default:
      return {
        label: "Pipeline step",
        value: "waiting",
      };
  }
}

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

export function CdcPipelineDemo() {
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

    const intervalId = window.setInterval(() => {
      setActiveStep((step) => nextStep(step));
    }, STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, prefersReducedMotion]);

  const activeStage = STAGES[activeStep];
  const progressRatio = activeStep / LAST_STAGE;
  const progressPosition = `${progressRatio * 100}%`;

  const style = useMemo(
    () =>
      ({
        "--cdc-progress-ratio": progressRatio,
        "--cdc-progress-position": progressPosition,
      }) as CSSProperties,
    [progressPosition, progressRatio],
  );

  return (
    <section
      className="cdc-demo"
      aria-labelledby="cdc-demo-title"
      style={style}
    >
      <div className="cdc-demo-header">
        <div>
          <h3 id="cdc-demo-title">One user row, one downstream view</h3>
          <p>
            Follow a single <code>users</code> update as it becomes a durable
            event, then an OpenSearch document, then an observed client result.
          </p>
        </div>

        <div className="cdc-demo-controls" aria-label="Animation controls">
          <button
            type="button"
            className="cdc-demo-button"
            aria-pressed={isPlaying}
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

      <div
        className="cdc-demo-stage-status"
        aria-live={isPlaying ? "off" : "polite"}
      >
        <span>Step {formatStep(activeStep)}</span>
        <strong>{activeStage.status}</strong>
      </div>

      <div className="cdc-demo-rail" aria-label="CDC pipeline stages">
        <div className="cdc-demo-progress-track" aria-hidden="true">
          <div className="cdc-demo-progress-fill" />
          <div className="cdc-demo-progress-packet" />
        </div>

        {STAGES.map((stage, index) => {
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
              className="cdc-demo-stage"
              data-state={state}
              aria-current={state === "active" ? "step" : undefined}
              style={{ "--stage-index": index } as CSSProperties}
              onClick={() => {
                setIsPlaying(false);
                setActiveStep(index);
              }}
            >
              <span className="cdc-demo-stage-index">{formatStep(index)}</span>
              <span className="cdc-demo-stage-copy">
                <strong>{stage.label}</strong>
                <small>{stage.detail}</small>
              </span>
            </button>
          );
        })}
      </div>

      <ol className="cdc-demo-mobile-flow" aria-label="Compact CDC flow">
        {STAGES.map((stage, index) => {
          const state =
            index < activeStep
              ? "complete"
              : index === activeStep
                ? "active"
                : "waiting";
          const payload = mobilePayloadForStep(index, activeStep);

          return (
            <li
              key={stage.id}
              className="cdc-demo-mobile-step"
              data-state={state}
            >
              <button
                type="button"
                className="cdc-demo-mobile-marker"
                aria-label={`Jump to ${stage.label}`}
                aria-current={state === "active" ? "step" : undefined}
                onClick={() => {
                  setIsPlaying(false);
                  setActiveStep(index);
                }}
              >
                {formatStep(index)}
              </button>

              <div className="cdc-demo-mobile-copy">
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

      <div className="cdc-demo-panels">
        <section
          className="cdc-demo-panel"
          aria-labelledby="cdc-postgres-title"
        >
          <div className="cdc-demo-panel-header">
            <p>Source write</p>
            <h4 id="cdc-postgres-title">
              <code>users</code> row
            </h4>
          </div>

          <div className="cdc-demo-table" role="table" aria-label="users row">
            <div role="row" className="cdc-demo-table-head">
              <span role="columnheader">id</span>
              <span role="columnheader">name</span>
              <span role="columnheader">plan</span>
            </div>
            <div role="row" className="cdc-demo-table-row">
              <span role="cell">42</span>
              <span role="cell">Ada</span>
              <span role="cell" className="cdc-demo-value-swap">
                <span className="cdc-demo-value-old">free</span>
                <span className="cdc-demo-value-new">pro</span>
              </span>
            </div>
          </div>

          <p className="cdc-demo-note">
            The application commits one write. No search code runs in the
            request path.
          </p>
        </section>

        <section className="cdc-demo-panel" aria-labelledby="cdc-event-title">
          <div className="cdc-demo-panel-header">
            <p>Change stream</p>
            <h4 id="cdc-event-title">event envelope</h4>
          </div>

          <dl className="cdc-demo-event">
            {EVENT_FIELDS.map((field) => (
              <div key={field.key} data-visible={activeStep >= field.visibleAt}>
                <dt>{field.key}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="cdc-demo-panel" aria-labelledby="cdc-search-title">
          <div className="cdc-demo-panel-header">
            <p>Read model</p>
            <h4 id="cdc-search-title">observed values</h4>
          </div>

          <div className="cdc-demo-search">
            <div className="cdc-demo-document" data-updated={activeStep >= 4}>
              <span>users/_doc/42</span>
              <strong>plan: {activeStep >= 4 ? "pro" : "free"}</strong>
            </div>

            <ol className="cdc-demo-observations">
              {OBSERVATIONS.map((observation) => (
                <li
                  key={observation.time}
                  data-visible={activeStep >= observation.visibleAt}
                >
                  <span>{observation.time}</span>
                  <strong>plan={observation.value}</strong>
                  <small>{observation.note}</small>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </section>
  );
}

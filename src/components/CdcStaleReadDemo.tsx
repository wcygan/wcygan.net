import { useEffect, useState } from "react";

const STEPS = [
  {
    label: "Commit",
    status: "Postgres commits plan=pro while OpenSearch still has plan=free.",
  },
  {
    label: "Fetch",
    status: "The client fetches users[42] from both places.",
  },
  {
    label: "Return",
    status: "Postgres returns pro. OpenSearch returns free.",
  },
  {
    label: "Mismatch",
    status:
      "Same entity, different answers until the derived index catches up.",
  },
] as const;

const LAST_STEP = STEPS.length - 1;
const STEP_MS = 1550;

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
  return step === LAST_STEP ? 0 : step + 1;
}

export function CdcStaleReadDemo() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeStep, setActiveStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsPlaying(false);
      setActiveStep(LAST_STEP);
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isPlaying || prefersReducedMotion) return;

    const intervalId = window.setInterval(() => {
      setActiveStep((step) => nextStep(step));
    }, STEP_MS);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, prefersReducedMotion]);

  const active = STEPS[activeStep];
  const queryStarted = activeStep >= 1;
  const responseReturned = activeStep >= 2;
  const mismatchVisible = activeStep >= 3;

  return (
    <section
      className="cdc-demo cdc-stale-demo"
      aria-labelledby="cdc-stale-title"
      data-step={activeStep}
    >
      <div className="cdc-demo-header">
        <div>
          <h3 id="cdc-stale-title">Inconsistent Reads</h3>
          <p>
            After an update, clients can read different values depending on
            which system they read from.
          </p>
        </div>

        <div className="cdc-demo-controls" aria-label="Animation controls">
          <button
            type="button"
            className="cdc-demo-button"
            aria-pressed={isPlaying}
            disabled={prefersReducedMotion}
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
        className="cdc-demo-stage-status cdc-stale-status"
        aria-live={isPlaying ? "off" : "polite"}
      >
        <span>{active.label}</span>
        <strong>{active.status}</strong>
      </div>

      <div
        className="cdc-stale-board"
        aria-label="Postgres and OpenSearch stale read comparison"
      >
        <div className="cdc-stale-client">
          <span>Client</span>
          <strong>User profile view</strong>
          <code>fetchUser(42)</code>
        </div>

        <div className="cdc-stale-lanes" aria-hidden="true">
          <div
            className="cdc-stale-lane"
            data-active={queryStarted}
            data-returned={responseReturned}
          >
            <span className="cdc-stale-chip">GET</span>
            <span className="cdc-stale-arrow" />
            <span className="cdc-stale-chip cdc-stale-chip-result">pro</span>
          </div>
          <div
            className="cdc-stale-lane cdc-stale-lane-stale"
            data-active={queryStarted}
            data-returned={responseReturned}
          >
            <span className="cdc-stale-chip">GET</span>
            <span className="cdc-stale-arrow" />
            <span className="cdc-stale-chip cdc-stale-chip-result">free</span>
          </div>
        </div>

        <div className="cdc-stale-sources">
          <section
            className="cdc-stale-source"
            data-active={queryStarted}
            data-returned={responseReturned}
            aria-labelledby="cdc-stale-postgres"
          >
            <span>Source of truth</span>
            <h4 id="cdc-stale-postgres">Postgres</h4>
            <strong className="cdc-stale-plan">plan: pro</strong>
            <small>users/42 at v42</small>
          </section>

          <section
            className="cdc-stale-source cdc-stale-source-lagging"
            data-active={queryStarted}
            data-returned={responseReturned}
            data-mismatch={mismatchVisible}
            aria-labelledby="cdc-stale-opensearch"
          >
            <span>Derived index</span>
            <h4 id="cdc-stale-opensearch">OpenSearch</h4>
            <strong className="cdc-stale-plan">plan: free</strong>
            <small>users/42 at v41</small>
          </section>
        </div>
      </div>
    </section>
  );
}

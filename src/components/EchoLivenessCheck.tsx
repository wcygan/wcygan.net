import { useEffect, useState } from "react";

const ECHO_URL = "https://echo.wcygan.net/";

type ProbeState = "idle" | "checking" | "ok" | "opaque" | "error";

interface EchoResponse {
  path?: string;
  method?: string;
  protocol?: string;
  hostname?: string;
  headers?: Record<string, string | undefined>;
  os?: {
    hostname?: string;
  };
}

interface ProbeResult {
  state: ProbeState;
  durationMs?: number;
  message?: string;
  data?: EchoResponse;
}

const STATUS_LABEL: Record<ProbeState, string> = {
  idle: "Not checked",
  checking: "Contacting edge",
  ok: "Live",
  opaque: "Reachable",
  error: "Failed",
};

function getHeader(data: EchoResponse | undefined, name: string) {
  return data?.headers?.[name.toLowerCase()];
}

function getCloudflareColo(cfRay: string | undefined) {
  return cfRay?.split("-").at(-1);
}

function formatDuration(durationMs: number) {
  return `${Math.round(durationMs)} ms`;
}

export function EchoLivenessCheck() {
  const [result, setResult] = useState<ProbeResult>({ state: "idle" });
  const [elapsedMs, setElapsedMs] = useState(0);

  const isChecking = result.state === "checking";
  const isOk = result.state === "ok" || result.state === "opaque";

  // Tick a live elapsed-time counter while a request is in flight — this is
  // the primary "something is happening right now" signal for the user.
  useEffect(() => {
    if (!isChecking) return;

    const startedAt = performance.now();
    let frame = requestAnimationFrame(function tick() {
      setElapsedMs(performance.now() - startedAt);
      frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [isChecking]);

  async function runProbe() {
    const startedAt = performance.now();
    const probeUrl = new URL(ECHO_URL);
    probeUrl.searchParams.set("probe", Date.now().toString());

    setElapsedMs(0);
    setResult({ state: "checking" });

    let response: Response;

    try {
      response = await fetch(probeUrl, {
        cache: "no-store",
        credentials: "omit",
      });
    } catch {
      try {
        await fetch(probeUrl, {
          cache: "no-store",
          credentials: "omit",
          mode: "no-cors",
        });

        setResult({
          state: "opaque",
          durationMs: performance.now() - startedAt,
          message:
            "Reachability check completed, but browser CORS rules hid the JSON response body.",
        });
      } catch (networkError) {
        setResult({
          state: "error",
          durationMs: performance.now() - startedAt,
          message:
            networkError instanceof Error
              ? networkError.message
              : "Unable to reach echo.wcygan.net.",
        });
      }
      return;
    }

    if (!response.ok) {
      setResult({
        state: "error",
        durationMs: performance.now() - startedAt,
        message: `echo.wcygan.net returned HTTP ${response.status}.`,
      });
      return;
    }

    try {
      const data = (await response.json()) as EchoResponse;
      setResult({
        state: "ok",
        durationMs: performance.now() - startedAt,
        data,
      });
    } catch (jsonError) {
      setResult({
        state: "error",
        durationMs: performance.now() - startedAt,
        message:
          jsonError instanceof Error
            ? jsonError.message
            : "Unable to parse echo response JSON.",
      });
    }
  }

  const buttonLabel = isChecking
    ? "Checking"
    : result.state === "idle"
      ? "Check echo.wcygan.net"
      : "Run check again";

  const displayDurationMs = isChecking ? elapsedMs : result.durationMs;

  const cfRay = getHeader(result.data, "cf-ray");
  const cloudflareColo = getCloudflareColo(cfRay);
  const podHostname = result.data?.os?.hostname;
  const requestId = getHeader(result.data, "x-request-id");

  return (
    <section
      className="anton-probe"
      data-state={result.state}
      aria-labelledby="anton-probe-title"
    >
      <div className="anton-probe-header">
        <div>
          <h3 id="anton-probe-title">Live edge check</h3>
          <p>
            Pings <a href={ECHO_URL}>echo.wcygan.net</a> straight from this
            browser.
          </p>
        </div>
        <button
          type="button"
          className="anton-probe-button"
          onClick={runProbe}
          disabled={isChecking}
        >
          {isChecking && (
            <span className="anton-probe-spinner" aria-hidden="true" />
          )}
          {buttonLabel}
        </button>
      </div>

      <div
        className="anton-probe-track"
        data-state={result.state}
        aria-hidden="true"
      >
        <span className="anton-probe-track-fill" />
      </div>

      <div
        className="anton-probe-status"
        data-state={result.state}
        role="status"
        aria-live="polite"
      >
        <span className="anton-probe-dot" aria-hidden="true" />
        <strong>{STATUS_LABEL[result.state]}</strong>
        {displayDurationMs !== undefined && (
          <span
            key={result.state}
            className="anton-probe-latency"
            data-state={result.state}
          >
            {isOk && (
              <svg
                className="anton-probe-check"
                viewBox="0 0 16 16"
                width="13"
                height="13"
                aria-hidden="true"
              >
                <path
                  d="M3.5 8.5l3 3 6-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {formatDuration(displayDurationMs)}
          </span>
        )}
      </div>

      {result.state === "ok" && (
        <dl className="anton-probe-details">
          <div>
            <dt>Route</dt>
            <dd>
              {result.data?.method ?? "GET"} {result.data?.protocol ?? "https"}
              ://{result.data?.hostname ?? "echo.wcygan.net"}
              {result.data?.path ?? "/"}
            </dd>
          </div>
          {cloudflareColo && (
            <div>
              <dt>Cloudflare colo</dt>
              <dd>{cloudflareColo}</dd>
            </div>
          )}
          {podHostname && (
            <div>
              <dt>Kubernetes pod</dt>
              <dd>{podHostname}</dd>
            </div>
          )}
          {requestId && (
            <div>
              <dt>Request ID</dt>
              <dd>{requestId}</dd>
            </div>
          )}
        </dl>
      )}

      <p
        className="anton-probe-message"
        data-empty={result.message ? undefined : "true"}
        aria-hidden={result.message ? undefined : true}
      >
        {result.message}
      </p>
    </section>
  );
}

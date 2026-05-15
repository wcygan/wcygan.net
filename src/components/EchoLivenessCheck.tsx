import { useEffect, useRef, useState } from "react";

const ECHO_URL = "https://echo.wcygan.net/";
const BUSY_DELAY_MS = 120;
const MIN_BUSY_VISIBLE_MS = 200;

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

function formatAnnouncement(result: ProbeResult) {
  const duration =
    result.durationMs === undefined
      ? ""
      : ` in ${formatDuration(result.durationMs)}`;

  switch (result.state) {
    case "ok":
      return `echo.wcygan.net is live${duration}.`;
    case "opaque":
      return `echo.wcygan.net is reachable${duration}, but browser CORS rules hid the response body.`;
    case "error":
      return `Unable to reach echo.wcygan.net${duration}.`;
    case "checking":
      return "Checking echo.wcygan.net.";
    case "idle":
      return "echo.wcygan.net has not been checked yet.";
  }
}

export function EchoLivenessCheck() {
  const [result, setResult] = useState<ProbeResult>({ state: "idle" });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRequestActive, setIsRequestActive] = useState(false);
  const [showBusy, setShowBusy] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "echo.wcygan.net has not been checked yet.",
  );

  const requestInFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const requestStartedAtRef = useRef<number | undefined>(undefined);
  const busyDelayTimeoutRef = useRef<number | undefined>(undefined);
  const settleTimeoutRef = useRef<number | undefined>(undefined);

  const visualState: ProbeState = showBusy ? "checking" : result.state;
  const isOk = visualState === "ok" || visualState === "opaque";

  // Tick a live elapsed-time counter while a request is in flight — this is
  // visual only. Final status changes are announced separately for assistive
  // tech so the live region is not updated on every animation frame.
  useEffect(() => {
    if (!showBusy) return;

    const startedAt = requestStartedAtRef.current ?? performance.now();
    let frame = requestAnimationFrame(function tick() {
      setElapsedMs(performance.now() - startedAt);
      frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [showBusy]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      window.clearTimeout(busyDelayTimeoutRef.current);
      window.clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  async function runProbe() {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const startedAt = performance.now();
    requestStartedAtRef.current = startedAt;
    let busyShownAt: number | undefined;
    const probeUrl = new URL(ECHO_URL);
    probeUrl.searchParams.set("probe", Date.now().toString());

    setElapsedMs(0);
    setIsRequestActive(true);
    setShowBusy(false);
    window.clearTimeout(busyDelayTimeoutRef.current);
    window.clearTimeout(settleTimeoutRef.current);

    busyDelayTimeoutRef.current = window.setTimeout(() => {
      if (requestIdRef.current !== requestId) return;

      busyShownAt = performance.now();
      setShowBusy(true);
      setAnnouncement("Checking echo.wcygan.net.");
    }, BUSY_DELAY_MS);

    let response: Response;
    let nextResult: ProbeResult;

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

        nextResult = {
          state: "opaque",
          durationMs: performance.now() - startedAt,
          message:
            "Reachability check completed, but browser CORS rules hid the JSON response body.",
        };
      } catch (networkError) {
        nextResult = {
          state: "error",
          durationMs: performance.now() - startedAt,
          message:
            networkError instanceof Error
              ? networkError.message
              : "Unable to reach echo.wcygan.net.",
        };
      }
      finishProbe(requestId, nextResult, busyShownAt);
      return;
    }

    if (!response.ok) {
      nextResult = {
        state: "error",
        durationMs: performance.now() - startedAt,
        message: `echo.wcygan.net returned HTTP ${response.status}.`,
      };
      finishProbe(requestId, nextResult, busyShownAt);
      return;
    }

    try {
      const data = (await response.json()) as EchoResponse;
      nextResult = {
        state: "ok",
        durationMs: performance.now() - startedAt,
        data,
      };
    } catch (jsonError) {
      nextResult = {
        state: "error",
        durationMs: performance.now() - startedAt,
        message:
          jsonError instanceof Error
            ? jsonError.message
            : "Unable to parse echo response JSON.",
      };
    }

    finishProbe(requestId, nextResult, busyShownAt);
  }

  function finishProbe(
    requestId: number,
    nextResult: ProbeResult,
    busyShownAt: number | undefined,
  ) {
    window.clearTimeout(busyDelayTimeoutRef.current);

    const finish = () => {
      if (requestIdRef.current !== requestId) return;

      requestInFlightRef.current = false;
      requestStartedAtRef.current = undefined;
      setResult(nextResult);
      setShowBusy(false);
      setIsRequestActive(false);
      setAnnouncement(formatAnnouncement(nextResult));
    };

    if (busyShownAt === undefined) {
      finish();
      return;
    }

    const visibleDurationMs = performance.now() - busyShownAt;
    const settleDelayMs = Math.max(MIN_BUSY_VISIBLE_MS - visibleDurationMs, 0);

    settleTimeoutRef.current = window.setTimeout(finish, settleDelayMs);
  }

  const buttonLabel = showBusy
    ? "Checking"
    : result.state === "idle"
      ? "Check echo.wcygan.net"
      : "Run check again";

  const displayDurationMs = showBusy ? elapsedMs : result.durationMs;

  const cfRay = getHeader(result.data, "cf-ray");
  const cloudflareColo = getCloudflareColo(cfRay);
  const podHostname = result.data?.os?.hostname;
  const requestId = getHeader(result.data, "x-request-id");

  return (
    <section
      className="anton-probe"
      data-state={visualState}
      aria-busy={isRequestActive}
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
          disabled={isRequestActive}
          data-busy={showBusy ? "true" : undefined}
        >
          <span className="anton-probe-button-icon" aria-hidden="true">
            {showBusy && <span className="anton-probe-spinner" />}
          </span>
          <span className="anton-probe-button-label">{buttonLabel}</span>
        </button>
      </div>

      <div
        className="anton-probe-track"
        data-state={visualState}
        aria-hidden="true"
      >
        <span className="anton-probe-track-fill" />
      </div>

      <div className="anton-probe-status" data-state={visualState}>
        <span className="anton-probe-dot" aria-hidden="true" />
        <strong>{STATUS_LABEL[visualState]}</strong>
        <span
          className="anton-probe-latency"
          data-state={visualState}
          data-empty={displayDurationMs === undefined ? "true" : undefined}
          aria-hidden={
            showBusy || displayDurationMs === undefined ? true : undefined
          }
        >
          {isOk && displayDurationMs !== undefined && (
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
          {displayDurationMs === undefined
            ? "000 ms"
            : formatDuration(displayDurationMs)}
        </span>
      </div>

      <div className="anton-probe-result" data-state={result.state}>
        {result.state === "ok" && (
          <dl className="anton-probe-details">
            <div>
              <dt>Route</dt>
              <dd>
                {result.data?.method ?? "GET"}{" "}
                {result.data?.protocol ?? "https"}://
                {result.data?.hostname ?? "echo.wcygan.net"}
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
      </div>

      <p
        className="anton-probe-announcement"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </section>
  );
}

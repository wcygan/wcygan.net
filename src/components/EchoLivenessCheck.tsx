import { type CSSProperties, useEffect, useRef, useState } from "react";

const ECHO_URL = "https://echo.wcygan.net/";
const ROUTE_PLAYBACK_MS = 1200;
const REQUEST_ROUTE_STEPS = [
  { kind: "browser", label: "Browser" },
  { kind: "cloudflare", label: "Cloudflare" },
  { kind: "anton", label: "Anton" },
  { kind: "echo", label: "echo" },
] as const;

type ProbeState = "idle" | "checking" | "ok" | "opaque" | "error";
type RouteStepKind = (typeof REQUEST_ROUTE_STEPS)[number]["kind"];

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
  const [playbackElapsedMs, setPlaybackElapsedMs] = useState(0);
  const [isRequestActive, setIsRequestActive] = useState(false);
  const [showBusy, setShowBusy] = useState(false);
  const [announcement, setAnnouncement] = useState(
    "echo.wcygan.net has not been checked yet.",
  );

  const requestInFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const playbackStartedAtRef = useRef<number | undefined>(undefined);
  const shouldAnimatePlaybackRef = useRef(false);
  const playbackTimeoutRef = useRef<number | undefined>(undefined);
  const playbackResolveRef = useRef<(() => void) | undefined>(undefined);

  const visualState: ProbeState = showBusy ? "checking" : result.state;
  const isOk = visualState === "ok" || visualState === "opaque";

  // Route playback is intentionally independent from network timing. The
  // response duration is captured when fetch settles and revealed only after
  // this educational route animation completes.
  useEffect(() => {
    if (!showBusy || !shouldAnimatePlaybackRef.current) return;

    const startedAt = playbackStartedAtRef.current ?? performance.now();
    let frame = requestAnimationFrame(function tick() {
      const elapsedMs = Math.min(
        performance.now() - startedAt,
        ROUTE_PLAYBACK_MS,
      );
      setPlaybackElapsedMs(elapsedMs);

      if (elapsedMs < ROUTE_PLAYBACK_MS) {
        frame = requestAnimationFrame(tick);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [showBusy]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      window.clearTimeout(playbackTimeoutRef.current);
      playbackResolveRef.current?.();
    };
  }, []);

  async function runProbe() {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const startedAt = performance.now();
    playbackStartedAtRef.current = startedAt;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    shouldAnimatePlaybackRef.current = !prefersReducedMotion;
    const probeUrl = new URL(ECHO_URL);
    probeUrl.searchParams.set("probe", Date.now().toString());
    const playbackFinished = waitForRoutePlayback(prefersReducedMotion);

    setPlaybackElapsedMs(prefersReducedMotion ? ROUTE_PLAYBACK_MS : 0);
    setResult({ state: "checking" });
    setIsRequestActive(true);
    setShowBusy(true);
    setAnnouncement("Checking echo.wcygan.net.");

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
      await playbackFinished;
      finishProbe(requestId, nextResult);
      return;
    }

    if (!response.ok) {
      nextResult = {
        state: "error",
        durationMs: performance.now() - startedAt,
        message: `echo.wcygan.net returned HTTP ${response.status}.`,
      };
      await playbackFinished;
      finishProbe(requestId, nextResult);
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

    await playbackFinished;
    finishProbe(requestId, nextResult);
  }

  function waitForRoutePlayback(prefersReducedMotion: boolean) {
    window.clearTimeout(playbackTimeoutRef.current);

    if (prefersReducedMotion) return Promise.resolve();

    return new Promise<void>((resolve) => {
      playbackResolveRef.current = resolve;
      playbackTimeoutRef.current = window.setTimeout(() => {
        playbackResolveRef.current = undefined;
        playbackTimeoutRef.current = undefined;
        resolve();
      }, ROUTE_PLAYBACK_MS);
    });
  }

  function finishProbe(requestId: number, nextResult: ProbeResult) {
    if (requestIdRef.current !== requestId) return;

    window.clearTimeout(playbackTimeoutRef.current);
    requestInFlightRef.current = false;
    playbackStartedAtRef.current = undefined;
    shouldAnimatePlaybackRef.current = false;
    playbackResolveRef.current = undefined;
    playbackTimeoutRef.current = undefined;
    setResult(nextResult);
    setShowBusy(false);
    setIsRequestActive(false);
    setAnnouncement(formatAnnouncement(nextResult));
  }

  const buttonLabel = showBusy
    ? "Checking"
    : result.state === "idle"
      ? "Check echo.wcygan.net"
      : "Run check again";

  const displayDurationMs = showBusy ? undefined : result.durationMs;

  const cfRay = getHeader(result.data, "cf-ray");
  const cloudflareColo = getCloudflareColo(cfRay);
  const podHostname = result.data?.os?.hostname;
  const requestId = getHeader(result.data, "x-request-id");
  const showReadyPreview = result.state === "idle" && !isRequestActive;
  const routeState = isRequestActive ? "checking" : visualState;
  const routeProgress = getRouteProgress(routeState, playbackElapsedMs);

  return (
    <figure
      className="anton-probe"
      data-graphic-frame="workbench"
      data-graphic-key="live-edge-check"
      data-graphic-kind="dom"
      data-state={visualState}
      aria-busy={isRequestActive}
      aria-labelledby="anton-probe-title"
      aria-describedby="anton-probe-description"
    >
      <header className="anton-probe-header">
        <div>
          <p className="article-graphic-title" id="anton-probe-title">
            Live edge check
          </p>
          <p id="anton-probe-description">
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
      </header>

      <div
        className="anton-probe-stage"
        data-graphic-stage="padded"
        data-state={showReadyPreview ? "idle" : routeState}
      >
        <RequestRoute progress={routeProgress} state={routeState} />

        {showReadyPreview ? (
          <div className="anton-probe-ready anton-probe-state">
            <div className="anton-probe-ready-summary">
              <p>Run the check to trace a live request through the cluster.</p>
              <span className="anton-probe-ready-status">Not checked</span>
            </div>
          </div>
        ) : (
          <div className="anton-probe-state">
            <div className="anton-probe-status" data-state={visualState}>
              <span className="anton-probe-dot" aria-hidden="true" />
              <strong>{STATUS_LABEL[visualState]}</strong>
              <span
                className="anton-probe-latency"
                data-state={visualState}
                data-empty={
                  displayDurationMs === undefined ? "true" : undefined
                }
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
                  <div className="anton-probe-detail-wide">
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
                    <div className="anton-probe-detail-wide">
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
          </div>
        )}
      </div>

      <p
        className="anton-probe-announcement"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </figure>
  );
}

function getRouteProgress(state: ProbeState, playbackElapsedMs: number) {
  if (state === "idle") return 0;
  if (state === "ok" || state === "opaque") return 1;
  if (state === "error") return 0.88;

  return Math.min(playbackElapsedMs / ROUTE_PLAYBACK_MS, 0.999);
}

function RequestRoute({
  progress,
  state,
}: {
  progress: number;
  state: ProbeState;
}) {
  const currentStep = Math.min(
    REQUEST_ROUTE_STEPS.length - 1,
    Math.floor(progress * REQUEST_ROUTE_STEPS.length),
  );
  const routeStyle = {
    "--anton-probe-route-progress": `${progress * 100}%`,
  } as CSSProperties;

  return (
    <div
      className="anton-probe-route"
      data-state={state}
      style={routeStyle}
      aria-label="Request route: Browser to Cloudflare to Anton to echo"
    >
      <div className="anton-probe-route-rail" aria-hidden="true">
        <span className="anton-probe-route-fill" />
      </div>
      {REQUEST_ROUTE_STEPS.map((step, index) => {
        const stepState =
          state === "idle"
            ? "pending"
            : state === "ok" || state === "opaque"
              ? "reached"
              : index < currentStep
                ? "reached"
                : index === currentStep
                  ? state === "error"
                    ? "failed"
                    : "active"
                  : "pending";

        return (
          <div
            className="anton-probe-route-step"
            data-step-state={stepState}
            key={step.kind}
          >
            <span className="anton-probe-route-icon" aria-hidden="true">
              <RequestRouteIcon kind={step.kind} />
            </span>
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function RequestRouteIcon({ kind }: { kind: RouteStepKind }) {
  if (kind === "browser") {
    return (
      <svg viewBox="0 0 32 32" fill="none">
        <rect x="3.75" y="5.75" width="24.5" height="18.5" rx="2.25" />
        <path d="M4 10.25h24M11.5 27.25h9M16 24.5v2.75" />
        <circle cx="7.25" cy="8" r=".75" fill="currentColor" stroke="none" />
        <circle cx="10.25" cy="8" r=".75" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (kind === "cloudflare") {
    return (
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M8.5 23.5h15.25a4.75 4.75 0 0 0 .42-9.48A7.5 7.5 0 0 0 9.7 12.4a5.6 5.6 0 0 0-1.2 11.1Z" />
        <path d="M11 19.5h13.5" />
      </svg>
    );
  }

  if (kind === "anton") {
    return (
      <svg viewBox="0 0 32 32" fill="none">
        <rect x="5" y="5.5" width="22" height="6" rx="1.5" />
        <rect x="5" y="13" width="22" height="6" rx="1.5" />
        <rect x="5" y="20.5" width="22" height="6" rx="1.5" />
        <path d="M9 8.5h.01M9 16h.01M9 23.5h.01M13 8.5h9M13 16h9M13 23.5h9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" fill="none">
      <rect x="4.5" y="6" width="23" height="20" rx="2.5" />
      <path d="m10.5 12 4 4-4 4M17.5 20h5" />
    </svg>
  );
}

import { useMemo, useState } from "react";

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

function getHeader(data: EchoResponse | undefined, name: string) {
  return data?.headers?.[name.toLowerCase()];
}

function getCloudflareColo(cfRay: string | undefined) {
  return cfRay?.split("-").at(-1);
}

function formatDuration(durationMs: number | undefined) {
  if (durationMs === undefined) return "";
  return `${Math.round(durationMs)} ms`;
}

export function EchoLivenessCheck() {
  const [result, setResult] = useState<ProbeResult>({ state: "idle" });

  const buttonLabel = useMemo(() => {
    if (result.state === "checking") return "Checking...";
    if (result.state === "ok" || result.state === "opaque") {
      return "Run check again";
    }
    return "Check echo.wcygan.net";
  }, [result.state]);

  async function runProbe() {
    const startedAt = performance.now();
    const probeUrl = new URL(ECHO_URL);
    probeUrl.searchParams.set("probe", Date.now().toString());

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

  const cfRay = getHeader(result.data, "cf-ray");
  const cloudflareColo = getCloudflareColo(cfRay);
  const podHostname = result.data?.os?.hostname;
  const requestId = getHeader(result.data, "x-request-id");
  const statusText =
    result.state === "ok"
      ? "Live"
      : result.state === "opaque"
        ? "Reachable"
        : result.state === "error"
          ? "Failed"
          : "Not checked";

  return (
    <section className="anton-probe" aria-labelledby="anton-probe-title">
      <div className="anton-probe-header">
        <div>
          <h3 id="anton-probe-title">Live edge check</h3>
          <p>
            Checks <a href={ECHO_URL}>echo.wcygan.net</a> from this browser.
          </p>
        </div>
        <button
          type="button"
          className="anton-probe-button"
          onClick={runProbe}
          disabled={result.state === "checking"}
        >
          {buttonLabel}
        </button>
      </div>

      <div
        className="anton-probe-status"
        data-state={result.state}
        role="status"
        aria-live="polite"
      >
        <span aria-hidden="true" />
        <strong>{statusText}</strong>
        {result.durationMs !== undefined && (
          <span>{formatDuration(result.durationMs)}</span>
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

      {result.message && (
        <p className="anton-probe-message">{result.message}</p>
      )}
    </section>
  );
}

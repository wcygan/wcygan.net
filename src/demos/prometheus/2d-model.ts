export type CounterSample = { time: number; value: number };

export type ScrapeSample = {
  time: number;
  up: 0 | 1;
  requests: number | null;
};

export const SCRAPE_PHASES = [
  "Waiting for the next scrape",
  "Prometheus sends GET /metrics",
  "The target answers the scrape",
  "Prometheus appends timestamped samples",
] as const;

export function scrapeSnapshot(step: number, failed: boolean) {
  const phase = Math.min(3, Math.max(0, Math.floor(step)));
  const samples: ScrapeSample[] = [{ time: 0, up: 1, requests: 8 }];
  if (phase === 3) {
    samples.push({
      time: 15,
      up: failed ? 0 : 1,
      requests: failed ? null : 12,
    });
  }
  return { phase, samples };
}

export type MetricHistoryPoint = {
  step: number;
  requests: number;
  inFlight: number;
};

export type MetricState = {
  requests: number;
  inFlight: number;
  history: MetricHistoryPoint[];
};

export const MAX_DEMO_REQUESTS = 12;
export const MAX_DEMO_IN_FLIGHT = 5;

export function initialMetricState(): MetricState {
  return {
    requests: 0,
    inFlight: 0,
    history: [{ step: 0, requests: 0, inFlight: 0 }],
  };
}

export function changeMetricState(
  state: MetricState,
  action: "start" | "finish",
): MetricState {
  if (
    action === "start" &&
    (state.requests >= MAX_DEMO_REQUESTS ||
      state.inFlight >= MAX_DEMO_IN_FLIGHT)
  )
    return state;
  if (action === "finish" && state.inFlight === 0) return state;
  const requests = state.requests + (action === "start" ? 1 : 0);
  const inFlight = state.inFlight + (action === "start" ? 1 : -1);
  return {
    requests,
    inFlight,
    history: [
      ...state.history,
      { step: state.history.length, requests, inFlight },
    ],
  };
}

export function counterSamples(restart: boolean): CounterSample[] {
  return [100, 130, 160, restart ? 10 : 190, restart ? 40 : 220].map(
    (value, index) => ({ time: index * 15, value }),
  );
}

/** A teaching slope between sampled endpoints, not PromQL's extrapolated rate. */
export function resetAdjustedSlope(samples: readonly CounterSample[]) {
  if (samples.length < 2)
    return { gain: 0, perSecond: 0, rawPerSecond: 0, adjusted: [...samples] };
  const elapsed = samples[samples.length - 1].time - samples[0].time;
  let gain = 0;
  const adjusted: CounterSample[] = [{ ...samples[0] }];
  for (let index = 1; index < samples.length; index++) {
    const current = samples[index];
    const previous = samples[index - 1];
    gain +=
      current.value < previous.value
        ? current.value
        : current.value - previous.value;
    adjusted.push({ time: current.time, value: samples[0].value + gain });
  }
  return {
    gain,
    perSecond: elapsed > 0 ? gain / elapsed : 0,
    rawPerSecond:
      elapsed > 0
        ? (samples[samples.length - 1].value - samples[0].value) / elapsed
        : 0,
    adjusted,
  };
}

export const HISTOGRAM_BOUNDS = [0.1, 0.25, 0.5, 1, Infinity] as const;
export const INITIAL_OBSERVATIONS = [
  0.06, 0.08, 0.12, 0.2, 0.35, 0.4, 0.8, 0.9,
] as const;
export const MAX_HISTOGRAM_OBSERVATIONS = 16;

export function classicHistogram(observations: readonly number[]) {
  return {
    buckets: HISTOGRAM_BOUNDS.map((bound) => ({
      bound,
      count: observations.filter((value) => value <= bound).length,
    })),
    count: observations.length,
    sum: observations.reduce((sum, value) => sum + value, 0),
  };
}

export type RequestMethod = "GET" | "POST";
export const RAW_REQUEST_SERIES = [
  { instance: "a:8080", method: "GET" as const },
  { instance: "b:8080", method: "GET" as const },
  { instance: "a:8080", method: "POST" as const },
  { instance: "b:8080", method: "POST" as const },
] as const;
export const RECORDING_EVALUATIONS = [
  { time: 0, rates: [4, 6, 1, 2] },
  { time: 15, rates: [5, 8, 2, 3] },
  { time: 30, rates: [7, 9, 2, 5] },
] as const;

export type RecordingState = {
  evaluationCount: number;
  series: { method: RequestMethod; samples: CounterSample[] }[];
};

export function initialRecordingState(): RecordingState {
  return {
    evaluationCount: 0,
    series: [
      { method: "GET", samples: [] },
      { method: "POST", samples: [] },
    ],
  };
}

export function evaluateRecordingRule(state: RecordingState): RecordingState {
  const evaluation = RECORDING_EVALUATIONS[state.evaluationCount];
  if (!evaluation) return state;
  return {
    evaluationCount: state.evaluationCount + 1,
    series: state.series.map((series) => ({
      ...series,
      samples: [
        ...series.samples,
        {
          time: evaluation.time,
          value: RAW_REQUEST_SERIES.reduce(
            (sum, raw, index) =>
              sum +
              (raw.method === series.method ? evaluation.rates[index] : 0),
            0,
          ),
        },
      ],
    })),
  };
}

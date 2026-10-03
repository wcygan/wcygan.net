export const PURCHASES = [
  { id: 1, customer: "Ada", amount: 12 },
  { id: 2, customer: "Bea", amount: 7 },
  { id: 3, customer: "Ada", amount: 8 },
] as const;

export const DATAFLOW_STEPS = PURCHASES.length * 3;

export function dataflowAt(step: number) {
  const progress = Math.max(0, Math.min(DATAFLOW_STEPS, Math.floor(step)));
  const totals: Record<string, number> = { Ada: 0, Bea: 0 };
  const updates: { customer: string; total: number }[] = [];
  let sourceRead = 0;
  for (let beat = 1; beat <= progress; beat++) {
    const purchase = PURCHASES[Math.floor((beat - 1) / 3)];
    const phase = (beat - 1) % 3;
    if (phase === 0) sourceRead++;
    if (phase === 1) totals[purchase.customer] += purchase.amount;
    if (phase === 2) {
      updates.push({
        customer: purchase.customer,
        total: totals[purchase.customer],
      });
    }
  }
  const current =
    progress > 0 ? PURCHASES[Math.floor((progress - 1) / 3)] : null;
  const phase =
    progress === 0
      ? "ready"
      : ["read", "aggregate", "emit"][(progress - 1) % 3];
  return {
    step: progress,
    phase,
    sourceRead,
    totals,
    updates,
    current,
    complete: progress === DATAFLOW_STEPS,
  };
}

export const BOUNDED_FILE_RECORDS = 4;
export const BOUNDED_STEPS = 6;

export function boundedAt(step: number) {
  const progress = Math.max(0, Math.min(BOUNDED_STEPS, Math.floor(step)));
  return {
    step: progress,
    fileProcessed: Math.min(BOUNDED_FILE_RECORDS, progress),
    fileComplete: progress >= BOUNDED_FILE_RECORDS,
    streamProcessed: progress,
    streamOpen: true,
    demonstrationComplete: progress === BOUNDED_STEPS,
  };
}

// Minutes after 12:00, from one input. The watermark rule is an explicit
// teaching policy: maximum observed timestamp minus two minutes. The demo
// emits that watermark after each arrival rather than on a periodic timer.
export const EVENT_TIMES = [1, 4, 2, 7, 3] as const;
export const WINDOW_END = 5;
export const WATERMARK_DELAY = 2;

export function eventTimeAt(step: number) {
  const progress = Math.max(0, Math.min(EVENT_TIMES.length, Math.floor(step)));
  let maxTime = -Infinity;
  let watermark = -Infinity;
  let windowClosed = false;
  const accepted: number[] = [];
  const discarded: number[] = [];
  let nextWindowCount = 0;
  const arrivals = EVENT_TIMES.slice(0, progress).map((eventTime) => {
    const late = eventTime < WINDOW_END && windowClosed;
    if (late) discarded.push(eventTime);
    else if (eventTime < WINDOW_END) accepted.push(eventTime);
    else nextWindowCount++;
    maxTime = Math.max(maxTime, eventTime);
    watermark = Math.max(watermark, maxTime - WATERMARK_DELAY);
    windowClosed = windowClosed || watermark >= WINDOW_END;
    return { eventTime, watermark, discarded: late };
  });
  return {
    step: progress,
    watermark: Number.isFinite(watermark) ? watermark : null,
    windowClosed,
    accepted,
    discarded,
    nextWindowCount,
    arrivals,
    complete: progress === EVENT_TIMES.length,
  };
}

export const PRESSURE_RECORDS = 12;
export const PRESSURE_CAPACITY = 4;
export const SOURCE_READ_LIMIT = 3;

export interface PressureState {
  step: number;
  unread: number;
  buffered: number;
  completed: number;
  lastRead: number;
  lastCompleted: number;
  throttled: boolean;
}

export function initialPressure(): PressureState {
  return {
    step: 0,
    unread: PRESSURE_RECORDS,
    buffered: 0,
    completed: 0,
    lastRead: 0,
    lastCompleted: 0,
    throttled: false,
  };
}

export function advancePressure(
  state: PressureState,
  sinkCapacity: 1 | 3,
): PressureState {
  if (state.completed === PRESSURE_RECORDS) return state;
  // Finish existing buffered records, then read only into newly free slots.
  // Records waiting upstream remain in a finite replayable source, not an
  // ever-growing in-memory queue inside this job.
  const lastCompleted = Math.min(sinkCapacity, state.buffered);
  const retained = state.buffered - lastCompleted;
  const wanted = Math.min(SOURCE_READ_LIMIT, state.unread);
  const lastRead = Math.min(wanted, PRESSURE_CAPACITY - retained);
  return {
    step: state.step + 1,
    unread: state.unread - lastRead,
    buffered: retained + lastRead,
    completed: state.completed + lastCompleted,
    lastRead,
    lastCompleted,
    throttled: lastRead < wanted,
  };
}

export const SINK_ATTEMPTS = [1, 2, 3, 4, 5, 4, 5] as const;

export function sinkAt(step: number) {
  const progress = Math.max(
    0,
    Math.min(SINK_ATTEMPTS.length, Math.floor(step)),
  );
  const appended = SINK_ATTEMPTS.slice(0, progress);
  const unique = [...new Set(appended)];
  return {
    step: progress,
    currentId: progress ? appended[progress - 1] : null,
    appended,
    unique,
    ignored: appended.length - unique.length,
    replaying: progress > 5,
    complete: progress === SINK_ATTEMPTS.length,
  };
}

// Latest-known enrichment in one ordered input. A later reference update
// affects future purchases; it does not rewrite previously emitted results.
export const ENRICHMENT_EVENTS = [
  { type: "region", customer: "Ada", value: "US" },
  { type: "order", customer: "Ada", value: "order 1" },
  { type: "order", customer: "Bo", value: "order 2" },
  { type: "region", customer: "Bo", value: "DE" },
  { type: "region", customer: "Ada", value: "CA" },
  { type: "order", customer: "Ada", value: "order 3" },
  { type: "order", customer: "Bo", value: "order 4" },
] as const;

export function enrichmentAt(requestedStep: number) {
  const step = Math.max(
    0,
    Math.min(ENRICHMENT_EVENTS.length, Math.floor(requestedStep)),
  );
  const regions: Record<string, string> = {};
  const output: { order: string; customer: string; region: string }[] = [];
  for (const event of ENRICHMENT_EVENTS.slice(0, step)) {
    if (event.type === "region") regions[event.customer] = event.value;
    else
      output.push({
        order: event.value,
        customer: event.customer,
        region: regions[event.customer] ?? "unknown",
      });
  }
  return {
    step,
    regions,
    output,
    current: ENRICHMENT_EVENTS[step - 1] ?? null,
  };
}

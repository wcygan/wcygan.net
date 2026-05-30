// Model for the retry & idempotency explainer.
//
// One sendEmail Activity runs on two tracks. Each POSTs to an email provider
// with an Idempotency-Key, the provider delivers one email and records the key,
// then the Worker crashes before completion is recorded. Temporal retries and
// reruns the Activity. The hero is the provider's dedup ledger: the provider —
// not the Worker — decides whether a retry sends a second email.
//
// The contrast is the key itself. The stable track derives its key from
// runId + activityId, so the retry recomputes the SAME key and the provider
// dedupes it. The fresh track regenerates a uuid() each attempt, so the retry
// arrives with a NEW key the provider has never seen, and a duplicate goes out.

export type TrackKey = "stable" | "fresh";

export type RetryPhase = "send" | "crash" | "retry" | "resolve";

export type ProviderAction =
  | "idle" // no key on file yet
  | "recorded" // first key recorded, one email delivered
  | "checking" // retry arrived, provider is looking the key up
  | "dedupe-hit" // key already on file, returns the cached message
  | "duplicate-send"; // key is new, a second email goes out

export type TrackOutcome = "pending" | "exactly-once" | "duplicate";

export type PacketDirection = "request" | "response";

// request carries the key out to the provider; response carries the result
// back. A duplicate response is tinted red, a deduped response green.
export type PacketTone = "send" | "retry" | "deduped" | "duplicate";

export type RequestPacket = {
  direction: PacketDirection;
  progress: number;
  label: string;
  tone: PacketTone;
};

export type LedgerEntry = {
  key: string;
  messageId: string;
  // Pulses when the row is first written, or when a retry matches it.
  flash: number;
  hit: boolean;
};

export type TrackSnapshot = {
  key: TrackKey;
  title: string;
  strategyLabel: string;
  attempt: 1 | 2;
  attemptKey: string;
  workerStatus: string;
  crashFlash: number;
  packet: RequestPacket | null;
  ledger: LedgerEntry[];
  providerAction: ProviderAction;
  delivered: 0 | 1 | 2;
  deliveredFlash: number;
  outcome: TrackOutcome;
  outcomeLabel: string;
};

export type RetryDemoState = {
  progress: number;
  playing: boolean;
};

export type RetrySnapshot = {
  progress: number;
  playing: boolean;
  phase: RetryPhase;
  tracks: Record<TrackKey, TrackSnapshot>;
};

// Stable key is recomputed identically on every attempt.
const STABLE_KEY = "run-7f3#act-2";
// Fresh key is a new uuid() each attempt, so the retry looks brand new.
const FRESH_KEY_1 = "k-a91c4e";
const FRESH_KEY_2 = "k-e4d017";

const MESSAGE_1 = "msg_01";
const MESSAGE_2 = "msg_02";

// Timeline beats over a 0..1 loop.
const REQUEST_1 = { start: 0.04, end: 0.14 };
const RECORD_1_AT = 0.16;
const RESPONSE_1 = { start: 0.18, end: 0.26 };
const CRASH_AT = 0.36;
const RETRY_AT = 0.52;
const REQUEST_2 = { start: 0.54, end: 0.64 };
const CHECK_AT = 0.68;
const APPLY_2_AT = 0.72;
const RESPONSE_2 = { start: 0.74, end: 0.84 };

// Phase boundaries the four-step timeline reads from.
const SEND_END = 0.3;
const CRASH_END = 0.5;
const RETRY_END = 0.66;

const PACKET_FLASH = 0.05;
const CRASH_FLASH_RADIUS = 0.06;

export const REDUCED_MOTION_PROGRESS = 0.93;

export function deriveRetrySnapshot(state: RetryDemoState): RetrySnapshot {
  const progress = clamp(state.progress, 0, 1);
  const phase = derivePhase(progress);

  return {
    progress,
    playing: state.playing,
    phase,
    tracks: {
      stable: trackSnapshot("stable", progress),
      fresh: trackSnapshot("fresh", progress),
    },
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function easeOut(value: number) {
  const normalized = clamp(value, 0, 1);
  return 1 - Math.pow(1 - normalized, 3);
}

export function easeInOut(value: number) {
  const normalized = clamp(value, 0, 1);
  return normalized < 0.5
    ? 4 * normalized * normalized * normalized
    : 1 - Math.pow(-2 * normalized + 2, 3) / 2;
}

function derivePhase(progress: number): RetryPhase {
  if (progress < SEND_END) return "send";
  if (progress < CRASH_END) return "crash";
  if (progress < RETRY_END) return "retry";
  return "resolve";
}

function trackSnapshot(key: TrackKey, progress: number): TrackSnapshot {
  const isStable = key === "stable";
  const attempt: 1 | 2 = progress < RETRY_AT ? 1 : 2;
  const attemptKey = isStable
    ? STABLE_KEY
    : attempt === 1
      ? FRESH_KEY_1
      : FRESH_KEY_2;

  return {
    key,
    title: isStable ? "Stable key" : "Regenerated key",
    strategyLabel: isStable ? "runId + activityId" : "uuid() per attempt",
    attempt,
    attemptKey,
    workerStatus: workerStatus(isStable, progress),
    crashFlash: flashAround(progress, CRASH_AT, CRASH_FLASH_RADIUS),
    packet: derivePacket(isStable, progress),
    ledger: deriveLedger(isStable, progress),
    providerAction: deriveProviderAction(isStable, progress),
    delivered: deriveDelivered(isStable, progress),
    deliveredFlash: deriveDeliveredFlash(isStable, progress),
    outcome: deriveOutcome(isStable, progress),
    outcomeLabel: outcomeLabel(isStable, progress),
  };
}

function workerStatus(isStable: boolean, progress: number): string {
  if (progress < RECORD_1_AT) return "POST /send with key";
  if (progress < SEND_END) return "provider returned 200";
  if (progress < CRASH_END) return "crashed before ack";
  if (progress < RETRY_END) {
    return isStable ? "retry recomputes same key" : "retry generates new key";
  }
  return isStable ? "done, no resend" : "done, email resent";
}

function deriveDelivered(isStable: boolean, progress: number): 0 | 1 | 2 {
  const first = progress >= RECORD_1_AT ? 1 : 0;
  // Only the fresh track ever delivers a second email — its retry carries a key
  // the provider has not seen, so dedup does not apply.
  const second = !isStable && progress >= APPLY_2_AT ? 1 : 0;
  return (first + second) as 0 | 1 | 2;
}

function deriveDeliveredFlash(isStable: boolean, progress: number): number {
  return Math.max(
    flashAround(progress, RECORD_1_AT, PACKET_FLASH),
    !isStable ? flashAround(progress, APPLY_2_AT, PACKET_FLASH) : 0,
  );
}

function deriveLedger(isStable: boolean, progress: number): LedgerEntry[] {
  if (progress < RECORD_1_AT) return [];

  const firstKey = isStable ? STABLE_KEY : FRESH_KEY_1;
  // The stable retry matches the existing row, so it lights up as a hit.
  const matched = isStable && progress >= CHECK_AT;
  const first: LedgerEntry = {
    key: firstKey,
    messageId: MESSAGE_1,
    flash: Math.max(
      flashAround(progress, RECORD_1_AT, PACKET_FLASH),
      matched ? flashAround(progress, CHECK_AT, PACKET_FLASH) : 0,
    ),
    hit: matched,
  };

  if (isStable || progress < APPLY_2_AT) return [first];

  // The fresh retry's new key gets written as a second, distinct row.
  const second: LedgerEntry = {
    key: FRESH_KEY_2,
    messageId: MESSAGE_2,
    flash: flashAround(progress, APPLY_2_AT, PACKET_FLASH),
    hit: false,
  };
  return [first, second];
}

function deriveProviderAction(
  isStable: boolean,
  progress: number,
): ProviderAction {
  if (progress < RECORD_1_AT) return "idle";
  if (progress < CHECK_AT) return "recorded";
  if (progress < APPLY_2_AT) return "checking";
  return isStable ? "dedupe-hit" : "duplicate-send";
}

function deriveOutcome(isStable: boolean, progress: number): TrackOutcome {
  if (progress < APPLY_2_AT) return "pending";
  return isStable ? "exactly-once" : "duplicate";
}

function outcomeLabel(isStable: boolean, progress: number): string {
  if (progress < RECORD_1_AT) return "no key on file";
  if (progress < APPLY_2_AT) return "1 email delivered";
  return isStable ? "1 email · deduped" : "2 emails · duplicate";
}

function derivePacket(
  isStable: boolean,
  progress: number,
): RequestPacket | null {
  const attemptKey = isStable
    ? STABLE_KEY
    : progress < RETRY_AT
      ? FRESH_KEY_1
      : FRESH_KEY_2;

  // Attempt 1: the key flies out, the 200 flies back.
  const request1 = packetIn(progress, REQUEST_1);
  if (request1 !== null) {
    return {
      direction: "request",
      progress: request1,
      label: attemptKey,
      tone: "send",
    };
  }
  const response1 = packetIn(progress, RESPONSE_1);
  if (response1 !== null) {
    return {
      direction: "response",
      progress: response1,
      label: `200 ${MESSAGE_1}`,
      tone: "send",
    };
  }

  // Attempt 2 (the retry): the key flies out again, tinted gold.
  const request2 = packetIn(progress, REQUEST_2);
  if (request2 !== null) {
    return {
      direction: "request",
      progress: request2,
      label: attemptKey,
      tone: "retry",
    };
  }
  const response2 = packetIn(progress, RESPONSE_2);
  if (response2 !== null) {
    return isStable
      ? {
          direction: "response",
          progress: response2,
          label: `200 ${MESSAGE_1} cached`,
          tone: "deduped",
        }
      : {
          direction: "response",
          progress: response2,
          label: `200 ${MESSAGE_2}`,
          tone: "duplicate",
        };
  }

  return null;
}

function packetIn(
  progress: number,
  window: { start: number; end: number },
): number | null {
  if (progress < window.start || progress > window.end) return null;
  return easeInOut((progress - window.start) / (window.end - window.start));
}

function flashAround(progress: number, center: number, radius: number) {
  const distance = Math.abs(progress - center);
  return easeOut(1 - clamp(distance / radius, 0, 1));
}

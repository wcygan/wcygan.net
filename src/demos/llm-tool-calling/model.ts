export type FlowSegment =
  | "input"
  | "prompt"
  | "tool-request"
  | "tool-execution"
  | "tool-result"
  | "context"
  | "answer"
  | "delivery";

export type ToolCallingPhase = "establishing" | FlowSegment | "complete";
export type FlowRoute = "human" | "remote" | "tool";
export type ActorState = "idle" | "active" | "complete";

export type JsonValue =
  | boolean
  | null
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type ToolCallingPayload =
  | { kind: "json"; value: JsonValue }
  | { kind: "prompt"; text: string }
  | { kind: "result"; lines: readonly string[] }
  | {
      command: string;
      files: readonly string[];
      kind: "terminal";
      validation: string;
    };

export type ToolCallingSnapshot = {
  actorStates: Record<"keyboard" | "computer" | "api" | "tool", ActorState>;
  elapsedMs: number;
  isComplete: boolean;
  payload?: ToolCallingPayload;
  phase: ToolCallingPhase;
  segment?: FlowSegment;
  segmentProgress: number;
};

const ESTABLISHING_END_MS = 1_000;
const TRAVEL_MS = 3_000;

const prompt = "What files are in src/components?";
const files = [
  "DemoReplayButton.tsx",
  "NPlusOneQueryDemos.tsx",
  "TableOfContents.tsx",
] as const;

const finalAnswer = [...files] as const;

const PAYLOADS: Record<FlowSegment, ToolCallingPayload> = {
  answer: { kind: "result", lines: finalAnswer },
  context: {
    kind: "json",
    value: { entries: files },
  },
  delivery: { kind: "result", lines: finalAnswer },
  input: { kind: "prompt", text: prompt },
  prompt: {
    kind: "json",
    value: { prompt },
  },
  "tool-execution": {
    kind: "terminal",
    validation: "list_directory available",
    command: "ls src/components",
    files,
  },
  "tool-request": {
    kind: "json",
    value: {
      name: "list_directory",
      arguments: { path: "src/components" },
    },
  },
  "tool-result": {
    kind: "json",
    value: { entries: files },
  },
};

const sequence: ReadonlyArray<{
  actorStates: Partial<ToolCallingSnapshot["actorStates"]>;
  segment: FlowSegment;
}> = [
  { segment: "input", actorStates: { keyboard: "active", computer: "active" } },
  {
    segment: "prompt",
    actorStates: { keyboard: "complete", computer: "active", api: "active" },
  },
  {
    segment: "tool-request",
    actorStates: { keyboard: "complete", computer: "active", api: "active" },
  },
  {
    segment: "tool-execution",
    actorStates: {
      keyboard: "complete",
      computer: "active",
      api: "complete",
      tool: "active",
    },
  },
  {
    segment: "tool-result",
    actorStates: {
      keyboard: "complete",
      computer: "active",
      api: "complete",
      tool: "active",
    },
  },
  {
    segment: "context",
    actorStates: {
      keyboard: "complete",
      computer: "active",
      api: "active",
      tool: "complete",
    },
  },
  {
    segment: "answer",
    actorStates: {
      keyboard: "complete",
      computer: "active",
      api: "active",
      tool: "complete",
    },
  },
  {
    segment: "delivery",
    actorStates: {
      keyboard: "active",
      computer: "active",
      api: "complete",
      tool: "complete",
    },
  },
];

export const TOOL_CALLING_DURATION_MS =
  ESTABLISHING_END_MS + TRAVEL_MS * sequence.length;

export const INITIAL_TOOL_CALLING_SNAPSHOT = deriveToolCallingSnapshot(0);
export const COMPLETE_TOOL_CALLING_SNAPSHOT = deriveToolCallingSnapshot(
  TOOL_CALLING_DURATION_MS,
);

export function deriveToolCallingSnapshot(
  elapsedMs: number,
): ToolCallingSnapshot {
  const elapsed = clamp(elapsedMs, 0, TOOL_CALLING_DURATION_MS);
  if (elapsed < ESTABLISHING_END_MS) return snapshot(elapsed, "establishing");

  const sequenceElapsed = elapsed - ESTABLISHING_END_MS;
  const stepIndex = Math.floor(sequenceElapsed / TRAVEL_MS);
  const step = sequence[stepIndex];
  if (!step) {
    return settledComplete(elapsed);
  }

  return {
    ...snapshot(elapsed, step.segment, step.actorStates),
    payload: PAYLOADS[step.segment],
    segment: step.segment,
    segmentProgress: clamp(
      (sequenceElapsed - stepIndex * TRAVEL_MS) / TRAVEL_MS,
      0,
      1,
    ),
  };
}

function settledComplete(elapsedMs: number): ToolCallingSnapshot {
  return {
    ...snapshot(elapsedMs, "complete", {
      keyboard: "complete",
      computer: "complete",
      api: "complete",
      tool: "complete",
    }),
    isComplete: true,
    payload: PAYLOADS.delivery,
    segment: "delivery",
    segmentProgress: 1,
  };
}

function snapshot(
  elapsedMs: number,
  phase: ToolCallingPhase,
  actorStates: Partial<ToolCallingSnapshot["actorStates"]> = {},
): ToolCallingSnapshot {
  return {
    actorStates: {
      keyboard: "idle",
      computer: "idle",
      api: "idle",
      tool: "idle",
      ...actorStates,
    },
    elapsedMs,
    isComplete: false,
    phase,
    segmentProgress: 0,
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(
    maximum,
    Math.max(minimum, Number.isFinite(value) ? value : minimum),
  );
}

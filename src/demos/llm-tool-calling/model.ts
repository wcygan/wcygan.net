export type ToolCallingPhase =
  | "establishing"
  | "input"
  | "prompt"
  | "tool-request"
  | "validating"
  | "tool-execution"
  | "tool-result"
  | "context"
  | "answer"
  | "delivery"
  | "complete";

export type FlowSegment =
  | "input"
  | "prompt"
  | "tool-request"
  | "tool-execution"
  | "tool-result"
  | "context"
  | "answer"
  | "delivery";

export type FlowRoute = "human" | "remote" | "tool";

export type ActorState = "idle" | "active" | "complete";

export type ToolCallingSnapshot = {
  actorStates: Record<"keyboard" | "computer" | "api" | "tool", ActorState>;
  elapsedMs: number;
  isComplete: boolean;
  message: string;
  phase: ToolCallingPhase;
  segment?: FlowSegment;
  segmentProgress: number;
};

export const TOOL_CALLING_DURATION_MS = 12_600;

const ESTABLISHING_END_MS = 1_200;
const INPUT_END_MS = 2_100;
const PROMPT_END_MS = 3_300;
const TOOL_REQUEST_END_MS = 4_500;
const VALIDATION_END_MS = 5_900;
const TOOL_EXECUTION_END_MS = 6_800;
const TOOL_RESULT_END_MS = 7_700;
const CONTEXT_END_MS = 8_900;
const ANSWER_END_MS = 10_100;
const DELIVERY_END_MS = 11_000;

export const INITIAL_TOOL_CALLING_SNAPSHOT = deriveToolCallingSnapshot(0);
export const COMPLETE_TOOL_CALLING_SNAPSHOT = deriveToolCallingSnapshot(
  TOOL_CALLING_DURATION_MS,
);

export function deriveToolCallingSnapshot(
  elapsedMs: number,
): ToolCallingSnapshot {
  const elapsed = clamp(elapsedMs, 0, TOOL_CALLING_DURATION_MS);

  if (elapsed < ESTABLISHING_END_MS) {
    return snapshot(
      elapsed,
      "establishing",
      "A local application mediates every tool call",
    );
  }
  if (elapsed < INPUT_END_MS) {
    return moving(
      elapsed,
      "input",
      "input",
      ESTABLISHING_END_MS,
      INPUT_END_MS,
      "A question enters the local computer",
      {
        keyboard: "active",
        computer: "active",
      },
    );
  }
  if (elapsed < PROMPT_END_MS) {
    return moving(
      elapsed,
      "prompt",
      "prompt",
      INPUT_END_MS,
      PROMPT_END_MS,
      "The harness sends the conversation to the LLM API",
      {
        keyboard: "complete",
        computer: "active",
        api: "active",
      },
    );
  }
  if (elapsed < TOOL_REQUEST_END_MS) {
    return moving(
      elapsed,
      "tool-request",
      "tool-request",
      PROMPT_END_MS,
      TOOL_REQUEST_END_MS,
      "The API returns a requested tool call",
      {
        keyboard: "complete",
        computer: "active",
        api: "active",
      },
    );
  }
  if (elapsed < VALIDATION_END_MS) {
    return snapshot(
      elapsed,
      "validating",
      "The harness validates the tool and path",
      {
        keyboard: "complete",
        computer: "active",
        api: "complete",
      },
    );
  }
  if (elapsed < TOOL_EXECUTION_END_MS) {
    return moving(
      elapsed,
      "tool-execution",
      "tool-execution",
      VALIDATION_END_MS,
      TOOL_EXECUTION_END_MS,
      "Only the local harness executes list_directory",
      {
        keyboard: "complete",
        computer: "active",
        api: "complete",
        tool: "active",
      },
    );
  }
  if (elapsed < TOOL_RESULT_END_MS) {
    return moving(
      elapsed,
      "tool-result",
      "tool-result",
      TOOL_EXECUTION_END_MS,
      TOOL_RESULT_END_MS,
      "The local tool returns directory entries",
      {
        keyboard: "complete",
        computer: "active",
        api: "complete",
        tool: "active",
      },
    );
  }
  if (elapsed < CONTEXT_END_MS) {
    return moving(
      elapsed,
      "context",
      "context",
      TOOL_RESULT_END_MS,
      CONTEXT_END_MS,
      "The harness appends that result to the conversation",
      {
        keyboard: "complete",
        computer: "active",
        api: "active",
        tool: "complete",
      },
    );
  }
  if (elapsed < ANSWER_END_MS) {
    return moving(
      elapsed,
      "answer",
      "answer",
      CONTEXT_END_MS,
      ANSWER_END_MS,
      "The API returns a plain-language answer",
      {
        keyboard: "complete",
        computer: "active",
        api: "active",
        tool: "complete",
      },
    );
  }
  if (elapsed < DELIVERY_END_MS) {
    return moving(
      elapsed,
      "delivery",
      "delivery",
      ANSWER_END_MS,
      DELIVERY_END_MS,
      "The local computer presents the answer",
      {
        keyboard: "active",
        computer: "active",
        api: "complete",
        tool: "complete",
      },
    );
  }

  return snapshot(
    elapsed,
    "complete",
    "The LLM requested work; the local harness executed it",
    {
      keyboard: "complete",
      computer: "complete",
      api: "complete",
      tool: "complete",
    },
  );
}

function moving(
  elapsedMs: number,
  phase: ToolCallingPhase,
  segment: FlowSegment,
  startMs: number,
  endMs: number,
  message: string,
  actorStates: Partial<ToolCallingSnapshot["actorStates"]>,
) {
  return {
    ...snapshot(elapsedMs, phase, message, actorStates),
    segment,
    segmentProgress: clamp((elapsedMs - startMs) / (endMs - startMs), 0, 1),
  };
}

function snapshot(
  elapsedMs: number,
  phase: ToolCallingPhase,
  message: string,
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
    isComplete: phase === "complete",
    message,
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

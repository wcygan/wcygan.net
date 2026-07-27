export type RacePhase =
  | "initial"
  | "both-read"
  | "worker-a-submit"
  | "worker-a-success"
  | "worker-b-submit"
  | "worker-b-rejected"
  | "worker-b-reread"
  | "worker-b-retry"
  | "complete";

export type StepStatus = "pending" | "active" | "applied";

export type InventoryRow = {
  sku: "SKU-42";
  available: 0 | 1 | 2;
  version: 7 | 8 | 9;
};

export type RaceStep = {
  id:
    | "read-v7"
    | "worker-a-write"
    | "worker-b-stale-write"
    | "worker-b-reread"
    | "worker-b-retry";
  status: StepStatus;
  outcome?: "accepted" | "rejected";
};

export type RaceSnapshot = {
  progress: number;
  phaseProgress: number;
  phase: RacePhase;
  phaseLabel: string;
  row: InventoryRow;
  steps: RaceStep[];
  expectedVersion?: 7 | 8;
  currentVersion: 7 | 8 | 9;
  isComplete: boolean;
};

type PhaseWindow = {
  phase: RacePhase;
  start: number;
  end: number;
};

const PHASE_WINDOWS: readonly PhaseWindow[] = [
  { phase: "initial", start: 0, end: 0.08 },
  { phase: "both-read", start: 0.08, end: 0.2 },
  { phase: "worker-a-submit", start: 0.2, end: 0.31 },
  { phase: "worker-a-success", start: 0.31, end: 0.42 },
  { phase: "worker-b-submit", start: 0.42, end: 0.53 },
  { phase: "worker-b-rejected", start: 0.53, end: 0.65 },
  { phase: "worker-b-reread", start: 0.65, end: 0.76 },
  { phase: "worker-b-retry", start: 0.76, end: 0.88 },
  { phase: "complete", start: 0.88, end: 1 },
] as const;

const STEP_PHASES: readonly RacePhase[] = [
  "both-read",
  "worker-a-submit",
  "worker-b-submit",
  "worker-b-reread",
  "worker-b-retry",
] as const;

const STEP_IDS: readonly RaceStep["id"][] = [
  "read-v7",
  "worker-a-write",
  "worker-b-stale-write",
  "worker-b-reread",
  "worker-b-retry",
] as const;

export const OPTIMISTIC_LOCKING_DURATION_MS = 18_000;

export function deriveRaceSnapshot(progress: number): RaceSnapshot {
  const normalizedProgress = clamp(progress, 0, 1);
  const window = phaseWindow(normalizedProgress);
  const phase = window.phase;
  const phaseProgress = clamp(
    (normalizedProgress - window.start) / (window.end - window.start),
    0,
    1,
  );

  return {
    progress: normalizedProgress,
    phaseProgress,
    phase,
    phaseLabel: phaseLabel(phase),
    row: rowForPhase(phase),
    steps: deriveSteps(phase),
    expectedVersion: expectedVersionForPhase(phase),
    currentVersion: rowForPhase(phase).version,
    isComplete: phase === "complete",
  };
}

export const INITIAL_RACE_SNAPSHOT = deriveRaceSnapshot(0);
export const COMPLETE_RACE_SNAPSHOT = deriveRaceSnapshot(1);

function phaseWindow(progress: number) {
  return (
    PHASE_WINDOWS.find(({ end }) => progress < end) ??
    PHASE_WINDOWS[PHASE_WINDOWS.length - 1]
  );
}

function rowForPhase(phase: RacePhase): InventoryRow {
  if (
    phase === "initial" ||
    phase === "both-read" ||
    phase === "worker-a-submit"
  ) {
    return { sku: "SKU-42", available: 2, version: 7 };
  }

  if (
    phase === "worker-a-success" ||
    phase === "worker-b-submit" ||
    phase === "worker-b-rejected" ||
    phase === "worker-b-reread" ||
    phase === "worker-b-retry"
  ) {
    return { sku: "SKU-42", available: 1, version: 8 };
  }

  return { sku: "SKU-42", available: 0, version: 9 };
}

function deriveSteps(phase: RacePhase): RaceStep[] {
  const currentStepIndex = currentStepForPhase(phase);
  const phaseIndex = PHASE_WINDOWS.findIndex(
    (window) => window.phase === phase,
  );

  return STEP_IDS.map((id, index) => {
    const stepPhaseIndex = PHASE_WINDOWS.findIndex(
      (window) => window.phase === STEP_PHASES[index],
    );
    const status: StepStatus =
      phase === "complete"
        ? "applied"
        : index === currentStepIndex
          ? "active"
          : phaseIndex > stepPhaseIndex
            ? "applied"
            : "pending";

    return {
      id,
      status,
      outcome: stepOutcome(id, phase),
    };
  });
}

function currentStepForPhase(phase: RacePhase) {
  if (phase === "worker-a-success") return 1;
  if (phase === "worker-b-rejected") return 2;
  return STEP_PHASES.indexOf(phase);
}

function stepOutcome(
  id: RaceStep["id"],
  phase: RacePhase,
): RaceStep["outcome"] {
  if (id === "worker-a-write" && phaseAtOrAfter(phase, "worker-a-success")) {
    return "accepted";
  }

  if (
    id === "worker-b-stale-write" &&
    phaseAtOrAfter(phase, "worker-b-rejected")
  ) {
    return "rejected";
  }

  if (id === "worker-b-retry" && phase === "complete") {
    return "accepted";
  }

  return undefined;
}

function expectedVersionForPhase(phase: RacePhase): 7 | 8 | undefined {
  if (phase === "worker-a-submit" || phase === "worker-a-success") return 7;
  if (phase === "worker-b-submit" || phase === "worker-b-rejected") return 7;
  if (phase === "worker-b-reread" || phase === "worker-b-retry") return 8;
  if (phase === "complete") return 8;
  return undefined;
}

function phaseAtOrAfter(phase: RacePhase, boundary: RacePhase) {
  const phaseIndex = PHASE_WINDOWS.findIndex(
    (window) => window.phase === phase,
  );
  const boundaryIndex = PHASE_WINDOWS.findIndex(
    (window) => window.phase === boundary,
  );
  return phaseIndex >= boundaryIndex;
}

function phaseLabel(phase: RacePhase) {
  switch (phase) {
    case "initial":
      return "SKU-42 starts with 2 available units at version 7.";
    case "both-read":
      return "Worker A and Worker B both read available 2 at version 7.";
    case "worker-a-submit":
      return "Worker A submits its guarded decrement expecting version 7.";
    case "worker-a-success":
      return "Worker A gets rows_affected = 1; the row is now available 1, version 8.";
    case "worker-b-submit":
      return "Worker B submits its stale decrement still expecting version 7.";
    case "worker-b-rejected":
      return "Worker B gets rows_affected = 0; the row remains available 1, version 8.";
    case "worker-b-reread":
      return "Worker B rereads the row and sees available 1 at version 8.";
    case "worker-b-retry":
      return "Worker B retries the decrement expecting version 8.";
    case "complete":
      return "Worker B gets rows_affected = 1; the row is now available 0, version 9.";
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

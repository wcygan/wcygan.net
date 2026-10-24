import type { FailureLayout, FailurePhase } from "./failure-domains-model";
import type { CellLayer, FleetView, PageStep } from "./model";
import {
  initialNamedState,
  requestCell,
  restartNamedCells,
  type NamedState,
} from "./named-state-model";

// Each tour has a beginning and a settled conclusion. Frames describe events,
// not elapsed-time ticks, so a reader can inspect the same sequence manually.
export const ANATOMY_TOUR: readonly CellLayer[] = ["handler", "sqlite", "ltx"];
export const PAGE_TOUR: readonly PageStep[] = [0, 1, 2];
export const FLEET_TOUR: readonly FleetView[] = [
  "two-nodes",
  "third-node",
  "handoff",
];

export const NAMED_STATE_TOUR_LENGTH = 6;

/** Continue the guided events from inspected state; only Replay resets data. */
export function advanceNamedStateTour(
  current: NamedState,
  nextStep: number,
): NamedState {
  if (nextStep === 1 || nextStep === 2 || nextStep === 5)
    return requestCell(current, "blue");
  if (nextStep === 3) return requestCell(current, "green");
  if (nextStep === 4) return restartNamedCells(current);
  return current;
}

export function namedStateTourFrame(step: number): NamedState {
  let state = initialNamedState();
  for (
    let beat = 1;
    beat <= Math.min(step, NAMED_STATE_TOUR_LENGTH - 1);
    beat++
  )
    state = advanceNamedStateTour(state, beat);
  return state;
}

export interface FailureTourFrame {
  layout: FailureLayout;
  phase: FailurePhase;
}

export const FAILURE_TOUR: readonly FailureTourFrame[] = [
  {
    layout: "separate",
    phase: "acknowledged",
  },
  {
    layout: "separate",
    phase: "lose-host",
  },
  {
    layout: "separate",
    phase: "bucket-covered",
  },
  {
    layout: "shared",
    phase: "acknowledged",
  },
  {
    layout: "shared",
    phase: "lose-host",
  },
  {
    layout: "shared",
    phase: "bucket-covered",
  },
];

/** Every manually selectable layout/phase has a corresponding guided beat. */
export function failureTourStep(
  layout: FailureLayout,
  phase: FailurePhase,
): number {
  return FAILURE_TOUR.findIndex(
    (frame) => frame.layout === layout && frame.phase === phase,
  );
}

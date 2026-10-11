import { useVisibleAnimationClock } from "./use-visible-animation-clock";
import { workingSetSnapshot } from "./working-set";

export function useWorkingSetPlayback() {
  const { figure, elapsed, reduced } = useVisibleAnimationClock();
  return { figure, reduced, snapshot: workingSetSnapshot(elapsed) };
}

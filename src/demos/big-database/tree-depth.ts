import { pointOnPath, type Point } from "./query-flow";

export const DEPTH_STEP_MS = 1_500;
export const DEPTH_DURATION_MS = DEPTH_STEP_MS * 4;

export const DEPTH_LEVELS = [
  { y: 36, label: "1 Root", pages: [200], selected: 200 },
  { y: 126, label: "2 Route", pages: [140, 284], selected: 284 },
  { y: 216, label: "3 Route", pages: [100, 164, 252, 316], selected: 316 },
  {
    y: 306,
    label: "4 Rows",
    pages: [88, 112, 152, 176, 240, 264, 304, 328],
    selected: 328,
  },
] as const;

export const DEPTH_PATHS: readonly (readonly Point[])[] = DEPTH_LEVELS.slice(
  0,
  3,
).map((level, i) => {
  const next = DEPTH_LEVELS[i + 1];
  const middle = (level.y + next.y) / 2;
  return [
    [level.selected, level.y + 14],
    [level.selected, middle],
    [next.selected, middle],
    [next.selected, next.y - (i === 2 ? 18 : 14)],
  ];
});

const descriptions = [
  "Level 1: the cached root chooses a branch.",
  "Level 2: a cached routing page narrows the search.",
  "Level 3: a cached routing page chooses the leaf.",
  "Level 4: the hot leaf is cached too; read the row.",
] as const;

export function treeDepthSnapshot(elapsed: number) {
  const time = Math.max(0, Math.min(DEPTH_DURATION_MS, elapsed));
  const level = Math.min(3, Math.floor(time / DEPTH_STEP_MS));
  const complete = time === DEPTH_DURATION_MS;
  const progress = Math.max(0, ((time % DEPTH_STEP_MS) - 500) / 1_000);
  return {
    level,
    complete,
    packet:
      level < 3 && progress > 0
        ? pointOnPath(DEPTH_PATHS[level], progress)
        : null,
    status: complete
      ? "4 levels visited: 3 routing pages + 1 leaf."
      : descriptions[level],
  };
}

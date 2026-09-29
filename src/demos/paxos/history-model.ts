export const HISTORY_STAGES = [
  "One value",
  "Apply 2",
  "A/B: 25",
  "Apply 3",
  "A/B: 50",
  "C: apply 2",
  "C: 25",
  "C: apply 3",
  "In sync",
] as const;
export const OPERATIONS = [
  { slot: 1, label: "Set 20", apply: (_value: number) => 20 },
  { slot: 2, label: "Add 5", apply: (value: number) => value + 5 },
  { slot: 3, label: "× 2", apply: (value: number) => value * 2 },
] as const;
export function historySnapshot(step: number) {
  const index = Math.max(0, Math.min(8, Math.trunc(step)));
  const chosen = OPERATIONS.slice(0, index === 0 ? 1 : index < 3 ? 2 : 3);
  const moving = index % 2 === 1;
  const applyingSlot = index === 1 || index === 5 ? 2 : 3;
  return {
    chosen,
    moving,
    applyingSlot,
    replicas: ["A", "B", "C"].map((name, i) => {
      const count =
        i < 2
          ? index < 2
            ? 1
            : index < 4
              ? 2
              : 3
          : index < 6
            ? 1
            : index < 8
              ? 2
              : 3;
      const applied = chosen.slice(0, count);
      return {
        name,
        applied,
        value: applied.reduce((v, o) => o.apply(v), 10),
        applying: moving && (index < 5 ? i < 2 : i === 2),
      };
    }),
  };
}

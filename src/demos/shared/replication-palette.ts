// Preserve the established article palette. Three.js materials require sRGB
// values here; Color.setStyle does not parse CSS oklch().
export const DATABASE_COLORS = {
  primary: { fill: "#9cc9e9", outline: "#3f77b1" },
  // Replica B: oklch(0.8 0.08 175) fill, oklch(0.48 0.08 175) outline.
  replicaB: { fill: "#85cfbb", outline: "#1d6c5b" },
  replica: { fill: "#c2afd9", outline: "#8060a5" },
} as const;

// Entry identity is stable across every log and every replication demo.
export const LOG_ENTRY_COLORS = [
  "#d87842", // 1 · orange
  "#527cad", // 2 · blue
  "#66886b", // 3 · green
  "#b45d62", // 4 · rose
  "#9561c9", // 5 · purple
  "#cda52e", // 6 · gold
] as const;

export const LOG_ENTRY_OUTLINE = "#393833";
// oklch(0.55 0.2 25), in sRGB gamut; 4.12:1 against the warm-gray tray.
export const LAG_OUTLINE = "#cc272e";

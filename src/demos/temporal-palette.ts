/** PlanetScale semantic colors. Hex values are required by Three.js materials. */
export const TEMPORAL_PALETTE = {
  canvas: "#111111",
  panel: "#1c1c1c",
  text: "#fafafa",
  muted: "#cfcfcf",
  dim: "#b5b5b5",
  border: "#818181",
  track: "#383838",
  connector: "#818181",
  orange: "#f35815",
  blue: "#0e73cc",
  green: "#27b648",
  yellow: "#f2b600",
  red: "#ff455d",
  focus: "#65baff",
} as const;

export type TemporalColor = keyof typeof TEMPORAL_PALETTE;

/** PlanetScale semantic colors. Hex values are required by Three.js materials. */
export const TEMPORAL_PALETTE = {
  canvas: "#f7f7f5",
  panel: "#ffffff",
  text: "#202020",
  muted: "#595954",
  dim: "#595954",
  border: "#777770",
  track: "#d6d6ce",
  connector: "#777770",
  orange: "#b43d08",
  blue: "#076fa8",
  green: "#187636",
  yellow: "#866100",
  red: "#c12e46",
  focus: "#b43d08",
} as const;

export type TemporalColor = keyof typeof TEMPORAL_PALETTE;

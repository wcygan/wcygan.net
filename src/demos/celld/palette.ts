/**
 * Celld diagrams use the PlanetScale standalone light palette.
 * Hex strings are intentional at the Three.js/Canvas color boundary; matching
 * editorial CSS tokens use the same sRGB values in app.css.
 * Use semantic color with labels and geometry, never as the sole state cue.
 */
export const CELLD_COLORS = {
  bg: "#f7f7f5",
  panel: "#ffffff",
  fg: "#202020",
  muted: "#595954",
  border: "#777770",
  track: "#d6d6ce",
  connector: "#777770",
  onAccent: "#ffffff",
  darkInk: "#111111",
  orange: "#b43d08",
  blue: "#076fa8",
  green: "#187636",
  yellow: "#866100",
  red: "#c12e46",
  orangeLabel: "#b43d08",
  blueLabel: "#076fa8",
  greenLabel: "#187636",
  redLabel: "#c12e46",
} as const;

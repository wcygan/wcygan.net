/**
 * Celld diagrams use the PlanetScale standalone dark palette.
 * Hex strings are intentional at the Three.js/Canvas color boundary; matching
 * editorial CSS tokens are defined in OKLCH in app.css.
 * Use semantic color with labels and geometry, never as the sole state cue.
 */
export const CELLD_COLORS = {
  bg: "#111111",
  panel: "#1c1c1c",
  fg: "#fafafa",
  muted: "#b8b8b8",
  border: "#4e4e4e",
  track: "#333333",
  connector: "#818181",
  darkInk: "#111111",
  orange: "#f35815",
  blue: "#1e9de7",
  green: "#27b648",
  yellow: "#f2b600",
  red: "#ff455d",
  orangeLabel: "#f1bdab",
  blueLabel: "#a7d0f1",
  greenLabel: "#6fe97f",
  redLabel: "#f1bbba",
} as const;

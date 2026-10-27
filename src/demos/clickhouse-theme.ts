/**
 * sRGB equivalents of the ClickHouse figure tokens in clickhouse-theme.css.
 * Three.js and Canvas receive sRGB hex; CSS uses the same sRGB values.
 * Neutral outlines remain visible against the light canvas.
 */
export const CLICKHOUSE_COLORS = {
  bg: "#f7f7f5",
  panel: "#ffffff",
  text: "#202020",
  muted: "#595954",
  dim: "#595954",
  border: "#777770",
  nodeBorder: "#777770",
  track: "#d6d6ce",
  orange: "#b43d08",
  blue: "#076fa8",
  green: "#187636",
  yellow: "#866100",
  red: "#c12e46",
  purple: "#7050a3",
} as const;

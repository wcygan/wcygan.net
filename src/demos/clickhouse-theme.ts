/**
 * sRGB equivalents of the ClickHouse figure tokens in clickhouse-theme.css.
 * Three.js and Canvas receive sRGB hex; CSS uses rounded, gamut-safe OKLCH.
 * Borders are the standalone white-alpha colors composited over the canvas.
 */
export const CLICKHOUSE_COLORS = {
  bg: "#111111",
  panel: "#1c1c1c",
  text: "#fafafa",
  muted: "#cecece",
  dim: "#b8b8b8",
  border: "#323232",
  nodeBorder: "#454545",
  track: "#292929",
  orange: "#f35815",
  blue: "#1e9de7",
  green: "#27b648",
  yellow: "#f2b600",
  red: "#ff455d",
  purple: "#b58cff",
} as const;

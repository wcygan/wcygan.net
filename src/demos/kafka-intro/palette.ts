/** PlanetScale dark-theme colors. Three.js takes sRGB hex; CSS uses OKLCH equivalents. */
export const KAFKA_COLORS = {
  canvas: "#111111",
  panel: "#1c1c1c",
  text: "#fafafa",
  muted: "#b6b6b6",
  connector: "#818181",
  accent: "#f35815",
  blue: "#0e73cc",
  info: "#1e9de7",
  green: "#27b648",
  yellow: "#f2b600",
  red: "#ff455d",
} as const;
export const PARTITION_COLORS = [
  KAFKA_COLORS.blue,
  KAFKA_COLORS.green,
  KAFKA_COLORS.yellow,
] as const;

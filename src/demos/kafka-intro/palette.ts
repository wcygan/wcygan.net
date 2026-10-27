/** PlanetScale light-theme colors. Three.js takes sRGB hex; CSS uses matching sRGB values. */
export const KAFKA_COLORS = {
  canvas: "#f7f7f5",
  panel: "#ffffff",
  text: "#202020",
  muted: "#595954",
  connector: "#777770",
  accent: "#b43d08",
  blue: "#076fa8",
  info: "#076fa8",
  green: "#187636",
  yellow: "#866100",
  red: "#c12e46",
} as const;
export const PARTITION_COLORS = [
  KAFKA_COLORS.blue,
  KAFKA_COLORS.green,
  KAFKA_COLORS.yellow,
] as const;

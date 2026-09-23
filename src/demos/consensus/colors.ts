import type { CSSProperties } from "react";
import type { LogEntry } from "./types";

export interface PaletteColor {
  css: string;
  // Three.js Color does not parse OKLCH. These are the in-gamut sRGB equivalents
  // of the authored OKLCH values, not a separate renderer palette.
  three: string;
}

// Equal perceptual lightness; chroma is 62% of each hue's sRGB gamut boundary.
export const NODE_COLORS = {
  A: { css: "oklch(0.82 0.058 250)", three: "#a8c8e9" },
  B: { css: "oklch(0.82 0.102 330)", three: "#eaace4" },
  C: { css: "oklch(0.82 0.125 155)", three: "#7ddca0" },
  D: { css: "oklch(0.82 0.072 55)", three: "#eab898" },
  E: { css: "oklch(0.82 0.059 290)", three: "#c3bee8" },
} satisfies Record<string, PaletteColor>;

// Committed colors identify log positions across the walkthroughs. Terms remain
// explicit labels: different uncommitted versions of one position stay yellow.
// Chroma is 78% of each hue's sRGB boundary, at the same lightness for all five.
export const ENTRY_COLORS: readonly PaletteColor[] = [
  { css: "oklch(0.84 0.113 190)", three: "#63e2db" },
  { css: "oklch(0.84 0.083 310)", three: "#dbbcf4" },
  { css: "oklch(0.84 0.068 25)", three: "#f4bab4" },
  { css: "oklch(0.84 0.072 235)", three: "#9dd3f3" },
  { css: "oklch(0.84 0.176 130)", three: "#a4e15a" },
];
export const ENTRY_PENDING: PaletteColor = {
  css: "oklch(0.89 0.129 92)",
  three: "#f9d870",
};
export const ENTRY_EMPTY: PaletteColor = {
  css: "oklch(0.87 0.012 80)",
  three: "#d8d3cc",
};
export const SNAPSHOT_COLOR: PaletteColor = {
  css: "oklch(0.84 0.035 80)",
  three: "#d7c9b2",
};

// Leadership-era chips match the leader-election demo. Keep this meaning
// separate from node identity and the committed log-index palette.
const TERM_COLORS: readonly PaletteColor[] = [
  { css: "oklch(0.821 0.073 18.76)", three: "#f0b2b2" },
  { css: "oklch(0.902 0.087 153.6)", three: "#b2f0c4" },
  { css: "oklch(0.816 0.094 310.8)", three: "#d6b2f0" },
  { css: "oklch(0.926 0.071 100.9)", three: "#f0e9b2" },
  { css: "oklch(0.892 0.055 211.3)", three: "#b2e6f0" },
];

export function termColor(term: number): PaletteColor {
  return TERM_COLORS[term - 1] ?? ENTRY_EMPTY;
}

export function nodeColor(id: string): PaletteColor {
  return NODE_COLORS[id as keyof typeof NODE_COLORS] ?? ENTRY_EMPTY;
}

export function entryColor(entry: Pick<LogEntry, "index">): PaletteColor {
  return ENTRY_COLORS[entry.index - 1] ?? ENTRY_EMPTY;
}

/** Data-driven color binding shared by scene labels, swatches and the inspector. */
export function colorStyle(color: PaletteColor): CSSProperties {
  return { "--consensus-color": color.css } as CSSProperties;
}

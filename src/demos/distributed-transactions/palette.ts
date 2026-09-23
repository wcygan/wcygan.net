export const PALETTE_ROLES = [
  "database-a",
  "database-b",
  "ink-a",
  "ink-b",
  "neutral",
  "paper",
  "ink",
  "line",
  "offline",
  "prepared",
  "pre-commit",
  "commit",
  "committed",
  "abort",
  "aborted",
  "active",
] as const;
export type PaletteRole = (typeof PALETTE_ROLES)[number];
export type Palette = Record<PaletteRole, string>;

/** CSS owns the OKLCH tokens. Resolve them to sRGB for Three's material API. */
export function readPalette(element: HTMLElement): Palette {
  const styles = getComputedStyle(element.closest(".dt-demo") ?? element);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Unable to resolve diagram colors");
  return Object.fromEntries(
    PALETTE_ROLES.map((role) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = styles.getPropertyValue(`--dt-${role}`).trim();
      context.fillRect(0, 0, 1, 1);
      const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
      return [
        role,
        `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`,
      ];
    }),
  ) as Palette;
}

export function recordRole(record: string): PaletteRole {
  if (record === "COMMIT") return "commit";
  if (record === "ABORT") return "abort";
  if (record === "PRE-COMMIT") return "pre-commit";
  return "prepared";
}

export function messageRole(label: string): PaletteRole {
  const normalized = label.toLowerCase();
  if (normalized.includes("pre-commit") || normalized === "ack") {
    return "pre-commit";
  }
  if (normalized.includes("commit")) return "commit";
  if (normalized === "abort" || normalized === "no") return "abort";
  if (normalized.startsWith("prepare") || normalized === "yes") {
    return "prepared";
  }
  return "active";
}

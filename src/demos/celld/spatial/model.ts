export type Point = [number, number, number];
export type CellLayer = "handler" | "sqlite" | "ltx";
export type FleetView = "two-nodes" | "third-node" | "handoff";
export type NodeId = "A" | "B" | "C";
export type CameraAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "in"
  | "out"
  | "front"
  | "reset";
export interface CameraCommand {
  action: CameraAction;
  sequence: number;
}

export const CELL_LAYERS = {
  handler: {
    label: "JavaScript",
    position: [0, 1.6, 0] as Point,
  },
  sqlite: {
    label: "SQLite",
    position: [0, 0, 0] as Point,
  },
  ltx: {
    label: "LTX changes",
    position: [0, -1.6, 0] as Point,
  },
} as const;

// A small illustrative commit, not an account of a real SQLite query's page use.
export const DATABASE_PAGES = [1, 2, 3, 4, 5, 6] as const;
export const CHANGED_PAGES = [2, 5] as const;

export type PageStep = 0 | 1 | 2;
export function nextPageStep(step: PageStep): PageStep {
  return Math.min(2, step + 1) as PageStep;
}
export function pageChangeSnapshot(step: PageStep) {
  const pages = DATABASE_PAGES.map((id) => ({
    id,
    changed: step > 0 && CHANGED_PAGES.some((page) => page === id),
    image: step > 0 && CHANGED_PAGES.some((page) => page === id) ? 2 : 1,
  }));
  return {
    pages,
    ltxPageImages: step === 2 ? pages.filter((page) => page.changed) : [],
  };
}

export function sqlitePagePosition(page: number): Point {
  const index = page - 1;
  return [((index % 3) - 1) * 1.05, 0.28, index < 3 ? -0.48 : 0.48];
}

export const FLEET_CELLS = [
  { number: "01", name: "room:blue", owner: "A", hibernated: true },
  { number: "02", name: "room:green", owner: "A", hibernated: false },
  { number: "03", name: "document:1", owner: "A", hibernated: false },
  { number: "04", name: "document:2", owner: "B", hibernated: false },
  { number: "05", name: "agent:7", owner: "B", hibernated: false },
  { number: "06", name: "agent:8", owner: "B", hibernated: false },
] as const;

export interface PlacedCell {
  number: string;
  name: string;
  owner: NodeId;
  hibernated: boolean;
  position: Point;
}

export interface FleetNode {
  id: NodeId;
  position: Point;
}

export function fleetSnapshot(view: FleetView): {
  nodes: FleetNode[];
  cells: PlacedCell[];
} {
  const expanded = view !== "two-nodes";
  const nodes: FleetNode[] = expanded
    ? [
        { id: "A", position: [-3.1, 0.85, 0] },
        { id: "B", position: [0, 0.85, 0] },
        { id: "C", position: [3.1, 0.85, 0] },
      ]
    : [
        { id: "A", position: [-1.95, 0.85, 0] },
        { id: "B", position: [1.95, 0.85, 0] },
      ];
  const slots: Record<NodeId, number> = { A: 0, B: 0, C: 0 };
  const cells = FLEET_CELLS.map((cell): PlacedCell => {
    const owner: NodeId =
      view === "handoff" && cell.name === "room:blue" ? "C" : cell.owner;
    const node = nodes.find((candidate) => candidate.id === owner)!;
    const slot = slots[owner]++;
    return {
      ...cell,
      owner,
      position: [
        node.position[0] + (slot === 0 ? -0.68 : slot === 1 ? 0.68 : 0),
        1.23,
        slot < 2 ? -0.4 : 0.5,
      ],
    };
  });

  return { nodes, cells };
}

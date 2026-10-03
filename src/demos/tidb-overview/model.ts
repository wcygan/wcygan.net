export interface OverviewRegion {
  id: string;
  start: number;
  end: number;
  stores: readonly number[];
  leader: number;
}

export interface RegionLayout {
  id: string;
  label: string;
  title: string;
  explanation: string;
  stores: readonly number[];
  regions: readonly OverviewRegion[];
}

/** Small ordered key space and placements, not actual Region sizes or timings. */
export const REGION_LAYOUTS: readonly RegionLayout[] = [
  {
    id: "initial",
    label: "Two Regions",
    title: "Two ranges, three copies of each",
    explanation:
      "A and B own different key ranges. Every TiKV store here holds a replica of both Regions; A and B have different leaders.",
    stores: [1, 2, 3],
    regions: [
      { id: "A", start: 0, end: 50, stores: [1, 2, 3], leader: 1 },
      { id: "B", start: 50, end: 100, stores: [1, 2, 3], leader: 2 },
    ],
  },
  {
    id: "split",
    label: "Split a Region",
    title: "A becomes two smaller ranges",
    explanation:
      "Splitting A creates A1 and A2. The key space is unchanged, and each new Region has its own Raft group with three replicas.",
    stores: [1, 2, 3],
    regions: [
      { id: "A1", start: 0, end: 25, stores: [1, 2, 3], leader: 1 },
      { id: "A2", start: 25, end: 50, stores: [1, 2, 3], leader: 1 },
      { id: "B", start: 50, end: 100, stores: [1, 2, 3], leader: 2 },
    ],
  },
  {
    id: "placed",
    label: "Add a store",
    title: "PD can redistribute replicas",
    explanation:
      "This settled example moves replicas onto TiKV 4. Every Region still has three copies; a store holds some Regions, not a complete database copy.",
    stores: [1, 2, 3, 4],
    regions: [
      { id: "A1", start: 0, end: 25, stores: [1, 2, 3], leader: 1 },
      { id: "A2", start: 25, end: 50, stores: [1, 2, 4], leader: 4 },
      { id: "B", start: 50, end: 100, stores: [2, 3, 4], leader: 2 },
    ],
  },
];

export function rangeLabel(region: OverviewRegion) {
  return `[${region.start}, ${region.end})`;
}

export type QueryKind = "lookup" | "aggregate";

export const QUERY_EXAMPLES = {
  lookup: {
    label: "Point lookup",
    sql: "SELECT * FROM orders WHERE id = 3;",
    engine: "tikv",
    title: "Find one row by primary key",
    explanation:
      "An indexed lookup can go straight to one row in TiKV. A column scan offers little benefit for this example.",
  },
  aggregate: {
    label: "Aggregate",
    sql: "SELECT SUM(amount) FROM orders;",
    engine: "tiflash",
    title: "Read one column across many rows",
    explanation:
      "A TiFlash plan can scan the amount column without reading every other field. The optimizer may choose it when a ready replica and the estimated costs support that plan.",
  },
} as const;

export const EXAMPLE_ORDERS = [
  { id: 1, buyer: "Ada", amount: 12 },
  { id: 2, buyer: "Lin", amount: 9 },
  { id: 3, buyer: "Sam", amount: 18 },
  { id: 4, buyer: "Jo", amount: 5 },
] as const;

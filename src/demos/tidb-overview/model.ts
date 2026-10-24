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
  stores: readonly number[];
  regions: readonly OverviewRegion[];
}

/** Small ordered key space and placements, not actual Region sizes or timings. */
export const REGION_LAYOUTS: readonly RegionLayout[] = [
  {
    id: "initial",
    label: "Two Regions",
    title: "Two ranges, three copies of each",
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
  },
  aggregate: {
    label: "Aggregate",
    sql: "SELECT SUM(amount) FROM orders;",
    engine: "tiflash",
    title: "Read one column across many rows",
  },
} as const;

export const EXAMPLE_ORDERS = [
  { id: 1, buyer: "Ada", amount: 12 },
  { id: 2, buyer: "Lin", amount: 9 },
  { id: 3, buyer: "Sam", amount: 18 },
  { id: 4, buyer: "Jo", amount: 5 },
] as const;

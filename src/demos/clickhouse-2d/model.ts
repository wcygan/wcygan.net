export interface EventRow {
  id: number;
  day: number;
  event: "view" | "buy";
  amount: number;
  userId: string;
}

// A small, day-sorted table shared by the workload, index, and query demos.
export const EVENTS = [
  { id: 1, day: 1, event: "view", amount: 0, userId: "Ada" },
  { id: 2, day: 1, event: "buy", amount: 40, userId: "Bea" },
  { id: 3, day: 1, event: "buy", amount: 25, userId: "Ada" },
  { id: 4, day: 2, event: "view", amount: 0, userId: "Cy" },
  { id: 5, day: 2, event: "view", amount: 0, userId: "Dee" },
  { id: 6, day: 2, event: "buy", amount: 70, userId: "Cy" },
  { id: 7, day: 3, event: "buy", amount: 35, userId: "Ada" },
  { id: 8, day: 3, event: "view", amount: 0, userId: "Bea" },
  { id: 9, day: 3, event: "buy", amount: 60, userId: "Bea" },
  { id: 10, day: 4, event: "view", amount: 0, userId: "Cy" },
  { id: 11, day: 4, event: "buy", amount: 20, userId: "Dee" },
  { id: 12, day: 4, event: "buy", amount: 55, userId: "Ada" },
] as const satisfies readonly EventRow[];

export const INSERT_BATCHES = [
  [
    { id: 13, day: 3, event: "buy", amount: 25, userId: "Ada" },
    { id: 14, day: 4, event: "view", amount: 0, userId: "Bea" },
    { id: 15, day: 5, event: "buy", amount: 50, userId: "Cy" },
  ],
  [
    { id: 16, day: 4, event: "buy", amount: 20, userId: "Dee" },
    { id: 17, day: 5, event: "view", amount: 0, userId: "Ada" },
    { id: 18, day: 6, event: "buy", amount: 30, userId: "Bea" },
  ],
] as const satisfies readonly (readonly EventRow[])[];

function requireCount(value: number, label: string, minimum = 0) {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be an integer of at least ${minimum}`);
  }
}

export interface Granule {
  id: number;
  mark: number;
  rows: readonly EventRow[];
  candidate: boolean;
  matchingRows: readonly EventRow[];
}

export interface GranulePruning {
  granules: Granule[];
  totalGranules: number;
  candidateGranules: number;
  totalRows: number;
  candidateRows: number;
  matchingRows: number;
}

// This simplified index stores one first-day mark per fixed-size granule.
// Rows must be sorted by day. The next mark is an inclusive upper bound:
// repeated keys may begin before that mark and continue across granules.
export function pruneGranules(
  rows: readonly EventRow[],
  fromDay: number,
  toDay: number,
  granuleSize = 3,
): GranulePruning {
  requireCount(granuleSize, "Granule size", 1);
  if (rows.some((row, index) => index > 0 && row.day < rows[index - 1].day)) {
    throw new RangeError("Granule rows must be sorted by day");
  }
  const granules: Granule[] = [];
  for (let offset = 0; offset < rows.length; offset += granuleSize) {
    const granuleRows = rows.slice(offset, offset + granuleSize);
    const mark = granuleRows[0].day;
    const nextMark = rows[offset + granuleSize]?.day;
    const candidate =
      fromDay <= toDay &&
      mark <= toDay &&
      (nextMark === undefined || nextMark >= fromDay);
    granules.push({
      id: granules.length + 1,
      mark,
      rows: granuleRows,
      candidate,
      matchingRows: candidate
        ? granuleRows.filter((row) => row.day >= fromDay && row.day <= toDay)
        : [],
    });
  }
  const candidates = granules.filter((granule) => granule.candidate);
  return {
    granules,
    totalGranules: granules.length,
    candidateGranules: candidates.length,
    totalRows: rows.length,
    candidateRows: candidates.reduce(
      (sum, granule) => sum + granule.rows.length,
      0,
    ),
    matchingRows: candidates.reduce(
      (sum, granule) => sum + granule.matchingRows.length,
      0,
    ),
  };
}

export interface AggregateBlock {
  id: number;
  inputRows: readonly EventRow[];
  matchingRows: readonly EventRow[];
  subtotal: number;
}

export function aggregateBlocks(rows: readonly EventRow[], blockSize = 3) {
  requireCount(blockSize, "Block size", 1);
  const blocks: AggregateBlock[] = [];
  for (let offset = 0; offset < rows.length; offset += blockSize) {
    const inputRows = rows.slice(offset, offset + blockSize);
    const matchingRows = inputRows.filter((row) => row.event === "buy");
    blocks.push({
      id: blocks.length + 1,
      inputRows,
      matchingRows,
      subtotal: matchingRows.reduce((sum, row) => sum + row.amount, 0),
    });
  }
  return blocks;
}

export function combineBlockTotals(blocks: readonly AggregateBlock[]) {
  return blocks.reduce((sum, block) => sum + block.subtotal, 0);
}

export type DayTotals = Readonly<Record<number, number>>;

// A teaching model of an insert-triggered aggregate: only the inserted rows
// contribute. It does not re-read earlier source rows or deduplicate inserts.
export function applyInsertedBatch(
  totals: DayTotals,
  rows: readonly EventRow[],
) {
  const next: Record<number, number> = { ...totals };
  for (const row of rows) {
    if (row.event === "buy") {
      next[row.day] = (next[row.day] ?? 0) + row.amount;
    }
  }
  return next;
}

export interface PipelineSnapshot {
  sourceRows: number;
  ingestedRows: number;
  pendingRows: number;
  sourceRevenue: number;
  storedRevenue: number;
  dashboardRevenue: number;
}

// The dashboard is the result of its last query. Delivering a new batch to
// storage does not refresh that already-rendered result until the next query.
export function derivePipelineSnapshot(step: number): PipelineSnapshot {
  requireCount(step, "Pipeline step");
  const baselineRevenue = combineBlockTotals(aggregateBlocks(EVENTS));
  const batchRevenue = combineBlockTotals(aggregateBlocks(INSERT_BATCHES[0]));
  const sourceRows = EVENTS.length + (step >= 1 ? INSERT_BATCHES[0].length : 0);
  const ingestedRows =
    EVENTS.length + (step >= 2 ? INSERT_BATCHES[0].length : 0);
  return {
    sourceRows,
    ingestedRows,
    pendingRows: sourceRows - ingestedRows,
    sourceRevenue: baselineRevenue + (step >= 1 ? batchRevenue : 0),
    storedRevenue: baselineRevenue + (step >= 2 ? batchRevenue : 0),
    dashboardRevenue: baselineRevenue + (step >= 3 ? batchRevenue : 0),
  };
}

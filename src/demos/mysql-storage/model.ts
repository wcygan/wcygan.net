/** Conceptual InnoDB lookups, not a simulation of page bytes or the optimizer. */
export const ORDERS = [
  { id: 101, customer_id: 1, book_id: 1, quantity: 1, total_cents: 2900 },
  { id: 102, customer_id: 1, book_id: 2, quantity: 1, total_cents: 4500 },
  { id: 103, customer_id: 2, book_id: 1, quantity: 1, total_cents: 2900 },
] as const;

export type IndexScenario = "row" | "covered";
export interface Lookup {
  scenario: IndexScenario;
  step: number;
}
export function createLookup(scenario: IndexScenario = "row"): Lookup {
  return { scenario, step: 0 };
}
export function lookupSteps(lookup: Lookup) {
  return lookup.scenario === "covered" ? 3 : 4;
}
export function advanceLookup(lookup: Lookup): Lookup {
  return { ...lookup, step: Math.min(lookupSteps(lookup), lookup.step + 1) };
}
export function matchingEntries(customerId: number) {
  return ORDERS.filter((row) => row.customer_id === customerId).map((row) => ({
    customer_id: row.customer_id,
    id: row.id,
  }));
}
export function lookupSnapshot(lookup: Lookup): {
  entries: ReturnType<typeof matchingEntries>;
  rowFetches: number;
  complete: boolean;
  results: Array<Record<string, number>>;
} {
  const entries = lookup.step >= 2 ? matchingEntries(1) : [];
  const rowFetches =
    lookup.scenario === "row" && lookup.step >= 3 ? entries.length : 0;
  const complete = lookup.step >= lookupSteps(lookup);
  return {
    entries,
    rowFetches,
    complete,
    results: !complete
      ? []
      : lookup.scenario === "covered"
        ? entries
        : ORDERS.filter((row) =>
            entries.some((entry) => entry.id === row.id),
          ).map(({ id, total_cents }) => ({ id, total_cents })),
  };
}
export function lookupMessage(lookup: Lookup) {
  if (lookup.step === 0) return "customer_id = 1";
  if (lookup.step === 1) return "Secondary root → leaf";
  if (lookup.step === 2) return "2 matching entries · IDs 101, 102";
  if (lookup.scenario === "covered")
    return "2 rows returned · 0 clustered fetches";
  if (lookup.step === 3) return "2 clustered rows fetched";
  return "2 rows returned";
}

export type PageId = 1 | 2;
export interface BufferPool {
  resident: PageId[];
  requests: number;
  hits: number;
  misses: number;
  last: { page: PageId; outcome: "hit" | "miss" } | null;
}
export function createBufferPool(): BufferPool {
  return { resident: [], requests: 0, hits: 0, misses: 0, last: null };
}
/** Two slots and two pages: eviction and writeback are intentionally outside this lesson. */
export function readPage(state: BufferPool, page: PageId): BufferPool {
  const hit = state.resident.includes(page);
  return {
    resident: hit ? state.resident : [...state.resident, page],
    requests: state.requests + 1,
    hits: state.hits + Number(hit),
    misses: state.misses + Number(!hit),
    last: { page, outcome: hit ? "hit" : "miss" },
  };
}
export function bufferMessage(state: BufferPool) {
  if (!state.last) return "Memory empty";
  return state.last.outcome === "hit"
    ? `Page ${state.last.page} · memory hit`
    : `Page ${state.last.page} · disk miss`;
}

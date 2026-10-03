import { describe, expect, it } from "vitest";
import {
  aggregateBlocks,
  applyInsertedBatch,
  combineBlockTotals,
  derivePipelineSnapshot,
  EVENTS,
  INSERT_BATCHES,
  pruneGranules,
  type EventRow,
} from "./model";

function rowsForDays(days: readonly number[]): EventRow[] {
  return days.map((day, index) => ({
    id: index + 1,
    day,
    event: index % 2 === 0 ? "buy" : "view",
    amount: index + 1,
    userId: `user-${index}`,
  }));
}

describe("sparse day marks", () => {
  it("prunes whole granules and then checks individual candidate rows", () => {
    const result = pruneGranules(EVENTS, 3, 3);

    expect(result.granules.map((granule) => granule.mark)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(result.granules.map((granule) => granule.candidate)).toEqual([
      false,
      true,
      true,
      false,
    ]);
    expect(result.candidateRows).toBe(6);
    expect(result.matchingRows).toBe(3);
    expect(result.granules[1].matchingRows).toEqual([]);
    expect(result.granules[2].matchingRows).toEqual(EVENTS.slice(6, 9));
  });

  it("keeps duplicate keys that cross a granule boundary", () => {
    const rows = rowsForDays([1, 2, 2, 2, 2, 3, 3]);
    const result = pruneGranules(rows, 2, 2, 3);

    expect(result.granules.map((granule) => granule.candidate)).toEqual([
      true,
      true,
      false,
    ]);
    expect(result.granules.flatMap((granule) => granule.matchingRows)).toEqual(
      rows.filter((row) => row.day === 2),
    );
  });

  it("never excludes a true match across varied sorted rows and ranges", () => {
    // Deterministic generated data includes repeated keys and partial granules.
    let seed = 29;
    const random = () => {
      seed = (seed * 48271) % 2147483647;
      return seed;
    };
    for (let sample = 0; sample < 30; sample++) {
      const days = Array.from(
        { length: random() % 30 },
        () => random() % 8,
      ).sort((a, b) => a - b);
      const rows = rowsForDays(days);
      for (const granuleSize of [1, 2, 3, 5, 8]) {
        for (let fromDay = -1; fromDay <= 8; fromDay++) {
          for (let toDay = fromDay; toDay <= 8; toDay++) {
            const result = pruneGranules(rows, fromDay, toDay, granuleSize);
            const expected = rows.filter(
              (row) => row.day >= fromDay && row.day <= toDay,
            );
            const matching = result.granules.flatMap(
              (granule) => granule.matchingRows,
            );
            expect(matching).toEqual(expected);
            expect(result.matchingRows).toBe(expected.length);
            expect(result.candidateRows).toBeGreaterThanOrEqual(
              expected.length,
            );
          }
        }
      }
    }
  });

  it("handles empty tables, reversed ranges, and invalid layout inputs", () => {
    expect(pruneGranules([], 1, 4)).toEqual({
      granules: [],
      totalGranules: 0,
      candidateGranules: 0,
      totalRows: 0,
      candidateRows: 0,
      matchingRows: 0,
    });
    expect(pruneGranules(EVENTS, 4, 1).candidateRows).toBe(0);
    expect(() => pruneGranules(EVENTS, 1, 4, 0)).toThrow(RangeError);
    expect(() => pruneGranules(rowsForDays([2, 1]), 1, 4)).toThrow(RangeError);
  });
});

describe("block aggregation", () => {
  it("filters buy rows before producing each partial sum", () => {
    const blocks = aggregateBlocks(EVENTS);

    expect(blocks.map((block) => block.inputRows.length)).toEqual([3, 3, 3, 3]);
    expect(blocks.map((block) => block.matchingRows.length)).toEqual([
      2, 1, 2, 2,
    ]);
    expect(blocks.map((block) => block.subtotal)).toEqual([65, 70, 95, 75]);
    expect(combineBlockTotals(blocks)).toBe(305);
  });

  it.each([1, 2, 3, 5, 7, 12, 20])(
    "preserves the raw aggregate with block size %s",
    (blockSize) => {
      const rows = rowsForDays([1, 1, 2, 3, 3, 3, 4, 5, 6]);
      const rawTotal = rows
        .filter((row) => row.event === "buy")
        .reduce((sum, row) => sum + row.amount, 0);
      const blocks = aggregateBlocks(rows, blockSize);

      expect(blocks.flatMap((block) => block.inputRows)).toEqual(rows);
      expect(combineBlockTotals(blocks)).toBe(rawTotal);
      for (const block of blocks) {
        expect(block.inputRows.length).toBeLessThanOrEqual(blockSize);
        expect(block.matchingRows.every((row) => row.event === "buy")).toBe(
          true,
        );
      }
    },
  );

  it("produces the same aggregate when independently partitioned inputs combine", () => {
    const blocks = [
      ...aggregateBlocks(EVENTS.slice(0, 5), 2),
      ...aggregateBlocks(EVENTS.slice(5), 4),
    ];
    expect(combineBlockTotals(blocks)).toBe(
      combineBlockTotals(aggregateBlocks(EVENTS)),
    );
    expect(combineBlockTotals(aggregateBlocks([]))).toBe(0);
    expect(() => aggregateBlocks(EVENTS, 0)).toThrow(RangeError);
  });
});

describe("insert-triggered daily totals", () => {
  it("adds each new batch without mutating the earlier totals or source rows", () => {
    const sourceRows = EVENTS.map((row) => ({ ...row }));
    const initial = applyInsertedBatch({}, sourceRows);
    const initialSnapshot = { ...initial };
    const sourceSnapshot = sourceRows.map((row) => ({ ...row }));
    const first = applyInsertedBatch(initial, INSERT_BATCHES[0]);
    const second = applyInsertedBatch(first, INSERT_BATCHES[1]);

    expect(initial).toEqual({ 1: 65, 2: 70, 3: 95, 4: 75 });
    expect(first).toEqual({ 1: 65, 2: 70, 3: 120, 4: 75, 5: 50 });
    expect(second).toEqual({ 1: 65, 2: 70, 3: 120, 4: 95, 5: 50, 6: 30 });
    expect(initial).toEqual(initialSnapshot);
    expect(sourceRows).toEqual(sourceSnapshot);
    expect(Object.values(second).reduce((sum, total) => sum + total, 0)).toBe(
      combineBlockTotals(
        aggregateBlocks([...EVENTS, ...INSERT_BATCHES.flat()]),
      ),
    );
  });

  it("ignores nonmatching rows and adds a repeated insert again", () => {
    const initial = { 1: 65 };
    const views = EVENTS.filter((row) => row.event === "view");
    expect(applyInsertedBatch(initial, views)).toEqual(initial);
    expect(applyInsertedBatch(initial, [])).toEqual(initial);
    const once = applyInsertedBatch({}, INSERT_BATCHES[0]);
    const twice = applyInsertedBatch(once, INSERT_BATCHES[0]);
    expect(twice).toEqual({ 3: 50, 5: 100 });
    expect(once).toEqual({ 3: 25, 5: 50 });
  });
});

describe("source, ingestion, and dashboard pipeline", () => {
  it("keeps a delivered batch separate from the dashboard's last query", () => {
    expect(derivePipelineSnapshot(0)).toEqual({
      sourceRows: 12,
      ingestedRows: 12,
      pendingRows: 0,
      sourceRevenue: 305,
      storedRevenue: 305,
      dashboardRevenue: 305,
    });
    const waiting = derivePipelineSnapshot(1);
    expect(waiting).toEqual({
      sourceRows: 15,
      ingestedRows: 12,
      pendingRows: 3,
      sourceRevenue: 380,
      storedRevenue: 305,
      dashboardRevenue: 305,
    });
    const delivered = derivePipelineSnapshot(2);
    expect(delivered).toEqual({
      sourceRows: 15,
      ingestedRows: 15,
      pendingRows: 0,
      sourceRevenue: 380,
      storedRevenue: 380,
      dashboardRevenue: 305,
    });
    const refreshed = derivePipelineSnapshot(3);
    expect(refreshed).toEqual({ ...delivered, dashboardRevenue: 380 });
    expect(delivered.dashboardRevenue).toBe(waiting.dashboardRevenue);
  });

  it("accounts for every source row as ingested or pending at each beat", () => {
    for (const step of [0, 1, 2, 3]) {
      const snapshot = derivePipelineSnapshot(step);
      expect(snapshot.sourceRows).toBe(
        snapshot.ingestedRows + snapshot.pendingRows,
      );
      expect(snapshot.dashboardRevenue).toBeLessThanOrEqual(
        snapshot.storedRevenue,
      );
      expect(snapshot.storedRevenue).toBeLessThanOrEqual(
        snapshot.sourceRevenue,
      );
    }
  });
});

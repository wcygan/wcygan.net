import { describe, expect, it } from "vitest";
import {
  initialNamedState,
  NAMED_CELL_IDS,
  requestCell,
  restartNamedCells,
} from "./named-state-model";

describe("the named-cell persistence illustration", () => {
  it("routes a request to one named cell without changing another database", () => {
    const initial = initialNamedState();
    const requested = requestCell(initial, "blue");

    expect(requested.cells.blue).toMatchObject({
      name: "room:blue",
      committedCount: 1,
      volatileCount: 1,
    });
    expect(requested.cells.green).toEqual(initial.cells.green);
    expect(requested.cells.agent).toEqual(initial.cells.agent);
    expect(initial.cells.blue.committedCount).toBe(0);
  });

  it("keeps different named-cell counters independent over repeated requests", () => {
    let state = initialNamedState();
    state = requestCell(state, "blue");
    state = requestCell(state, "green");
    state = requestCell(state, "blue");

    expect(NAMED_CELL_IDS.map((id) => state.cells[id].committedCount)).toEqual([
      2, 1, 0,
    ]);
    expect(state.selected).toBe("blue");
  });

  it("retains committed values and named identity while discarding handler memory", () => {
    let before = initialNamedState();
    before = requestCell(before, "blue");
    before = requestCell(before, "blue");
    before = requestCell(before, "green");
    before = requestCell(before, "agent");
    const restarted = restartNamedCells(before);

    for (const id of NAMED_CELL_IDS) {
      expect(restarted.cells[id].id).toBe(before.cells[id].id);
      expect(restarted.cells[id].name).toBe(before.cells[id].name);
      expect(restarted.cells[id].committedCount).toBe(
        before.cells[id].committedCount,
      );
      expect(restarted.cells[id].volatileCount).toBe(0);
    }
    expect(before.cells.blue.volatileCount).toBe(2);
    expect(restarted.selected).toBeNull();
  });

  it("continues the saved counter after a restart while handler memory starts fresh", () => {
    let state = initialNamedState();
    state = requestCell(state, "blue");
    state = requestCell(state, "blue");
    state = restartNamedCells(state);
    state = requestCell(state, "blue");
    state = restartNamedCells(state);
    state = requestCell(state, "blue");

    expect(state.cells.blue.committedCount).toBe(4);
    expect(state.cells.blue.volatileCount).toBe(1);
    expect(state.restartCount).toBe(2);
    expect(state.cells.green.committedCount).toBe(0);
  });
});

export type NamedCellId = "blue" | "green" | "agent";

export const NAMED_CELL_IDS: NamedCellId[] = ["blue", "green", "agent"];

export interface NamedCellState {
  id: NamedCellId;
  name: string;
  committedCount: number;
  volatileCount: number;
}

export interface NamedState {
  cells: Record<NamedCellId, NamedCellState>;
  selected: NamedCellId | null;
  restartCount: number;
  action: "initial" | "request" | "restart";
}

export function initialNamedState(): NamedState {
  return {
    cells: {
      blue: {
        id: "blue",
        name: "room:blue",
        committedCount: 0,
        volatileCount: 0,
      },
      green: {
        id: "green",
        name: "room:green",
        committedCount: 0,
        volatileCount: 0,
      },
      agent: {
        id: "agent",
        name: "agent:7",
        committedCount: 0,
        volatileCount: 0,
      },
    },
    selected: null,
    restartCount: 0,
    action: "initial",
  };
}

/**
 * One illustrated already-acknowledged request and its completed storage commit.
 * This manual model does not run JavaScript, SQLite, or a durability protocol.
 */
export function requestCell(state: NamedState, id: NamedCellId): NamedState {
  const cell = state.cells[id];
  return {
    ...state,
    cells: {
      ...state.cells,
      [id]: {
        ...cell,
        committedCount: cell.committedCount + 1,
        volatileCount: cell.volatileCount + 1,
      },
    },
    selected: id,
    action: "request",
  };
}

/** Restarting a handler discards memory, while its named database is retained. */
export function restartNamedCells(state: NamedState): NamedState {
  return {
    ...state,
    cells: {
      blue: { ...state.cells.blue, volatileCount: 0 },
      green: { ...state.cells.green, volatileCount: 0 },
      agent: { ...state.cells.agent, volatileCount: 0 },
    },
    selected: null,
    restartCount: state.restartCount + 1,
    action: "restart",
  };
}

export function namedStateSummary(state: NamedState): string {
  const saved = NAMED_CELL_IDS.map(
    (id) => `${state.cells[id].name} = ${state.cells[id].committedCount}`,
  ).join(", ");
  if (state.action === "restart") {
    return `Handler memory is now zero in all three cells. Their committed SQLite counters remain ${saved}.`;
  }
  if (state.selected) {
    const cell = state.cells[state.selected];
    return `The illustrated already-acknowledged request to ${cell.name} has committed SQLite counter ${cell.committedCount} and temporary JavaScript counter ${cell.volatileCount}. The other named cells are unchanged.`;
  }
  return `Each named cell has its own handler memory and private SQLite counter: ${saved}.`;
}

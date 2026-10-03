export interface PrimerCustomer {
  id: number;
  name: string;
}

export interface PrimerOrder {
  id: number;
  customerId: number;
  book: string;
  totalCents: number;
}

export const CUSTOMERS: readonly PrimerCustomer[] = [
  { id: 1, name: "Ada" },
  { id: 2, name: "Lin" },
];

export const ORDERS: readonly PrimerOrder[] = [
  { id: 101, customerId: 1, book: "SQL Basics", totalCents: 2900 },
  { id: 102, customerId: 1, book: "Reliable Systems", totalCents: 4500 },
  { id: 103, customerId: 2, book: "SQL Basics", totalCents: 2900 },
];

export const NEW_ORDER: PrimerOrder = {
  id: 104,
  customerId: 2,
  book: "SQL Basics",
  totalCents: 2900,
};

export function joinCustomerOrders(customerId: number) {
  const customer = CUSTOMERS.find((row) => row.id === customerId);
  if (!customer) return [];
  return ORDERS.filter((row) => row.customerId === customer.id).map(
    (order) => ({
      ...order,
      customerName: customer.name,
    }),
  );
}

/** A logical explanation of WHERE then SUM, not an optimizer execution plan. */
export function queryOrders(customerId: number) {
  const rows = ORDERS.filter((row) => row.customerId === customerId);
  return {
    rows,
    // SQL SUM over an empty input is NULL, rather than zero.
    totalCents:
      rows.length === 0
        ? null
        : rows.reduce((sum, row) => sum + row.totalCents, 0),
  };
}

export type TransactionPhase =
  | "ready"
  | "started"
  | "reserved"
  | "ordered"
  | "committed"
  | "rolled-back";

export interface StoreSnapshot {
  stock: number;
  orderIds: readonly number[];
}

export interface PrimerTransaction {
  phase: TransactionPhase;
  committed: StoreSnapshot;
  pending: StoreSnapshot | null;
}

export type TransactionAction =
  | "begin"
  | "reserve"
  | "insert"
  | "commit"
  | "rollback";

export function createTransaction(stock = 2): PrimerTransaction {
  return {
    phase: "ready",
    committed: { stock, orderIds: ORDERS.map((row) => row.id) },
    pending: null,
  };
}

/**
 * One application-controlled transaction. A failed reservation is rolled back;
 * the application must check affected rows before inserting or committing.
 * This deliberately does not model locks, isolation levels, or crash recovery.
 */
export function advanceTransaction(
  state: PrimerTransaction,
  action: TransactionAction,
): PrimerTransaction {
  if (action === "begin" && state.phase === "ready") {
    return { ...state, phase: "started", pending: { ...state.committed } };
  }

  if (action === "rollback" && state.pending) {
    return { ...state, phase: "rolled-back", pending: null };
  }

  if (!state.pending) return state;

  if (action === "reserve" && state.phase === "started") {
    if (state.pending.stock <= 0) {
      return { ...state, phase: "rolled-back", pending: null };
    }
    return {
      ...state,
      phase: "reserved",
      pending: { ...state.pending, stock: state.pending.stock - 1 },
    };
  }

  if (action === "insert" && state.phase === "reserved") {
    return {
      ...state,
      phase: "ordered",
      pending: {
        ...state.pending,
        orderIds: [...state.pending.orderIds, NEW_ORDER.id],
      },
    };
  }

  if (action === "commit" && state.phase === "ordered") {
    return { phase: "committed", committed: state.pending, pending: null };
  }

  return state;
}

export interface PrimerReplication {
  primaryOrderIds: readonly number[];
  replicaOrderIds: readonly number[];
  primaryPosition: number;
  replicaPosition: number;
}

export function createReplication(): PrimerReplication {
  return {
    primaryOrderIds: ORDERS.map((row) => row.id),
    replicaOrderIds: ORDERS.map((row) => row.id),
    primaryPosition: 0,
    replicaPosition: 0,
  };
}

/** Positions are illustrative change numbers, not binlog positions or GTIDs. */
export function writePrimary(state: PrimerReplication): PrimerReplication {
  if (state.primaryPosition !== 0) return state;
  return {
    ...state,
    primaryOrderIds: [...state.primaryOrderIds, NEW_ORDER.id],
    primaryPosition: 1,
  };
}

export function applyReplica(state: PrimerReplication): PrimerReplication {
  if (state.replicaPosition === state.primaryPosition) return state;
  return {
    ...state,
    replicaOrderIds: [...state.primaryOrderIds],
    replicaPosition: state.primaryPosition,
  };
}

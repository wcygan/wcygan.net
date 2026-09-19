import { LOG_ENTRY_COLORS } from "../shared/replication-palette";

export interface LogRecord {
  id: number;
  operation: "INSERT" | "UPDATE" | "DELETE";
  key: string;
  color: string;
}

export const LOG_RECORDS: readonly LogRecord[] = [
  { id: 1, operation: "INSERT", key: "user:42", color: LOG_ENTRY_COLORS[0] },
  { id: 2, operation: "UPDATE", key: "user:42", color: LOG_ENTRY_COLORS[1] },
  { id: 3, operation: "INSERT", key: "user:77", color: LOG_ENTRY_COLORS[2] },
  { id: 4, operation: "DELETE", key: "user:19", color: LOG_ENTRY_COLORS[3] },
  { id: 5, operation: "UPDATE", key: "user:77", color: LOG_ENTRY_COLORS[4] },
  { id: 6, operation: "INSERT", key: "user:91", color: LOG_ENTRY_COLORS[5] },
];

export const TOTAL_STEPS = LOG_RECORDS.length * 2;

export function databaseLogSnapshot(step: number) {
  const tick = Math.max(0, Math.min(TOTAL_STEPS, Math.floor(step)));
  const appended = LOG_RECORDS.slice(0, Math.floor(tick / 2));
  const current = tick === 0 ? null : LOG_RECORDS[Math.floor((tick - 1) / 2)];

  return {
    tick,
    appended,
    current,
    writing: tick % 2 === 1,
    done: tick === TOTAL_STEPS,
  };
}

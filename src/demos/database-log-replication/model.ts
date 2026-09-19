import { LOG_RECORDS } from "../database-log/model";
export { LOG_RECORDS };
export const WRITE_COOLDOWN = 500;
export const PHASE_DURATION = {
  writing: 850,
  replicating: 1600,
  applying: 1000,
};
export const COMMIT = PHASE_DURATION.writing;
export const RECEIVE = COMMIT + PHASE_DURATION.replicating;
export const APPLY = RECEIVE + PHASE_DURATION.applying;
export type Flight = {
  record: (typeof LOG_RECORDS)[number];
  started: number;
  phase: "writing" | "replicating" | "applying";
  phaseStarted: number;
};

export function concurrentSnapshot(starts: readonly number[], now: number) {
  const primary = LOG_RECORDS.slice(
    0,
    starts.filter((t) => now - t >= COMMIT).length,
  );
  const replica = LOG_RECORDS.slice(
    0,
    starts.filter((t) => now - t >= RECEIVE).length,
  );
  const applied = LOG_RECORDS.slice(
    0,
    starts.filter((t) => now - t >= APPLY).length,
  );
  const flights: Flight[] = starts.flatMap((started, index) => {
    const age = now - started;
    if (age >= APPLY) return [];
    const phase =
      age < COMMIT ? "writing" : age < RECEIVE ? "replicating" : "applying";
    return [
      {
        record: LOG_RECORDS[index],
        started,
        phase,
        phaseStarted:
          started +
          (phase === "writing"
            ? 0
            : phase === "replicating"
              ? COMMIT
              : RECEIVE),
      },
    ];
  });
  return {
    primary,
    replica,
    applied,
    flights,
    lag: primary.length - applied.length,
    cooling:
      starts.length > 0 && now - starts[starts.length - 1] < WRITE_COOLDOWN,
    full: starts.length === LOG_RECORDS.length,
    done: applied.length === LOG_RECORDS.length,
  };
}

export function concurrentStatus(state: ReturnType<typeof concurrentSnapshot>) {
  if (state.flights.length > 1)
    return `${state.flights.length} writes in flight. Entries commit, replicate, and apply in order.`;
  const flight = state.flights[0];
  if (flight?.phase === "writing")
    return `Primary writes ${flight.record.operation} ${flight.record.key} to log offset ${flight.record.id - 1}.`;
  if (flight?.phase === "replicating")
    return `Write committed on the primary. Sending entry ${flight.record.id} to the replica.`;
  if (flight)
    return `Replica received entry ${flight.record.id} and is applying the write locally.`;
  return state.applied.length
    ? `${state.applied.length} ${state.applied.length === 1 ? "write" : "writes"} replicated in order. The replica is caught up.`
    : "All reads and writes go to the primary. Write an entry to replicate it.";
}

import {
  canWrite,
  MAX_WRITES,
  PLAYBACK_RATE,
  type LagConditions,
} from "./model";
import {
  advanceSimulation,
  configureSimulation,
  createSimulation,
  nextEventAt,
  simulationSnapshot,
  submitWrite,
  toggleLink,
} from "./engine";
export { PLAYBACK_RATE } from "./model";

export function createLagPlayback(
  clock: () => number = () => performance.now(),
) {
  let simulation = createSimulation();
  let wallStartedAt: number | null = null;
  let readAt: number | null = null;
  const getWallTime = () =>
    readAt ??
    (wallStartedAt === null ? 0 : Math.max(0, clock() - wallStartedAt));
  let anchor = clock();
  let active = false;
  let reduced = false;
  let started = false;
  let reads: ReturnType<typeof simulationSnapshot>["reads"] | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const running = () =>
    active &&
    reads === null &&
    (!reduced ||
      simulation.interruptedAt !== null ||
      simulation.source !== "live" ||
      simulation.donorRequired) &&
    Number.isFinite(nextEventAt(simulation));
  const getTime = () =>
    simulation.now +
    (running() ? Math.max(0, clock() - anchor) * PLAYBACK_RATE : 0);
  const derive = () => ({
    ...simulationSnapshot(simulation),
    time: simulation.now,
    conditions: simulation.conditions,
    running: running(),
    reduced,
    reads,
    readAt,
    canWrite: canWrite(simulation.transactions, simulation.now),
  });
  let snapshot = derive();
  function synchronize() {
    simulation = advanceSimulation(simulation, getTime());
    anchor = clock();
  }
  function publish() {
    clearTimeout(timer);
    timer = undefined;
    snapshot = derive();
    if (running()) {
      const next = nextEventAt(simulation);
      timer = setTimeout(
        () => {
          synchronize();
          publish();
        },
        Math.max(1, Math.ceil((next - getTime()) / PLAYBACK_RATE - 1e-5)),
      );
    }
    listeners.forEach((listener) => listener());
  }
  function submit() {
    if (!canWrite(simulation.transactions, simulation.now)) return;
    started = true;
    wallStartedAt ??= clock();
    simulation = submitWrite(simulation);
    if (
      reduced &&
      simulation.interruptedAt === null &&
      !simulation.donorRequired
    )
      simulation = advanceSimulation(
        simulation,
        simulation.transactions.at(-1)!.fastAppliedAt,
      );
    anchor = clock();
  }
  return {
    getTime,
    getWallTime,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setActive(value: boolean) {
      if (value === active) return;
      synchronize();
      active = value;
      if (active && !started) submit();
      publish();
    },
    setReduced(value: boolean) {
      if (value === reduced) return;
      synchronize();
      reduced = value;
      if (
        reduced &&
        !reads &&
        simulation.interruptedAt === null &&
        !simulation.donorRequired
      )
        simulation = advanceSimulation(
          simulation,
          Math.max(
            simulation.now,
            simulation.transactions.at(-1)?.fastAppliedAt ?? 0,
          ),
        );
      publish();
    },
    configure(update: Partial<LagConditions>) {
      synchronize();
      simulation = configureSimulation(simulation, update);
      publish();
    },
    toggleLink() {
      synchronize();
      started = true;
      wallStartedAt ??= clock();
      simulation = toggleLink(simulation);
      publish();
    },
    write() {
      synchronize();
      submit();
      publish();
    },
    reset() {
      synchronize();
      started = true;
      simulation = createSimulation(simulation.conditions);
      wallStartedAt = clock();
      readAt = null;
      reads = null;
      publish();
    },
    readAll() {
      synchronize();
      readAt = getWallTime();
      reads = simulationSnapshot(simulation).reads;
      publish();
    },
    resume() {
      synchronize();
      if (readAt !== null && wallStartedAt !== null)
        wallStartedAt = clock() - readAt;
      reads = null;
      readAt = null;
      publish();
    },
    catchUp() {
      synchronize();
      // Advance only through real model events; a disconnected link has no deliveries.
      for (let i = 0; i < 1000; i++) {
        const next = nextEventAt(simulation);
        if (!Number.isFinite(next)) break;
        simulation = advanceSimulation(simulation, next);
      }
      anchor = clock();
      publish();
    },
  };
}

export type LagPlayback = ReturnType<typeof createLagPlayback>;
export type LagState = ReturnType<LagPlayback["getSnapshot"]>;

export function lagStatus(state: LagState) {
  if (state.reads)
    return "Replication is paused while you inspect the read results.";
  if (state.disconnected)
    return state.membership === "expelled"
      ? "Replica B is expelled. Reconnect Link 2 to rejoin and recover from the donor."
      : `Link 2 is interrupted. B can apply received entries. ${state.countdown}s until ${state.membership === "suspected" ? "expulsion" : "failure suspicion"}.`;
  if (state.membership === "rejoining")
    return "Replica B is rejoining the group. The primary is the selected recovery donor.";
  if (state.membership === "recovering")
    return "Distributed recovery: B applies local work, retrieves missing transactions from the donor, and catches up before becoming online.";
  if (state.recoverySource === "cache")
    return "XCom is recovering missed messages from the primary’s cache. Received entries are applied separately.";
  if (!state.submitted)
    return "Write an update, then read all three databases to compare their versions.";
  if (state.submitted > state.ordered)
    return `Transaction ${state.submitted}: group messages travel before primary commit. Ordering and certification must finish first.`;
  if (state.ordered > state.committed)
    return `Transaction ${state.ordered} is ordered and conflict-checked. The primary can now commit.`;
  if (state.reduced && state.pending)
    return state.submitted < MAX_WRITES
      ? "Write another update to grow the queue, or select Apply pending to let both replicas catch up."
      : "Select Apply pending to let both replicas catch up.";
  if (state.pending)
    return `${state.committed} of ${MAX_WRITES} writes committed. ${state.submitted < MAX_WRITES ? "Write again to grow the queue, or read" : "Read"} all three databases while Replica B catches up.`;
  return `All three databases read version ${state.committed}. ${state.submitted === MAX_WRITES ? "Reset to start again." : "Select Write to add another update."}`;
}

export function readSummary(reads: NonNullable<LagState["reads"]>) {
  const primary = reads[0].version;
  const unavailable = reads.filter((read) => !read.available);
  if (unavailable.length)
    return unavailable
      .map(
        (read) =>
          `${read.name} is ${read.status.toLowerCase()}. Version ${read.version} is its last applied state, not a successful application read.`,
      )
      .join(" ");
  const behind = reads.slice(1).filter((read) => read.version < primary);
  if (!behind.length) return `All three databases returned version ${primary}.`;
  return behind
    .map((read) => {
      const lag = primary - read.version;
      return `${read.name} returned a value ${lag} version${lag === 1 ? "" : "s"} behind the primary.`;
    })
    .join(" ");
}

export function formatWallTime(milliseconds: number) {
  const centiseconds = Math.floor(milliseconds / 10);
  const seconds = Math.floor(centiseconds / 100);
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(
      2,
      "0",
    )}:${(seconds % 60).toString().padStart(2, "0")}.${(centiseconds % 100).toString().padStart(2, "0")}`;
}

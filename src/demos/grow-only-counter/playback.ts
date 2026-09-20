import {
  type Action,
  apply,
  captureMessages,
  converged,
  describe,
  experimentReplicas,
  formatVector,
  type Message,
  type NodeId,
  refreshMessages,
} from "./model";
export const EVENT_MS = 4000;
export const SPEEDS = [0.5, 1, 2, 4] as const;
export function createPlayback(now = () => performance.now()) {
  let replicas = experimentReplicas();
  let previous = replicas;
  let delivered: string[] = [];
  let messages: readonly Message[] = captureMessages(replicas);
  let action: Action | null = null;
  let status =
    "A and C have each incremented once. Choose a client action or saved message.";
  let elapsed = 0;
  let anchor = now();
  let active = false;
  let reduced = false;
  let speed = 2;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const running = () => active && action !== null;
  const getElapsed = () =>
    Math.min(
      EVENT_MS,
      elapsed + (running() ? Math.max(0, now() - anchor) * speed : 0),
    );
  const makeState = () => ({
    replicas,
    previous,
    delivered,
    messages,
    action,
    status,
    reduced,
    speed,
    running: running(),
    inProgress: action !== null,
    converged: converged(replicas),
  });
  let state = makeState();
  function sync() {
    elapsed = getElapsed();
    anchor = now();
  }
  function commit() {
    if (!action) return;
    const committed = action;
    previous = replicas;
    replicas = apply(replicas, committed);
    status = describe(previous, committed, replicas);
    if (
      committed.kind === "deliver" &&
      !delivered.includes(committed.message.id)
    ) {
      delivered = [...delivered, committed.message.id];
    }
    if (committed.kind === "increment") {
      messages = refreshMessages(messages, replicas, committed.node);
      delivered = delivered.filter(
        (id) => !id.startsWith(`${committed.node}-`),
      );
      status += ` ${committed.node}’s saved snapshots now carry ${formatVector(
        replicas[committed.node],
      )}.`;
    }
    action = null;
    elapsed = 0;
    anchor = now();
  }
  function publish() {
    clearTimeout(timer);
    state = makeState();
    listeners.forEach((listener) => listener());
    if (running()) {
      timer = setTimeout(
        () => {
          commit();
          publish();
        },
        Math.max(1, (EVENT_MS - elapsed) / speed),
      );
    }
  }
  function start(next: Action) {
    if (action) return;
    action = next;
    elapsed = 0;
    anchor = now();
    if (reduced) commit();
    publish();
  }
  function reset() {
    replicas = experimentReplicas();
    messages = captureMessages(replicas);
    previous = replicas;
    delivered = [];
    action = null;
    elapsed = 0;
    anchor = now();
    status =
      "A and C have each incremented once. Choose a client action or saved message.";
    publish();
  }
  return {
    getSnapshot: () => state,
    getProgress: () => getElapsed() / EVENT_MS,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setActive(next: boolean) {
      if (next === active) return;
      sync();
      active = next;
      publish();
    },
    setSpeed(next: number) {
      if (!SPEEDS.some((s) => s === next) || next === speed) return;
      sync();
      speed = next;
      publish();
    },
    setReduced(next: boolean) {
      if (next === reduced) return;
      sync();
      reduced = next;
      if (next) commit();
      publish();
    },
    deliver(id: string) {
      const message = messages.find((m) => m.id === id);
      if (message) start({ kind: "deliver", message });
    },
    increment(node: Extract<NodeId, "A" | "C">) {
      start({
        kind: "increment",
        node,
        client: node === "A" ? "Client 1" : "Client 2",
      });
    },
    restart() {
      reset();
    },
    dispose() {
      clearTimeout(timer);
      active = false;
    },
  };
}
export type Playback = ReturnType<typeof createPlayback>;
export type PlaybackState = ReturnType<Playback["getSnapshot"]>;

import {
  BROKERS,
  controllerRoute,
  fetchRoute,
  producerRoute,
  reversed,
  type BrokerId,
} from "./layout";
import { createTimeline, type Beat, type Move } from "./timeline";

export const MIN_IN_SYNC = 2;

export type MoveKind =
  | "record"
  | "fetch"
  | "ack"
  | "reject"
  | "elect"
  | "metadata";
export type Result = { label: string; ok: boolean };
export type ReplicationScene = {
  leader: BrokerId | null;
  // Where the producer's cached metadata says P0's leader is. It can point at
  // a crashed broker until the producer refreshes.
  target: BrokerId;
  // Set while the controller has not yet noticed a crashed broker.
  undetected: BrokerId | null;
  offline: readonly BrokerId[];
  isr: readonly BrokerId[];
  logs: readonly (readonly string[])[];
  // The next offset each follower last asked the leader for. A follower that
  // fetches offset N has every record before N; that is how the leader knows.
  fetched: readonly number[];
  results: readonly Result[];
};

type Step = {
  caption: string;
  moves?: Move<MoveKind>[];
  hold?: number;
  // Applied after this beat's moves arrive, so recipients change on arrival.
  apply?: (scene: ReplicationScene) => ReplicationScene;
};

const append = (
  scene: ReplicationScene,
  label: string,
  ...brokers: BrokerId[]
): ReplicationScene => ({
  ...scene,
  logs: scene.logs.map((log, id) =>
    brokers.includes(id as BrokerId) ? [...log, label] : log,
  ),
});
// A crash is only the first beat: the broker stops answering, but the ISR
// still lists it until the controller or leader notices the silence.
const crash = (scene: ReplicationScene, id: BrokerId): ReplicationScene => ({
  ...scene,
  leader: scene.leader === id ? null : scene.leader,
  offline: [...scene.offline, id],
  undetected: id,
});
const drop = (scene: ReplicationScene, id: BrokerId): ReplicationScene => ({
  ...scene,
  undetected: null,
  isr: scene.isr.filter((member) => member !== id),
});
const settle = (scene: ReplicationScene, result: Result) => ({
  ...scene,
  results: [...scene.results, result],
});

const record = (label: string, to: BrokerId): Move<MoveKind> => ({
  kind: "record",
  label,
  points: producerRoute(to, -20),
});
const replicate = (
  label: string,
  from: BrokerId,
  to: BrokerId,
  lag = 0,
): Move<MoveKind> => ({
  kind: "record",
  label,
  points: fetchRoute(from, to),
  lag,
});
const fetchNext = (
  leader: BrokerId,
  follower: BrokerId,
  offset: number,
  lag = 0,
): Move<MoveKind> => ({
  kind: "fetch",
  label: `fetch ${offset}`,
  points: reversed(fetchRoute(leader, follower)),
  lag,
});
const confirm = (
  scene: ReplicationScene,
  offset: number,
  ...followers: BrokerId[]
): ReplicationScene => ({
  ...scene,
  fetched: scene.fetched.map((value, id) =>
    followers.includes(id as BrokerId) ? offset : value,
  ),
});

const ack = (from: BrokerId): Move<MoveKind> => ({
  kind: "ack",
  label: "ack",
  points: reversed(producerRoute(from, -20)),
});

const steps: Step[] = [
  {
    caption: "Producer sends A to the P0 leader",
    moves: [record("A", 0)],
    apply: (s) => append(s, "A", 0),
  },
  {
    caption: "Followers ask the leader for records starting at offset 0",
    moves: [fetchNext(0, 1, 0), fetchNext(0, 2, 0, 0.2)],
  },
  {
    caption: "The leader answers each fetch with A, and the followers store it",
    moves: [replicate("A", 0, 1), replicate("A", 0, 2, 0.2)],
    apply: (s) => append(s, "A", 1, 2),
  },
  {
    caption:
      "Each follower's next fetch asks for offset 1, which tells the leader it stored A",
    moves: [fetchNext(0, 1, 1), fetchNext(0, 2, 1, 0.2)],
    hold: 1400,
    apply: (s) => confirm(s, 1, 1, 2),
  },
  {
    caption: "All 3 in-sync replicas have A, so the leader acknowledges it",
    moves: [ack(0)],
    apply: (s) => settle(s, { label: "A", ok: true }),
  },
  {
    caption: "Broker 0 crashes. P0 has no leader, so writes pause",
    hold: 2200,
    apply: (s) => crash(s, 0),
  },
  {
    caption:
      "The controller stops hearing Broker 0's heartbeats and marks it out of sync",
    hold: 2200,
    apply: (s) => drop(s, 0),
  },
  {
    caption:
      "The controller picks Broker 1, an in-sync replica that has every acknowledged record",
    moves: [{ kind: "elect", label: "P0 leader", points: controllerRoute(1) }],
    hold: 1500,
    apply: (s) => ({ ...s, leader: 1 }),
  },
  {
    caption: "The producer refreshes its metadata: P0's leader is now Broker 1",
    moves: [
      {
        kind: "metadata",
        label: "P0→B1",
        points: reversed(producerRoute(1, -20)),
      },
    ],
    apply: (s) => ({ ...s, target: 1 }),
  },
  {
    caption: "Producer sends B to the new leader",
    moves: [record("B", 1)],
    apply: (s) => append(s, "B", 1),
  },
  {
    caption: "Broker 2 asks the new leader for records starting at offset 1",
    moves: [fetchNext(1, 2, 1)],
  },
  {
    caption: "The leader answers with B, and Broker 2 stores it",
    moves: [replicate("B", 1, 2)],
    apply: (s) => append(s, "B", 2),
  },
  {
    caption:
      "Broker 2's next fetch asks for offset 2, which tells the leader it stored B",
    moves: [fetchNext(1, 2, 2)],
    hold: 1400,
    apply: (s) => confirm(s, 2, 2),
  },
  {
    caption: "2 in-sync replicas have B, meeting the minimum of 2",
    moves: [ack(1)],
    apply: (s) => settle(s, { label: "B", ok: true }),
  },
  {
    caption: "Broker 2 crashes and stops fetching",
    hold: 2000,
    apply: (s) => crash(s, 2),
  },
  {
    caption:
      "After replica.lag.time.max.ms without a fetch, the leader marks Broker 2 out of sync",
    hold: 2200,
    apply: (s) => drop(s, 2),
  },
  {
    caption: "Producer sends C",
    moves: [record("C", 1)],
  },
  {
    caption: "Leader rejects C: 1 in-sync replica is below the minimum of 2",
    moves: [
      { kind: "reject", label: "×", points: reversed(producerRoute(1, -20)) },
    ],
    apply: (s) => settle(s, { label: "C", ok: false }),
  },
];

const initial: ReplicationScene = {
  leader: 0,
  target: 0,
  undetected: null,
  offline: [],
  isr: BROKERS,
  logs: BROKERS.map(() => []),
  fetched: BROKERS.map(() => 0),
  results: [],
};

function buildBeats() {
  const beats: Beat<ReplicationScene, MoveKind>[] = [];
  let scene = initial;
  for (const step of steps) {
    const after = step.apply?.(scene) ?? scene;
    beats.push({
      scene,
      after,
      caption: step.caption,
      moves: step.moves ?? [],
      hold: step.hold ?? 900,
    });
    scene = after;
  }
  beats.push({
    scene,
    after: scene,
    caption: "A and B acknowledged. C rejected with 1 in-sync replica.",
    moves: [],
    hold: 0,
  });
  return beats;
}

export const replication = createTimeline(buildBeats());

import { KEY_COLORS, KEYS, murmur2 } from "~/demos/kafka-partitioning/model";
import { BROKERS, placementRoute, reversed, type BrokerId } from "./layout";
import { createTimeline, type Beat } from "./timeline";

export const PARTITIONS = 3;
export const partitionOf = (key: string) =>
  (murmur2(key) & 0x7fffffff) % PARTITIONS;

// Leaders are deliberately not numbered like their brokers: placement is a
// cluster assignment, not a property of the partition number.
export const LEADER_OF_PARTITION: readonly BrokerId[] = [1, 2, 0];
export const partitionLedBy = (broker: BrokerId) =>
  LEADER_OF_PARTITION.indexOf(broker);

export type PlacementKey = "order-101" | "order-102" | "order-113";
// Same key colors as the partitioning figure earlier in the article.
export const keyColor = (key: PlacementKey) => KEY_COLORS[KEYS.indexOf(key)];

const SEQUENCE: readonly PlacementKey[] = [
  "order-101",
  "order-102",
  "order-101",
  "order-113",
  "order-102",
  "order-101",
];

// Any broker can answer a metadata request; the producer starts from one of
// its bootstrap.servers.
export const BOOTSTRAP: BrokerId = 0;

export type PlacementMove = "record" | "metadata";
export type PlacementScene = {
  // Whether the producer has cached the partition → leader map.
  cached: boolean;
  logs: readonly (readonly PlacementKey[])[];
  current?: { key: PlacementKey; partition: number; broker: BrokerId };
};

const emptyLogs = (): PlacementKey[][] => BROKERS.map(() => []);

function buildBeats() {
  const beats: Beat<PlacementScene, PlacementMove>[] = [];
  const logs = emptyLogs();
  const empty = { cached: false, logs: emptyLogs() };
  beats.push(
    {
      scene: empty,
      after: empty,
      caption: `Producer asks bootstrap Broker ${BOOTSTRAP} for cluster metadata`,
      moves: [
        {
          kind: "metadata",
          label: "metadata?",
          points: placementRoute(BOOTSTRAP),
        },
      ],
      hold: 300,
    },
    {
      scene: empty,
      after: { ...empty, cached: true },
      caption:
        "Broker 0 replies with each partition's leader; the producer caches it",
      moves: [
        {
          kind: "metadata",
          label: "leaders",
          points: reversed(placementRoute(BOOTSTRAP)),
        },
      ],
      hold: 1400,
    },
  );
  for (const key of SEQUENCE) {
    const partition = partitionOf(key);
    const broker = LEADER_OF_PARTITION[partition];
    const current = { key, partition, broker };
    const before = logs.map((log) => [...log]);
    logs[broker].push(key);
    beats.push({
      scene: { cached: true, logs: before, current },
      after: { cached: true, logs: logs.map((log) => [...log]), current },
      caption: `${key} → P${partition}; the cache says Broker ${broker} leads P${partition}`,
      moves: [{ kind: "record", label: key, points: placementRoute(broker) }],
      hold: 900,
    });
  }
  const counts = logs.map((log) => log.length);
  beats.push({
    scene: { cached: true, logs },
    after: { cached: true, logs },
    caption: `${SEQUENCE.length} writes split ${counts.join(" · ")} across Brokers 0–2`,
    moves: [],
    hold: 0,
  });
  return beats;
}

export const placement = createTimeline(buildBeats());

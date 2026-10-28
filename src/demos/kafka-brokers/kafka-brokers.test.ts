import { describe, expect, it } from "vitest";
import { LEADER_OF_PARTITION, partitionOf, placement } from "./placement";
import { replication } from "./replication";
import { PRODUCER } from "./layout";
import { pointAt, travelTime } from "./timeline";

describe("partition leaders", () => {
  it("sends every record to its partition's leader broker", () => {
    for (const beat of placement.beats) {
      const current = beat.scene.current;
      if (!current) continue;
      expect(current.partition).toBe(partitionOf(current.key));
      expect(current.broker).toBe(LEADER_OF_PARTITION[current.partition]);
    }
  });

  it("caches leaders from a bootstrap broker before sending any record", () => {
    const first = placement.beats.findIndex((beat) => beat.scene.current);
    expect(first).toBeGreaterThan(0);
    expect(placement.beats[first - 1].after.cached).toBe(true);
    for (const beat of placement.beats.slice(0, first))
      expect(beat.moves.every((move) => move.kind === "metadata")).toBe(true);
    for (const beat of placement.beats.slice(first))
      expect(beat.scene.cached).toBe(true);
  });

  it("settles with each broker holding only its partition's keys", () => {
    const final = placement.snapshot(placement.total);
    expect(final.done).toBe(true);
    expect(final.beat.scene.logs).toEqual([
      ["order-113"],
      ["order-102", "order-102"],
      ["order-101", "order-101", "order-101"],
    ]);
  });
});

describe("replication and failover", () => {
  const scenes = replication.beats.map((beat) => beat.scene);
  const final = scenes[scenes.length - 1];

  it("acknowledges A and B and rejects C below min.insync.replicas", () => {
    expect(final.results).toEqual([
      { label: "A", ok: true },
      { label: "B", ok: true },
      { label: "C", ok: false },
    ]);
    expect(final.isr).toEqual([1]);
    expect(final.offline).toEqual([0, 2]);
  });

  it("never stores the rejected record", () => {
    expect(final.logs).toEqual([["A"], ["A", "B"], ["A", "B"]]);
  });

  it("acks only after every in-sync follower has fetched past the record", () => {
    for (const beat of replication.beats) {
      if (!beat.moves.some((move) => move.kind === "ack")) continue;
      const { leader, isr, logs, fetched } = beat.scene;
      for (const member of isr)
        if (member !== leader)
          expect(fetched[member]).toBe(logs[leader as number].length);
    }
  });

  it("walks a leader failure through crash, detection, election, and reroute", () => {
    const crashed = scenes.findIndex((s) => s.offline.includes(0));
    const dropped = scenes.findIndex((s) => !s.isr.includes(0));
    const elected = scenes.findIndex((s) => s.leader === 1);
    const rerouted = scenes.findIndex((s) => s.target === 1);
    expect(scenes[crashed].leader).toBeNull();
    expect(scenes[crashed].isr).toContain(0);
    expect(crashed).toBeLessThan(dropped);
    expect(dropped).toBeLessThan(elected);
    expect(elected).toBeLessThan(rerouted);
    const firstB = scenes.findIndex((s) => s.logs[1].includes("B"));
    expect(rerouted).toBeLessThan(firstB);
  });

  it("sends records to a follower only in answer to its fetch request", () => {
    const key = (points: readonly (readonly number[])[]) =>
      JSON.stringify(points);
    replication.beats.forEach((beat, i) => {
      for (const move of beat.moves) {
        const fromProducer = move.points[0][1] === PRODUCER.y + PRODUCER.h;
        if (move.kind !== "record" || fromProducer) continue;
        const requests = replication.beats[i - 1].moves
          .filter((prior) => prior.kind === "fetch")
          .map((prior) => key([...prior.points].reverse()));
        expect(requests).toContain(key(move.points));
      }
    });
  });

  it("only elects a leader from the in-sync replicas", () => {
    for (const scene of scenes)
      if (scene.leader !== null) expect(scene.isr).toContain(scene.leader);
  });
});

describe("path sampling", () => {
  it("interpolates by cumulative length across bends", () => {
    const route = [
      [0, 0],
      [10, 0],
      [10, 30],
    ] as const;
    expect(pointAt(route, 0.25)).toEqual([10, 0]);
    expect(pointAt(route, 1)).toEqual([10, 30]);
  });
});

describe("arrival", () => {
  it("lands the record the instant its payload arrives", () => {
    const travel = travelTime(replication.beats[0].moves);
    const before = replication.snapshot(travel - 1);
    const landed = replication.snapshot(travel);
    expect(before.moves).toHaveLength(1);
    expect(before.scene.logs[0]).toEqual([]);
    expect(landed.moves).toHaveLength(0);
    expect(landed.scene.logs[0]).toEqual(["A"]);
  });

  it("settles each beat immediately under reduced motion", () => {
    const settled = placement.snapshot(placement.starts[1], true);
    expect(settled.moves).toHaveLength(0);
    expect(settled.scene.cached).toBe(true);
  });
});

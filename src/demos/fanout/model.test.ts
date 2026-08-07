import { describe, expect, it } from "vitest";
import {
  deriveFanoutSnapshot,
  FANOUT_DURATION_MS,
  FANOUT_EDGES,
  FANOUT_NODES,
  INITIAL_FANOUT_SNAPSHOT,
} from "./model";

describe("fanout graph model", () => {
  it("defines a 1-2-4 directed acyclic graph", () => {
    expect(
      [1, 2, 3].map(
        (column) =>
          FANOUT_NODES.filter((node) => node.column === column).length,
      ),
    ).toEqual([1, 2, 4]);

    expect(FANOUT_NODES.find((node) => node.id === "browser")?.shape).toBe(
      "browser",
    );
    expect(
      FANOUT_NODES.find((node) => node.id === "front-end")?.rateLabel,
    ).toBe("0.3 req/s");

    const highRate = FANOUT_EDGES.find(
      (edge) => edge.id === "mid-b-back-c",
    )?.ratePerSecond;
    const normalizedRate = FANOUT_EDGES.find(
      (edge) => edge.id === "mid-a-back-b",
    )?.ratePerSecond;
    expect(highRate).toBe(normalizedRate! * 5);

    const nodeOrder = new Map(
      FANOUT_NODES.map((node) => [node.id, node.column]),
    );
    for (const edge of FANOUT_EDGES) {
      expect(nodeOrder.get(edge.to)).toBeGreaterThan(nodeOrder.get(edge.from)!);
    }
  });

  it("starts with no requests before the first burst", () => {
    expect(INITIAL_FANOUT_SNAPSHOT).toMatchObject({
      elapsedMs: 0,
      startedRequests: 0,
      packets: [],
      isComplete: false,
    });
  });

  it("moves requests through the graph in downstream phases", () => {
    const browserPackets = deriveFanoutSnapshot(1_100).packets;
    expect(browserPackets).toHaveLength(1);
    expect(browserPackets[0]?.edgeId).toBe("browser-front-end");

    const midTierPackets = deriveFanoutSnapshot(2_000).packets;
    expect(new Set(midTierPackets.map((packet) => packet.edgeId))).toEqual(
      new Set(["front-end-mid-a", "front-end-mid-b"]),
    );

    const backEndPackets = deriveFanoutSnapshot(2_800).packets;
    expect(new Set(backEndPackets.map((packet) => packet.edgeId))).toEqual(
      new Set(["mid-a-back-a", "mid-a-back-b", "mid-b-back-c", "mid-b-back-d"]),
    );

    const highRatePackets = deriveFanoutSnapshot(3_500).packets.filter(
      (packet) => packet.edgeId === "mid-b-back-c",
    );
    const normalizedPackets = deriveFanoutSnapshot(3_500).packets.filter(
      (packet) => packet.edgeId === "mid-a-back-a",
    );
    expect(highRatePackets.length).toBeGreaterThan(normalizedPackets.length);
  });

  it("repeats the burst at the configured rate and settles", () => {
    expect(
      deriveFanoutSnapshot(FANOUT_DURATION_MS / 2).startedRequests,
    ).toBeGreaterThan(0);

    const complete = deriveFanoutSnapshot(FANOUT_DURATION_MS);
    expect(complete).toMatchObject({
      startedRequests: expect.any(Number),
      packets: [],
      isComplete: true,
    });
  });

  it("clamps elapsed time outside the playback range", () => {
    expect(deriveFanoutSnapshot(-1)).toEqual(INITIAL_FANOUT_SNAPSHOT);
    expect(deriveFanoutSnapshot(FANOUT_DURATION_MS + 1)).toEqual(
      deriveFanoutSnapshot(FANOUT_DURATION_MS),
    );
  });
});

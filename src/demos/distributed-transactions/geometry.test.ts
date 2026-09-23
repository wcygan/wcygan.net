import { describe, expect, it } from "vitest";
import {
  connectionsFor,
  COORDINATOR_RADIUS,
  DATABASE_RADIUS,
  CONNECTION_HEIGHT,
  nodeRadius,
  type Point,
  pointOnRoute,
  positionsFor,
  routeBetween,
} from "./geometry";
import { DEMOS } from "./model";
import type { Message, NodeId } from "./types";

describe("transaction connections", () => {
  it("draws one wire for the 3PC state request and its reverse reply", () => {
    const frames = DEMOS["three-phase"].scenarios[0].frames;
    const exchangeAt = frames.findIndex(
      (frame) => frame.title === "Survivors exchange state",
    );
    const connections = connectionsFor(
      frames[exchangeAt - 1],
      frames[exchangeAt].messages,
    );
    expect(connections).toEqual([
      { from: "coordinator", to: "a", interrupted: true, active: false },
      { from: "coordinator", to: "b", interrupted: true, active: false },
      { from: "a", to: "b", interrupted: false, active: true },
    ]);
  });

  it("activates persistent 2PC wires without adding reverse vote wires", () => {
    const frames = DEMOS["two-phase"].scenarios[0].frames;
    const votesAt = frames.findIndex(
      (frame) => frame.title === "Both votes are Yes",
    );
    expect(
      connectionsFor(frames[votesAt - 1], frames[votesAt].messages),
    ).toEqual([
      { from: "coordinator", to: "a", interrupted: false, active: true },
      { from: "coordinator", to: "b", interrupted: false, active: true },
    ]);
  });

  it("keeps replica-group wires and the leader-to-leader wire, sharing active paths", () => {
    const frame = DEMOS.spanner.scenarios[0].frames[0];
    const messages: Message[] = [{ from: "b", to: "a", label: "Prepared" }];
    expect(connectionsFor(frame, messages)).toEqual([
      { from: "a", to: "a2", interrupted: false, active: false },
      { from: "a", to: "a3", interrupted: false, active: false },
      { from: "b", to: "b2", interrupted: false, active: false },
      { from: "b", to: "b3", interrupted: false, active: false },
      { from: "a", to: "b", interrupted: false, active: true },
    ]);
  });

  it("uses the new replica leader and keeps the failed replica's wire interrupted", () => {
    const frames = DEMOS.spanner.scenarios.find(
      (scenario) => scenario.id === "leader-failure",
    )!.frames;
    const recovered = frames.find(
      (frame) => frame.title === "A2 recovers the chosen decision",
    )!;
    expect(connectionsFor(recovered, recovered.messages)).toEqual([
      { from: "a2", to: "a", interrupted: true, active: false },
      { from: "a2", to: "a3", interrupted: false, active: true },
      { from: "b", to: "b2", interrupted: false, active: false },
      { from: "b", to: "b3", interrupted: false, active: false },
      { from: "a2", to: "b", interrupted: false, active: false },
    ]);
  });

  it("omits unavailable leader topology while retaining an explicitly animated recovery route", () => {
    const frames = DEMOS.spanner.scenarios.find(
      (scenario) => scenario.id === "leader-failure",
    )!.frames;
    const failedAt = frames.findIndex((frame) => frame.recoveryAction);
    expect(
      connectionsFor(frames[failedAt], frames[failedAt + 1].messages),
    ).toEqual([
      { from: "b", to: "b2", interrupted: false, active: false },
      { from: "b", to: "b3", interrupted: false, active: false },
      { from: "a2", to: "a3", interrupted: false, active: true },
    ]);
  });

  it("preserves an interrupted static wire even when traffic activates it", () => {
    const frame = structuredClone(DEMOS["two-phase"].scenarios[0].frames[0]);
    frame.isolated = true;
    const messages: Message[] = [
      { from: "b", to: "coordinator", label: "Yes" },
    ];
    expect(connectionsFor(frame, messages)).toEqual([
      { from: "coordinator", to: "a", interrupted: false, active: false },
      { from: "coordinator", to: "b", interrupted: true, active: true },
    ]);
    frame.coordinator.online = false;
    expect(
      connectionsFor(frame, messages).every(
        (connection) => connection.interrupted,
      ),
    ).toBe(true);
  });

  it("preserves replica and coordinator failures on their respective wires", () => {
    const frame = structuredClone(DEMOS.spanner.scenarios[0].frames[0]);
    frame.replicas.find((node) => node.id === "a2")!.online = false;
    frame.coordinator.online = false;
    const connections = connectionsFor(frame, []);
    expect(connections.filter((connection) => connection.interrupted)).toEqual([
      { from: "a", to: "a2", interrupted: true, active: false },
      { from: "a", to: "b", interrupted: true, active: false },
    ]);
  });

  it("does not invent wires for local transactions or inactive independent shards", () => {
    const [together, split] = DEMOS.independent.scenarios[0].frames;
    expect(connectionsFor(together, [])).toEqual([]);
    expect(connectionsFor(split, [])).toEqual([]);
    const messages: Message[] = [
      { from: "b", to: "a", label: "First" },
      { from: "a", to: "b", label: "Reply" },
      { from: "b", to: "a", label: "Again" },
    ];
    expect(connectionsFor(split, messages)).toEqual([
      { from: "b", to: "a", interrupted: false, active: true },
    ]);
  });

  it("leaves frozen input unchanged and gives each call independent output objects", () => {
    const frame = structuredClone(DEMOS.spanner.scenarios[0].frames[0]);
    const messages: Message[] = [{ from: "b", to: "a", label: "Prepared" }];
    const before = structuredClone({ frame, messages });
    function freeze(value: unknown) {
      if (value && typeof value === "object") {
        Object.freeze(value);
        Object.values(value).forEach(freeze);
      }
    }
    freeze(frame);
    freeze(messages);
    const first = connectionsFor(frame, messages);
    const second = connectionsFor(frame, messages);
    expect({ frame, messages }).toEqual(before);
    expect(first).toEqual(second);
    first[0].interrupted = true;
    expect(second[0].interrupted).toBe(false);
    expect({ frame, messages }).toEqual(before);
  });
});

const horizontalDistance = (a: Point, b: Point) =>
  Math.hypot(a[0] - b[0], a[2] - b[2]);

function distanceToSegment(point: Point, from: Point, to: Point) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - from[0]) * dx + (point[2] - from[2]) * dz) /
        (dx * dx + dz * dz),
    ),
  );
  return horizontalDistance(point, [from[0] + dx * t, 0, from[2] + dz * t]);
}

describe("database ports", () => {
  it("ends a split-shard connection on both slim cylinder surfaces", () => {
    const positions = positionsFor("split");
    const route = routeBetween(positions, "split", "a", "b");
    expect(horizontalDistance(route[0], positions.a)).toBeCloseTo(
      DATABASE_RADIUS,
    );
    expect(horizontalDistance(route.at(-1)!, positions.b)).toBeCloseTo(
      DATABASE_RADIUS,
    );
    expect(route[0][0]).toBeGreaterThan(positions.a[0]);
    expect(route.at(-1)![0]).toBeLessThan(positions.b[0]);
  });

  it("uses circular coordinator ports and enters the participants from the outside", () => {
    const positions = positionsFor("split");
    for (const participant of ["a", "b"] as const) {
      const route = routeBetween(
        positions,
        "split",
        "coordinator",
        participant,
      );
      expect(horizontalDistance(route[0], positions.coordinator)).toBeCloseTo(
        COORDINATOR_RADIUS,
      );
      expect(
        horizontalDistance(route.at(-1)!, positions[participant]),
      ).toBeCloseTo(DATABASE_RADIUS);
      expect(route[0][2]).toBe(positions.coordinator[2]);
      expect(route.at(-1)![2]).toBe(positions[participant][2]);
      expect(Math.abs(route.at(-1)![0])).toBeGreaterThan(
        Math.abs(positions[participant][0]),
      );
    }
  });

  it("routes front/back replica traffic outside each back replica's label column", () => {
    const positions = positionsFor("replicated");
    for (const [front, back] of [
      ["a", "a2"],
      ["a", "a3"],
      ["b", "b2"],
      ["b", "b3"],
    ] as const) {
      const route = routeBetween(positions, "replicated", front, back);
      const direction = Math.sign(positions[back][0] - positions[front][0]);
      expect(route).toHaveLength(4);
      expect(route[1][0]).toBeCloseTo(positions[back][0] + direction * 0.85);
      expect(route[1][0]).toBe(route[2][0]);
      expect(horizontalDistance(route[0], positions[front])).toBeCloseTo(0.66);
      expect(horizontalDistance(route.at(-1)!, positions[back])).toBeCloseTo(
        0.5,
      );
    }
  });

  it("clears the back row before a replacement leader crosses to another group", () => {
    const positions = positionsFor("replicated");
    const route = routeBetween(positions, "replicated", "a2", "b");
    const expected: Point[] = [
      [-3.9, 0, -4],
      [-4.25, 0, -4],
      [-4.25, 0, -0.3],
      [0, 0, -0.3],
      [0, 0, 3],
      [1.84, 0, 3],
    ];
    expect(route).toHaveLength(expected.length);
    route.forEach((point, index) =>
      point.forEach((value, axis) =>
        expect(value).toBeCloseTo(expected[index][axis]),
      ),
    );
  });

  it("keeps front-row leader traffic and back-row same-group traffic direct", () => {
    const positions = positionsFor("replicated");
    const front = routeBetween(positions, "replicated", "a", "b");
    expect(front).toHaveLength(2);
    expect(front[0][0]).toBeCloseTo(-1.84);
    expect(front[1][0]).toBeCloseTo(1.84);
    expect(front.every((point) => point[2] === 3)).toBe(true);
    expect(routeBetween(positions, "replicated", "a2", "a3")).toEqual([
      [-2.9, 0, -4],
      [-2.1, 0, -4],
    ]);
  });

  it("uses fixed front/back sizes when leadership changes", () => {
    expect(nodeRadius("replicated", "a")).toBe(0.66);
    expect(nodeRadius("replicated", "a2")).toBe(0.5);
    expect(nodeRadius("split", "a")).toBe(0.7);
    expect(nodeRadius("split", "coordinator")).toBe(0.32);
  });
});

describe("routing invariants across every transaction scenario", () => {
  for (const [demo, definition] of Object.entries(DEMOS)) {
    for (const scenario of definition.scenarios) {
      it(`${demo}/${scenario.id}: wires have perpendicular surface ports, exact reverse paths, and clear every unrelated cylinder`, () => {
        scenario.frames.forEach((frame, index) => {
          const positions = positionsFor(frame.layout);
          const messages = scenario.frames[index + 1]?.messages ?? [];
          const connections = connectionsFor(frame, [
            ...frame.messages,
            ...messages,
          ]);
          const nodes: NodeId[] =
            frame.layout === "replicated"
              ? frame.replicas.map((node) => node.id)
              : frame.coordinator.visible
                ? ["a", "b", "coordinator"]
                : ["a", "b"];
          for (const { from, to } of connections) {
            const route = routeBetween(positions, frame.layout, from, to);
            expect(routeBetween(positions, frame.layout, to, from)).toEqual(
              [...route].reverse(),
            );
            for (const [id, endpoint, neighbor] of [
              [from, route[0], route[1]],
              [to, route.at(-1)!, route.at(-2)!],
            ] as const) {
              const center = positions[id];
              expect(horizontalDistance(center, endpoint)).toBeCloseTo(
                nodeRadius(frame.layout, id),
              );
              // Radius and adjacent segment are parallel, so the wire meets the tangent at 90 degrees.
              const cross =
                (endpoint[0] - center[0]) * (neighbor[2] - endpoint[2]) -
                (endpoint[2] - center[2]) * (neighbor[0] - endpoint[0]);
              expect(cross).toBeCloseTo(0);
            }
            for (let segment = 1; segment < route.length; segment++) {
              const a = route[segment - 1];
              const b = route[segment];
              expect(a[1]).toBe(CONNECTION_HEIGHT);
              expect(b[1]).toBe(CONNECTION_HEIGHT);
              expect(a[0] === b[0] || a[2] === b[2]).toBe(true);
              expect(horizontalDistance(a, b)).toBeGreaterThan(0);
              for (const node of nodes.filter(
                (node) => node !== from && node !== to,
              )) {
                expect(
                  distanceToSegment(positions[node], a, b),
                ).toBeGreaterThan(nodeRadius(frame.layout, node));
              }
            }
          }
        });
      });
    }
  }
});

describe("packet routes", () => {
  it("matches the connector endpoints and clamps progress outside the route", () => {
    const route = routeBetween(
      positionsFor("replicated"),
      "replicated",
      "a",
      "a3",
    );
    expect(pointOnRoute(route, 0)).toEqual(route[0]);
    expect(pointOnRoute(route, -1)).toEqual(route[0]);
    expect(pointOnRoute(route, 1)).toEqual(route.at(-1));
    expect(pointOnRoute(route, 2)).toEqual(route.at(-1));
  });

  it("travels at a consistent speed through a bend with unequal segment lengths", () => {
    const route: Point[] = [
      [0, 0, 0],
      [3, 0, 0],
      [3, 0, 4],
    ];
    expect(pointOnRoute(route, 3 / 7)).toEqual([3, 0, 0]);
    expect(pointOnRoute(route, 5 / 7)).toEqual([3, 0, 2]);
  });

  it("visits every corridor corner using its share of total path distance", () => {
    const route = routeBetween(
      positionsFor("replicated"),
      "replicated",
      "a2",
      "b",
    );
    const lengths = route
      .slice(1)
      .map((point, index) => horizontalDistance(route[index], point));
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let traveled = 0;
    route.forEach((corner, index) => {
      const point = pointOnRoute(route, traveled / total);
      point.forEach((value, axis) => expect(value).toBeCloseTo(corner[axis]));
      traveled += lengths[index] ?? 0;
    });
  });

  it("keeps a reverse packet on the same physical corridor as its persistent wire", () => {
    const positions = positionsFor("replicated");
    const wire = routeBetween(positions, "replicated", "a2", "b");
    const packet = routeBetween(positions, "replicated", "b", "a2");
    for (const progress of [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]) {
      const forward = pointOnRoute(wire, progress);
      const reverse = pointOnRoute(packet, 1 - progress);
      forward.forEach((coordinate, axis) =>
        expect(coordinate).toBeCloseTo(reverse[axis]),
      );
      expect(
        Math.min(
          ...wire
            .slice(1)
            .map((point, index) =>
              distanceToSegment(reverse, wire[index], point),
            ),
        ),
      ).toBeCloseTo(0);
    }
  });
});

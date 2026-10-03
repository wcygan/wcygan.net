import { describe, expect, it } from "vitest";
import { LAYOUTS, type Point, type SpatialNode } from "./layout";

const EPSILON = 1e-8;
const delta = (from: Point, to: Point): Point =>
  to.map((value, axis) => value - from[axis]) as Point;
const nonzeroAxes = (point: Point) =>
  point.flatMap((value, axis) => (Math.abs(value) > EPSILON ? [axis] : []));

/** Independent face test: one coordinate is on a face, the other two centered. */
function faceNormal(item: SpatialNode, point: Point): Point | null {
  const offset = delta(item.position, point);
  const axes = nonzeroAxes(offset);
  if (axes.length !== 1) return null;
  const axis = axes[0];
  if (Math.abs(Math.abs(offset[axis]) - item.size[axis] / 2) > EPSILON)
    return null;
  const normal: Point = [0, 0, 0];
  normal[axis] = Math.sign(offset[axis]);
  return normal;
}

function segmentCrossesInterior(from: Point, to: Point, item: SpatialNode) {
  const axes = nonzeroAxes(delta(from, to));
  if (axes.length !== 1) return false;
  const moving = axes[0];
  const fixed = [0, 1, 2].filter((axis) => axis !== moving);
  if (
    !fixed.every(
      (axis) =>
        Math.abs(from[axis] - item.position[axis]) <
        item.size[axis] / 2 - EPSILON,
    )
  )
    return false;
  const low = Math.min(from[moving], to[moving]);
  const high = Math.max(from[moving], to[moving]);
  return (
    high > item.position[moving] - item.size[moving] / 2 + EPSILON &&
    low < item.position[moving] + item.size[moving] / 2 - EPSILON
  );
}

function corners(position: Point, size: Point): Point[] {
  return [-1, 1].flatMap((x) =>
    [-1, 1].flatMap((y) =>
      [-1, 1].map(
        (z) =>
          [
            position[0] + (x * size[0]) / 2,
            position[1] + (y * size[1]) / 2,
            position[2] + (z * size[2]) / 2,
          ] as Point,
      ),
    ),
  );
}

/** Orthographic view basis derived independently from each camera pose. */
function viewProjection(point: Point, pose: Point): [number, number] {
  const distance = Math.hypot(...pose);
  const horizontal = Math.hypot(pose[0], pose[2]);
  const right: Point = [pose[2] / horizontal, 0, -pose[0] / horizontal];
  const up: Point = [
    (-pose[0] * pose[1]) / (distance * horizontal),
    horizontal / distance,
    (-pose[2] * pose[1]) / (distance * horizontal),
  ];
  const dot = (axis: Point) =>
    point.reduce((sum, value, index) => sum + value * axis[index], 0);
  return [dot(right), dot(up)];
}

describe("Temporal spatial route geometry", () => {
  for (const [kind, layout] of Object.entries(LAYOUTS)) {
    it(`${kind} attaches every orthogonal route to outward face-center stems`, () => {
      const nodes = new Map(layout.nodes.map((item) => [item.id, item]));
      expect(nodes.size).toBe(layout.nodes.length);
      expect(new Set(layout.routes.map((item) => item.id)).size).toBe(
        layout.routes.length,
      );
      for (const route of layout.routes) {
        const source = nodes.get(route.from);
        const destination = nodes.get(route.to);
        expect(source, `${route.id}: source exists`).toBeDefined();
        expect(destination, `${route.id}: destination exists`).toBeDefined();
        expect(route.points.length).toBeGreaterThanOrEqual(2);
        const sourceNormal = faceNormal(source!, route.points[0]);
        const destinationNormal = faceNormal(
          destination!,
          route.points.at(-1)!,
        );
        expect(sourceNormal, `${route.id}: source face center`).not.toBeNull();
        expect(
          destinationNormal,
          `${route.id}: destination face center`,
        ).not.toBeNull();
        const leaving = delta(route.points[0], route.points[1]);
        const arriving = delta(route.points.at(-1)!, route.points.at(-2)!);
        for (const [stem, normal] of [
          [leaving, sourceNormal!],
          [arriving, destinationNormal!],
        ] as const) {
          expect(nonzeroAxes(stem), `${route.id}: perpendicular stem`).toEqual(
            nonzeroAxes(normal),
          );
          expect(
            stem.reduce((sum, value, axis) => sum + value * normal[axis], 0),
          ).toBeGreaterThan(0);
        }
        for (let index = 1; index < route.points.length; index += 1) {
          const from = route.points[index - 1];
          const to = route.points[index];
          expect(
            nonzeroAxes(delta(from, to)),
            `${route.id}: right-angle lane`,
          ).toHaveLength(1);
          for (const item of [...layout.nodes, ...layout.regions]) {
            expect(
              segmentCrossesInterior(from, to, item),
              `${route.id}: lane ${index} clears ${item.id}`,
            ).toBe(false);
          }
        }
      }
    });
  }
});

describe("Temporal layout teaching contracts", () => {
  it("fits every initial camera's solid geometry and routes inside its framing bounds", () => {
    for (const [kind, layout] of Object.entries(LAYOUTS)) {
      const points = [
        ...[...layout.nodes, ...layout.regions].flatMap((item) =>
          corners(item.position, item.size),
        ),
        ...layout.routes.flatMap((item) => item.points),
      ];
      for (const point of points) {
        const [x, y] = viewProjection(point, layout.pose);
        expect(Math.abs(x), `${kind}: horizontal framing`).toBeLessThan(
          layout.worldWidth / 2 - 0.3,
        );
        expect(Math.abs(y), `${kind}: vertical framing`).toBeLessThan(
          layout.worldHeight / 2 - 0.3,
        );
      }
      const labels = [
        ...layout.nodes.filter((item) => item.shape !== "record"),
        ...layout.regions,
      ].filter((item) => item.label);
      expect(
        labels.length,
        `${kind}: bounded semantic label set`,
      ).toBeLessThanOrEqual(8);
    }
  });

  it("keeps Workflow Tasks separate from Activity delivery and acknowledgments", () => {
    const { nodes, routes } = LAYOUTS.tasks;
    expect(nodes.find((item) => item.id === "wfQueue")?.domain).toBe("service");
    expect(nodes.find((item) => item.id === "activityQueue")?.domain).toBe(
      "service",
    );
    expect(
      routes.filter((item) => item.from === "wfQueue" || item.to === "wfQueue"),
    ).toEqual([]);
    expect(
      routes
        .filter((item) => item.id.startsWith("task") || item.id === "replace")
        .map((item) => [item.from, item.to]),
    ).toEqual([
      ["activityQueue", "workerA"],
      ["activityQueue", "workerB"],
      ["activityQueue", "workerC"],
      ["activityQueue", "replacement"],
    ]);
    expect(
      routes
        .filter((item) => item.id.startsWith("ack"))
        .every((item) => item.to === "activityQueue"),
    ).toBe(true);
  });

  it("uses different delivery and reporting ports for the Service and worker", () => {
    const routes = new Map(
      LAYOUTS.architecture.routes.map((item) => [item.id, item]),
    );
    expect(routes.get("workflow")?.points[0]).not.toEqual(
      routes.get("activity")?.points[0],
    );
    expect(routes.get("workflow")?.points.at(-1)).not.toEqual(
      routes.get("activity")?.points.at(-1),
    );
    expect(routes.get("command")?.points[0]).not.toEqual(
      routes.get("report")?.points[0],
    );
    expect(routes.get("command")?.points.at(-1)).not.toEqual(
      routes.get("report")?.points.at(-1),
    );
  });

  it("retains an evenly spaced append-order prefix in both history scenes", () => {
    const scenes = [LAYOUTS.history, LAYOUTS.replay];
    const coordinates = scenes.map((layout) => {
      const records = layout.nodes.filter((item) => item.domain === "history");
      expect(records.map((item) => item.id)).toEqual([
        "record1",
        "record2",
        "record3",
        "record4",
        "record5",
        "record6",
      ]);
      expect(records.every((item) => item.shape === "record")).toBe(true);
      expect(records.map((item) => item.label)).toEqual([
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
      ]);
      for (let index = 1; index < records.length; index += 1) {
        expect(
          records[index].position[0] - records[index - 1].position[0],
        ).toBeCloseTo(1.3);
        expect(records[index].position.slice(1)).toEqual(
          records[0].position.slice(1),
        );
        expect(
          records[index].position[0] - records[index - 1].position[0],
        ).toBeGreaterThan(records[index].size[0]);
      }
      return records.map((item) => item.position[0]);
    });
    expect(coordinates[0]).toEqual(coordinates[1]);
    expect(LAYOUTS.history.routes.map((item) => item.to)).toEqual([
      "record1",
      "record2",
      "record3",
      "record4",
      "record5",
      "record6",
    ]);
    expect(
      LAYOUTS.history.routes.find((item) => item.id === "append5"),
    ).toMatchObject({ from: "timerService", to: "record5" });
    expect(
      LAYOUTS.history.routes
        .filter((item) => item.id !== "append5")
        .every((item) => item.from === "memory"),
    ).toBe(true);
  });

  it("replays recorded history into the new worker rather than calling inventory", () => {
    const routes = new Map(
      LAYOUTS.replay.routes.map((item) => [item.id, item]),
    );
    expect(routes.get("reuse")).toMatchObject({
      from: "record3",
      to: "newWorker",
    });
    expect(routes.get("reserve")).toMatchObject({
      from: "oldWorker",
      to: "inventory",
    });
    expect(routes.get("schedule")).toMatchObject({
      from: "newWorker",
      to: "record4",
    });
    expect(routes.get("charge")).toMatchObject({
      from: "newWorker",
      to: "payment",
    });
    expect(
      LAYOUTS.replay.routes.some(
        (item) => item.from === "newWorker" && item.to === "inventory",
      ),
    ).toBe(false);
  });

  it("joins two spatially distinct branches before fulfillment", () => {
    const nodes = new Map(
      LAYOUTS.parallel.nodes.map((item) => [item.id, item]),
    );
    expect(nodes.get("inventory")!.position[2]).toBeLessThan(0);
    expect(nodes.get("risk")!.position[2]).toBeGreaterThan(0);
    expect(nodes.get("join")?.shape).toBe("gate");
    expect(
      LAYOUTS.parallel.routes.find((item) => item.id === "begin"),
    ).toMatchObject({ from: "orchestrator", to: "fork" });
    expect(
      LAYOUTS.parallel.routes
        .filter((item) => item.to === "join")
        .map((item) => item.from),
    ).toEqual(["inventory", "risk"]);
    expect(
      LAYOUTS.parallel.routes.find((item) => item.id === "fulfill"),
    ).toMatchObject({ from: "join", to: "fulfill" });
  });

  it("places compensating operations on a new lower rear path with manual failure recovery", () => {
    const nodes = new Map(
      LAYOUTS.compensation.nodes.map((item) => [item.id, item]),
    );
    for (const id of ["refund", "release"]) {
      expect(nodes.get(id)!.position[1]).toBeLessThan(
        nodes.get("reserve")!.position[1],
      );
      expect(nodes.get(id)!.position[2]).toBeLessThan(
        nodes.get("reserve")!.position[2],
      );
    }
    expect(
      LAYOUTS.compensation.routes.find((item) => item.id === "manual"),
    ).toMatchObject({ from: "refund", to: "manual" });
    expect(
      LAYOUTS.compensation.regions.find((item) => item.id === "manual-recovery")
        ?.tone,
    ).toBe("red");
  });

  it("keeps forward and compensating silhouettes separate in the initial view", () => {
    const layout = LAYOUTS.compensation;
    const nodes = new Map(layout.nodes.map((item) => [item.id, item]));
    const bounds = (item: SpatialNode) => {
      const points = corners(item.position, item.size).map((point) =>
        viewProjection(point, layout.pose),
      );
      return {
        left: Math.min(...points.map(([x]) => x)),
        right: Math.max(...points.map(([x]) => x)),
        bottom: Math.min(...points.map(([, y]) => y)),
        top: Math.max(...points.map(([, y]) => y)),
      };
    };
    for (const forwardId of ["reserve", "charge", "ship"]) {
      for (const compensationId of ["refund", "release", "manual"]) {
        const forward = bounds(nodes.get(forwardId)!);
        const compensation = bounds(nodes.get(compensationId)!);
        const gap = 0.1;
        expect(
          forward.right + gap < compensation.left ||
            compensation.right + gap < forward.left ||
            forward.top + gap < compensation.bottom ||
            compensation.top + gap < forward.bottom,
          `${forwardId} and ${compensationId}: separated projected silhouettes`,
        ).toBe(true);
      }
    }
  });
});

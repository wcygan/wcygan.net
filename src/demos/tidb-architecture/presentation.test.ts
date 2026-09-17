import { describe, expect, it } from "vitest";
import {
  INITIAL_OPERATION,
  REGIONS,
  operationSteps,
  stepParticipants,
} from "./model";
import { inspectionDetails, sceneLabels } from "./presentation";
import { overlaps, placeLabels, type LabelRequest } from "./label-layout";

describe("progressive scene labels", () => {
  it.each(["follower-caught-up", "follower-lagging"] as const)(
    "anchors %s read checks to the participating replica",
    (readMode) => {
      for (const region of REGIONS) {
        const operation = {
          ...INITIAL_OPERATION,
          readMode,
          userId: region.start,
        };
        const steps = operationSteps(operation);
        for (const [index, current] of steps.entries()) {
          if (index === 0 || current.id === "complete") continue;
          const labels = sceneLabels(operation, index);
          const stores = labels.filter((l) => l.id.startsWith("TiKV"));
          expect(stores.map((l) => l.id).sort()).toEqual(
            [...stepParticipants(current)]
              .filter((id) => id.startsWith("TiKV"))
              .sort(),
          );
          const callouts = labels.filter((l) => l.readState);
          expect(callouts).toHaveLength(current.readSafety ? 1 : 0);
          if (current.readSafety) {
            expect(callouts[0].anchor.id).toBe(current.readSafety.nodeId);
            expect(callouts[0].detail).toContain(
              current.readSafety.nodeId === region.leader
                ? "Leader"
                : "Follower",
            );
            if (current.readSafety.state === "waiting")
              expect(callouts[0].explanation).toContain("read blocked");
          }
        }
      }
    },
  );
  it("keeps idle and completed views to four group labels", () => {
    for (const step of [0, operationSteps(INITIAL_OPERATION).length - 1]) {
      expect(
        sceneLabels(INITIAL_OPERATION, step).map((label) => label.title),
      ).toEqual(["Application", "SQL", "Storage · 9 nodes", "PD"]);
    }
  });
  it.each(["read", "update"] as const)(
    "labels only the selected %s replica group, with one leader",
    (kind) => {
      for (const region of REGIONS) {
        const operation = { ...INITIAL_OPERATION, kind, userId: region.start };
        for (
          let step = 1;
          step < operationSteps(operation).length - 1;
          step++
        ) {
          const labels = sceneLabels(operation, step);
          const regionLabels = labels.filter(
            (l) => l.title.includes(region.id) || l.detail?.includes(region.id),
          );
          const current = operationSteps(operation)[step];
          const visibleReplicas = region.replicas.filter(
            (r) => kind === "update" || stepParticipants(current).has(r.nodeId),
          );
          expect(regionLabels).toHaveLength(visibleReplicas.length);
          expect(
            regionLabels.filter((l) =>
              `${l.title} ${l.detail}`.includes("Leader"),
            ),
          ).toHaveLength(visibleReplicas.filter((r) => r.leader).length);
          expect(regionLabels.map((l) => l.anchor.id).sort()).toEqual(
            visibleReplicas.map((r) => r.nodeId).sort(),
          );
          expect(labels.some((l) => l.title === "SQL 2")).toBe(true);
          expect(labels.some((l) => l.id === "PD 1")).toBe(step === 2);
        }
      }
    },
  );
  it("names followers during replication but keeps them quiet during a read", () => {
    const read = sceneLabels(INITIAL_OPERATION, 3);
    expect(read.find((l) => l.id === "TiKV 7")).toMatchObject({
      title: "TiKV 7",
      detail: "R3 · Leader",
    });
    expect(read.find((l) => l.id === "TiKV 3")).toBeUndefined();
    const update = sceneLabels({ ...INITIAL_OPERATION, kind: "update" }, 4);
    expect(update.find((l) => l.id === "TiKV 3")).toMatchObject({
      title: "TiKV 3",
      detail: "R3",
    });
  });
  it("puts node roles and coordination explanations in the information panel", () => {
    expect(
      inspectionDetails({ kind: "node", id: "TiKV 7" }).description,
    ).toContain("R3 (users 401–600): leader");
    expect(
      inspectionDetails({ kind: "connection", id: "metadata" }).description,
    ).toContain("cache locations");
    expect(
      inspectionDetails({ kind: "connection", id: "scheduling" }).description,
    ).toContain("heartbeats");
  });
  it("keeps the lagging follower identifiable through the response, retry, and recovery", () => {
    for (const region of REGIONS) {
      const operation = {
        ...INITIAL_OPERATION,
        kind: "update" as const,
        dropFollowerMessage: true,
        userId: region.start,
      };
      for (const [step, current] of operationSteps(operation).entries()) {
        const labels = sceneLabels(operation, step);
        const follower = labels.find((l) => l.followerStatus);
        if (!current.follower || current.id === "complete") {
          expect(follower).toBeUndefined();
          continue;
        }
        expect(follower).toMatchObject({
          title: current.follower.nodeId,
          anchor: { kind: "node", id: current.follower.nodeId },
          followerStatus: current.follower.status,
        });
        expect(follower!.priority).toBeGreaterThan(90);
        expect(follower!.detail).toContain(region.id);
        expect(follower!.detail).toContain(
          current.follower.status === "behind"
            ? "Behind"
            : current.follower.status === "retrying"
              ? "Retrying"
              : current.follower.status === "applying"
                ? "Applying"
                : "Caught up",
        );
      }
    }
  });
  it("anchors the majority rule to each write leader only while replicating or gathering ACKs", () => {
    for (const region of REGIONS) {
      for (const kind of ["read", "update"] as const) {
        const operation = { ...INITIAL_OPERATION, kind, userId: region.start };
        for (const [step, current] of operationSteps(operation).entries()) {
          const callouts = sceneLabels(operation, step).filter(
            (label) => label.explanation,
          );
          if (
            kind === "update" &&
            ["replicate", "majority"].includes(current.id)
          ) {
            expect(callouts).toHaveLength(1);
            expect(callouts[0]).toMatchObject({
              anchor: { kind: "node", id: region.leader },
              detail: `${region.id} · Leader`,
            });
            expect(callouts[0].explanation).toBe(
              "Waits for 2 follower ACKs.\nLeader + 2 = 3/5 majority\nto commit the Raft entry.",
            );
          } else if (current.applying) {
            expect(callouts).toHaveLength(1);
            expect(callouts[0].anchor.id).toBe(current.applying);
          } else if (current.readSafety) {
            expect(callouts).toHaveLength(1);
            expect(callouts[0].anchor.id).toBe(current.readSafety.nodeId);
          } else expect(callouts).toHaveLength(0);
        }
      }
    }
  });
});

describe("screen-space label placement", () => {
  const request = (id: string, priority: number): LabelRequest => ({
    id,
    priority,
    width: 60,
    height: 20,
    anchor: { x: 80, y: 40, width: 40, height: 40 },
    avoid: [],
  });
  it("keeps labels outside silhouettes and chooses another side when the preferred position is occupied", () => {
    const first = request("first", 10),
      second = request("second", 20);
    const result = placeLabels([first, second], { width: 200, height: 150 });
    expect(result.size).toBe(2);
    expect(result.get("second")!.y).toBeLessThan(second.anchor.y);
    expect(overlaps(result.get("first")!, result.get("second")!, 6)).toBe(
      false,
    );
    for (const rect of result.values())
      expect(overlaps(rect, first.anchor)).toBe(false);
  });
  it("hides lower-priority labels when only one position fits, regardless of input order", () => {
    const low = request("low", 10),
      leader = request("leader", 100);
    const viewport = { width: 200, height: 86 };
    // Block side positions and leave only the space above the silhouette.
    const obstacles = [
      { x: 0, y: 37, width: 79, height: 48 },
      { x: 121, y: 37, width: 79, height: 48 },
    ];
    low.avoid = leader.avoid = obstacles;
    expect([...placeLabels([low, leader], viewport).keys()]).toEqual([
      "leader",
    ]);
    expect([...placeLabels([leader, low], viewport).keys()]).toEqual([
      "leader",
    ]);
  });
  it("suppresses labels for off-screen anchors rather than pinning misleading text to the viewport edge", () => {
    const item = request("clipped", 100);
    item.anchor.x = -80;
    expect(placeLabels([item], { width: 200, height: 150 }).size).toBe(0);
  });
  it("finds clear space for a leader callout beyond a crowded row of nodes", () => {
    const item: LabelRequest = {
      ...request("leader", 100),
      width: 164,
      height: 100,
      anchor: { x: 100, y: 230, width: 48, height: 70 },
      avoid: [{ x: 20, y: 150, width: 280, height: 210 }],
      callout: true,
    };
    expect(
      placeLabels([{ ...item, callout: false }], { width: 342, height: 520 })
        .size,
    ).toBe(0);
    const placed = placeLabels([item], { width: 342, height: 520 }).get(
      "leader",
    )!;
    expect(placed).toBeDefined();
    expect(overlaps(placed, item.avoid[0], 3)).toBe(false);
    expect(placed.x).toBeGreaterThanOrEqual(8);
    expect(placed.x + placed.width).toBeLessThanOrEqual(334);
  });
  it("uses the viewport edge when a callout only just fits beside a silhouette", () => {
    const item: LabelRequest = {
      ...request("leader", 100),
      width: 90,
      height: 40,
      anchor: { x: 40, y: 80, width: 40, height: 40 },
      avoid: [{ x: 0, y: 0, width: 99, height: 200 }],
      callout: true,
    };
    const placed = placeLabels([item], { width: 200, height: 200 }).get(
      "leader",
    )!;
    expect(placed.x).toBe(102);
    expect(overlaps(placed, item.avoid[0], 3)).toBe(false);
  });
  it("keeps a zoomed callout clear of the active nodes when only inactive geometry can be covered", () => {
    const item: LabelRequest = {
      ...request("leader", 100),
      avoid: [{ x: 0, y: 0, width: 200, height: 150 }],
      fallbackAvoid: [request("leader", 100).anchor],
      callout: true,
    };
    const placed = placeLabels([item], { width: 200, height: 150 }).get(
      "leader",
    )!;
    expect(placed).toBeDefined();
    expect(overlaps(placed, item.anchor, 3)).toBe(false);
  });
  it("fits an operation label beside a higher-priority callout within its node", () => {
    const leader: LabelRequest = {
      id: "leader",
      priority: 100,
      width: 70,
      height: 35,
      anchor: { x: 0, y: 90, width: 96, height: 50 },
      avoid: [],
    };
    const follower: LabelRequest = {
      id: "follower",
      priority: 80,
      width: 48,
      height: 35,
      anchor: { x: 83, y: 40, width: 54, height: 60 },
      allowInside: true,
      avoid: [
        { x: 0, y: 0, width: 200, height: 39 },
        { x: 0, y: 101, width: 200, height: 49 },
        { x: 141, y: 40, width: 59, height: 60 },
      ],
    };
    const placed = placeLabels([follower, leader], { width: 200, height: 150 });
    expect(placed.size).toBe(2);
    expect(overlaps(placed.get("leader")!, placed.get("follower")!, 6)).toBe(
      false,
    );
    expect(placed.get("follower")!.x).toBe(89);
  });
});

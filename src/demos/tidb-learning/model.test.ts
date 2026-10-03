import { describe, expect, it } from "vitest";
import {
  AMOUNTS,
  LESSONS,
  quorum,
  regionRanges,
  scaling,
  visibleVersion,
} from "./model";
import {
  boxFaces,
  facingPort,
  projector,
  visibleSegments,
  type Point,
  type Solid,
} from "./geometry";
import { scene } from "./scene";

describe("TiDB introductory lessons", () => {
  it("splits without gaps, overlaps, lost keys, or duplicate key ownership", () => {
    for (const phase of [0, 1, 2]) {
      const ranges = regionRanges(phase);
      expect(ranges[0].start).toBe(0);
      expect(ranges.at(-1)?.end).toBe(100);
      ranges
        .slice(1)
        .forEach((range, i) => expect(range.start).toBe(ranges[i].end));
      for (let key = 0; key < 100; key++)
        expect(
          ranges.filter((r) => r.start <= key && key < r.end),
        ).toHaveLength(1);
    }
    expect(regionRanges(2).find((r) => r.id === "A2")?.store).toBe(3);
  });
  it("needs a majority of actual replicated copies and excludes unavailable voters", () => {
    for (const unavailable of [0, 1, 2]) {
      expect(quorum(1, unavailable).committed).toBe(false);
      expect(quorum(1, unavailable).copies).toBe(1);
      expect(quorum(3, unavailable).copies).toBe(3 - unavailable);
      expect(quorum(3, unavailable).committed).toBe(unavailable < 2);
    }
  });
  it("keeps exactly three copies per Region while adding resources independently", () => {
    for (const phase of [0, 1, 2, 3]) {
      const state = scaling(phase);
      for (const region of ["A", "B", "C"])
        expect(state.stores.filter((s) => s.includes(region))).toHaveLength(3);
      expect(state.compute).toBe(phase === 0 ? 2 : 3);
    }
    expect(scaling(2).stores[3]).toEqual([]);
    expect(scaling(3).stores[3]).toEqual(["A", "B", "C"]);
  });
  it("chooses the latest committed version at or before the read timestamp", () => {
    expect(visibleVersion(59)).toBeUndefined();
    expect(visibleVersion(80)?.name).toBe("Lin");
    expect(visibleVersion(120)?.name).toBe("Will");
    expect(visibleVersion(140)?.name).toBe("William");
    expect(visibleVersion(160)?.name).toBe("William");
  });
  it("visualizes both logical lookup phases and the amount column without changing the data", () => {
    const index = scene("index", 3, 0, false);
    expect(
      index.solids.filter((s) => s.tone === "orange").map((s) => s.id),
    ).toEqual(["entry-0-2", "entry-1-1"]);
    const columns = scene("tiflash", 3, 0, false);
    expect(
      columns.solids.filter((s) => s.id.startsWith("value-")),
    ).toHaveLength(24);
    expect(columns.solids.filter((s) => s.tone === "orange")).toHaveLength(4);
    expect(AMOUNTS.reduce((sum, n) => sum + n, 0)).toBe(44);
  });
  it("has ten bounded lessons, split evenly between direct sequences and spatial explanations", () => {
    const lessons = Object.values(LESSONS);
    expect(lessons).toHaveLength(10);
    expect(lessons.filter((l) => l.dimension === "2d")).toHaveLength(5);
    expect(lessons.filter((l) => l.dimension === "3d")).toHaveLength(5);
    expect(
      lessons.every((l) => l.beats.length >= 3 && l.beats.length <= 5),
    ).toBe(true);
  });
});

describe("shared 3D coordinate and visibility rules", () => {
  it("connects actual face centers, rather than independently guessed screen locations", () => {
    const a: Solid = {
      id: "a",
      center: [-3, 1, 0],
      size: [2, 2, 2],
      tone: "blue",
    };
    const b: Solid = { ...a, id: "b", center: [3, 1, 0] };
    expect(facingPort(a, b)).toEqual([-2, 1, 0]);
    expect(facingPort(b, a)).toEqual([2, 1, 0]);
    expect(boxFaces(a, 0)[0].vertices).toContainEqual([-2, 2, 1]);
  });
  it("clips a line behind a nearer face and preserves it in front of that face", () => {
    const a: Point = { x: -2, y: 0, depth: 0 },
      b: Point = { x: 2, y: 0, depth: 0 };
    const face = [
      { x: -1, y: -1, depth: 1 },
      { x: 1, y: -1, depth: 1 },
      { x: 1, y: 1, depth: 1 },
      { x: -1, y: 1, depth: 1 },
    ];
    expect(visibleSegments(a, b, [face])).toEqual([
      [0, 0.25],
      [0.75, 1],
    ]);
    expect(
      visibleSegments({ ...a, depth: 2 }, { ...b, depth: 2 }, [face]),
    ).toEqual([[0, 1]]);
  });
  it("projects model positions and ports consistently through a full orbit", () => {
    for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2]) {
      const project = projector(342, 480, angle, 1.02, 1, [12, 4, 11]);
      const a = project([0, 1, 0]),
        b = project([0, 1, 0]);
      expect(a).toEqual(b);
      expect([a.x, a.y, a.depth].every(Number.isFinite)).toBe(true);
    }
  });
});

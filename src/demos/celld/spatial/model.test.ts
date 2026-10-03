import { describe, expect, it } from "vitest";
import {
  CHANGED_PAGES,
  DATABASE_PAGES,
  fleetSnapshot,
  nextPageStep,
  pageChangeSnapshot,
} from "./model";

describe("the celld placement illustration", () => {
  it("adds capacity without cloning or silently transferring serving cells", () => {
    const before = fleetSnapshot("two-nodes");
    const added = fleetSnapshot("third-node");
    expect(added.nodes.map((node) => node.id)).toEqual(["A", "B", "C"]);
    expect(added.cells.map(({ name, owner }) => ({ name, owner }))).toEqual(
      before.cells.map(({ name, owner }) => ({ name, owner })),
    );
    expect(new Set(added.cells.map((cell) => cell.name)).size).toBe(6);
  });

  it("moves only the selected hibernated cell while preserving its identity", () => {
    const before = fleetSnapshot("third-node");
    const after = fleetSnapshot("handoff");
    expect(after.cells.map((cell) => cell.name)).toEqual(
      before.cells.map((cell) => cell.name),
    );
    const moved = after.cells.filter(
      (cell, index) => cell.owner !== before.cells[index].owner,
    );
    expect(
      moved.map(({ name, owner, hibernated }) => ({ name, owner, hibernated })),
    ).toEqual([{ name: "room:blue", owner: "C", hibernated: true }]);
    for (const cell of after.cells) {
      expect(after.nodes.some((node) => node.id === cell.owner)).toBe(true);
    }
  });
});

describe("the committed-page illustration", () => {
  it("replicates only changed pages in the illustrated LTX payload", () => {
    expect(CHANGED_PAGES.every((page) => DATABASE_PAGES.includes(page))).toBe(
      true,
    );
    expect(CHANGED_PAGES.length).toBeLessThan(DATABASE_PAGES.length);
    expect(new Set(CHANGED_PAGES).size).toBe(CHANGED_PAGES.length);
  });

  it("captures only the new images after the commit, with baseline pages unchanged", () => {
    expect(pageChangeSnapshot(0).ltxPageImages).toEqual([]);
    expect(pageChangeSnapshot(1).ltxPageImages).toEqual([]);
    const captured = pageChangeSnapshot(2);
    expect(
      captured.ltxPageImages.map(({ id, image }) => ({ id, image })),
    ).toEqual([
      { id: 2, image: 2 },
      { id: 5, image: 2 },
    ]);
    expect(
      captured.pages.filter((page) => !page.changed).map((page) => page.image),
    ).toEqual([1, 1, 1, 1]);
    expect(nextPageStep(0)).toBe(1);
    expect(nextPageStep(1)).toBe(2);
    expect(nextPageStep(2)).toBe(2);
  });
});

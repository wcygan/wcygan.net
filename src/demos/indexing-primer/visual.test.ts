import { describe, expect, it } from "vitest";
import { lessons } from "./model";
import { visual, WIDTH, type Entry, type TreeGroup } from "./visual";

const leaves = (group: TreeGroup) =>
  group.pages.filter((page) => page.kind === "leaf");
const entries = (group: TreeGroup): Entry[] =>
  leaves(group).flatMap((page) => page.entries);
const primaryKeys = (group: TreeGroup) =>
  entries(group).map((entry) => Number(entry.key));

describe("indexing tree visuals", () => {
  it("keeps every state connected, visible, and within its stage", () => {
    for (const lesson of lessons)
      for (let step = 0; step < lesson.stepCount; step++) {
        const result = visual(lesson.id, step);
        const pages = result.groups.flatMap((group) => group.pages);
        const ids = pages.map((page) => page.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(result.query).not.toBe("");
        expect(result.height).toBe(
          lesson.id === "secondary" || lesson.id === "cover" ? 556 : 286,
        );
        for (const page of pages) {
          expect(page.height).toBe(page.kind === "branch" ? 56 : 134);
          expect(page.x - page.width / 2).toBeGreaterThanOrEqual(0);
          expect(page.x + page.width / 2).toBeLessThanOrEqual(WIDTH);
          expect(page.y - page.height / 2).toBeGreaterThanOrEqual(0);
          expect(page.y + page.height / 2).toBeLessThan(result.height);
          expect(page.entries.length).toBeLessThanOrEqual(3);
        }
        for (const group of result.groups) {
          const root = group.pages.find((page) => page.kind === "branch")!;
          for (const leaf of leaves(group))
            expect(leaf.y - leaf.height / 2 - (root.y + root.height / 2)).toBe(
              40,
            );
        }
        for (const link of result.groups.flatMap((group) => group.links)) {
          expect(ids).toContain(link.from);
          expect(ids).toContain(link.to);
        }
      }
  });

  it("uses valid routing separators and a sorted, linked primary leaf chain", () => {
    const index = visual("tree", 2).groups[0];
    expect(index.pages[0].entries.map((entry) => entry.key)).toEqual([
      "4",
      "7",
    ]);
    expect(primaryKeys(index)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const pages = leaves(index);
    for (let i = 1; i < pages.length; i++) {
      const separator = Number(index.pages[0].entries[i - 1].key);
      expect(
        Math.max(...pages[i - 1].entries.map((entry) => Number(entry.key))),
      ).toBeLessThan(separator);
      expect(
        Math.min(...pages[i].entries.map((entry) => Number(entry.key))),
      ).toBe(separator);
    }
    expect(
      index.links
        .filter((link) => link.kind === "leaf")
        .map(({ from, to }) => [from, to]),
    ).toEqual([
      ["primary-leaf-1", "primary-leaf-2"],
      ["primary-leaf-2", "primary-leaf-3"],
    ]);
    expect(
      index.links
        .filter((link) => link.kind === "branch" && link.active)
        .map((link) => link.to),
    ).toEqual(["primary-leaf-3"]);
  });

  it("distinguishes checking a record from finding a match", () => {
    const scan = entries(visual("scan", 3).groups[0]);
    expect(scan.filter((entry) => entry.state === "checked")).toHaveLength(8);
    expect(
      scan.filter((entry) => entry.state === "found").map((entry) => entry.key),
    ).toEqual(["09"]);
    expect(
      visual("scan", 3).groups[0].links.filter(
        (link) => link.kind === "branch" && link.active,
      ),
    ).toHaveLength(0);
  });

  it("shows name entries in sorted order with the correct implicit primary keys", () => {
    const result = visual("secondary", 2);
    expect(result.groups[0].pages[0].entries.map((entry) => entry.key)).toEqual(
      ["Leo", "Noah"],
    );
    expect(
      entries(result.groups[0]).map(({ key, value }) => [key, value]),
    ).toEqual([
      ["Ava", "→ 2"],
      ["Emma", "→ 4"],
      ["Isla", "→ 8"],
      ["Leo", "→ 7"],
      ["Liam", "→ 1"],
      ["Mia", "→ 6"],
      ["Noah", "→ 3"],
      ["Oliver", "→ 5"],
      ["Zoe", "→ 9"],
    ]);
    expect(
      result.groups[0].links.find((link) => link.kind === "handoff")?.active,
    ).toBe(true);
    expect(
      entries(result.groups[1]).find((entry) => entry.state === "found"),
    ).toMatchObject({ key: "09", value: "Zoe" });
    expect(
      visual("cover", 2)
        .groups.flatMap((group) => group.links)
        .filter((link) => link.kind === "handoff"),
    ).toHaveLength(0);
  });

  it("makes a leading city contiguous and a name-only search span both city groups", () => {
    const city = visual("compound", 1).groups[0];
    expect(city.pages[0].entries.map((entry) => entry.key)).toEqual(["Boston"]);
    expect(leaves(city).map((page) => page.title)).toEqual([
      "Austin",
      "Boston",
    ]);
    expect(
      leaves(city)[0].entries.filter((entry) => entry.state === "found"),
    ).toHaveLength(3);
    expect(
      leaves(city)[1].entries.filter((entry) => entry.state === "found"),
    ).toHaveLength(0);
    expect(
      leaves(visual("compound", 2).groups[0]).map((page) =>
        page.entries
          .filter((entry) => entry.state === "found")
          .map((entry) => entry.key),
      ),
    ).toEqual([["Zoe"], ["Zoe"]]);
  });

  it("adds one relevant entry to each maintained index", () => {
    const result = visual("writes", 2);
    expect(result.groups).toHaveLength(3);
    expect(
      result.groups.map((group) =>
        entries(group)
          .filter((entry) => entry.state === "new")
          .map(({ key, value }) => [key, value]),
      ),
    ).toEqual([[["09", "Zoe"]], [["Zoe", "→ 9"]], [["Boston", "→ 9"]]]);
  });
});

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
      for (let step = 0; step < lesson.steps.length; step++) {
        const result = visual(lesson.id, step);
        const pages = result.groups.flatMap((group) => group.pages);
        const ids = pages.map((page) => page.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(result.query).not.toBe("");
        expect(result.takeaway).not.toBe("");
        for (const page of pages) {
          expect(page.x - page.width / 2).toBeGreaterThanOrEqual(0);
          expect(page.x + page.width / 2).toBeLessThanOrEqual(WIDTH);
          expect(page.y - page.height / 2).toBeGreaterThanOrEqual(0);
          expect(page.y + page.height / 2).toBeLessThan(result.height);
          expect(page.entries.length).toBeLessThanOrEqual(3);
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

  it("inserts into only the destination leaf and preserves all existing records", () => {
    expect(primaryKeys(visual("insert", 1).groups[0])).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    const after = visual("insert", 2).groups[0];
    expect(primaryKeys(after)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(
      entries(after)
        .filter((entry) => entry.state === "new")
        .map((entry) => entry.key),
    ).toEqual(["09"]);
    expect(
      after.links.filter((link) => link.active).map((link) => link.to),
    ).toEqual(["primary-leaf-3"]);
  });

  it("splits without dropping entries and installs the right leaf's minimum key", () => {
    const after = visual("split", 2).groups[0];
    expect(primaryKeys(after)).toEqual([6, 7, 8, 9]);
    expect(
      leaves(after).map((page) =>
        page.entries.map((entry) => Number(entry.key)),
      ),
    ).toEqual([
      [6, 7],
      [8, 9],
    ]);
    expect(after.pages[0].entries.map((entry) => entry.key)).toEqual(["8"]);
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

  it("returns only the requested range while walking from one leaf to the next", () => {
    const range = visual("range", 3).groups[0];
    expect(
      entries(range)
        .filter((entry) => entry.state === "found")
        .map((entry) => Number(entry.key)),
    ).toEqual([4, 5, 6, 7, 8]);
    expect(entries(range).find((entry) => entry.key === "09")?.state).toBe(
      "muted",
    );
    expect(
      range.links
        .filter((link) => link.kind === "branch" && link.active)
        .map((link) => link.to),
    ).toEqual(["primary-leaf-2"]);
    expect(
      range.links
        .filter((link) => link.kind === "leaf" && link.active)
        .map((link) => link.to),
    ).toEqual(["primary-leaf-3"]);
  });

  it("makes a leading city contiguous and a name-only search span both city groups", () => {
    const city = visual("compound", 1).groups[0];
    expect(city.pages[0].entries.map((entry) => entry.key)).toEqual(["Boston"]);
    expect(leaves(city).map((page) => page.title)).toEqual([
      "CITY · AUSTIN",
      "CITY · BOSTON",
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

  it("makes the selective and broad filters' actual match counts inspectable", () => {
    expect(
      entries(visual("selectivity", 1).groups[0]).filter(
        (entry) => entry.state === "found",
      ),
    ).toHaveLength(1);
    const broad = entries(visual("selectivity", 2).groups[0]);
    expect(broad.filter((entry) => entry.state === "found")).toHaveLength(8);
    expect(broad.filter((entry) => entry.value === "no")).toHaveLength(1);
    expect(broad.filter((entry) => entry.value === "yes")).toHaveLength(8);
    expect(visual("selectivity", 2).groups[0].title).toBe(
      "PRIMARY INDEX · ID + ACTIVE",
    );
    expect(primaryKeys(visual("selectivity", 2).groups[0])).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
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

  it("preserves the secondary reference when the primary record moves after a page split", () => {
    const before = visual("stable", 0);
    const after = visual("stable", 2);
    expect(
      entries(before.groups[0]).map(({ key, value }) => [key, value]),
    ).toEqual(entries(after.groups[0]).map(({ key, value }) => [key, value]));
    expect(primaryKeys(before.groups[1])).toEqual([7, 8, 9]);
    expect(primaryKeys(after.groups[1])).toEqual([7, 8, 9]);
    expect(
      leaves(before.groups[1]).find((page) =>
        page.entries.some((entry) => entry.key === "09"),
      )?.id,
    ).toBe("primary-leaf-1");
    expect(
      leaves(after.groups[1]).find((page) =>
        page.entries.some((entry) => entry.key === "09"),
      )?.id,
    ).toBe("primary-leaf-2");
    expect(after.groups[1].pages[0].entries.map((entry) => entry.key)).toEqual([
      "9",
    ]);
    expect(after.height).toBe(560);
  });
});

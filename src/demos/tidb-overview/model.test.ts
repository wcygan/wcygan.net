import { describe, expect, it } from "vitest";
import { REGION_LAYOUTS } from "./model";

describe("illustrative TiKV Region layouts", () => {
  for (const layout of REGION_LAYOUTS) {
    it(`${layout.id} preserves an ordered key space and three Raft peers`, () => {
      expect(layout.regions[0].start).toBe(0);
      expect(layout.regions.at(-1)?.end).toBe(100);
      for (const [index, region] of layout.regions.entries()) {
        expect(region.end).toBeGreaterThan(region.start);
        if (index > 0) expect(region.start).toBe(layout.regions[index - 1].end);
        expect(new Set(region.stores).size).toBe(3);
        expect(region.stores).toContain(region.leader);
        for (const store of region.stores)
          expect(layout.stores).toContain(store);
      }
    });
  }

  it("adds capacity without turning a new store into a complete replica", () => {
    const added = REGION_LAYOUTS.find((layout) => layout.id === "placed")!;
    expect(added.stores).toContain(4);
    const onNewStore = added.regions.filter((region) =>
      region.stores.includes(4),
    );
    expect(onNewStore.length).toBeGreaterThan(0);
    expect(onNewStore.length).toBeLessThan(added.regions.length);
    expect(
      new Set(added.regions.map((region) => region.leader)).size,
    ).toBeGreaterThan(1);
  });
});

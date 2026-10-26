import { describe, expect, it } from "vitest";
import { linkPoints, routePrefix } from "./geometry";
import { visual } from "./visual";

describe("index lookup routes", () => {
  it("connects each child to a distinct ordered port on the branch page", () => {
    const state = visual("tree", 0);
    const links = state.groups[0].links.filter(
      (link) => link.kind === "branch",
    );
    const routes = links.map((link) => linkPoints(state, link, 640));
    const ports = routes.map((route) => route[0].x);
    expect(new Set(ports).size).toBe(3);
    expect(ports).toEqual([...ports].sort((a, b) => a - b));
    for (const [index, route] of routes.entries()) {
      const leaf = state.groups[0].pages[index + 1];
      expect(route.at(-1)).toEqual({ x: leaf.x, y: leaf.y - leaf.height / 2 });
    }
  });

  it("moves along cumulative path distance through corners and in reverse", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 200, y: 100 },
    ];
    expect(routePrefix(points, 0).at(-1)).toEqual(points[0]);
    expect(routePrefix(points, 0.5)).toEqual([
      points[0],
      points[1],
      { x: 50, y: 100 },
    ]);
    expect(routePrefix(points, 1)).toEqual(points);
    expect(routePrefix([...points].reverse(), 0.5).at(-1)).toEqual({
      x: 50,
      y: 100,
    });
  });

  it("keeps cross-index handoffs attached to page boundaries at both reading widths", () => {
    const state = visual("secondary", 2);
    const link = state.groups[0].links.find(
      (candidate) => candidate.kind === "handoff",
    )!;
    for (const width of [318, 610]) {
      const route = linkPoints(state, link, width);
      expect(route[0]).toEqual({ x: (528 * width) / 640, y: 262 });
      expect(route.at(-1)).toEqual({ x: (402 * width) / 640, y: 330 });
    }
  });
});

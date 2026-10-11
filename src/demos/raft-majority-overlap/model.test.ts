import { expect, it } from "vitest";
import { majorities, overlapRound } from "./model";
import { serverPositions } from "./layout";
import { servers } from "../raft-election-overview/model";

it("visits all ten distinct three-server majorities", () => {
  expect(majorities).toHaveLength(10);
  expect(new Set(majorities.map((group) => group.join(""))).size).toBe(10);
  for (const group of majorities) {
    expect(new Set(group).size).toBe(3);
    expect(group.every((server) => servers.includes(server))).toBe(true);
  }
});

it("every pair of majorities overlaps, including pairs not adjacent in playback", () => {
  for (let index = 0; index < majorities.length; index++) {
    for (const other of majorities.slice(index + 1)) {
      expect(
        majorities[index].some((server) =>
          (other as readonly string[]).includes(server),
        ),
      ).toBe(true);
    }
    const round = overlapRound(index);
    expect(round.shared.length).toBeGreaterThan(0);
    expect(round.shared).toEqual(
      round.current.filter((server) => round.previous.includes(server)),
    );
    expect(round.previous).toEqual(
      overlapRound((index + majorities.length - 1) % majorities.length).current,
    );
  }
});

it("rounded group bounds leave unselected circles outside the group", () => {
  for (const group of majorities) {
    const points = group.map((server) => serverPositions[server]);
    for (const server of servers.filter(
      (server) => !(group as readonly string[]).includes(server),
    )) {
      const [x, y] = serverPositions[server];
      const distances = points.map(([ax, ay], index) => {
        const [bx, by] = points[(index + 1) % points.length];
        const dx = bx - ax,
          dy = by - ay;
        const t = Math.max(
          0,
          Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)),
        );
        return Math.hypot(x - ax - t * dx, y - ay - t * dy);
      });
      // Largest boundary padding (36) plus the unselected circle radius (20).
      expect(Math.min(...distances)).toBeGreaterThan(56);
    }
  }
});

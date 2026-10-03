import { expect, it } from "vitest";
import { pathData, pointOnRoute, port, route } from "./geometry";

it("attaches exact ports and walks ordered segments at constant speed", () => {
  const source = { x: 10, y: 20, width: 100, height: 60 };
  const target = { x: 180, y: 120, width: 120, height: 60 };
  const points = route(source, "right", target, "left", [
    [140, 50],
    [140, 150],
  ]);
  expect(points[0]).toEqual(port(source, "right"));
  expect(points.at(-1)).toEqual(port(target, "left"));
  expect(pathData(points)).toBe("M110 50 L140 50 L140 150 L180 150");
  expect(pointOnRoute(points, 0)).toEqual([110, 50]);
  expect(pointOnRoute(points, 30 / 170)).toEqual([140, 50]);
  expect(pointOnRoute(points, 80 / 170)).toEqual([140, 100]);
  expect(pointOnRoute(points, 1)).toEqual([180, 150]);
  expect(pointOnRoute(points, 2)).toEqual([180, 150]);
});

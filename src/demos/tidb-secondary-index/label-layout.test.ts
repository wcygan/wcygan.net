import { expect, it } from "vitest";
import { placePacketLabel } from "./label-layout";
it("keeps the returned ID beside the server without covering its heading", () => {
  const obstacle = { x: 120, y: 30, width: 80, height: 36 };
  const rect = placePacketLabel(
    { x: 160, y: 90 },
    { width: 70, height: 24 },
    { width: 342, height: 520 },
    [obstacle],
  )!;
  expect(rect.x >= 8 && rect.x + rect.width <= 334).toBe(true);
  expect(rect.y >= 8 && rect.y + rect.height <= 512).toBe(true);
  expect(
    rect.x + rect.width <= obstacle.x - 5 ||
      rect.x >= obstacle.x + obstacle.width + 5 ||
      rect.y + rect.height <= obstacle.y - 5 ||
      rect.y >= obstacle.y + obstacle.height + 5,
  ).toBe(true);
});
it("keeps full-record payloads within a narrow stage and declines impossible placements", () => {
  const rect = placePacketLabel(
    { x: 340, y: 519 },
    { width: 150, height: 44 },
    { width: 342, height: 520 },
    [],
  )!;
  expect(rect.x + rect.width).toBeLessThanOrEqual(334);
  expect(rect.y + rect.height).toBeLessThanOrEqual(512);
  expect(
    placePacketLabel(
      { x: 10, y: 10 },
      { width: 400, height: 44 },
      { width: 342, height: 520 },
      [],
    ),
  ).toBeUndefined();
});

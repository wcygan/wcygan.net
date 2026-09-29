import { describe, expect, it } from "vitest";
import { snapshot, packetProgress } from "./model";
describe("independent write delivery", () => {
  it("starts equal and diverges after the same two writes are applied", () => {
    expect(snapshot(0).map((r) => r.value)).toEqual([10, 10, 10]);
    expect(snapshot(2).map((r) => r.value)).toEqual([20, 15, 20]);
    expect(snapshot(3).map((r) => r.value)).toEqual([25, 20, 25]);
    for (const replica of snapshot(3))
      expect([...replica.applied].sort()).toEqual(["X", "Y"]);
  });
});

it("keeps slow packets moving at half speed across the first arrival", () => {
  expect(packetProgress(1, 2, false)).toBe(0.5);
  expect(packetProgress(1, 2, true)).toBe(0.25);
  expect(packetProgress(1, 4, true)).toBe(packetProgress(2, 0, true));
  expect(packetProgress(2, 2, true)).toBe(0.75);
  expect(packetProgress(2, 4, true)).toBe(1);
});

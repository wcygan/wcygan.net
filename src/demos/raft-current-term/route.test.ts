import { expect, it } from "vitest";
import { packetPosition } from "./route";
it("starts and ends at the sender and receiver without overshooting", () => {
  expect(packetPosition("A", "B", 0)).toEqual([40, 30]);
  expect(packetPosition("A", "B", 1)[0]).toBe(180);
  expect(packetPosition("A", "B", 1)[1]).toBeCloseTo(30);
  expect(packetPosition("C", "B", -1)).toEqual([320, 30]);
  expect(packetPosition("C", "B", 2)[1]).toBeCloseTo(30);
});
it("uses the same path in either direction and stays inside the lane", () => {
  for (let i = 0; i <= 100; i++) {
    const a = packetPosition("A", "C", i / 100);
    const b = packetPosition("C", "A", 1 - i / 100);
    expect(a[0]).toBeCloseTo(b[0]);
    expect(a[1]).toBeCloseTo(b[1]);
    expect(a[1]).toBeGreaterThanOrEqual(29.99);
    expect(a[1]).toBeLessThanOrEqual(74.01);
  }
});

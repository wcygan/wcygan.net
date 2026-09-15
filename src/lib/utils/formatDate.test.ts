import { expect, it } from "vitest";
import { toDisplayDate } from "./formatDate";
it("hides timestamp precision and preserves the authored day across time zones", () => {
  expect(toDisplayDate("2026-09-15T23:30:00-05:00")).toBe("September 15, 2026");
  expect(toDisplayDate("September 15, 2026")).toBe("September 15, 2026");
});

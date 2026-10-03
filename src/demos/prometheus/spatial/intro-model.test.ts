import { describe, expect, it } from "vitest";
import { INTRO, seriesValue } from "./intro-model";
describe("introductory monitoring models", () => {
  it("adds history to two fixed label identities", () => {
    expect([0, 1, 2, 3].map((i) => seriesValue(0, i))).toEqual([4, 7, 10, 13]);
    expect([0, 1, 2, 3].map((i) => seriesValue(1, i))).toEqual([8, 10, 12, 14]);
  });
  it("keeps notification delivery distinct from rule evaluation", () => {
    expect(INTRO.architecture.states[3]).toContain("Alertmanager");
    expect(INTRO.alerts.states[2]).toContain("reset the timer");
    expect(INTRO.alerts.states[3]).toContain("30 s continuously true");
  });
});

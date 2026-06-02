import { describe, expect, it } from "vitest";
import {
  deriveGeoDnsSnapshot,
  GEO_DNS_STEPS,
  geoDnsStepState,
  REDUCED_MOTION_STEP_INDEX,
} from "./model";

describe("deriveGeoDnsSnapshot", () => {
  it("routes Seattle to the Oregon endpoint", () => {
    const snapshot = deriveGeoDnsSnapshot({ stepIndex: 0 });

    expect(snapshot.phase).toBe("seattle-query");
    expect(snapshot.activeUser.code).toBe("SEA");
    expect(snapshot.selectedRegion).toBe("OR");
    expect(snapshot.dnsAnswer).toBe("oregon.app.example.com");
  });

  it("routes Dallas and New York to their nearest regional entry points", () => {
    const dallas = deriveGeoDnsSnapshot({ stepIndex: 1 });
    const newYork = deriveGeoDnsSnapshot({ stepIndex: 2 });

    expect(dallas.selectedRegion).toBe("TX");
    expect(dallas.dnsAnswer).toBe("texas.app.example.com");
    expect(newYork.selectedRegion).toBe("VA");
    expect(newYork.dnsAnswer).toBe("virginia.app.example.com");
  });

  it("marks only the selected regional entry point", () => {
    const snapshot = deriveGeoDnsSnapshot({ stepIndex: 2 });

    expect(
      snapshot.regions.map((region) => [region.code, region.status]),
    ).toEqual([
      ["OR", "available"],
      ["TX", "available"],
      ["VA", "selected"],
    ]);
  });

  it("wraps step indexes for autoplay loops", () => {
    const snapshot = deriveGeoDnsSnapshot({ stepIndex: GEO_DNS_STEPS.length });

    expect(snapshot.phase).toBe("seattle-query");
  });

  it("uses the reduced-motion frame as the last routing state", () => {
    const snapshot = deriveGeoDnsSnapshot({
      stepIndex: REDUCED_MOTION_STEP_INDEX,
    });

    expect(snapshot.phase).toBe("new-york-query");
    expect(snapshot.selectedRegion).toBe("VA");
    expect(geoDnsStepState(snapshot.phase, 2)).toBe("complete");
  });
});

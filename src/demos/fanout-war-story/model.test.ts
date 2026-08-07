import { describe, expect, it } from "vitest";
import {
  deployProgress,
  WAR_STORY_DEPLOY_HOUR,
  WAR_STORY_INPUT_HIGH_QPS,
  WAR_STORY_INPUT_LOW_QPS,
  WAR_STORY_POINTS,
  WAR_STORY_POST_FIX_QPS,
  WAR_STORY_REDUNDANT_PERCENT,
  WAR_STORY_TOTAL_HOURS,
} from "./model";

describe("fanout war story model", () => {
  it("contains the complete two-day traffic series", () => {
    expect(WAR_STORY_POINTS).toHaveLength(WAR_STORY_TOTAL_HOURS / 2 + 1);
    expect(WAR_STORY_POINTS[0]).toMatchObject({
      hour: 0,
      inputQps: WAR_STORY_INPUT_LOW_QPS,
      downstreamQps: WAR_STORY_INPUT_LOW_QPS * 2,
      postFixQps: WAR_STORY_POST_FIX_QPS,
    });
  });

  it("keeps the incident range and two-times downstream multiplier explicit", () => {
    expect(Math.min(...WAR_STORY_POINTS.map((point) => point.inputQps))).toBe(
      WAR_STORY_INPUT_LOW_QPS,
    );
    expect(Math.max(...WAR_STORY_POINTS.map((point) => point.inputQps))).toBe(
      WAR_STORY_INPUT_HIGH_QPS,
    );
    expect(
      WAR_STORY_POINTS.every(
        (point) => point.downstreamQps === point.inputQps * 2,
      ),
    ).toBe(true);
  });

  it("marks the fix boundary and low-traffic outcome explicitly", () => {
    expect(WAR_STORY_DEPLOY_HOUR).toBe(36);
    expect(deployProgress()).toBe(0.75);
    expect(WAR_STORY_POST_FIX_QPS).toBe(10);
    expect(WAR_STORY_REDUNDANT_PERCENT).toBe(99);
    expect(
      WAR_STORY_POINTS.find((point) => point.hour === WAR_STORY_DEPLOY_HOUR),
    ).toMatchObject({
      hour: WAR_STORY_DEPLOY_HOUR,
      downstreamQps: expect.any(Number),
      postFixQps: WAR_STORY_POST_FIX_QPS,
    });
  });
});

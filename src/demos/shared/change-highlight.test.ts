import { describe, expect, it } from "vitest";
import {
  CHANGE_HIGHLIGHT_MIN_DURATION_MS,
  changeHighlightDurationMs,
  changeHighlightProgressSpan,
} from "./change-highlight";

describe("change highlight timing", () => {
  it("holds every change highlight for at least 750ms", () => {
    expect(CHANGE_HIGHLIGHT_MIN_DURATION_MS).toBe(750);
    expect(changeHighlightDurationMs(500)).toBe(750);
  });

  it("preserves longer demo-specific highlights", () => {
    expect(changeHighlightDurationMs(1_200)).toBe(1_200);
  });

  it("converts the minimum into progress-based animation timelines", () => {
    expect(changeHighlightProgressSpan(10_000, 0.05)).toBe(0.075);
    expect(changeHighlightProgressSpan(10_000, 0.12)).toBe(0.12);
  });
});

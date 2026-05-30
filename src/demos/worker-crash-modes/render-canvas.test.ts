import { describe, expect, it } from "vitest";
import { measureCrashDemoHeight } from "./render-canvas";

// The two acts have fixed final lengths: the Workflow Task history runs 7 rows,
// the Activity history only 4. The canvas must be sized to that content so it
// never reserves proportion-driven whitespace below the logs.
const WORKFLOW_ROWS = 7;
const ACTIVITY_ROWS = 4;

describe("measureCrashDemoHeight", () => {
  it("tracks content, not the viewport: the shorter Activity log shrinks the stack", () => {
    const stacked = measureCrashDemoHeight(390, WORKFLOW_ROWS, ACTIVITY_ROWS);
    const ifActivityWereFull = measureCrashDemoHeight(390, WORKFLOW_ROWS, 7);

    expect(stacked).toBeLessThan(ifActivityWereFull);
  });

  it("is independent of width within a layout band (no proportion-driven height)", () => {
    expect(measureCrashDemoHeight(640, WORKFLOW_ROWS, ACTIVITY_ROWS)).toBe(
      measureCrashDemoHeight(800, WORKFLOW_ROWS, ACTIVITY_ROWS),
    );
  });

  it("stacks taller than it lays out side by side", () => {
    const wide = measureCrashDemoHeight(800, WORKFLOW_ROWS, ACTIVITY_ROWS);
    const compact = measureCrashDemoHeight(390, WORKFLOW_ROWS, ACTIVITY_ROWS);

    expect(compact).toBeGreaterThan(wide);
  });

  it("fits within the first-paint CSS fallbacks so the canvas does not jump", () => {
    expect(measureCrashDemoHeight(800, WORKFLOW_ROWS, ACTIVITY_ROWS)).toBe(432);
    expect(measureCrashDemoHeight(390, WORKFLOW_ROWS, ACTIVITY_ROWS)).toBe(648);
  });
});

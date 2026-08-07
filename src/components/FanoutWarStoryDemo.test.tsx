/**
 * @vitest-environment jsdom
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FanoutWarStoryDemo } from "~/components/FanoutWarStoryDemo";

describe("FanoutWarStoryDemo", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the complete two-day range and fix labels immediately", () => {
    const { container } = render(<FanoutWarStoryDemo />);
    const figure = container.querySelector<HTMLElement>(".fanout-war-story");

    expect(figure?.dataset.phase).toBe("settled");
    expect(figure?.dataset.complete).toBe("true");
    expect(
      container.querySelectorAll(".fanout-war-story-grid-line"),
    ).toHaveLength(5);
    expect(container.querySelector('[data-series="input"]')).toBeTruthy();
    expect(
      container.querySelector('[data-series="downstream-before-fix"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-series="downstream-after-fix"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("Traffic over time");
    expect(container.textContent).toContain("fix merged + deployed");
    expect(container.textContent).toContain("input · 1k–4k QPS");
    expect(container.querySelector("button")).toBeNull();
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("keeps the low-traffic outcome visible as static explanatory text", () => {
    const { container } = render(<FanoutWarStoryDemo />);

    expect(container.textContent).toContain("~10 QPS after fix");
    expect(container.textContent).toContain("99% avoided");
  });
});

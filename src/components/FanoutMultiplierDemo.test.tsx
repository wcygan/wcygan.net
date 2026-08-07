/**
 * @vitest-environment jsdom
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FanoutMultiplierDemo } from "~/components/FanoutMultiplierDemo";

describe("FanoutMultiplierDemo", () => {
  let nextFrame: FrameRequestCallback | undefined;

  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        nextFrame = callback;
        return 1;
      }),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    cleanup();
    nextFrame = undefined;
    vi.unstubAllGlobals();
  });

  it("shows singular rails, rates, and the takeaway without moving packets", () => {
    stubMatchMedia(true);

    const { container } = render(<FanoutMultiplierDemo />);
    const figure = container.querySelector<HTMLElement>(
      ".fanout-multiplier-graph",
    );

    expect(figure?.dataset.phase).toBe("steady");
    expect(
      container.querySelectorAll(".fanout-multiplier-graph-service"),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll(".fanout-multiplier-graph-rail"),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll(".fanout-multiplier-graph-multiplier"),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll(".fanout-multiplier-graph-packet"),
    ).toHaveLength(0);
    expect(container.textContent).toContain("5 req/s");
    expect(container.textContent).toContain("15 req/s");
    expect(container.textContent).toContain("30 reads/s");
    expect(container.textContent).toContain("×3");
    expect(container.textContent).toContain("×2");
    expect(container.textContent).toContain("One request, six database reads");
    expect(container.textContent).toContain("1 request → 3 calls → 6 reads");
  });

  it("starts the continuous explanation when motion is allowed", () => {
    stubMatchMedia(false);

    const { container } = render(<FanoutMultiplierDemo />);
    const figure = container.querySelector<HTMLElement>(
      ".fanout-multiplier-graph",
    );

    expect(figure?.dataset.phase).toBe("streaming");
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(
      container.querySelectorAll(".fanout-multiplier-graph-rail"),
    ).toHaveLength(3);
  });

  it("keeps emitting bounded packets after the old eight-second story", () => {
    stubMatchMedia(false);

    const { container } = render(<FanoutMultiplierDemo />);

    act(() => {
      nextFrame?.(0);
      nextFrame?.(8_001);
    });

    const figure = container.querySelector<HTMLElement>(
      ".fanout-multiplier-graph",
    );
    const packets = container.querySelectorAll(
      ".fanout-multiplier-graph-packet",
    );

    expect(figure?.dataset.phase).toBe("streaming");
    expect(packets.length).toBeGreaterThan(0);
    expect(packets.length).toBeLessThan(24);
    expect(
      container.querySelectorAll(".fanout-multiplier-graph-packet-db-read"),
    ).not.toHaveLength(0);
  });
});

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

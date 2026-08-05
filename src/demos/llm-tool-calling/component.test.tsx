/**
 * @vitest-environment jsdom
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolCallingFlowDemo } from "~/components/ToolCallingFlowDemo";

class IntersectionObserverStub {
  constructor(private readonly callback: IntersectionObserverCallback) {}

  disconnect() {}
  observe() {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  takeRecords() {
    return [];
  }
  unobserve() {}
}

describe("ToolCallingFlowDemo", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    Object.defineProperty(SVGElement.prototype, "getTotalLength", {
      configurable: true,
      value: () => 100,
    });
    Object.defineProperty(SVGElement.prototype, "getPointAtLength", {
      configurable: true,
      value: () => ({ x: 118, y: 205 }),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the completed local ownership story for reduced motion", () => {
    const { container } = render(<ToolCallingFlowDemo />);
    const figure = container.querySelector<HTMLElement>(
      ".tool-calling-network",
    );
    const replay = container.querySelector<HTMLButtonElement>(
      ".tool-calling-network-replay",
    );

    expect(figure?.dataset.phase).toBe("complete");
    expect(figure?.dataset.graphicFrame).toBe("workbench");
    expect(
      container.querySelectorAll(".tool-calling-network-travel[data-route]"),
    ).toHaveLength(6);
    expect(
      container.querySelectorAll(".tool-calling-network-arrow"),
    ).toHaveLength(6);
    expect(
      container.querySelectorAll(
        '.tool-calling-network-travel[data-direction="request"]',
      ),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll(
        '.tool-calling-network-travel[data-direction="response"]',
      ),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll(".tool-calling-network-route-label"),
    ).toHaveLength(0);
    expect(container.textContent).toContain("External API");
    expect(container.textContent).toContain("Local computer");
    fireEvent.click(replay!);
    expect(figure?.dataset.phase).toBe("complete");
  });
});

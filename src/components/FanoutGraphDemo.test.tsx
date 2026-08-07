/**
 * @vitest-environment jsdom
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FanoutGraphDemo } from "~/components/FanoutGraphDemo";

describe("FanoutGraphDemo", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn(() => 1),
    );
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the complete DAG without moving packets for reduced motion", () => {
    stubMatchMedia(true);

    const { container } = render(<FanoutGraphDemo />);
    const figure = container.querySelector<HTMLElement>(".fanout-graph");

    expect(figure?.dataset.phase).toBe("complete");
    expect(container.querySelectorAll(".fanout-graph-node")).toHaveLength(8);
    expect(container.querySelectorAll(".fanout-graph-edge")).toHaveLength(7);
    expect(
      container.querySelector(".fanout-graph-safari-compass"),
    ).not.toBeNull();
    expect(
      container.querySelectorAll(".fanout-graph-request-orb"),
    ).toHaveLength(0);
    expect(container.textContent).toContain("One browser request multiplies");
    expect(container.textContent).toContain("Svc A");
    expect(container.textContent).toContain("2.5 req/s");

    expect(container.querySelector(".fanout-graph-replay")).toBeNull();
  });

  it("starts the request animation from the first frame", () => {
    stubMatchMedia(false);

    const { container } = render(<FanoutGraphDemo />);
    const figure = container.querySelector<HTMLElement>(".fanout-graph");

    expect(figure?.dataset.phase).toBe("playing");
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(
      container.querySelectorAll(".fanout-graph-request-orb"),
    ).toHaveLength(0);
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

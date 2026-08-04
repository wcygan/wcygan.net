/**
 * @vitest-environment jsdom
 */

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityCard } from "./IdentityCard";

class IntersectionObserverStub {
  observe() {}
  disconnect() {}
}

function useBrowserIdentity({
  maxTouchPoints = 0,
  platform = "MacIntel",
  userAgent,
}: {
  maxTouchPoints?: number;
  platform?: string;
  userAgent: string;
}) {
  Object.defineProperties(window.navigator, {
    maxTouchPoints: { configurable: true, value: maxTouchPoints },
    platform: { configurable: true, value: platform },
    userAgent: { configurable: true, value: userAgent },
  });
}

describe("IdentityCard transparent video compatibility", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(window.navigator, "maxTouchPoints");
    Reflect.deleteProperty(window.navigator, "platform");
    Reflect.deleteProperty(window.navigator, "userAgent");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("mounts the three HEVC-alpha videos in Safari", async () => {
    useBrowserIdentity({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
    });

    const { container } = render(<IdentityCard variant="full" />);

    await waitFor(() => {
      expect(container.querySelectorAll("video")).toHaveLength(3);
    });
    expect(
      [...container.querySelectorAll("video source")].map((source) => ({
        src: source.getAttribute("src"),
        type: source.getAttribute("type"),
      })),
    ).toEqual([
      {
        src: "/identity-card/github-spin-safari.mov",
        type: 'video/quicktime; codecs="hvc1"',
      },
      {
        src: "/identity-card/linkedin-spin-safari.mov",
        type: 'video/quicktime; codecs="hvc1"',
      },
      {
        src: "/identity-card/die-spin-safari.mov",
        type: 'video/quicktime; codecs="hvc1"',
      },
    ]);
  });

  it("mounts the three VP9 videos in Chromium", async () => {
    useBrowserIdentity({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    });

    const { container } = render(<IdentityCard variant="full" />);

    await waitFor(() => {
      expect(container.querySelectorAll("video")).toHaveLength(3);
    });
    expect(
      [...container.querySelectorAll("video source")].map((source) =>
        source.getAttribute("src"),
      ),
    ).toEqual([
      "/identity-card/github-spin.webm",
      "/identity-card/linkedin-spin.webm",
      "/identity-card/die-spin.webm",
    ]);
  });
});

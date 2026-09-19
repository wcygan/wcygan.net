/** @vitest-environment jsdom */

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { DatabaseLogDemo } from "./DatabaseLogDemo";

let ready: () => void;
vi.mock("~/demos/database-log/Scene", () => ({
  default: ({ onReady }: { onReady: () => void }) => {
    ready = onReady;
    return null;
  },
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("automatically appends the first record, then exposes read and write", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe() {
        this.callback(
          [
            {
              isIntersecting: true,
              intersectionRatio: 1,
            } as IntersectionObserverEntry,
          ],
          this as unknown as IntersectionObserver,
        );
      }
      disconnect() {}
    },
  );

  await act(async () => {
    render(<DatabaseLogDemo />);
  });
  await act(async () => {
    vi.advanceTimersByTime(10_000);
  });
  expect(screen.getByRole("status").textContent).toContain(
    "A database write travels to an append-only log.",
  );
  expect(
    (screen.getByRole("button", { name: "Write" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);

  act(() => ready());
  act(() => {
    vi.advanceTimersByTime(300);
  });
  expect(
    (screen.getByRole("button", { name: "Write" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
  act(() => {
    vi.advanceTimersByTime(300);
  });
  expect(screen.getByRole("status").textContent).toContain("1 write appended");
  act(() => {
    vi.advanceTimersByTime(20);
  });
  expect(screen.getByRole("status").textContent).toContain("1 write appended");
});

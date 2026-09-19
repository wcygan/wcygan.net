/** @vitest-environment jsdom */
import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VectorClockDemo } from "~/components/VectorClockDemo";
const scene = vi.hoisted(() => ({ fail: false, ready: true }));
vi.mock("./Scene", () => ({
  default: ({
    onReady,
    onUnavailable,
  }: {
    onReady: () => void;
    onUnavailable: () => void;
  }) => {
    useEffect(() => {
      if (scene.fail) onUnavailable();
      else if (scene.ready) onReady();
    }, [onReady, onUnavailable]);
    return <div>Scene</div>;
  },
}));
beforeEach(() => {
  scene.fail = false;
  scene.ready = true;
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
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
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("keeps loading controls disabled until the first frame", async () => {
  scene.ready = false;
  await act(async () => {
    render(<VectorClockDemo />);
  });
  expect(
    (screen.getByRole("button", { name: "Step" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByLabelText("Current node clocks").textContent).toContain(
    "0",
  );
});
it("keeps the full lesson usable without WebGL", async () => {
  scene.fail = true;
  await act(async () => {
    render(<VectorClockDemo />);
  });
  expect(screen.getByText(/3D is unavailable/)).toBeTruthy();
  const step = screen.getByRole("button", { name: "Step" });
  for (let i = 0; i < 3; i++) fireEvent.click(step);
  expect(screen.getByRole("status").textContent).toContain(
    "A counts its send (1 → 2)",
  );
  expect(screen.getByRole("status").textContent).toContain(
    "B has not received it yet",
  );
  fireEvent.click(step);
  expect(screen.getByRole("status").textContent).toContain(
    "counts receipt (0 → 1)",
  );
  fireEvent.click(step);
  fireEvent.click(step);
  expect(screen.getByText("Step 6 of 6")).toBeTruthy();
  expect(screen.getByText(/C learned about A through B/)).toBeTruthy();
  expect((step as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Restart" }));
  expect(screen.getByText("Step 0 of 6")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Play" })).toBeNull();
});
it("authors one discoverable stage", async () => {
  let container!: HTMLElement;
  await act(async () => {
    ({ container } = render(<VectorClockDemo />));
  });
  expect(
    container.querySelectorAll('[data-graphic-frame="workbench"]'),
  ).toHaveLength(1);
  expect(container.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
});

it("provides a labeled speed selector defaulting to 1×", async () => {
  await act(async () => {
    render(<VectorClockDemo />);
  });
  const speed = screen.getByRole("combobox", {
    name: "Speed",
  }) as HTMLSelectElement;
  expect(speed.value).toBe("1");
  fireEvent.change(speed, { target: { value: "4" } });
  expect(speed.value).toBe("4");
  fireEvent.click(screen.getByRole("button", { name: "Restart" }));
  expect(speed.value).toBe("4");
});

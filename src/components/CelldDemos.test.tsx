/** @vitest-environment jsdom */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CelldDurabilityDemo,
  CelldKeyChoiceDemo,
  CelldOwnershipDemo,
  CelldRecoveryDemo,
  CelldRequestRoutingDemo,
} from "./CelldDemos";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "hidden");
});

function advanceButton(figure: HTMLElement) {
  return within(figure).getByRole<HTMLButtonElement>("button", {
    name: /^(Next step|Retry tail|Run one round)$/,
  });
}

it("provides independent named figures with one accessible SVG stage and controls outside it", () => {
  render(
    <>
      <CelldRequestRoutingDemo />
      <CelldOwnershipDemo />
      <CelldDurabilityDemo />
      <CelldRecoveryDemo />
      <CelldKeyChoiceDemo />
    </>,
  );
  const figures = screen.getAllByRole("figure");
  expect(figures).toHaveLength(5);
  expect(
    new Set(figures.map((figure) => figure.getAttribute("aria-labelledby")))
      .size,
  ).toBe(5);
  for (const figure of figures) {
    const stages = figure.querySelectorAll("[data-graphic-stage]");
    expect(stages).toHaveLength(1);
    const stage = stages[0];
    const image = within(figure).getByRole("img");
    expect(image.tagName.toLowerCase()).toBe("svg");
    expect(stage.contains(image)).toBe(true);
    expect(image.querySelector("title")?.textContent?.trim()).toBeTruthy();
    expect(image.querySelector("desc")?.textContent?.trim()).toBeTruthy();
    expect(stage.querySelectorAll("svg")).toHaveLength(1);
    expect(stage.querySelectorAll("button")).toHaveLength(0);
    expect(within(figure).getByRole("button", { name: "Reset" })).toBeDefined();
    expect(within(figure).getByRole("status")).toBeDefined();
  }
});

it.each([
  {
    name: "routing",
    Demo: CelldRequestRoutingDemo,
    steps: 4,
    initial: /client names room:lobby/i,
    final: /response returns through the entry node/i,
  },
  {
    name: "ownership",
    Demo: CelldOwnershipDemo,
    steps: 3,
    initial: /both will try to replace version 7/i,
    final: /A cannot acknowledge this write/i,
  },
  {
    name: "durability",
    Demo: CelldDurabilityDemo,
    steps: 3,
    initial: /neither client has received/i,
    final: /earlier acknowledgement depended on the durable follower copy/i,
  },
  {
    name: "recovery",
    Demo: CelldRecoveryDemo,
    steps: 6,
    initial: /Owner stops/i,
    final: /Serve again/i,
  },
  {
    name: "cell keys",
    Demo: CelldKeyChoiceDemo,
    steps: 6,
    initial: /six equal synchronous work turns/i,
    final: /hot cell took six rounds.*independent cells took two/i,
  },
])(
  "finishes $name in finite steps and restores its initial state on reset",
  ({ Demo, steps, initial, final }) => {
    render(<Demo />);
    const figure = screen.getByRole("figure");
    const status = within(figure).getByRole("status");
    const next = advanceButton(figure);
    expect(status.textContent).toMatch(initial);
    for (let step = 0; step < steps; step++) {
      expect(next.disabled).toBe(false);
      fireEvent.click(next);
    }
    expect(status.textContent).toMatch(final);
    expect(next.disabled).toBe(true);
    const settledStatus = status.textContent;
    fireEvent.click(next);
    expect(status.textContent).toBe(settledStatus);
    fireEvent.click(within(figure).getByRole("button", { name: "Reset" }));
    expect(status.textContent).toMatch(initial);
    expect(next.disabled).toBe(false);
  },
);

it("routes a warm request to its owner and returns the response through the entry node", () => {
  render(<CelldRequestRoutingDemo />);
  const figure = screen.getByRole("figure");
  const next = advanceButton(figure);
  const edges = () =>
    Array.from(figure.querySelectorAll("path[data-flow]")).map((path) => ({
      flow: path.getAttribute("data-flow"),
      from: path.getAttribute("data-from"),
      to: path.getAttribute("data-to"),
    }));
  expect(edges()).toHaveLength(2);
  expect(edges()).toEqual(
    expect.arrayContaining([
      { flow: "request", from: "client", to: "entry" },
      { flow: "request", from: "entry", to: "owner" },
    ]),
  );
  fireEvent.click(next);
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /Node A forwards this request to node B/,
  );
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /handler runs on B.*local SQLite/,
  );
  fireEvent.click(next);
  expect(edges()).toHaveLength(2);
  expect(edges()).toEqual(
    expect.arrayContaining([
      { flow: "response", from: "entry", to: "client" },
      { flow: "response", from: "owner", to: "entry" },
    ]),
  );
});

it("shows the winning ownership epoch before refusing the stale owner's acknowledgement", () => {
  render(<CelldOwnershipDemo />);
  const next = advanceButton(screen.getByRole("figure"));
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /B wins.*epoch 8.*C's stale version-7 condition is rejected/,
  );
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /old epoch-7 prefix.*cannot overwrite B's epoch-8 objects/,
  );
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /owner record.*B at epoch 8.*A cannot acknowledge/,
  );
});

it("distinguishes bucket-before-ack and follower-before-ack durability", () => {
  render(<CelldDurabilityDemo />);
  const next = advanceButton(screen.getByRole("figure"));
  expect(screen.getByRole("status").textContent).toMatch(
    /committed locally.*Neither client has received a successful write response/,
  );
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /uploads the write to the bucket.*sends the write to that peer's durable log/,
  );
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /checks the current owner after its bucket proof.*follower fsync proof.*Both can now acknowledge/,
  );
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /bucket upload finishes later.*earlier acknowledgement depended on the durable follower copy/,
  );
});

it("keeps an unavailable follower tail blocked and unclaimed across retries and resets", () => {
  render(<CelldRecoveryDemo />);
  const figure = screen.getByRole("figure");
  const unavailable = screen.getByRole("button", {
    name: "Follower unreachable",
  });
  fireEvent.click(unavailable);
  expect(unavailable.getAttribute("aria-pressed")).toBe("true");
  for (let step = 0; step < 3; step++) fireEvent.click(advanceButton(figure));
  for (let retry = 0; retry < 4; retry++) {
    expect(advanceButton(figure).textContent).toBe("Retry tail");
    expect(advanceButton(figure).disabled).toBe(false);
    fireEvent.click(advanceButton(figure));
    expect(screen.getByRole("status").textContent).toContain(
      "B has not claimed or restored",
    );
  }
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.getByRole("status").textContent).toContain("Owner stops");
  expect(unavailable.getAttribute("aria-pressed")).toBe("true");
  for (let step = 0; step < 3; step++) fireEvent.click(advanceButton(figure));
  expect(screen.getByRole("status").textContent).toContain(
    "B has not claimed or restored",
  );

  const complete = screen.getByRole("button", { name: "Complete tail" });
  fireEvent.click(complete);
  expect(complete.getAttribute("aria-pressed")).toBe("true");
  expect(unavailable.getAttribute("aria-pressed")).toBe("false");
  expect(screen.getByRole("status").textContent).toContain("Owner stops");
  for (let step = 0; step < 6; step++) fireEvent.click(advanceButton(figure));
  expect(screen.getByRole("status").textContent).toContain("Serve again");
  expect(advanceButton(figure).disabled).toBe(true);
});

it("finishes independent cells while the hot cell still has queued turns", () => {
  render(<CelldKeyChoiceDemo />);
  const next = advanceButton(screen.getByRole("figure"));
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /one hot-cell turn completes.*three independent cells can each complete a turn/,
  );
  fireEvent.click(next);
  expect(screen.getByRole("status").textContent).toMatch(
    /independent cells have finished.*hot cell still has 4 turns queued/,
  );
});

describe("natural SVG autoplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(private callback: IntersectionObserverCallback) {}
        observe(target: Element) {
          this.callback(
            [
              {
                target,
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

  function beat() {
    act(() => vi.advanceTimersByTime(3600));
  }

  it.each([
    { name: "routing", Demo: CelldRequestRoutingDemo, steps: 4 },
    { name: "ownership", Demo: CelldOwnershipDemo, steps: 3 },
    { name: "durability", Demo: CelldDurabilityDemo, steps: 3 },
    { name: "recovery", Demo: CelldRecoveryDemo, steps: 6 },
    { name: "cell keys", Demo: CelldKeyChoiceDemo, steps: 6 },
  ])(
    "autoplays the finite $name story and leaves its last state readable",
    ({ Demo, steps }) => {
      render(<Demo />);
      const figure = screen.getByRole("figure");
      expect(figure.dataset.playbackState).toBe("playing");
      expect(
        within(figure).getByRole("button", { name: "Pause" }),
      ).toBeDefined();
      for (let step = 1; step <= steps; step++) {
        beat();
        expect(figure.dataset.playbackStep).toBe(String(step));
      }
      expect(figure.dataset.playbackState).toBe("complete");
      const finalStatus = within(figure).getByRole("status").textContent;
      act(() => vi.advanceTimersByTime(36000));
      expect(within(figure).getByRole("status").textContent).toBe(finalStatus);
      fireEvent.click(within(figure).getByRole("button", { name: "Replay" }));
      expect(figure.dataset.playbackStep).toBe("0");
      expect(figure.dataset.playbackState).toBe("playing");
      beat();
      expect(figure.dataset.playbackStep).toBe("1");
    },
  );

  it("lets a reader pause, step manually, resume, and reset without a competing timer", () => {
    render(<CelldRequestRoutingDemo />);
    const figure = screen.getByRole("figure");
    beat();
    fireEvent.click(within(figure).getByRole("button", { name: "Pause" }));
    expect(figure.dataset.playbackState).toBe("paused");
    beat();
    expect(figure.dataset.playbackStep).toBe("1");
    fireEvent.click(advanceButton(figure));
    beat();
    expect(figure.dataset.playbackStep).toBe("2");
    fireEvent.click(within(figure).getByRole("button", { name: "Play" }));
    beat();
    expect(figure.dataset.playbackStep).toBe("3");
    fireEvent.click(within(figure).getByRole("button", { name: "Reset" }));
    expect(figure.dataset.playbackState).toBe("paused");
    beat();
    expect(figure.dataset.playbackStep).toBe("0");
  });

  it("pauses on an evidence choice and stops an unreachable-tail autoplay before claiming the cell", () => {
    render(<CelldRecoveryDemo />);
    const figure = screen.getByRole("figure");
    beat();
    fireEvent.click(
      within(figure).getByRole("button", { name: "Follower unreachable" }),
    );
    expect(figure.dataset.playbackState).toBe("paused");
    expect(figure.dataset.playbackStep).toBe("0");
    beat();
    expect(figure.dataset.playbackStep).toBe("0");
    fireEvent.click(within(figure).getByRole("button", { name: "Play" }));
    for (let step = 0; step < 3; step++) beat();
    expect(figure.dataset.playbackState).toBe("blocked");
    expect(figure.dataset.playbackStep).toBe("2");
    act(() => vi.advanceTimersByTime(36000));
    expect(within(figure).getByRole("status").textContent).toContain(
      "B has not claimed or restored",
    );
    expect(advanceButton(figure).textContent).toBe("Retry tail");
    fireEvent.click(advanceButton(figure));
    expect(figure.dataset.playbackState).toBe("blocked");
    expect(figure.dataset.playbackStep).toBe("2");
  });

  it("explains reduced motion while preserving manual steps and a paused replay", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      addEventListener() {},
      removeEventListener() {},
    }));
    render(<CelldRequestRoutingDemo />);
    const figure = screen.getByRole("figure");
    expect(figure.dataset.playbackState).toBe("reduced-motion");
    expect(
      within(figure).getByText("Reduced motion: use the step controls"),
    ).toBeDefined();
    expect(
      within(figure).getByRole<HTMLButtonElement>("button", { name: "Play" })
        .disabled,
    ).toBe(true);
    beat();
    expect(figure.dataset.playbackStep).toBe("0");
    fireEvent.click(advanceButton(figure));
    expect(figure.dataset.playbackStep).toBe("1");
    fireEvent.click(within(figure).getByRole("button", { name: "Replay" }));
    beat();
    expect(figure.dataset.playbackStep).toBe("0");
    expect(figure.dataset.playbackState).toBe("reduced-motion");
  });
});

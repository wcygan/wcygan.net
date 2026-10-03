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
  KafkaConsumerGroupsDemo,
  KafkaEventDemo,
  KafkaOffsetsDemo,
  KafkaPipelineDemo,
  KafkaRetentionDemo,
  KafkaDecouplingDemo,
} from "./KafkaIntroDemos";

afterEach(cleanup);

it("keeps all six figures discoverable with exactly one stage and controls outside it", () => {
  const { container } = render(
    <>
      <KafkaEventDemo />
      <KafkaConsumerGroupsDemo />
      <KafkaOffsetsDemo />
      <KafkaRetentionDemo />
      <KafkaPipelineDemo />
      <KafkaDecouplingDemo />
    </>,
  );
  const figures = container.querySelectorAll("figure");
  expect(figures).toHaveLength(6);
  for (const figure of figures) {
    expect(figure.querySelectorAll("[data-graphic-stage]")).toHaveLength(1);
    expect(figure.querySelector("[data-graphic-stage] button")).toBeNull();
    expect(figure.querySelector("figcaption")?.textContent).toBeTruthy();
    expect(figure.getAttribute("aria-labelledby")).toBeTruthy();
  }
  expect(screen.getByText(/"event": "OrderPlaced"/)).toBeTruthy();
});

it("changes ownership within each group independently and exposes the fourth member as idle", () => {
  render(<KafkaConsumerGroupsDemo />);
  fireEvent.change(
    screen.getByRole("combobox", { name: "Analytics members" }),
    {
      target: { value: "4" },
    },
  );
  const analytics = screen.getByRole("region", {
    name: "Analytics partition ownership",
  });
  const fulfillment = screen.getByRole("region", {
    name: "Fulfillment partition ownership",
  });
  expect(within(analytics).getByText("Member 4")).toBeTruthy();
  expect(within(analytics).getByText("Idle")).toBeTruthy();
  expect(
    analytics.querySelectorAll(
      ".kafka-intro-owned-partitions > span:not(.kafka-intro-idle)",
    ),
  ).toHaveLength(3);
  expect(fulfillment.querySelectorAll(".kafka-intro-member")).toHaveLength(1);
  expect(
    fulfillment.querySelectorAll(".kafka-intro-owned-partitions > span"),
  ).toHaveLength(3);
  expect(screen.getByRole("status").textContent).toContain("fourth is idle");
});

it("separates reading, saving a checkpoint, restarting, and replaying while retaining the log", () => {
  const { container } = render(<KafkaOffsetsDemo />);
  const metric = (label: string) =>
    screen.getByText(label).nextElementSibling?.textContent;
  const click = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name }));
  click("Read next");
  expect(metric("Reader's next offset")).toBe("3");
  expect(metric("Committed next offset")).toBe("2");
  expect(metric("Committed lag")).toBe("4 records");
  click("Restart reader");
  expect(metric("Reader's next offset")).toBe("2");
  click("Read next");
  click("Save checkpoint");
  expect(metric("Committed next offset")).toBe("3");
  expect(metric("Committed lag")).toBe("3 records");
  click("Replay from start");
  expect(metric("Reader's next offset")).toBe("0");
  expect(metric("Committed next offset")).toBe("3");
  expect(container.querySelectorAll(".kafka-intro-offset-log li")).toHaveLength(
    6,
  );
  expect(
    container.querySelector(".kafka-intro-offset-log [data-next='true']")
      ?.textContent,
  ).toBe("0next");
});

it("shows compaction gaps at original offsets and exposes the selected cleanup policy", () => {
  render(<KafkaRetentionDemo />);
  fireEvent.click(screen.getByRole("button", { name: "Key compaction" }));
  expect(
    screen
      .getByRole("button", { name: "Key compaction" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  const after = screen.getByLabelText("4 retained records after cleanup");
  expect(
    Array.from(
      after.querySelectorAll(
        "[data-retained='true'] .kafka-intro-cleanup-offset",
      ),
    ).map((node) => node.textContent),
  ).toEqual(["1", "3", "4", "5"]);
  expect(
    within(after).getByLabelText("Offset 0, key 101, removed"),
  ).toBeTruthy();
  expect(
    within(after).getByLabelText("Offset 2, key 103, removed"),
  ).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("become gaps");
});

it("retains an event while analytics is offline and delivers it on recovery", () => {
  render(<KafkaDecouplingDemo />);
  expect(screen.getByRole("status").textContent).toContain("waiting");
  fireEvent.click(screen.getByRole("button", { name: "Retained events" }));
  expect(screen.getByText("can finish")).toBeTruthy();
  expect(screen.getByText("event remains here")).toBeTruthy();
  expect(screen.getByText("offline")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Recover analytics" }));
  expect(screen.queryByText("offline")).toBeNull();
  expect(screen.getAllByText("received")).toHaveLength(2);
});

it("produces successive totals and resets without inventing an initial output", () => {
  render(<KafkaPipelineDemo />);
  expect(screen.getByText("no output yet")).toBeTruthy();
  for (const amount of [42, 18, 73]) {
    fireEvent.click(
      screen.getByRole("button", { name: `Process $${amount} order` }),
    );
  }
  expect(screen.getByText("customer total: $133")).toBeTruthy();
  expect(screen.getByText("total: $133")).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "All orders processed" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Reset pipeline" }));
  expect(screen.getByText("no rows yet")).toBeTruthy();
});

describe("Kafka 2D autoplay", () => {
  let intersection: IntersectionObserverCallback;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          intersection = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function enterView() {
    act(() => {
      intersection(
        [
          {
            isIntersecting: true,
            intersectionRatio: 1,
          } as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      );
    });
  }

  it("processes each order at a readable pace and settles on the final total", () => {
    render(<KafkaPipelineDemo />);
    enterView();
    expect(screen.getByText("no output yet")).toBeTruthy();
    for (const total of [42, 60, 133]) {
      act(() => vi.advanceTimersByTime(2600));
      expect(screen.getByText(`customer total: $${total}`)).toBeTruthy();
    }
    act(() => vi.advanceTimersByTime(26000));
    expect(screen.getByText("customer total: $133")).toBeTruthy();
    expect(screen.getByText("total: $133")).toBeTruthy();
  });

  it("stops automatic progress when the reader takes over", () => {
    render(<KafkaPipelineDemo />);
    enterView();
    act(() => vi.advanceTimersByTime(2600));
    fireEvent.click(screen.getByRole("button", { name: "Reset pipeline" }));
    act(() => vi.advanceTimersByTime(26000));
    expect(screen.getByText("no output yet")).toBeTruthy();
    expect(screen.getByText("no rows yet")).toBeTruthy();
  });

  it("demonstrates uncommitted work repeating before saving and replaying", () => {
    render(<KafkaOffsetsDemo />);
    enterView();
    const metric = (label: string) =>
      screen.getByText(label).nextElementSibling?.textContent;
    for (const [next, committed] of [
      [3, 2],
      [4, 2],
      [2, 2],
      [3, 2],
      [3, 3],
      [0, 3],
    ]) {
      act(() => vi.advanceTimersByTime(2800));
      expect(metric("Reader's next offset")).toBe(String(next));
      expect(metric("Committed next offset")).toBe(String(committed));
    }
    expect(
      screen.getByRole("list", { name: "Retained records" }).children,
    ).toHaveLength(6);
  });
});

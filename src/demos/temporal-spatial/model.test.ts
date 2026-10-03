import { describe, expect, it } from "vitest";
import { LAYOUTS, type DemoKind } from "./layout";
import {
  architectureSnapshot,
  compensationSnapshot,
  historySnapshot,
  parallelSnapshot,
  replaySnapshot,
  spatialSnapshot,
  taskQueueSnapshot,
} from "./model";
import { motionPhases } from "./useSpatialPlayback";
const value = (frame: ReturnType<typeof spatialSnapshot>, label: string) =>
  frame.readouts.find((item) => item.label === label)?.value;

describe("Temporal Service and worker ownership", () => {
  it("records commands and acknowledged results independently of the application worker", () => {
    expect(architectureSnapshot(1).history).toHaveLength(1);
    expect(architectureSnapshot(2).routes).toEqual(["workflow"]);
    expect(architectureSnapshot(3).history.at(-1)?.label).toContain(
      "ActivityTaskScheduled",
    );
    expect(architectureSnapshot(4).routes).toEqual(["activity"]);
    expect(value(architectureSnapshot(4), "Inventory calls")).toBe("0");
    expect(value(architectureSnapshot(5), "Inventory calls")).toBe("1");
    expect(architectureSnapshot(6).history.at(-1)).toMatchObject({
      result: "R-42",
      payload: { reservationId: "R-42" },
    });
    expect(architectureSnapshot(7).history).toEqual(
      architectureSnapshot(6).history,
    );
    expect(architectureSnapshot(7).nodes.service.tone).toBe("blue");
    expect(architectureSnapshot(7).status).toContain("application workers");
  });
});

describe("Task queue worker replacement", () => {
  it("distinguishes in-flight attempts, timeout, retry, and recorded completion", () => {
    expect(taskQueueSnapshot(1).nodes.workerA.note).toBe("T2 attempt");
    expect(taskQueueSnapshot(2).nodes.workerB.note).toBe("T1 attempt 1");
    expect(value(taskQueueSnapshot(3), "Acknowledged Activities")).toBe(
      "0 / 3",
    );
    expect(value(taskQueueSnapshot(4), "Acknowledged Activities")).toBe(
      "1 / 3",
    );
    expect(taskQueueSnapshot(5).nodes.workerB.tone).toBe("red");
    expect(value(taskQueueSnapshot(5), "Available Activity attempts")).toBe(
      "0",
    );
    expect(value(taskQueueSnapshot(6), "Available Activity attempts")).toBe(
      "1",
    );
    expect(taskQueueSnapshot(6).nodes.replacement.visible).toBe(false);
    expect(taskQueueSnapshot(7).nodes.replacement).toMatchObject({
      visible: true,
      note: "T1 attempt 2",
    });
    expect(value(taskQueueSnapshot(7), "Acknowledged Activities")).toBe(
      "1 / 3",
    );
    expect(value(taskQueueSnapshot(9), "Acknowledged Activities")).toBe(
      "3 / 3",
    );
    expect(value(taskQueueSnapshot(9), "T1 attempts")).toBe("2");
    expect(taskQueueSnapshot(9).nodes.workerB.tone).toBe("red");
  });
});

describe("Persisted event payloads versus local memory", () => {
  it("keeps recorded payloads and a durable timer when worker memory is lost", () => {
    expect(historySnapshot(1).history[0].payload).toEqual({
      orderId: "order-42",
    });
    expect(historySnapshot(3).history[2].payload).toEqual({
      reservationId: "R-42",
    });
    const before = historySnapshot(4);
    const crashed = historySnapshot(5);
    expect(crashed.history).toEqual(before.history);
    expect(value(crashed, "Worker memory")).toBe("Lost");
    expect(crashed.nodes.memory.tone).toBe("red");
    expect(historySnapshot(6).history.at(-1)?.label).toBe("TimerFired");
    expect(historySnapshot(6).routes).toEqual(["append5"]);
    expect(historySnapshot(6).nodes.memory.tone).toBe("red");
    expect(historySnapshot(6).nodes.timerService.note).toBe("Timer fired");
    expect(historySnapshot(7).history.map((event) => event.id)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });
});

describe("Replay consumes recorded results", () => {
  it("rebuilds the local variable without scheduling or calling the completed reserve again", () => {
    const completed = replaySnapshot(2);
    expect(value(completed, "Local reservation")).toBe("R-42");
    expect(completed.history[2].result).toBe("R-42");
    for (let step = 3; step <= 5; step += 1) {
      expect(replaySnapshot(step).history).toEqual(completed.history);
      expect(value(replaySnapshot(step), "External calls")).toBe(
        "Reserve 1 · Charge 0",
      );
    }
    expect(value(replaySnapshot(3), "Local reservation")).toBe("Lost / unset");
    expect(value(replaySnapshot(4), "Workflow code runs")).toBe(
      "2 · one execution",
    );
    expect(replaySnapshot(5).routes).toEqual(["reuse"]);
    expect(value(replaySnapshot(5), "Local reservation")).toBe("R-42");
    expect(replaySnapshot(6).history.at(-1)?.label).toContain("chargePayment");
    expect(replaySnapshot(6).routes).toEqual(["schedule"]);
    expect(value(replaySnapshot(8), "External calls")).toBe(
      "Reserve 1 · Charge 1",
    );
    expect(replaySnapshot(8).done).toBe(true);
  });
  it("animates provider execution before reporting the acknowledged result", () => {
    expect(motionPhases("replay", replaySnapshot(2).routes)).toEqual([
      ["reserve"],
      ["record"],
    ]);
    expect(motionPhases("parallel", parallelSnapshot(1).routes)).toEqual([
      ["begin"],
      ["fanInventory", "fanRisk"],
    ]);
  });
});

describe("Parallel Activities", () => {
  it("retains the faster result but blocks fulfillment until both successes are acknowledged", () => {
    expect(parallelSnapshot(1).routes).toEqual([
      "begin",
      "fanInventory",
      "fanRisk",
    ]);
    const one = parallelSnapshot(2);
    expect(one.nodes.inventory.tone).toBe("green");
    expect(one.nodes.risk.tone).toBe("yellow");
    expect(one.nodes.join).toMatchObject({
      tone: "yellow",
      note: "1 / 2 results",
    });
    expect(value(one, "Fulfillment scheduled")).toBe("No");
    expect(parallelSnapshot(3).history).toEqual(one.history);
    expect(parallelSnapshot(4).nodes.join).toMatchObject({
      tone: "green",
      note: "2 / 2 results",
    });
    expect(parallelSnapshot(4).history).toHaveLength(3);
    expect(value(parallelSnapshot(4), "Fulfillment scheduled")).toBe("No");
    expect(value(parallelSnapshot(5), "Fulfillment scheduled")).toBe("Yes");
    expect(parallelSnapshot(5).routes).toEqual(["fulfill"]);
  });
});

describe("Compensation is another business operation", () => {
  it("preserves successful operations and appends acknowledged refund/release instead of erasing history", () => {
    const partial = compensationSnapshot(3);
    expect(value(partial, "Payment")).toBe("Captured");
    expect(value(partial, "Inventory")).toBe("Reserved");
    const repaired = compensationSnapshot(7);
    expect(repaired.history.slice(0, partial.history.length)).toEqual(
      partial.history,
    );
    expect(repaired.history[1]).toMatchObject({
      label: "Charge acknowledged",
      result: "P-42",
    });
    expect(repaired.history[4].result).toBe("refunded");
    expect(repaired.history[5].result).toBe("released");
    expect(value(repaired, "Payment")).toBe("Refunded");
    expect(value(repaired, "Inventory")).toBe("Released");
    expect(value(repaired, "Outcome")).toBe("Canceled · compensated");
  });
  it("settles with unresolved side effects when the refund retry policy is exhausted", () => {
    const failed = compensationSnapshot(99, "refund-fails");
    expect(failed.done).toBe(true);
    expect(failed.last).toBe(6);
    expect(failed.nodes.refund.tone).toBe("red");
    expect(compensationSnapshot(5, "refund-fails").status).toContain(
      "rejected every refund attempt before issuing any refund",
    );
    expect(failed.nodes.manual.visible).toBe(true);
    expect(failed.routes).toEqual(["manual"]);
    expect(value(failed, "Payment")).toBe("Captured");
    expect(value(failed, "Inventory")).toBe("Reserved");
    expect(value(failed, "Outcome")).toBe("Manual recovery");
    expect(
      failed.history.some((event) => event.label === "Release acknowledged"),
    ).toBe(false);
    expect(failed.history[1].result).toBe("P-42");
  });
});

it("bounds all six models and keeps their route/node references valid with append-only histories", () => {
  for (const kind of Object.keys(LAYOUTS) as DemoKind[]) {
    const final = spatialSnapshot(kind, 999);
    expect(final.done).toBe(true);
    expect(spatialSnapshot(kind, -1).step).toBe(0);
    expect(spatialSnapshot(kind, NaN).step).toBe(0);
    expect(spatialSnapshot(kind, 2.9).step).toBe(2);
    for (let step = 0; step <= final.last; step += 1) {
      const current = spatialSnapshot(kind, step);
      expect(
        current.routes.every((id) =>
          LAYOUTS[kind].routes.some((route) => route.id === id),
        ),
      ).toBe(true);
      expect(
        Object.keys(current.nodes).every((id) =>
          LAYOUTS[kind].nodes.some((node) => node.id === id),
        ),
      ).toBe(true);
      if (step > 0) {
        const before = spatialSnapshot(kind, step - 1);
        expect(current.history.slice(0, before.history.length)).toEqual(
          before.history,
        );
      }
    }
  }
});

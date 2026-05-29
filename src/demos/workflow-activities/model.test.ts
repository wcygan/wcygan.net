import { describe, expect, it } from "vitest";
import { deriveActivitiesSnapshot, REDUCED_MOTION_PROGRESS } from "./model";

describe("deriveActivitiesSnapshot", () => {
  it("starts by dispatching reserveSeat with the workflow orchestrating", () => {
    const snapshot = deriveActivitiesSnapshot({ progress: 0, playing: false });

    expect(snapshot.phase).toBe("dispatch-reserve");
    expect(snapshot.workflow.status).toBe("orchestrating");
    expect(snapshot.workflow.completedCount).toBe(0);
    expect(snapshot.activities.reserveSeat.status).toBe("scheduled");
    expect(snapshot.activities.chargeCard.status).toBe("pending");
    expect(snapshot.activities.confirmSeat.status).toBe("pending");
    expect(snapshot.activities.sendItinerary.status).toBe("pending");

    const schedulePackets = snapshot.packets.filter(
      (packet) => packet.direction === "to-activity",
    );
    expect(schedulePackets).toHaveLength(1);
    expect(schedulePackets[0].activity).toBe("reserveSeat");
  });

  it("shows reserveSeat working alone while siblings stay pending", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.1,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-reserve");
    expect(snapshot.activities.reserveSeat.status).toBe("working");
    expect(snapshot.activities.chargeCard.status).toBe("pending");
    expect(snapshot.workflow.completedCount).toBe(0);
  });

  it("records a completion only once the result reaches the workflow", () => {
    const inFlight = deriveActivitiesSnapshot({
      progress: 0.16,
      playing: false,
    });
    expect(inFlight.activities.reserveSeat.status).toBe("done");
    expect(inFlight.activities.reserveSeat.progress).toBe(1);
    expect(inFlight.workflow.completedCount).toBe(0);

    const landed = deriveActivitiesSnapshot({ progress: 0.19, playing: false });
    expect(landed.activities.reserveSeat.status).toBe("done");
    expect(landed.activities.reserveSeat.resultLabel).toBe("seat 14C");
    expect(landed.workflow.completedCount).toBe(1);
  });

  it("dispatches chargeCard once the seat is held", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.22,
      playing: false,
    });

    expect(snapshot.phase).toBe("dispatch-charge");
    expect(snapshot.activities.reserveSeat.status).toBe("done");
    expect(snapshot.activities.chargeCard.status).toBe("scheduled");
    expect(snapshot.activities.confirmSeat.status).toBe("pending");
  });

  it("fills chargeCard toward 50% on its first attempt", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.26,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-charge");
    expect(snapshot.activities.chargeCard.status).toBe("working");
    expect(snapshot.activities.chargeCard.progress).toBeGreaterThan(0);
    expect(snapshot.activities.chargeCard.progress).toBeLessThan(0.5);
  });

  it("fails chargeCard's first attempt and reports the failure", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.3,
      playing: false,
    });

    expect(snapshot.phase).toBe("fail-charge");
    expect(snapshot.activities.chargeCard.status).toBe("failed");
    // The failure does not count as a completion.
    expect(snapshot.workflow.completedCount).toBe(1);

    const failurePacket = snapshot.packets.find(
      (packet) => packet.tone === "error",
    );
    expect(failurePacket).toBeDefined();
    expect(failurePacket?.direction).toBe("to-workflow");
    expect(failurePacket?.label).toBe("payment failed");
  });

  it("re-dispatches chargeCard for a retry after the backoff", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.39,
      playing: false,
    });

    expect(snapshot.phase).toBe("retry-charge");
    expect(snapshot.activities.chargeCard.status).toBe("scheduled");

    const retryPacket = snapshot.packets.find(
      (packet) => packet.activity === "chargeCard" && packet.label === "retry",
    );
    expect(retryPacket).toBeDefined();
    expect(retryPacket?.direction).toBe("to-activity");
  });

  it("runs the chargeCard retry and succeeds the second time", () => {
    const working = deriveActivitiesSnapshot({
      progress: 0.48,
      playing: false,
    });
    expect(working.phase).toBe("run-charge-retry");
    expect(working.activities.chargeCard.status).toBe("working");
    expect(working.activities.chargeCard.progress).toBeGreaterThan(0);

    // The retry hits 100% but the workflow records it only on arrival.
    const done = deriveActivitiesSnapshot({ progress: 0.52, playing: false });
    expect(done.activities.chargeCard.status).toBe("done");
    expect(done.activities.chargeCard.resultLabel).toBe("charged $480");
    expect(done.workflow.completedCount).toBe(1);

    const recorded = deriveActivitiesSnapshot({
      progress: 0.57,
      playing: false,
    });
    expect(recorded.workflow.completedCount).toBe(2);
  });

  it("dispatches confirmSeat after the payment is captured", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.58,
      playing: false,
    });

    expect(snapshot.phase).toBe("dispatch-confirm");
    expect(snapshot.activities.chargeCard.status).toBe("done");
    expect(snapshot.activities.confirmSeat.status).toBe("scheduled");
    expect(snapshot.activities.sendItinerary.status).toBe("pending");
    expect(snapshot.workflow.completedCount).toBe(2);
  });

  it("runs confirmSeat as the only active activity", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.66,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-confirm");
    expect(snapshot.activities.confirmSeat.status).toBe("working");
    expect(snapshot.activities.chargeCard.status).toBe("done");
    expect(snapshot.workflow.completedCount).toBe(2);
  });

  it("dispatches sendItinerary after three activities are done", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.77,
      playing: false,
    });

    expect(snapshot.phase).toBe("dispatch-send");
    expect(snapshot.workflow.completedCount).toBe(3);
    expect(snapshot.activities.confirmSeat.resultLabel).toBe("seat confirmed");
    expect(snapshot.activities.sendItinerary.status).toBe("scheduled");
  });

  it("runs sendItinerary as the final activity", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.84,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-send");
    expect(snapshot.activities.sendItinerary.status).toBe("working");
    expect(snapshot.workflow.status).toBe("orchestrating");
    expect(snapshot.workflow.completedCount).toBe(3);
  });

  it("completes the workflow at the reduced-motion frame", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-send");
    expect(snapshot.workflow.status).toBe("complete");
    expect(snapshot.workflow.completedCount).toBe(4);
    expect(snapshot.activities.reserveSeat.status).toBe("done");
    expect(snapshot.activities.chargeCard.status).toBe("done");
    expect(snapshot.activities.confirmSeat.status).toBe("done");
    expect(snapshot.activities.sendItinerary.status).toBe("done");
    expect(snapshot.activities.sendItinerary.resultLabel).toBe("email sent");
  });

  it("reports ring progress that climbs from 0 to 1 across an activity", () => {
    const pending = deriveActivitiesSnapshot({ progress: 0, playing: false });
    expect(pending.activities.chargeCard.status).toBe("pending");
    expect(pending.activities.chargeCard.progress).toBe(0);

    const working = deriveActivitiesSnapshot({ progress: 0.1, playing: false });
    expect(working.activities.reserveSeat.status).toBe("working");
    expect(working.activities.reserveSeat.progress).toBeGreaterThan(0);
    expect(working.activities.reserveSeat.progress).toBeLessThan(1);

    const done = deriveActivitiesSnapshot({ progress: 0.19, playing: false });
    expect(done.activities.reserveSeat.status).toBe("done");
    expect(done.activities.reserveSeat.progress).toBe(1);
  });
});

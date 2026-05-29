import { describe, expect, it } from "vitest";
import { deriveActivitiesSnapshot, REDUCED_MOTION_PROGRESS } from "./model";

describe("deriveActivitiesSnapshot", () => {
  it("starts by dispatching chargeCard with the workflow orchestrating", () => {
    const snapshot = deriveActivitiesSnapshot({ progress: 0, playing: false });

    expect(snapshot.phase).toBe("dispatch-charge");
    expect(snapshot.workflow.status).toBe("orchestrating");
    expect(snapshot.workflow.completedCount).toBe(0);
    expect(snapshot.activities.chargeCard.status).toBe("scheduled");
    expect(snapshot.activities.reserveSeat.status).toBe("pending");
    expect(snapshot.activities.sendItinerary.status).toBe("pending");

    const schedulePackets = snapshot.packets.filter(
      (packet) => packet.direction === "to-activity",
    );
    expect(schedulePackets).toHaveLength(1);
    expect(schedulePackets[0].activity).toBe("chargeCard");
  });

  it("shows chargeCard working alone while siblings stay pending", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.2,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-charge");
    expect(snapshot.activities.chargeCard.status).toBe("working");
    expect(snapshot.activities.chargeCard.pulse).toBeGreaterThan(0);
    expect(snapshot.activities.reserveSeat.status).toBe("pending");
    expect(snapshot.activities.sendItinerary.status).toBe("pending");
    expect(snapshot.workflow.completedCount).toBe(0);
  });

  it("marks chargeCard done and returns its result", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.3,
      playing: false,
    });

    expect(snapshot.activities.chargeCard.status).toBe("done");
    expect(snapshot.activities.chargeCard.resultLabel).toBe("charged $480");
    expect(snapshot.workflow.completedCount).toBe(1);
  });

  it("dispatches reserveSeat once charge committed", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.4,
      playing: false,
    });

    expect(snapshot.phase).toBe("dispatch-reserve");
    expect(snapshot.activities.chargeCard.status).toBe("done");
    expect(snapshot.activities.reserveSeat.status).toBe("scheduled");
    expect(snapshot.activities.sendItinerary.status).toBe("pending");
  });

  it("runs reserveSeat as the only active activity", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.5,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-reserve");
    expect(snapshot.activities.reserveSeat.status).toBe("working");
    expect(snapshot.activities.chargeCard.status).toBe("done");
    expect(snapshot.activities.sendItinerary.status).toBe("pending");
    expect(snapshot.workflow.completedCount).toBe(1);
  });

  it("dispatches sendItinerary after two activities are done", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.7,
      playing: false,
    });

    expect(snapshot.phase).toBe("dispatch-send");
    expect(snapshot.workflow.completedCount).toBe(2);
    expect(snapshot.activities.reserveSeat.resultLabel).toBe("seat 14C");
    expect(snapshot.activities.sendItinerary.status).toBe("scheduled");
  });

  it("runs sendItinerary as the final activity", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: 0.82,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-send");
    expect(snapshot.activities.sendItinerary.status).toBe("working");
    expect(snapshot.workflow.status).toBe("orchestrating");
    expect(snapshot.workflow.completedCount).toBe(2);
  });

  it("completes the workflow at the reduced-motion frame", () => {
    const snapshot = deriveActivitiesSnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("run-send");
    expect(snapshot.workflow.status).toBe("complete");
    expect(snapshot.workflow.completedCount).toBe(3);
    expect(snapshot.activities.chargeCard.status).toBe("done");
    expect(snapshot.activities.reserveSeat.status).toBe("done");
    expect(snapshot.activities.sendItinerary.status).toBe("done");
    expect(snapshot.activities.sendItinerary.resultLabel).toBe("email sent");
  });
});

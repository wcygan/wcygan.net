import { describe, expect, it } from "vitest";
import { deriveRetrySnapshot, REDUCED_MOTION_PROGRESS } from "./model";

describe("deriveRetrySnapshot", () => {
  it("starts with both tracks running the first sendEmail", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0, playing: false });

    expect(snapshot.phase).toBe("send");
    expect(snapshot.tracks.naive.status).toBe("sending");
    expect(snapshot.tracks.guarded.status).toBe("sending");
    expect(snapshot.tracks.naive.emailsSent).toBe(0);
    expect(snapshot.tracks.guarded.emailsSent).toBe(0);
  });

  it("ticks both counters to one once the first email is sent", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.22, playing: false });

    expect(snapshot.phase).toBe("send");
    expect(snapshot.tracks.naive).toMatchObject({
      status: "sent",
      emailsSent: 1,
    });
    expect(snapshot.tracks.guarded).toMatchObject({
      status: "sent",
      emailsSent: 1,
    });
  });

  it("crashes before recording while one email has already gone out", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.42, playing: false });

    expect(snapshot.phase).toBe("crash");
    expect(snapshot.tracks.naive.status).toBe("crashed");
    expect(snapshot.tracks.guarded.status).toBe("crashed");
    expect(snapshot.tracks.naive.emailsSent).toBe(1);
    expect(snapshot.tracks.guarded.emailsSent).toBe(1);
  });

  it("reruns the same activity code on retry for both tracks", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.6, playing: false });

    expect(snapshot.phase).toBe("retry");
    expect(snapshot.tracks.naive.status).toBe("retrying");
    expect(snapshot.tracks.guarded.status).toBe("retrying");
    expect(snapshot.tracks.guarded.statusLabel).toBe("retry checks abc-123");
  });

  it("diverges at resolve: naive resends, guarded skips", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.9, playing: false });

    expect(snapshot.phase).toBe("resolve");
    expect(snapshot.tracks.naive).toMatchObject({
      status: "resent",
      emailsSent: 2,
      outcome: "duplicate",
      outcomeLabel: "emails sent: 2",
    });
    expect(snapshot.tracks.guarded).toMatchObject({
      status: "skipped",
      emailsSent: 1,
      outcome: "exactly-once",
      outcomeLabel: "emails sent: 1",
    });
  });

  it("guarded track never sends a second email", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.99, playing: false });

    expect(snapshot.tracks.guarded.emailsSent).toBe(1);
  });

  it("uses the reduced-motion frame as the final divergent outcome", () => {
    const snapshot = deriveRetrySnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("resolve");
    expect(snapshot.tracks.naive.outcomeLabel).toBe("emails sent: 2");
    expect(snapshot.tracks.naive.outcome).toBe("duplicate");
    expect(snapshot.tracks.guarded.outcomeLabel).toBe("emails sent: 1");
    expect(snapshot.tracks.guarded.outcome).toBe("exactly-once");
  });
});

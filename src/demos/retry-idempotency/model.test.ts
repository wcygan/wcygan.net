import { describe, expect, it } from "vitest";
import { deriveRetrySnapshot, REDUCED_MOTION_PROGRESS } from "./model";

describe("deriveRetrySnapshot", () => {
  it("starts with empty ledgers and the first request in flight", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.08, playing: false });

    expect(snapshot.phase).toBe("send");
    expect(snapshot.tracks.stable.ledger).toHaveLength(0);
    expect(snapshot.tracks.fresh.ledger).toHaveLength(0);
    expect(snapshot.tracks.stable.delivered).toBe(0);
    expect(snapshot.tracks.stable.packet?.direction).toBe("request");
  });

  it("records one key and delivers one email on the first attempt", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.22, playing: false });

    expect(snapshot.phase).toBe("send");
    for (const track of [snapshot.tracks.stable, snapshot.tracks.fresh]) {
      expect(track.delivered).toBe(1);
      expect(track.ledger).toHaveLength(1);
      expect(track.ledger[0].messageId).toBe("msg_01");
      expect(track.providerAction).toBe("recorded");
    }
  });

  it("crashes after the email went out but before completion is recorded", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.42, playing: false });

    expect(snapshot.phase).toBe("crash");
    expect(snapshot.tracks.stable.workerStatus).toBe("crashed before ack");
    expect(snapshot.tracks.fresh.workerStatus).toBe("crashed before ack");
    expect(snapshot.tracks.stable.delivered).toBe(1);
    expect(snapshot.tracks.fresh.delivered).toBe(1);
  });

  it("recomputes a stable key but regenerates the fresh key on retry", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.58, playing: false });

    expect(snapshot.phase).toBe("retry");
    expect(snapshot.tracks.stable.attempt).toBe(2);
    // Stable: attempt 2 carries the exact same key as attempt 1.
    const attempt1 = deriveRetrySnapshot({ progress: 0.08, playing: false });
    expect(snapshot.tracks.stable.attemptKey).toBe(
      attempt1.tracks.stable.attemptKey,
    );
    // Fresh: attempt 2 carries a different key.
    expect(snapshot.tracks.fresh.attemptKey).not.toBe(
      attempt1.tracks.fresh.attemptKey,
    );
  });

  it("dedupes the stable key and never sends a second email", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.9, playing: false });
    const stable = snapshot.tracks.stable;

    expect(snapshot.phase).toBe("resolve");
    expect(stable.delivered).toBe(1);
    expect(stable.outcome).toBe("exactly-once");
    expect(stable.providerAction).toBe("dedupe-hit");
    expect(stable.ledger).toHaveLength(1);
    expect(stable.ledger[0].hit).toBe(true);
  });

  it("treats the fresh key as new and sends a duplicate", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.9, playing: false });
    const fresh = snapshot.tracks.fresh;

    expect(fresh.delivered).toBe(2);
    expect(fresh.outcome).toBe("duplicate");
    expect(fresh.providerAction).toBe("duplicate-send");
    expect(fresh.ledger).toHaveLength(2);
    expect(fresh.ledger[1].messageId).toBe("msg_02");
  });

  it("uses the reduced-motion frame as the final divergent outcome", () => {
    const snapshot = deriveRetrySnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("resolve");
    expect(snapshot.tracks.stable.delivered).toBe(1);
    expect(snapshot.tracks.stable.outcome).toBe("exactly-once");
    expect(snapshot.tracks.fresh.delivered).toBe(2);
    expect(snapshot.tracks.fresh.outcome).toBe("duplicate");
  });
});

import { describe, expect, it } from "vitest";
import { deriveRetrySnapshot, REDUCED_MOTION_PROGRESS } from "./model";

describe("deriveRetrySnapshot", () => {
  it("starts with empty ledgers and the first request in flight", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.08, playing: false });

    expect(snapshot.phase).toBe("send");
    expect(snapshot.tracks.stable.ledger).toHaveLength(0);
    expect(snapshot.tracks.blind.ledger).toHaveLength(0);
    expect(snapshot.tracks.stable.delivered).toBe(0);
    expect(snapshot.tracks.stable.packet?.direction).toBe("request");
  });

  it("records the stable key but the blind track records nothing", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.22, playing: false });
    expect(snapshot.phase).toBe("send");

    const stable = snapshot.tracks.stable;
    expect(stable.delivered).toBe(1);
    expect(stable.ledger).toHaveLength(1);
    expect(stable.ledger[0].messageId).toBe("msg_01");
    expect(stable.providerAction).toBe("recorded");

    // The blind track delivers the same email but sends no key, so the
    // provider's dedup ledger has nothing to record.
    const blind = snapshot.tracks.blind;
    expect(blind.delivered).toBe(1);
    expect(blind.ledger).toHaveLength(0);
    expect(blind.providerAction).toBe("blind-send");
  });

  it("crashes after the email went out but before completion is recorded", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.42, playing: false });

    expect(snapshot.phase).toBe("crash");
    expect(snapshot.tracks.stable.workerStatus).toBe("crashed before ack");
    expect(snapshot.tracks.blind.workerStatus).toBe("crashed before ack");
    expect(snapshot.tracks.stable.delivered).toBe(1);
    expect(snapshot.tracks.blind.delivered).toBe(1);
  });

  it("recomputes a stable key on retry while the blind track sends no key", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.58, playing: false });
    expect(snapshot.phase).toBe("retry");
    expect(snapshot.tracks.stable.attempt).toBe(2);

    const attempt1 = deriveRetrySnapshot({ progress: 0.08, playing: false });
    // Stable: attempt 2 carries the exact same key as attempt 1.
    expect(snapshot.tracks.stable.attemptKey).toBe(
      attempt1.tracks.stable.attemptKey,
    );
    // Blind: no key on either attempt.
    expect(snapshot.tracks.blind.attemptKey).toBe("(none)");
    expect(attempt1.tracks.blind.attemptKey).toBe("(none)");
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

  it("resends a duplicate on the blind track with an empty ledger", () => {
    const snapshot = deriveRetrySnapshot({ progress: 0.9, playing: false });
    const blind = snapshot.tracks.blind;

    expect(blind.delivered).toBe(2);
    expect(blind.outcome).toBe("duplicate");
    expect(blind.providerAction).toBe("duplicate-send");
    // No key was ever sent, so the provider recorded nothing to dedupe on.
    expect(blind.ledger).toHaveLength(0);
  });

  it("uses the reduced-motion frame as the final divergent outcome", () => {
    const snapshot = deriveRetrySnapshot({
      progress: REDUCED_MOTION_PROGRESS,
      playing: false,
    });

    expect(snapshot.phase).toBe("resolve");
    expect(snapshot.tracks.stable.delivered).toBe(1);
    expect(snapshot.tracks.stable.outcome).toBe("exactly-once");
    expect(snapshot.tracks.blind.delivered).toBe(2);
    expect(snapshot.tracks.blind.outcome).toBe("duplicate");
  });
});

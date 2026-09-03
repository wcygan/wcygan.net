import { describe, expect, it } from "vitest";
import {
  deriveReconciliationSnapshot,
  RECONCILIATION_DURATION_MS,
} from "./model";
describe("deriveReconciliationSnapshot", () => {
  it("has consistent duration constant", () => {
    expect(RECONCILIATION_DURATION_MS).toBeGreaterThan(0);
  });

  it("returns initial snapshot at t=0", () => {
    const s = deriveReconciliationSnapshot(0);
    expect(s.phase).toBe("idle");
    expect(s.activeStep).toBe(1);
    expect(s.isComplete).toBe(false);
  });

  it("transitions through steps 1, 2, 3, 4 sequentially", () => {
    const s1 = deriveReconciliationSnapshot(0.15);
    expect(s1.phase).toBe("detecting");
    expect(s1.activeStep).toBe(1);

    const s2 = deriveReconciliationSnapshot(0.4);
    expect(s2.phase).toBe("publishing");
    expect(s2.activeStep).toBe(2);

    const s3 = deriveReconciliationSnapshot(0.65);
    expect(s3.phase).toBe("applying");
    expect(s3.activeStep).toBe(3);

    const s4 = deriveReconciliationSnapshot(0.85);
    expect(s4.phase).toBe("cdc");
    expect(s4.activeStep).toBe(4);
  });

  it("completes at t=1 with repaired MySQL and synced lake", () => {
    const end = deriveReconciliationSnapshot(1);
    expect(end.isComplete).toBe(true);
    expect(end.phase).toBe("settled");
    expect(end.dbRowState.plan).toBe("pro");
    expect(end.dbRowState.status).toBe("repaired");
    expect(end.lakeRowState.status).toBe("indexed");
  });
});

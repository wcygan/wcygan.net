import { describe, expect, it } from "vitest";
import { databaseLogSnapshot, LOG_RECORDS, TOTAL_STEPS } from "./model";

describe("database log", () => {
  it("writes each record before appending it", () => {
    for (let step = 0; step <= TOTAL_STEPS; step++) {
      const snapshot = databaseLogSnapshot(step);
      expect(snapshot.appended).toHaveLength(Math.floor(step / 2));
      expect(snapshot.writing).toBe(step % 2 === 1);
      expect(snapshot.done).toBe(step === TOTAL_STEPS);
    }
  });

  it("retains the complete ordered log at the settled state", () => {
    expect(databaseLogSnapshot(TOTAL_STEPS).appended).toEqual(LOG_RECORDS);
    expect(databaseLogSnapshot(0).current).toBeNull();
    expect(databaseLogSnapshot(999).appended).toEqual(LOG_RECORDS);
  });
});

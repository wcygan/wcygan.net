import { describe, expect, it } from "vitest";
import {
  CDC_ACCEPTANCE_FLASH_DURATION_MS,
  CDC_PROPAGATION_DURATION_MS,
  deriveCdcPropagationSnapshot,
  INITIAL_CDC_PROPAGATION_SNAPSHOT,
} from "./model";

describe("deriveCdcPropagationSnapshot", () => {
  it("uses a finite ten-second explanatory timeline", () => {
    expect(CDC_PROPAGATION_DURATION_MS).toBe(10_000);
    expect(CDC_ACCEPTANCE_FLASH_DURATION_MS).toBe(500);
  });

  it("starts with the SQL in its origin and both stores serving free", () => {
    expect(INITIAL_CDC_PROPAGATION_SNAPSHOT).toMatchObject({
      phase: "establishing",
      sqlProgress: 0,
      sqlOpacity: 1,
      postgresPlanProgress: 0,
      postgresAcceptanceFlash: 0,
      eventProgress: 0,
      eventOpacity: 0,
      redisPlanProgress: 0,
      redisAcceptanceFlash: 0,
      isComplete: false,
    });
  });

  it("moves the SQL toward Postgres before either stored value changes", () => {
    const snapshot = deriveCdcPropagationSnapshot(0.2);

    expect(snapshot.phase).toBe("writing");
    expect(snapshot.sqlProgress).toBeGreaterThan(0);
    expect(snapshot.sqlProgress).toBeLessThan(1);
    expect(snapshot.sqlOpacity).toBe(1);
    expect(snapshot.postgresPlanProgress).toBe(0);
    expect(snapshot.redisPlanProgress).toBe(0);
  });

  it("accepts the SQL and updates Postgres at the same instant", () => {
    const beforeArrival = deriveCdcPropagationSnapshot(0.259);
    const accepted = deriveCdcPropagationSnapshot(0.26);

    expect(beforeArrival).toMatchObject({
      phase: "writing",
      postgresPlanProgress: 0,
      postgresAcceptanceFlash: 0,
    });
    expect(accepted).toMatchObject({
      phase: "committing",
      sqlProgress: 1,
      sqlOpacity: 1,
      postgresPlanProgress: 1,
      postgresAcceptanceFlash: 1,
      redisPlanProgress: 0,
    });
  });

  it("briefly highlights each accepted plan update", () => {
    const postgresAccepted = deriveCdcPropagationSnapshot(0.26);
    const postgresFlashHolding = deriveCdcPropagationSnapshot(0.294);
    const postgresFlashFading = deriveCdcPropagationSnapshot(0.3025);
    const postgresFlashFinished = deriveCdcPropagationSnapshot(0.31);
    const redisAccepted = deriveCdcPropagationSnapshot(0.82);
    const redisFlashHolding = deriveCdcPropagationSnapshot(0.854);
    const redisFlashFading = deriveCdcPropagationSnapshot(0.8625);
    const redisFlashFinished = deriveCdcPropagationSnapshot(0.87);

    expect(postgresAccepted.postgresAcceptanceFlash).toBe(1);
    expect(postgresFlashHolding.postgresAcceptanceFlash).toBe(1);
    expect(postgresFlashFading.postgresAcceptanceFlash).toBeGreaterThan(0);
    expect(postgresFlashFading.postgresAcceptanceFlash).toBeLessThan(1);
    expect(postgresFlashFinished.postgresAcceptanceFlash).toBe(0);
    expect(redisAccepted.redisAcceptanceFlash).toBe(1);
    expect(redisFlashHolding.redisAcceptanceFlash).toBe(1);
    expect(redisFlashFading.redisAcceptanceFlash).toBeGreaterThan(0);
    expect(redisFlashFading.redisAcceptanceFlash).toBeLessThan(1);
    expect(redisFlashFinished.redisAcceptanceFlash).toBe(0);
  });

  it("moves the change event linearly along the rail", () => {
    const first = deriveCdcPropagationSnapshot(0.475);
    const middle = deriveCdcPropagationSnapshot(0.59);
    const last = deriveCdcPropagationSnapshot(0.705);

    expect(first.eventProgress).toBeCloseTo(0.25, 8);
    expect(middle.eventProgress).toBeCloseTo(0.5, 8);
    expect(last.eventProgress).toBeCloseTo(0.75, 8);
    expect(middle.eventProgress - first.eventProgress).toBeCloseTo(
      last.eventProgress - middle.eventProgress,
      8,
    );
  });

  it("accepts the CDC event and updates Redis at the same instant", () => {
    const beforeArrival = deriveCdcPropagationSnapshot(0.819);
    const accepted = deriveCdcPropagationSnapshot(0.82);

    expect(beforeArrival).toMatchObject({
      phase: "propagating",
      redisPlanProgress: 0,
      redisAcceptanceFlash: 0,
    });
    expect(accepted).toMatchObject({
      phase: "applying",
      eventProgress: 1,
      eventOpacity: 1,
      redisPlanProgress: 1,
      redisAcceptanceFlash: 1,
    });
  });

  it("holds the synchronized values in the final settled state", () => {
    const snapshot = deriveCdcPropagationSnapshot(1);

    expect(snapshot).toMatchObject({
      phase: "settled",
      sqlProgress: 1,
      sqlOpacity: 0,
      postgresPlanProgress: 1,
      eventProgress: 1,
      eventOpacity: 0,
      redisPlanProgress: 1,
      postgresAcceptanceFlash: 0,
      redisAcceptanceFlash: 0,
      isComplete: true,
    });
  });

  it("clamps progress outside the timeline", () => {
    expect(deriveCdcPropagationSnapshot(-1)).toEqual(
      INITIAL_CDC_PROPAGATION_SNAPSHOT,
    );
    expect(deriveCdcPropagationSnapshot(2)).toEqual(
      deriveCdcPropagationSnapshot(1),
    );
  });
});

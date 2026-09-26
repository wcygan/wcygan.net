import { describe, expect, it } from "vitest";
import { durableRecords, recoveryFrames, type Protocol } from "./model";
for (const protocol of ["2pc", "3pc"] as Protocol[]) {
  describe(protocol, () => {
    it("retains prepared records through the crash and keeps the queued writer waiting until commit", () => {
      const frames = recoveryFrames(protocol);
      const crash = frames.find((f) => !f.online)!;
      expect(durableRecords(crash)).toContain("PREPARE");
      expect(crash.prepared && !crash.committed).toBe(true);
      expect(frames.filter((f) => f.released).every((f) => f.committed)).toBe(
        true,
      );
      for (let i = 1; i < frames.length; i++) {
        expect(
          durableRecords(frames[i]).slice(
            0,
            durableRecords(frames[i - 1]).length,
          ),
        ).toEqual(durableRecords(frames[i - 1]));
      }
    });
    it("stops for an explicit recovery action before releasing the rows", () => {
      const frames = recoveryFrames(protocol);
      const gate = frames.findIndex((f) => f.gate);
      expect(gate).toBeGreaterThan(0);
      expect(
        frames.slice(0, gate + 1).every((f) => !f.committed && !f.released),
      ).toBe(true);
      expect(frames.at(-1)?.committed).toBe(true);
    });
  });
}
it("2PC recovers the existing decision while 3PC leaves the old coordinator offline and unchanged", () => {
  const two = recoveryFrames("2pc"),
    three = recoveryFrames("3pc");
  expect(two.at(-1)?.online).toBe(true);
  const crash = three.findIndex((f) => !f.online);
  expect(
    three.slice(crash).every((f) => !f.online && f.decision === "PRE-COMMIT"),
  ).toBe(true);
  expect(three.at(-1)?.precommitted).toBe(true);
});

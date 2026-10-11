import { describe, expect, it } from "vitest";
import {
  CACHE_READS,
  DISK_READ_MS,
  RAM_READ_MS,
  workingSetSnapshot,
  WORKING_SET_CYCLE_MS,
} from "./working-set";

describe("frequent cache reads", () => {
  it("uses exactly 99 memory reads and one randomly positioned disk read per hundred", () => {
    expect(CACHE_READS).toHaveLength(300);
    for (let batch = 0; batch < 3; batch++)
      expect(
        CACHE_READS.slice(batch * 100, (batch + 1) * 100).filter(
          (read) => read.miss,
        ),
      ).toHaveLength(1);
    expect(
      new Set(workingSetSnapshot(4000).packets.map((read) => read.lane)).size,
    ).toBe(8);
    expect(CACHE_READS.filter((read) => read.miss)).toHaveLength(3);
    expect(CACHE_READS.find((read) => read.miss)!.id).toBeGreaterThan(0);
  });
  it("keeps a disk read waiting while later memory requests finish", () => {
    const miss = CACHE_READS.find((read) => read.miss)!;
    const state = workingSetSnapshot(miss.start + 3000);
    expect(state.diskWaiting).toBe(1);
    expect(state.packets.some((read) => read.id === miss.id)).toBe(true);
    expect(state.packets.some((read) => read.id === miss.id + 1)).toBe(false);
    expect(DISK_READ_MS).toBeGreaterThan(RAM_READ_MS * 4);
    expect(workingSetSnapshot(miss.start + DISK_READ_MS).ssdReads).toBe(1);
  });
  it("keeps reads in flight across every cycle boundary with bounded active state", () => {
    for (const time of [
      WORKING_SET_CYCLE_MS - 1,
      WORKING_SET_CYCLE_MS,
      WORKING_SET_CYCLE_MS + 1,
      36000,
      3600000,
    ]) {
      const state = workingSetSnapshot(time);
      expect(state.packets.length).toBeGreaterThan(20);
      expect(state.packets.length).toBeLessThan(40);
      expect(state.started).toBe(
        state.ramReads + state.ssdReads + state.packets.length,
      );
      expect(new Set(state.packets.map((read) => read.id)).size).toBe(
        state.packets.length,
      );
    }
    expect(
      workingSetSnapshot(18001).packets.some((read) => read.id < 300),
    ).toBe(true);
    expect(
      workingSetSnapshot(18001).packets.some((read) => read.id >= 300),
    ).toBe(true);
  });
  it("returns a disk page through the same originating lane before replying", () => {
    const miss = CACHE_READS.find((read) => read.miss)!;
    const fill = workingSetSnapshot(miss.start + 5500).packets.find(
      (read) => read.id === miss.id,
    )!;
    expect(fill).toMatchObject({
      phase: "fill",
      progress: 0.5,
      lane: miss.lane,
    });
    const response = workingSetSnapshot(miss.start + 6500).packets.find(
      (read) => read.id === miss.id,
    )!;
    expect(response).toMatchObject({
      phase: "return",
      progress: 0.5,
      lane: miss.lane,
    });
  });
});

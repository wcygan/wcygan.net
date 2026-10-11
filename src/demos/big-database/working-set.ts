// A repeating arrival schedule: one randomly placed miss per 100 page reads.
// Durations are presentation timing, not measured database latency.
export const READ_INTERVAL_MS = 60;
export const CACHE_LANE_COUNT = 8;
export const RAM_READ_MS = 1_500;
export const DISK_READ_MS = 7_000;
let seed = 42;
export const CACHE_READS = Array.from({ length: 3 }, (_, batch) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const miss = 20 + (seed % 60);
  return Array.from({ length: 100 }, (_, i) => {
    const id = batch * 100 + i;
    return {
      id,
      start: id * READ_INTERVAL_MS,
      miss: i === miss,
      lane: id % CACHE_LANE_COUNT,
    };
  });
}).flat();
export const WORKING_SET_CYCLE_MS = CACHE_READS.length * READ_INTERVAL_MS;
function packetPhase(age: number, miss: boolean) {
  if (age < 450) return { phase: "lookup", progress: age / 450 } as const;
  if (!miss) {
    if (age < 600) return { phase: "memory", progress: 0 } as const;
    return { phase: "return", progress: (age - 600) / 900 } as const;
  }
  if (age < 1800)
    return { phase: "disk", progress: (age - 450) / 1350 } as const;
  if (age < 5000)
    return { phase: "wait", progress: (age - 1800) / 3200 } as const;
  if (age < 6000)
    return { phase: "fill", progress: (age - 5000) / 1000 } as const;
  return { phase: "return", progress: (age - 6000) / 1000 } as const;
}
export function workingSetSnapshot(elapsed: number) {
  const time = Math.max(0, elapsed);
  const cycle = Math.floor(time / WORKING_SET_CYCLE_MS);
  // Every earlier cycle has fully returned. Only two cycles can have live reads.
  let ramReads = Math.max(0, cycle - 1) * 297;
  let ssdReads = Math.max(0, cycle - 1) * 3;
  const packets = [];
  for (let current = Math.max(0, cycle - 1); current <= cycle; current++) {
    for (const read of CACHE_READS) {
      const age = time - (current * WORKING_SET_CYCLE_MS + read.start);
      if (age < 0) continue;
      if (age >= (read.miss ? DISK_READ_MS : RAM_READ_MS)) {
        if (read.miss) ssdReads++;
        else ramReads++;
      } else {
        const id = current * CACHE_READS.length + read.id;
        packets.push({
          ...read,
          id,
          lane: id % CACHE_LANE_COUNT,
          ...packetPhase(age, read.miss),
        });
      }
    }
  }
  return {
    started: Math.floor(time / READ_INTERVAL_MS) + 1,
    ramReads,
    ssdReads,
    diskWaiting: packets.filter((read) => read.phase === "wait").length,
    packets,
  };
}

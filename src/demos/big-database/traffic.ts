// Illustrative aggregate primary traffic sampled every 15 minutes, including both day edges.
// Periodic curves preserve the reported arithmetic daily averages.
export const trafficSamples = Array.from({ length: 97 }, (_, index) => {
  const hour = index / 4;
  const phase = ((hour - 14) * Math.PI) / 12;
  return {
    hour,
    reads: 10000 + 2000 * Math.cos(phase),
    writes: 100 + 60 * Math.cos(phase) + 40 * Math.cos(2 * phase),
  };
});

export const trafficSummary = {
  reads: { average: 10000, peak: 12000 },
  writes: { average: 100, peak: 200 },
};

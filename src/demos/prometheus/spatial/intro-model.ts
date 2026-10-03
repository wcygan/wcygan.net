export const INTRO = {
  architecture: {
    title: "Monitoring Pipeline",
    states: [
      "Application → /metrics",
      "Prometheus scrapes → timestamped samples",
      "Stored samples → queries and rules",
      "Firing alerts → Alertmanager → grouped, routed notifications",
    ],
    caption:
      "Measurements feed queries and alerts. Boxes show roles; distance does not represent latency.",
  },
  series: {
    title: "Series and Samples",
    states: [
      "0 s: A = 4, B = 8.",
      "15 s: A = 7, B = 10.",
      "30 s: A = 10, B = 12.",
      "45 s: A = 13, B = 14. Two label sets still mean two series.",
    ],
    caption:
      "Lane = label set · length = time · height = value. More samples extend history, not series count.",
  },
  alerts: {
    title: "Sustained Alerts",
    states: [
      "0 s · errors > 20% → pending",
      "10 s · still true → pending",
      "20 s · pending. A false evaluation would reset the timer.",
      "After 30 s continuously true → firing. Alertmanager delivers notifications.",
    ],
    caption:
      "for: 30s requires a sustained condition. Timeline = elapsed time, not queued requests.",
  },
} as const;

export function seriesValue(lane: number, sample: number) {
  return (lane ? 8 : 4) + sample * (lane ? 2 : 3);
}

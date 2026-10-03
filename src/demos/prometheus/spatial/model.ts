export type CardinalityScenario = "bounded" | "users";

export const metricName = "http_requests_total";
export const STORAGE_STEPS = 4;

const methods = ["GET", "POST"] as const;
const routes = ["/orders", "/search", "/health"] as const;
const statuses = ["200", "500"] as const;

export type PrometheusSeries = {
  id: string;
  method: (typeof methods)[number];
  route: (typeof routes)[number];
  status: (typeof statuses)[number];
  userId?: string;
  methodIndex: number;
  routeIndex: number;
  statusIndex: number;
  userIndex: number;
};

export function cardinalitySnapshot(scenario: CardinalityScenario) {
  const userCount = scenario === "users" ? 10 : 1;
  const series: PrometheusSeries[] = [];

  // Every combination below is actually emitted in this illustrative workload.
  // Possible label values alone do not create a Prometheus time series.
  methods.forEach((method, methodIndex) => {
    routes.forEach((route, routeIndex) => {
      statuses.forEach((status, statusIndex) => {
        for (let userIndex = 0; userIndex < userCount; userIndex++) {
          const userId = `u${userIndex + 1}`;
          const labels = `method="${method}",route="${route}",status="${status}"`;
          series.push({
            id: `${metricName}{${labels}${scenario === "users" ? `,user_id="${userId}"` : ""}}`,
            method,
            route,
            status,
            ...(scenario === "users" ? { userId } : {}),
            methodIndex,
            routeIndex,
            statusIndex,
            userIndex,
          });
        }
      });
    });
  });

  return {
    metricName,
    series,
    count: series.length,
    dimensionSummary:
      scenario === "users"
        ? "2 methods × 3 routes × 2 statuses × 10 users"
        : "2 methods × 3 routes × 2 statuses",
    message:
      scenario === "users"
        ? "10 user IDs multiply the emitted combinations by ten."
        : "2 methods × 3 routes × 2 statuses.",
  };
}

export type StorageBlock = {
  id: string;
  startHour: number;
  endHour: number;
};

export type StorageSnapshot = {
  title: string;
  explanation: string;
  blocks: StorageBlock[];
  head: { startHour: number; endHour: number; samples: number };
  walSamples: number;
  deletedRange?: { startHour: number; endHour: number };
  recovery: boolean;
};

function block(startHour: number, endHour: number): StorageBlock {
  return { id: `block-${startHour}-${endHour}`, startHour, endHour };
}

// A teaching sequence, not a simulation of Prometheus's exact maintenance
// scheduler. Compaction keeps sample values; retention removes whole blocks.
export function storageSnapshot(step: number): StorageSnapshot {
  const tick = Number.isNaN(step)
    ? 0
    : Math.max(0, Math.min(STORAGE_STEPS - 1, Math.floor(step)));

  if (tick === 0) {
    return {
      title: "Recent samples enter Head and WAL",
      explanation:
        "Recent samples live in Head, backed by the write-ahead log (WAL).",
      blocks: [block(0, 2), block(2, 4), block(4, 6)],
      head: { startHour: 6, endHour: 8, samples: 6 },
      walSamples: 6,
      recovery: false,
    };
  }

  if (tick === 1) {
    return {
      title: "Head becomes an immutable block",
      explanation:
        "Head persists as a block; newer samples start a fresh Head and WAL.",
      blocks: [block(0, 2), block(2, 4), block(4, 6), block(6, 8)],
      head: { startHour: 8, endHour: 10, samples: 3 },
      walSamples: 3,
      recovery: false,
    };
  }

  if (tick === 2) {
    return {
      title: "Compact blocks and recover Head",
      explanation:
        "Compaction preserves samples. After restart, the WAL recovers the three active Head samples.",
      blocks: [block(0, 6), block(6, 8)],
      head: { startHour: 8, endHour: 10, samples: 3 },
      walSamples: 3,
      recovery: true,
    };
  }

  return {
    title: "Retention expires a whole block",
    explanation:
      "The expired 0–6 h block is deleted. Remaining samples keep their original resolution.",
    blocks: [block(6, 8)],
    head: { startHour: 8, endHour: 10, samples: 3 },
    walSamples: 3,
    deletedRange: { startHour: 0, endHour: 6 },
    recovery: false,
  };
}

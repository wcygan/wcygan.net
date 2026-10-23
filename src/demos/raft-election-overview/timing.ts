import {
  lessons,
  electionServers as servers,
  messageDeparture,
  type Lesson,
  type ElectionServer as Server,
} from "./model";
import { electionLayout, messageRoute } from "./layout";
import { routeLength, payloadUnitsPerSecond } from "../raft-transport";

// Fixed samples for the authored elections, in illustrative milliseconds.
// Other nodes have enough time to receive a grant request or a heartbeat at
// the shared packet speed. Replay uses the same samples, not fresh randomness.
const timeouts: Record<Server, number> = {
  A: 40000,
  B: 32000,
  C: 44000,
};
type ClockReset = { at: number; interval: number };
function buildTiming(lesson: Lesson, compact: boolean) {
  const steps = lessons[lesson].steps;
  const layout = electionLayout(compact);
  const flights = steps.map((step) =>
    (step.traffic ?? []).map(
      (message) =>
        (routeLength(messageRoute(layout, message)) / payloadUnitsPerSecond) *
        1000,
    ),
  );
  const arrivals = steps.map((step, index) =>
    (step.traffic ?? []).map(
      (message, order) =>
        flights[index][order] + messageDeparture(step, order, flights[index]),
    ),
  );
  const durations = arrivals.map((arrivals) =>
    Math.max(4000, ...arrivals.map((at) => at + 800)),
  );
  let elapsed = 0;
  const starts = durations.map((duration) => {
    const start = elapsed;
    elapsed += duration;
    return start;
  });
  // Manual checkpoints settle the packet beat before the next timer event.
  // In particular, the split-vote checkpoint must precede B's retry deadline.
  const checkpoints = durations.map((duration, index) =>
    index === steps.length - 1
      ? duration
      : Math.max(0, duration - 800, ...arrivals[index]),
  );
  const clocks = Object.fromEntries(
    servers.map((server) => [
      server,
      [
        {
          at: 0,
          interval:
            server === "B" || lesson === "split" ? starts[1] : timeouts[server],
        },
      ],
    ]),
  ) as Record<Server, ClockReset[]>;
  steps.forEach((step, index) => {
    const previous = steps[index - 1];
    for (const server of step.candidates) {
      if (previous?.term === step.term && previous.candidates.includes(server))
        continue;
      const retry = steps.findIndex(
        (next, nextIndex) =>
          nextIndex > index &&
          next.term > step.term &&
          next.candidates.includes(server),
      );
      clocks[server].push({
        at: starts[index],
        interval: retry < 0 ? timeouts[server] : starts[retry] - starts[index],
      });
    }
    (step.traffic ?? []).forEach((message, order) => {
      if (
        message.kind === "heartbeat" ||
        (message.kind === "request" && !step.candidates.includes(message.to))
      )
        clocks[message.to].push({
          at: starts[index] + arrivals[index][order],
          interval: timeouts[message.to],
        });
    });
  });
  return { flights, durations, starts, checkpoints, clocks };
}
const timings = {
  success: [buildTiming("success", false), buildTiming("success", true)],
  split: [buildTiming("split", false), buildTiming("split", true)],
};
export const getElectionTiming = (lesson: Lesson, compact: boolean) =>
  timings[lesson][Number(compact)];

export function electionTimers(
  lesson: Lesson,
  index: number,
  elapsed: number,
  compact = false,
) {
  const timing = getElectionTiming(lesson, compact);
  const now = timing.starts[index] + elapsed;
  return Object.fromEntries(
    servers.map((server) => {
      const reset = timing.clocks[server].findLast((reset) => reset.at <= now)!;
      return [
        server,
        {
          resetAt: reset.at,
          deadline: reset.at + reset.interval,
          progress: Math.min(1, Math.max(0, (now - reset.at) / reset.interval)),
        },
      ];
    }),
  ) as Record<Server, { resetAt: number; deadline: number; progress: number }>;
}

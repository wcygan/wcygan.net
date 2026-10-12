import {
  replicationLayout,
  messageRoute,
} from "../raft-log-replication/layout";
import {
  raftServers,
  routeLength,
  payloadUnitsPerSecond,
} from "../raft-transport";

type Server = (typeof raftServers)[number];
export type Entry = { index: number; term: number; command: string };
const prefix: readonly Entry[] = [
  { index: 1, term: 5, command: "x = 1" },
  { index: 2, term: 5, command: "x += 2" },
  { index: 3, term: 5, command: "x = 8" },
];
export const leaderLog: readonly Entry[] = [
  ...prefix,
  { index: 4, term: 7, command: "x *= 2" },
];
export const returningLog: readonly Entry[] = [
  ...prefix,
  { index: 4, term: 5, command: "x = 99" },
  { index: 5, term: 5, command: "x += 1" },
];

// Raft Figure 2: check the preceding index/term before modifying the log.
// Truncate only at a conflicting incoming entry, never on a failed probe.
export function appendEntries(
  log: readonly Entry[],
  commit: number,
  previous: { index: number; term: number },
  incoming: readonly Entry[],
  leaderCommit: number,
) {
  if (
    previous.index !== 0 &&
    log.find((entry) => entry.index === previous.index)?.term !== previous.term
  )
    return { accepted: false, log: [...log], commit };
  let next = [...log];
  for (const entry of incoming) {
    const existing = next.find((item) => item.index === entry.index);
    if (existing && existing.term !== entry.term) {
      if (entry.index <= commit)
        throw new Error("Committed entries cannot be replaced");
      next = next.filter((item) => item.index < entry.index);
    }
    if (!next.some((item) => item.index === entry.index)) next.push(entry);
  }
  return {
    accepted: true,
    log: next,
    commit: Math.max(
      commit,
      Math.min(leaderCommit, previous.index + incoming.length),
    ),
  };
}
export type Message = {
  kind: "check" | "reject" | "repair" | "ack";
  from: Server;
  to: Server;
  start: number;
  end: number;
  short: string;
  label: string;
};

function buildLesson(compact: boolean) {
  const layout = replicationLayout(compact);
  const padding = compact ? 12 : 16;
  const labelWidth = compact ? 64 : 72;
  const cellWidth = (layout.nodes.A.width - padding * 2 - labelWidth - 16) / 3;
  const replacementBounds = {
    x: layout.nodes.A.x + padding + labelWidth + cellWidth + 8,
    toY: layout.nodes.B.y + (compact ? 92 : 68),
    width: cellWidth,
  };
  const copyCenter = replacementBounds.x + cellWidth / 2;
  const replacementRoute: [number, number][] = [
    [copyCenter, layout.nodes.A.y + (compact ? 92 : 68) + 48],
    [copyCenter, replacementBounds.toY + 48],
  ];
  const route = (message: Pick<Message, "from" | "to">) =>
    messageRoute(layout, message);
  const flight = (
    kind: Message["kind"],
    from: Server,
    to: Server,
    start: number,
    short: string,
    label: string,
  ): Message => ({
    kind,
    from,
    to,
    start,
    end:
      start + (routeLength(route({ from, to })) / payloadUnitsPerSecond) * 1000,
    short,
    label,
  });
  const check = flight(
    "check",
    "A",
    "B",
    1500,
    "4/T7",
    "Check previous entry #4, term 7",
  );
  const reject = flight(
    "reject",
    "B",
    "A",
    check.end + 800,
    "No",
    "Rejected: B's entry #4 is term 5",
  );
  const repair = flight(
    "repair",
    "A",
    "B",
    reject.end + 1200,
    "3/T5",
    "Previous #3, term 5; send #4, term 7; commit index 4",
  );
  const deletingAt = repair.end + 600;
  const deletedAt = deletingAt + 1600;
  const replacementAt = deletedAt + 1200;
  const replacementArrivedAt =
    replacementAt +
    (routeLength(replacementRoute) / payloadUnitsPerSecond) * 1000;
  const persistedAt = replacementArrivedAt + 800;
  const ack = flight(
    "ack",
    "B",
    "A",
    persistedAt + 1200,
    "Ack 4",
    "Durably stored through #4",
  );
  const duration = ack.end + 1500;
  const beats = [
    {
      start: 0,
      settledAt: 0,
      title: "A returning server has a conflicting suffix",
      detail:
        "Separate scenario: A and C have committed #4 in term 7. B knows commitment through #3 and still stores uncommitted #4–5 from term 5.",
    },
    {
      start: check.start,
      settledAt: check.end,
      title: "Check the preceding entry",
      detail:
        "A starts with nextIndex 5 and checks #4 / term 7. B's #4 is term 5, so the prefix check fails. B keeps its entire log.",
    },
    {
      start: reject.start,
      settledAt: reject.end,
      title: "Back up after the refusal",
      detail:
        "B replies No. Only when A receives that reply does it reduce B's nextIndex from 5 to 4. B's entries are still unchanged.",
    },
    {
      start: repair.start,
      settledAt: repair.end,
      title: "Retry from a matching prefix",
      detail:
        "A retries with previous #3 / term 5 and its #4 / term 7. B's preceding entry matches. B persists the replacement before acknowledging.",
    },
    {
      start: deletingAt,
      settledAt: deletedAt,
      title: "Delete B’s uncommitted #4–5",
      detail:
        "The preceding #3 matches. B removes its conflicting #4 and the following #5. Crossed-out ghosts show what was deleted; the green, committed #1–3 prefix stays intact. The replacement is not yet durable.",
    },
    {
      start: replacementAt,
      settledAt: persistedAt,
      title: "Store A’s #4 in the same position",
      detail:
        "A’s purple #4 moves into B’s vacated slot. B persists term 7, x *= 2 before acknowledging. It turns green with a checkmark once storage and commitment are known. Old #5 stays deleted; committed #1–3 remain unchanged.",
    },
    {
      start: ack.start,
      settledAt: ack.end,
      title: "Confirm durable storage",
      detail:
        "B replies Stored through #4 after persistence. A updates its confirmed position to 4 and nextIndex to 5 only when the reply arrives.",
    },
    {
      start: duration,
      settledAt: duration,
      title: "Same committed log. Conflicting suffix removed.",
      detail:
        "All three servers contain the same entries through #4. B's old #4–5 were never committed or applied; the committed prefix survived. Applying the agreed log produces x = 16.",
    },
  ];
  return {
    layout,
    replacementBounds,
    replacementRoute,
    route,
    messages: [check, reject, repair, ack],
    check,
    reject,
    repair,
    ack,
    deletingAt,
    deletedAt,
    replacementAt,
    replacementArrivedAt,
    persistedAt,
    duration,
    beats,
  };
}
const lessons = [buildLesson(false), buildLesson(true)];
export const conflictLesson = (compact = false) => lessons[Number(compact)];
export function conflictState(elapsed: number, compact = false) {
  const lesson = conflictLesson(compact);
  const repaired = elapsed >= lesson.persistedAt;
  const deleted = elapsed >= lesson.deletingAt;
  const result = repaired
    ? appendEntries(
        returningLog,
        3,
        { index: 3, term: 5 },
        leaderLog.slice(3),
        4,
      )
    : { log: deleted ? returningLog.slice(0, 3) : returningLog, commit: 3 };
  return {
    nodes: raftServers.map((id) => ({
      id,
      role: id === "A" ? "Leader" : "Follower",
      term: 7,
      log: id === "B" ? result.log : leaderLog,
      commit: id === "B" ? result.commit : 4,
    })),
    step: Math.max(
      0,
      lesson.beats.findLastIndex((beat) => elapsed >= beat.start),
    ),
    nextIndex:
      elapsed >= lesson.ack.end ? 5 : elapsed >= lesson.reject.end ? 4 : 5,
    confirmed: elapsed >= lesson.ack.end ? 4 : 0,
    writing: elapsed >= lesson.repair.end && !repaired,
    deleted,
    repaired,
    deletionProgress: Math.max(
      0,
      Math.min(
        1,
        (elapsed - lesson.deletingAt) / (lesson.deletedAt - lesson.deletingAt),
      ),
    ),
    replacementProgress: Math.max(
      0,
      Math.min(
        1,
        (elapsed - lesson.replacementAt) /
          (lesson.replacementArrivedAt - lesson.replacementAt),
      ),
    ),
    replacing: elapsed >= lesson.replacementAt && !repaired,
    checked:
      elapsed >= lesson.repair.start
        ? 3
        : elapsed >= lesson.check.start
          ? 4
          : null,
  };
}

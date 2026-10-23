import { raftServers as servers, paceFlights } from "../raft-transport";
import { recoveryLayout } from "./layout";
export { servers };
export type Server = (typeof servers)[number];
export type Node = {
  id: Server;
  role: "Leader" | "Follower" | "Candidate";
  term: number;
  stored: number;
  commit: number;
  vote: Server | null;
  offline: boolean;
  writing: boolean;
};
export const entries = [
  { index: 3, term: 5, label: "#1–3", command: "x = 8" },
  { index: 4, term: 5, label: "#4", command: "x += 1" },
  { index: 5, term: 7, label: "#5", command: "x *= 2" },
] as const;
export function lastEntry(node: Pick<Node, "stored">) {
  return { term: node.stored === 5 ? 7 : 5, index: node.stored };
}
// RequestVote compares entry terms, not the candidate's election term.
// Raft paper, Figure 2 and §5.4.1: https://raft.github.io/raft.pdf
export function logIsCurrent(
  candidate: { term: number; index: number },
  voter: { term: number; index: number },
) {
  return (
    candidate.term > voter.term ||
    (candidate.term === voter.term && candidate.index >= voter.index)
  );
}
function receiveTerm(node: Node, term: number) {
  if (term > node.term) {
    node.term = term;
    node.role = "Follower";
    node.vote = null;
  }
}
export function requestVote(voter: Node, candidate: Node) {
  if (voter.offline || candidate.term < voter.term) return false;
  receiveTerm(voter, candidate.term);
  if (
    (voter.vote === null || voter.vote === candidate.id) &&
    logIsCurrent(lastEntry(candidate), lastEntry(voter))
  ) {
    voter.vote = candidate.id;
    return true;
  }
  return false;
}
const authoredBeats = [
  {
    title: "Working majority",
    detail:
      "A later snapshot: B leads term 5. B and A know #4 is committed; C still ends at #3.",
    settledAt: 0,
  },
  {
    title: "Leader stops",
    detail:
      "B stops sending heartbeats. Its durable log survives, but it cannot send messages or vote. New writes wait.",
    settledAt: 4000,
  },
  {
    title: "C tries first",
    detail:
      "C times out and votes for itself in term 6. Its request advertises last entry term 5, index 3.",
    settledAt: 8000,
  },
  {
    title: "A refuses",
    detail:
      "A receives term 6, but refuses C: both last entries are term 5, and A ends at #4 instead of #3. C has 1 vote; 2 are required.",
    settledAt: 12000,
  },
  {
    title: "A wins the next term",
    detail:
      "A times out in term 7. C grants its vote because A's log is current. A wins with its own vote and C's reply; C then receives A's heartbeat.",
    settledAt: 19000,
  },
  {
    title: "Replication resumes",
    detail:
      "A stores #5 in term 7, then sends #4–5 with commit index 4. C persists both and learns that #4 is committed; #5 remains pending locally.",
    settledAt: 22000,
  },
  {
    title: "Majority confirms",
    detail:
      "C acknowledges only after persistence. When the reply arrives, A commits its current-term entry #5 with 2 stored copies. C still knows commitment only through #4.",
    settledAt: 25000,
  },
  {
    title: "Commitment spreads",
    detail:
      "A sends commit index 5. C marks #5 committed only when that message arrives.",
    settledAt: 29000,
  },
  {
    title: "B returns as a follower",
    detail:
      "B restarts with its durable term 5 and log through #4, but commitment knowledge resets. It receives term 7, stores #5, and learns commit index 5 from A.",
    settledAt: 34000,
  },
  {
    title: "Committed entries survived. New writes resumed.",
    detail:
      "A leads term 7. All three servers store the same log through #5 and know it is committed. The commands produce x = 18 when applied in order.",
    settledAt: 36000,
  },
] as const;

export type Message = {
  from: Server;
  to: Server;
  start: number;
  end: number;
  label: string;
  short: string;
  payload: readonly string[];
};
const authoredMessages: readonly Message[] = [
  // Regular heartbeats share the same arrival schedule as the node timers.
  ...(["A", "C"] as const).flatMap((to) =>
    [2000, 4000].map((end) => ({
      from: "B" as const,
      to,
      start: end - 1400,
      end,
      label: "Heartbeat · term 5 · commit 4",
      short: "T5",
      payload: ["Heartbeat", "Term: 5", "Commit: 4"],
    })),
  ),
  {
    from: "C",
    to: "A",
    start: 8200,
    end: 9200,
    label: "Request vote · term 6 · last entry 5 / 3",
    short: "Vote?",
    payload: ["Request vote", "Term: 6", "Last: #3/T5"],
  },
  {
    from: "A",
    to: "C",
    start: 9800,
    end: 11000,
    label: "Vote refused · stale log",
    short: "No",
    payload: ["Vote refused", "Term: 6", "Stale log"],
  },
  {
    from: "A",
    to: "C",
    start: 16200,
    end: 17000,
    label: "Request vote · term 7 · last entry 5 / 4",
    short: "Vote?",
    payload: ["Request vote", "Term: 7", "Last: #4/T5"],
  },
  {
    from: "C",
    to: "A",
    start: 17200,
    end: 18000,
    label: "Vote granted",
    short: "Yes",
    payload: ["Vote granted", "Term: 7"],
  },
  {
    from: "A",
    to: "C",
    start: 18200,
    end: 19000,
    label: "Heartbeat · term 7",
    short: "T7",
    payload: ["Heartbeat", "Term: 7", "Commit: 4"],
  },
  {
    from: "A",
    to: "C",
    start: 20200,
    end: 21000,
    label: "Entries #4–5 · commit 4",
    short: "4–5",
    payload: ["Entries #4–5", "Term: 7", "Commit: 4"],
  },
  {
    from: "C",
    to: "A",
    start: 24000,
    end: 25000,
    label: "Stored through #5",
    short: "Ack",
    payload: ["Ack", "Stored #5", "Term: 7"],
  },
  {
    from: "A",
    to: "C",
    start: 26200,
    end: 29000,
    label: "Heartbeat · commit 5",
    short: "CI5",
    payload: ["Heartbeat", "Term: 7", "Commit: 5"],
  },
  ...[23000, 31000, 35000].map((end) => ({
    from: "A" as const,
    to: "C" as const,
    start: end - 800,
    end,
    label: `Heartbeat · term 7 · commit ${end < 25000 ? 4 : 5}`,
    short: "T7",
    payload: ["Heartbeat", "Term: 7", `Commit: ${end < 25000 ? 4 : 5}`],
  })),
  {
    from: "A",
    to: "B",
    start: 34200,
    end: 35000,
    label: "Heartbeat · term 7 · commit 5",
    short: "T7",
    payload: ["Heartbeat", "Term: 7", "Commit: 5"],
  },
  {
    from: "A",
    to: "B",
    start: 32200,
    end: 33000,
    label: "Term 7 · entry #5 · commit 5",
    short: "#5",
    payload: ["Entry #5", "Term: 7", "Commit: 5"],
  },
];

export function recoveryLesson(compact = false) {
  const layout = recoveryLayout(compact);
  const paced = paceFlights(authoredMessages, (message) =>
    layout.route(message),
  );
  // The visible heartbeat routes take just over four seconds between arrivals.
  // Give C six seconds after its last heartbeat, extending only the quiet wait
  // after B stops. Later flights keep their original travel durations.
  const time = (at: number) =>
    paced.time(at) + Math.min(1, Math.max(0, (at - 4000) / 4000)) * 2000;
  const messages = paced.messages.map((message) => {
    const delay = message.start > paced.time(4000) ? 2000 : 0;
    return {
      ...message,
      start: message.start + delay,
      end: message.end + delay,
    };
  });
  const beats = authoredBeats.map((beat) => ({
    ...beat,
    settledAt: time(beat.settledAt),
  }));
  return { messages, time, beats, duration: time(36000) };
}
const lessons = [recoveryLesson(false), recoveryLesson(true)];
export const { messages, beats, duration, time: recoveryTime } = lessons[0];
export const getRecoveryLesson = (compact: boolean) => lessons[Number(compact)];

export function nodeTimer(node: Node, elapsed: number, compact = false) {
  const { messages, time } = getRecoveryLesson(compact);
  if (node.offline)
    return {
      kind: "offline" as const,
      label: "Timer stopped",
      elapsed: 0,
      interval: 0,
      progress: 0,
    };
  const heartbeat = node.role === "Leader";
  let resets: number[];
  let interval: number;
  const incoming = messages
    .filter(
      (message) =>
        message.to === node.id && message.label.startsWith("Heartbeat"),
    )
    .map((message) => message.end);
  if (heartbeat) {
    const sends = messages
      .filter(
        (message) =>
          message.from === node.id && message.label.startsWith("Heartbeat"),
      )
      .map((message) => message.start);
    resets = [...new Set([node.id === "B" ? 0 : time(18000), ...sends])].sort(
      (a, b) => a - b,
    );
    const current = resets.findLast((at) => at <= elapsed) ?? 0;
    const next = resets.find((at) => at > elapsed);
    interval =
      next === undefined
        ? Math.max(4000, resets.at(-1)! - (resets.at(-2) ?? 0))
        : next - current;
  } else if (node.id === "A") {
    resets = [0, ...incoming, time(16000)].sort((a, b) => a - b);
    interval = time(16000) - (incoming.at(-1) ?? 0);
  } else if (node.id === "C" && elapsed < time(8000)) {
    resets = [0, ...incoming.filter((at) => at < time(8000))];
    interval = time(8000) - resets.at(-1)!;
  } else {
    resets =
      node.id === "B"
        ? [time(32000), time(33000), ...incoming]
        : [time(8000), time(17000), time(21000), ...incoming];
    resets.sort((a, b) => a - b);
    interval = Math.max(
      12000,
      ...resets.slice(1).map((at, index) => at - resets[index] + 4000),
    );
  }
  const start = resets.findLast((at) => at <= elapsed) ?? 0;
  const spent = Math.min(interval, Math.max(0, elapsed - start));
  return {
    kind: heartbeat ? ("heartbeat" as const) : ("election" as const),
    label: heartbeat ? "Heartbeat interval" : "Election timeout",
    elapsed: spent,
    interval,
    progress: spent / interval,
  };
}

// Authored crash/recovery schedule with intact durable storage, not a general
// Raft simulator. Arrival and persistence events are deliberately separate.
export function recoveryState(elapsed: number, compact = false) {
  const { time } = getRecoveryLesson(compact);
  const nodes: Node[] = servers.map((id) => ({
    id,
    role: id === "B" ? "Leader" : "Follower",
    term: 5,
    stored: id === "C" ? 3 : 4,
    commit: id === "C" ? 3 : 4,
    // B was elected with its own vote and A's vote in term 5. Both votes
    // survive for the rest of that term, including B's crash and restart.
    vote: id === "C" ? null : "B",
    offline: false,
    writing: false,
  }));
  const [b, a, c] = nodes;
  if (elapsed >= time(4000)) b.offline = true;
  if (elapsed >= time(8000)) {
    c.term = 6;
    c.role = "Candidate";
    c.vote = "C";
  }
  if (elapsed >= time(9200)) requestVote(a, c);
  if (elapsed >= time(16000)) {
    a.term = 7;
    a.role = "Candidate";
    a.vote = "A";
  }
  if (elapsed >= time(17000)) requestVote(c, a);
  if (elapsed >= time(18000)) a.role = "Leader";
  if (elapsed >= time(19000)) c.role = "Follower";
  if (elapsed >= time(20000)) a.stored = 5;
  if (elapsed >= time(21000)) c.writing = true;
  if (elapsed >= time(21600)) {
    c.writing = false;
    c.stored = 5;
    c.commit = 4;
  }
  if (elapsed >= time(25000)) a.commit = 5;
  if (elapsed >= time(29000)) c.commit = 5;
  if (elapsed >= time(32000)) {
    b.offline = false;
    b.role = "Follower";
    b.commit = 0;
  }
  if (elapsed >= time(33000)) {
    receiveTerm(b, 7);
    b.writing = true;
  }
  if (elapsed >= time(33600)) {
    b.writing = false;
    b.stored = 5;
    b.commit = 5;
  }
  const starts = [
    0, 4000, 8000, 12000, 16000, 20000, 24000, 28000, 32000, 36000,
  ];
  const step = Math.max(
    0,
    starts.findLastIndex((at) => elapsed >= time(at)),
  );
  const votes =
    elapsed >= time(18000)
      ? "A: 2 votes · majority"
      : elapsed >= time(16000)
        ? "A: 1 vote · needs 2"
        : elapsed >= time(8000)
          ? "C: 1 vote · needs 2"
          : "2 of 3 servers required";
  return { nodes, step, votes };
}

export const servers = ["A", "B", "C"] as const;
export type Server = (typeof servers)[number];
export type Branch = "inherited" | "current";
export type Entry = { term: number; command: string };
export type Node = {
  id: Server;
  log: readonly Entry[];
  role: "leader" | "follower" | "candidate" | "offline";
  vote?: Server | "refused";
};
export type Snapshot = {
  title: string;
  context: string;
  tally: string;
  nodes: Node[];
  // This marks the safety of entries, not individual servers' commit indices.
  committedThrough: number;
};

const initial: Entry = { term: 1, command: "x = 0" };
const inherited: Entry = { term: 2, command: "x += 1" };
const conflicting: Entry = { term: 3, command: "x = 9" };
const current: Entry = { term: 4, command: "no-op" };
const base = [initial];
const oldLog = [initial, inherited];
const otherLog = [initial, conflicting];
const protectedLog = [initial, inherited, current];
export const stepCount = 6;
export const quorum = Math.floor(servers.length / 2) + 1;

// Figure 2 and §5.4.1: election terms are not log-entry terms.
// https://raft.github.io/raft.pdf
export function logIsCurrent(
  candidate: readonly Entry[],
  voter: readonly Entry[],
) {
  const candidateTerm = candidate.at(-1)?.term ?? 0;
  const voterTerm = voter.at(-1)?.term ?? 0;
  return (
    candidateTerm > voterTerm ||
    (candidateTerm === voterTerm && candidate.length >= voter.length)
  );
}

export function canCommitByCounting(
  log: readonly Entry[],
  index: number,
  leaderTerm: number,
  copies: number,
) {
  return copies >= quorum && log[index - 1]?.term === leaderTerm;
}

export function entryIsCommitted(
  entry: Entry | undefined,
  index: number,
  committedThrough: number,
) {
  const committed = protectedLog[index];
  return (
    index < committedThrough &&
    !!entry &&
    entry.term === committed?.term &&
    entry.command === committed?.command
  );
}

function nodes(
  logs: readonly (readonly Entry[])[],
  leader: Server | null,
  offline: readonly Server[] = [],
): Node[] {
  return servers.map((id, index) => ({
    id,
    log: logs[index],
    role: offline.includes(id)
      ? "offline"
      : id === leader
        ? "leader"
        : "follower",
  }));
}

// Three-server adaptation of the Figure 8 schedule, not a general Raft
// simulator. Each step is settled after the events in its visible explanation.
export function currentTermState(step: number, branch: Branch): Snapshot {
  const index = Math.max(0, Math.min(stepCount - 1, Math.floor(step)));
  const protectedBranch = branch === "current";
  if (index === 0)
    return {
      title: "One copy in term 2",
      context: "Term 2 · A leads",
      tally: "Old entry: 1 / 3 copies",
      nodes: nodes([oldLog, base, base], "A"),
      committedThrough: 1,
    };
  if (index === 1)
    return {
      title: "A different entry in term 3",
      context: "Term 3 · C leads",
      tally: "C elected by B + C",
      nodes: nodes([oldLog, base, otherLog], "C", ["A"]),
      committedThrough: 1,
    };
  if (index === 2)
    return {
      title: "Two copies still are not enough",
      context: "Term 4 · A leads",
      tally: "Old entry: 2 / 3 · uncommitted",
      nodes: nodes([protectedLog, oldLog, otherLog], "A", ["C"]),
      committedThrough: 1,
    };
  if (index === 3)
    return protectedBranch
      ? {
          title: "Commit a current-term entry first",
          context: "Term 4 · A leads",
          tally: "Current-term entry: 2 / 3 · committed",
          nodes: nodes([protectedLog, protectedLog, otherLog], "A", ["C"]),
          committedThrough: 3,
        }
      : {
          title: "Stop before a current-term entry",
          context: "A is down · C returns",
          tally: "Old entry: 2 / 3 · uncommitted",
          nodes: nodes([protectedLog, oldLog, otherLog], null, ["A"]),
          committedThrough: 1,
        };
  if (index === 4) {
    const voters = nodes(
      protectedBranch
        ? [protectedLog, protectedLog, otherLog]
        : [protectedLog, oldLog, otherLog],
      null,
      ["A"],
    );
    const candidate = voters[2];
    candidate.role = "candidate";
    for (const voter of voters) {
      if (voter.role !== "offline")
        voter.vote = logIsCurrent(candidate.log, voter.log) ? "C" : "refused";
    }
    const votes = voters.filter((node) => node.vote === "C").length;
    if (votes >= quorum) candidate.role = "leader";
    return {
      title: protectedBranch
        ? "C cannot win with its old log"
        : "C can win despite the two copies",
      context: protectedBranch
        ? "Term 5 · C is a candidate"
        : "Term 5 · C leads",
      tally: `C: ${votes} / 3 votes · ${quorum} required`,
      nodes: voters,
      committedThrough: protectedBranch ? 3 : 1,
    };
  }
  if (protectedBranch) return currentTermState(4, "current");
  return {
    title: "The old entry is overwritten",
    context: "Term 5 · C leads",
    tally: "Term-2 entry overwritten · term-3 copies remain uncommitted",
    nodes: nodes([otherLog, otherLog, otherLog], "C"),
    committedThrough: 1,
  };
}

export const timeline = [
  {
    step: 0,
    branch: "inherited",
    phase: "(a) An entry from term 2",
    panel: "a",
  },
  {
    step: 1,
    branch: "inherited",
    phase: "(b) A conflicting entry from term 3",
    panel: "b",
  },
  {
    step: 2,
    branch: "inherited",
    phase: "(c) An older-term majority",
    panel: "c",
  },
  {
    step: 3,
    branch: "inherited",
    phase: "(d) A crashes before committing term 4",
    panel: "d",
  },
  {
    step: 4,
    branch: "inherited",
    phase: "(d) C wins a later election",
    panel: "d",
  },
  {
    step: 5,
    branch: "inherited",
    phase: "(d) C overwrites the old entries",
    panel: "d",
  },
  {
    step: 2,
    branch: "current",
    phase: "Return to (c) · try the alternative",
    panel: "c",
  },
  {
    step: 3,
    branch: "current",
    phase: "(e) Replicate the current-term entry",
    panel: "e",
  },
  {
    step: 4,
    branch: "current",
    phase: "(e) The committed prefix is protected",
    panel: "e",
  },
] as const;

export const paperPanels = [
  { letter: "a", name: "One copy", frame: 0 },
  { letter: "b", name: "Conflict", frame: 1 },
  { letter: "c", name: "Majority", frame: 2 },
  { letter: "d", name: "Overwrite", frame: 5 },
  { letter: "e", name: "Committed", frame: 7 },
] as const;

export function currentTermFrame(frame: number) {
  const beat = timeline[Math.max(0, Math.min(timeline.length - 1, frame))];
  const state = currentTermState(beat.step, beat.branch);
  return {
    ...state,
    ...beat,
    ...(frame === 6 && {
      title: "Try the other ending",
    }),
  };
}

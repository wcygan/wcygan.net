import type {
  ConsensusFrame,
  ConsensusLesson,
  ConsensusNode,
  ConsensusTopic,
  LogEntry,
} from "./types";

// Small protocol rules support authored walkthroughs, not a network simulator.
// Raft's crash/recovery persistence, RPC transport, timers and voting state are
// intentionally outside this model. See raft.github.io/raft.pdf, Figure 2.
export function quorumSize(voterCount: number): number {
  if (!Number.isInteger(voterCount) || voterCount < 1) {
    throw new Error("A configuration must contain at least one voter");
  }
  return Math.floor(voterCount / 2) + 1;
}

export function hasQuorum(
  acknowledgements: string[],
  voters: string[],
): boolean {
  const membership = new Set(voters);
  const received = new Set(acknowledgements.filter((id) => membership.has(id)));
  return received.size >= quorumSize(membership.size);
}

export function hasJointQuorum(
  acknowledgements: string[],
  old: string[],
  next: string[],
): boolean {
  return hasQuorum(acknowledgements, old) && hasQuorum(acknowledgements, next);
}

export function lastPosition(node: Pick<ConsensusNode, "log" | "snapshot">) {
  const last = node.log.at(-1) ?? node.snapshot;
  return { index: last?.index ?? 0, term: last?.term ?? 0 };
}

export function isLogUpToDate(
  candidate: { index: number; term: number },
  voter: { index: number; term: number },
): boolean {
  return (
    candidate.term > voter.term ||
    (candidate.term === voter.term && candidate.index >= voter.index)
  );
}

function termAt(node: ConsensusNode, index: number): number | undefined {
  if (index === 0 && !node.snapshot) return 0;
  if (index === node.snapshot?.index) return node.snapshot.term;
  return node.log.find((entry) => entry.index === index)?.term;
}

interface AppendRequest {
  term: number;
  leaderId: string;
  prevLogIndex: number;
  prevLogTerm: number;
  entries: LogEntry[];
  leaderCommit: number;
}

export function appendEntries(
  receiver: ConsensusNode,
  request: AppendRequest,
): { accepted: boolean; node: ConsensusNode } {
  if (request.term < receiver.term) return { accepted: false, node: receiver };
  const node: ConsensusNode = {
    ...receiver,
    term: request.term,
    role: "follower",
    // A current-term leader is recognized before checking its log prefix.
    leader: request.leaderId,
  };
  if (termAt(node, request.prevLogIndex) !== request.prevLogTerm) {
    return { accepted: false, node };
  }
  let log = [...node.log];
  for (const [offset, incoming] of request.entries.entries()) {
    if (incoming.index !== request.prevLogIndex + offset + 1) {
      throw new Error("AppendEntries must contain consecutive indexes");
    }
    const existing = log.find((entry) => entry.index === incoming.index);
    if (existing && existing.term !== incoming.term) {
      if (incoming.index <= node.commitIndex) {
        throw new Error("A committed prefix cannot be replaced");
      }
      log = log.filter((entry) => entry.index < incoming.index);
    } else if (existing) {
      if (existing.command !== incoming.command) {
        throw new Error("Matching index and term must have the same command");
      }
      continue;
    }
    log.push(incoming);
  }
  // A heartbeat or retried short batch does not truncate a nonconflicting tail.
  // Only the prefix validated by THIS request can advance the commit index.
  const lastMatched = request.prevLogIndex + request.entries.length;
  return {
    accepted: true,
    node: {
      ...node,
      log,
      commitIndex: Math.max(
        node.commitIndex,
        Math.min(request.leaderCommit, lastMatched),
      ),
    },
  };
}

export function advanceCommitIndex(
  leader: ConsensusNode,
  matchIndexes: Record<string, number>,
  voters: string[],
): number {
  let commitIndex = leader.commitIndex;
  for (const entry of leader.log) {
    const acknowledged = voters.filter(
      (id) => (matchIndexes[id] ?? 0) >= entry.index,
    );
    if (
      entry.index > commitIndex &&
      entry.term === leader.term &&
      hasQuorum(acknowledged, voters)
    ) {
      commitIndex = entry.index;
    }
  }
  return commitIndex;
}

function execute(command: string, value: number): number {
  // Configuration entries change voter membership, not the scalar state machine.
  if (command === "JOINT" || command === "CDE") return value;
  const match = /^(SET|ADD) (-?\d+)$/.exec(command);
  if (!match) throw new Error(`Unknown command: ${command}`);
  return match[1] === "SET" ? Number(match[2]) : value + Number(match[2]);
}

export function applyCommitted(
  node: ConsensusNode,
  through = node.commitIndex,
): ConsensusNode {
  if (
    !Number.isInteger(through) ||
    through < node.lastApplied ||
    through > node.commitIndex
  ) {
    throw new Error("Apply only a forward, committed prefix");
  }
  let value = node.value;
  for (let index = node.lastApplied + 1; index <= through; index++) {
    const entry = node.log.find((candidate) => candidate.index === index);
    if (!entry) throw new Error("Cannot apply a log with a missing entry");
    value = execute(entry.command, value);
  }
  return { ...node, lastApplied: through, value };
}

export function compactSnapshot(
  node: ConsensusNode,
  configuration: string[],
): ConsensusNode {
  if (node.lastApplied <= (node.snapshot?.index ?? 0)) return node;
  if (node.lastApplied > node.commitIndex)
    throw new Error("Snapshot only applied, committed state");
  const term = termAt(node, node.lastApplied);
  if (term === undefined)
    throw new Error("Snapshot boundary is missing from the log");
  return {
    ...node,
    log: node.log.filter((entry) => entry.index > node.lastApplied),
    snapshot: {
      index: node.lastApplied,
      term,
      value: node.value,
      configuration: [...configuration],
    },
  };
}

// Complete-snapshot installation for the walkthrough; chunk transfer is omitted.
export function installSnapshot(
  node: ConsensusNode,
  snapshot: NonNullable<ConsensusNode["snapshot"]>,
): ConsensusNode {
  if (snapshot.index <= node.lastApplied) return node;
  const matches = termAt(node, snapshot.index) === snapshot.term;
  if (!matches && node.commitIndex >= snapshot.index) {
    throw new Error("A snapshot cannot discard a committed suffix");
  }
  return {
    ...node,
    snapshot: { ...snapshot, configuration: [...snapshot.configuration] },
    log: matches
      ? node.log.filter((entry) => entry.index > snapshot.index)
      : [],
    commitIndex: Math.max(node.commitIndex, snapshot.index),
    lastApplied: snapshot.index,
    value: snapshot.value,
  };
}

const ABC = ["A", "B", "C"];
const FIVE = [...ABC, "D", "E"];
const OLD = ABC;
const NEXT = ["C", "D", "E"];
const e = (index: number, term: number, command: string): LogEntry => ({
  index,
  term,
  command,
});
const base = [e(1, 1, "SET 0")];

function server(
  id: string,
  log = base,
  overrides: Partial<ConsensusNode> = {},
): ConsensusNode {
  const { lastApplied = 1, ...rest } = overrides;
  return applyCommitted(
    {
      id,
      role: "follower",
      term: 2,
      leader: null,
      log,
      commitIndex: 1,
      lastApplied: 0,
      value: 0,
      ...rest,
    },
    lastApplied,
  );
}

function replicate(
  leader: ConsensusNode,
  follower: ConsensusNode,
  prevLogIndex = lastPosition(follower).index,
) {
  const result = appendEntries(follower, {
    term: leader.term,
    leaderId: leader.id,
    prevLogIndex,
    prevLogTerm: termAt(leader, prevLogIndex) ?? -1,
    entries: leader.log.filter((entry) => entry.index > prevLogIndex),
    leaderCommit: leader.commitIndex,
  });
  if (!result.accepted)
    throw new Error("Authored replication must match its prefix");
  return result.node;
}

function committed(
  leader: ConsensusNode,
  nodes: ConsensusNode[],
  voters: string[],
) {
  return {
    ...leader,
    commitIndex: advanceCommitIndex(
      leader,
      Object.fromEntries(
        nodes.map((node) => [node.id, lastPosition(node).index]),
      ),
      voters,
    ),
  };
}

const frame = (
  title: string,
  detail: string,
  nodes: ConsensusNode[],
  rest: Partial<ConsensusFrame> = {},
): ConsensusFrame => ({ title, detail, nodes, ...rest });

function replication(): ConsensusFrame[] {
  const a = server("A", base, { role: "leader", leader: "A" });
  const b = server("B", base, { leader: "A" });
  const c = server("C", base, { leader: "A" });
  const d = server("D", base, { leader: "A" });
  const extra = server("E", base, { leader: "A" });
  const proposal = { ...a, log: [...base, e(2, 2, "SET 5")] };
  const copied = replicate(proposal, b);
  const copiedC = replicate(proposal, c);
  const commit = committed(
    proposal,
    [proposal, copied, copiedC, d, extra],
    FIVE,
  );
  const frames = [
    frame(
      "One agreed prefix",
      "All five servers have applied index 1. A leads term 2; the state is 0.",
      [a, b, c, d, extra],
    ),
    frame(
      "Append locally",
      "A stores SET 5 at index 2, term 2. A local write is still a proposal.",
      [proposal, b, c, d, extra],
      { focusIndex: 2 },
    ),
    frame(
      "Three durable copies",
      "B and C store the entry and send acknowledgements. A, B and C make a majority of five; D and E may lag.",
      [proposal, copied, copiedC, d, extra],
      {
        focusIndex: 2,
        links: [
          { from: "B", to: "A", label: "stored i2" },
          { from: "C", to: "A", label: "stored i2" },
        ],
      },
    ),
    frame(
      "Commit, then apply",
      "A receives both acknowledgements, commits its current-term entry and applies SET 5. It can now answer the client.",
      [applyCommitted(commit), copied, copiedC, d, extra],
      { focusIndex: 2 },
    ),
    frame(
      "Followers learn the boundary",
      "A announces commit index 2 and catches up D and E. Every machine applies the same command; slow followers did not delay the reply.",
      [
        applyCommitted(commit),
        ...[copied, copiedC, d, extra].map((node) =>
          applyCommitted(replicate(commit, node)),
        ),
      ],
      { focusIndex: 2 },
    ),
  ];
  let nodes = frames.at(-1)!.nodes;
  const additions = [
    { command: "ADD 2", partners: ["B", "C"] },
    { command: "ADD 3", partners: ["B", "D"] },
    { command: "ADD -1", partners: ["C", "E"] },
  ];
  for (const [offset, { command, partners }] of additions.entries()) {
    const index = offset + 3;
    const leader = {
      ...nodes[0],
      log: [...nodes[0].log, e(index, 2, command)],
    };
    const proposed = [leader, ...nodes.slice(1)];
    const stored = proposed.map((node) =>
      partners.includes(node.id) ? replicate(leader, node) : node,
    );
    const committedLeader = applyCommitted(committed(leader, stored, FIVE));
    const applied = [committedLeader, ...stored.slice(1)];
    nodes = [
      committedLeader,
      ...stored
        .slice(1)
        .map((node) => applyCommitted(replicate(committedLeader, node))),
    ];
    const voters = partners.join(" and ");
    frames.push(
      frame(
        `Append index ${index}: ${command}`,
        `A appends ${command} at index ${index}, term 2. It has one copy; every machine still holds ${leader.value} from the previous committed prefix.`,
        proposed,
        { focusIndex: index },
      ),
      frame(
        `Three copies of index ${index}`,
        `${voters} store index ${index} and send acknowledgements. Together with A they form a majority, but A has not yet received those replies or advanced its commit position.`,
        stored,
        {
          focusIndex: index,
          links: partners.map((from) => ({
            from,
            to: "A",
            label: `stored i${index}`,
          })),
        },
      ),
      frame(
        `Commit and apply index ${index}`,
        `A receives both acknowledgements, commits index ${index} and applies ${command}, reaching ${committedLeader.value}. Followers still need to learn the new commit position.`,
        applied,
        { focusIndex: index },
      ),
      frame(
        index === 5
          ? "Five entries, one shared result"
          : `Followers apply through index ${index}`,
        index === 5
          ? "A announces commit index 5 and catches up the remaining followers. All five servers now store and have applied the same five entries, ending at value 9."
          : `A announces commit index ${index} and fills the lagging logs. All five machines apply the same prefix and reach ${committedLeader.value}; the client did not need to wait for every follower.`,
        nodes,
        { focusIndex: index },
      ),
    );
  }
  return frames;
}

function partition(): ConsensusFrame[] {
  const initial = FIVE.map((id) =>
    server(id, base, {
      role: id === "A" ? "leader" : "follower",
      group: id < "C" ? "left" : "right",
      leader: "A",
    }),
  );
  const minorityLog = [...base, e(2, 2, "SET 9")];
  const minority = initial.map((node) =>
    node.group === "left" ? { ...node, log: minorityLog } : node,
  );
  const partitionLinks = [
    { from: "A", to: "C", label: "partition", blocked: true },
  ];
  const elected = minority.map((node) =>
    node.group === "right"
      ? {
          ...node,
          term: 3,
          role: node.id === "C" ? ("leader" as const) : ("follower" as const),
          leader: node.id === "C" ? "C" : null,
        }
      : node,
  );
  const majorityLog = [...base, e(2, 3, "SET 5")];
  const stored = elected.map((node) =>
    node.group === "right" ? { ...node, log: majorityLog, leader: "C" } : node,
  );
  const c = committed(
    stored[2],
    stored.filter((node) => node.group === "right"),
    FIVE,
  );
  const majority = stored.map((node) =>
    node.group === "right"
      ? applyCommitted({ ...node, commitIndex: c.commitIndex })
      : node,
  );
  const steppedDown = majority.map((node) =>
    node.group === "left"
      ? appendEntries(node, {
          term: c.term,
          leaderId: c.id,
          prevLogIndex: 2,
          prevLogTerm: 3,
          entries: [],
          leaderCommit: c.commitIndex,
        }).node
      : node,
  );
  const healed = steppedDown.map((node) =>
    node.id === "C" ? node : applyCommitted(replicate(c, node, 1)),
  );
  return [
    frame(
      "Five voters, three required",
      "A leads term 2. The cluster’s majority remains three even if the network splits.",
      initial,
    ),
    frame(
      "Two copies cannot commit",
      "A and B store SET 9 behind the partition. Two of five is insufficient; their applied value stays 0.",
      minority,
      { links: partitionLinks, focusIndex: 2 },
    ),
    frame(
      "A majority elects C",
      "C wins term 3 with C, D and E. D and E have voted but have not heard the winner announce itself. A and B still know A as their term-2 leader.",
      elected,
      { links: partitionLinks },
    ),
    frame(
      "The majority makes progress",
      "C replicates SET 5 to C, D and E, commits it and announces the boundary. A’s conflicting proposal remains uncommitted.",
      majority,
      { links: partitionLinks, focusIndex: 2 },
    ),
    frame(
      "Healing reveals the newer term",
      "A and B receive C’s term-3 AppendEntries and recognize C as leader. A steps down even though the log-prefix check fails; repair follows next.",
      steppedDown,
      {
        links: [
          { from: "C", to: "A", label: "term 3" },
          { from: "C", to: "B", label: "term 3" },
        ],
        focusIndex: 2,
      },
    ),
    frame(
      "Repair the minority suffix",
      "C replaces the uncommitted SET 9 entries. All five apply SET 5 at index 2; no committed command was lost.",
      healed,
      { focusIndex: 2 },
    ),
  ];
}

function election(): ConsensusFrame[] {
  const old = [...base, e(2, 1, "SET 9"), e(3, 1, "ADD 1")];
  const fresh = [...base, e(2, 2, "SET 5")];
  const nodes = [
    server("A", old, { leader: "B" }),
    server("B", fresh, { role: "leader", leader: "B" }),
    server("C", fresh, { leader: "B" }),
  ];
  const request = nodes.map((node) => ({
    ...node,
    term: 3,
    role: node.id === "A" ? ("candidate" as const) : ("follower" as const),
    leader: null,
  }));
  const refused = request.map((node) => ({
    ...node,
    note: node.id === "A" ? "last: i3 / t1" : "deny A: last t2 > t1",
  }));
  const wins = nodes.map((node) => ({
    ...node,
    term: 4,
    role: node.id === "B" ? ("leader" as const) : ("follower" as const),
    leader: node.id === "B" ? "B" : null,
    note: node.id === "B" ? "3 votes · last i2 / t2" : "vote B",
  }));
  return [
    frame(
      "Length alone is misleading",
      "B leads term 2. A has three entries ending in term 1; B and C have two ending in term 2. Everyone knows B, but their known commit boundary is still index 1.",
      nodes,
    ),
    frame(
      "A requests votes in term 3",
      "After missing heartbeats, A requests term 3. B steps down on the higher term; all clear their known leader. A’s last entry still belongs to term 1: starting an election does not rewrite log terms.",
      request,
      { links: [{ from: "A", to: "B", label: "request t3 / last t1" }] },
    ),
    frame(
      "Compare last term, then index",
      "B and C refuse A: their last entry’s term is newer. For equal last terms, a candidate must have at least as large a last index.",
      refused,
    ),
    frame(
      "A fresher candidate wins",
      "B requests term 4. A accepts its newer log term, C accepts its equal log, and B wins with its own vote. Only B knows it won; A and C await its announcement.",
      wins,
      {
        links: [
          { from: "A", to: "B", label: "vote" },
          { from: "C", to: "B", label: "vote" },
        ],
      },
    ),
  ];
}

function repair(): ConsensusFrame[] {
  const authoritative = [...base, e(2, 3, "SET 5"), e(3, 3, "ADD 2")];
  const a = server("A", authoritative, {
    role: "leader",
    term: 3,
    leader: "A",
  });
  const b = server("B", [...base, e(2, 2, "SET 9"), e(3, 2, "ADD 1")], {
    term: 3,
  });
  const c = server("C", authoritative, { term: 3, leader: "A" });
  const rejected = appendEntries(b, {
    term: a.term,
    leaderId: a.id,
    prevLogIndex: 3,
    prevLogTerm: 3,
    entries: [],
    leaderCommit: a.commitIndex,
  }).node;
  const fixed = replicate(a, b, 1);
  const commit = committed(a, [a, fixed, c], ABC);
  return [
    frame(
      "A shared prefix, different tails",
      "Index 1 is committed everywhere. B has two uncommitted entries from term 2; A’s authoritative tail belongs to term 3.",
      [a, b, c],
      { focusIndex: 3 },
    ),
    frame(
      "The previous entry must match",
      "A probes previous index 3, term 3. B recognizes A as leader but has index 3, term 2, so it rejects the request without changing its log.",
      [a, { ...rejected, note: "reject prev i3 / t3" }, c],
      { focusIndex: 3, links: [{ from: "A", to: "B", label: "prev i3 / t3" }] },
    ),
    frame(
      "Back up to agreement",
      "The check also fails at index 2. At index 1, both logs contain term 1; A can send entries after this shared prefix.",
      [a, { ...rejected, note: "match prev i1 / t1" }, c],
      { focusIndex: 1 },
    ),
    frame(
      "Replace the conflicting suffix",
      "B removes its uncommitted tail and stores A’s entries at indexes 2 and 3. The committed entry at index 1 is untouched.",
      [a, fixed, c],
      { focusIndex: 2, links: [{ from: "A", to: "B", label: "append i2–3" }] },
    ),
    frame(
      "The repaired log can apply",
      "A commits current-term index 3 and announces it. All three apply SET 5 followed by ADD 2, reaching 7.",
      [
        applyCommitted(commit),
        applyCommitted(replicate(commit, fixed)),
        applyCommitted(replicate(commit, c)),
      ],
      { focusIndex: 3 },
    ),
  ];
}

function currentTerm(): ConsensusFrame[] {
  const old = [...base, e(2, 2, "SET 5")];
  const rival = [...base, e(2, 3, "SET 9")];
  const partial = FIVE.map((id) =>
    server(id, id < "C" ? old : base, {
      role: id === "A" ? "leader" : "follower",
      leader: "A",
    }),
  );
  const rivalLeader = partial.map((node) =>
    node.id === "A"
      ? { ...node, offline: true }
      : node.id === "B"
        ? node
        : {
            ...node,
            term: 3,
            role: node.id === "E" ? ("leader" as const) : ("follower" as const),
            leader: node.id === "E" ? "E" : null,
            log: node.id === "E" ? rival : base,
          },
  );
  const copied = FIVE.map((id) =>
    server(id, id === "E" ? rival : id < "D" ? old : base, {
      term: id === "E" ? 3 : 4,
      role: id === "A" || id === "E" ? "leader" : "follower",
      leader: id === "E" ? "E" : id === "D" ? null : "A",
      offline: id === "E",
    }),
  );
  const unsafe = {
    ...copied[0],
    commitIndex: advanceCommitIndex(
      copied[0],
      { A: 2, B: 2, C: 2, D: 1, E: 0 },
      FIVE,
    ),
  };
  const majorityOld = [unsafe, ...copied.slice(1)];
  const overwritten = FIVE.map((id) =>
    server(id, id === "A" ? old : rival, {
      term: id === "A" ? 4 : 5,
      role: id === "A" || id === "E" ? "leader" : "follower",
      leader: id === "A" ? "A" : "E",
      offline: id === "A",
      note: id === "E" ? "wins: B, C, D, E" : undefined,
    }),
  );
  const anchor = [...old, e(3, 4, "ADD 2")];
  const anchored = majorityOld.map((node) =>
    node.id < "D" ? { ...node, log: anchor } : node,
  );
  const commit = committed(anchored[0], anchored.slice(0, 3), FIVE);
  const settled = anchored.map((node) =>
    node.id < "D"
      ? applyCommitted({ ...node, commitIndex: commit.commitIndex })
      : node,
  );
  return [
    frame(
      "Term 2 leaves an unfinished entry",
      "A stores SET 5 at index 2 on A and B. Two of five copies cannot commit it.",
      partial,
      { focusIndex: 2 },
    ),
    frame(
      "Term 3 creates a competing suffix",
      "A crashes. E wins term 3 with C, D and E, then stores SET 9 at index 2 only on itself.",
      rivalLeader,
      { focusIndex: 2 },
    ),
    frame(
      "Term 4 reaches three old copies",
      "E crashes. A returns, wins term 4 with A, B and C, then copies its term-2 entry to C. Three copies still do not let A advance commit index 1.",
      majorityOld,
      { focusIndex: 2 },
    ),
    frame(
      "Counterexample: those copies can disappear",
      "If A now crashes, E can return and win term 5: its last log term 3 beats term 2. E can overwrite B and C’s uncommitted SET 5 entries.",
      overwritten,
      { focusIndex: 2 },
    ),
    frame(
      "Rewind: take the other branch",
      "Return to the term-4 state, before A crashed. The old SET 5 entry has three copies, but index 1 is still the commit boundary.",
      majorityOld,
      { focusIndex: 2 },
    ),
    frame(
      "Replicate an entry from term 4",
      "A appends ADD 2 at index 3 in its current term and gets acknowledgements from B and C. The old entries retain their original terms.",
      anchored,
      { focusIndex: 3 },
    ),
    frame(
      "The new entry anchors its prefix",
      "A commits index 3 and announces it to B and C. This also commits SET 5 at index 2; E’s term-3 log can no longer win a majority against this prefix.",
      settled,
      { focusIndex: 3 },
    ),
  ];
}

function application(): ConsensusFrame[] {
  const log = [e(1, 2, "SET 5"), e(2, 2, "ADD 2")];
  const nodes = ABC.map((id) =>
    server(id, log, {
      role: id === "A" ? "leader" : "follower",
      commitIndex: 0,
      lastApplied: 0,
      leader: "A",
    }),
  );
  const known = nodes.map((node) => ({ ...node, commitIndex: 2 }));
  const first = [applyCommitted(known[0], 1), known[1], known[2]];
  const uneven = [
    applyCommitted(known[0]),
    applyCommitted(known[1], 1),
    known[2],
  ];
  return [
    frame(
      "Stored is not applied",
      "All logs store SET 5 then ADD 2. No server has learned a commit boundary yet, so their application state remains 0.",
      nodes,
    ),
    frame(
      "Commit permits execution",
      "After A receives current-term acknowledgements, it commits index 2 and tells both followers. They may now apply indexes 1 and 2.",
      known,
      { focusIndex: 2 },
    ),
    frame(
      "Apply the next index",
      "A applies index 1: SET 5. It may not skip straight to ADD 2, even though both entries are committed.",
      first,
      { focusIndex: 1 },
    ),
    frame(
      "Machines can progress at different speeds",
      "A has applied both entries and holds 7. B has applied only SET 5 and holds 5. C has not applied either entry yet.",
      uneven,
      { focusIndex: 2 },
    ),
    frame(
      "Equal prefixes produce equal state",
      "All three finish in the same order: SET 5, then ADD 2. Their final value is 7; agreement does not require simultaneous execution.",
      known.map((node) => applyCommitted(node)),
      { focusIndex: 2 },
    ),
  ];
}

function membership(): ConsensusFrame[] {
  const nodes = FIVE.map((id) =>
    server(id, base, {
      role: id === "C" ? "leader" : "follower",
      leader: "C",
      note: id > "C" ? "caught up · not voting yet" : "old voter",
    }),
  );
  const jointLog = [...base, e(2, 2, "JOINT")];
  const joint = nodes.map((node) => ({
    ...node,
    log: node.id === "C" ? jointLog : base,
    note: undefined,
  }));
  const oldAcks = joint.map((node) => ({
    ...node,
    log: OLD.includes(node.id) ? jointLog : base,
  }));
  const enough = oldAcks.map((node) => ({
    ...node,
    log: node.id === "D" ? jointLog : node.log,
  }));
  const jointCommitted = enough.map((node) =>
    node.id <= "D" ? applyCommitted({ ...node, commitIndex: 2 }) : node,
  );
  const nextLog = [...jointLog, e(3, 2, "CDE")];
  const finalProposed = jointCommitted.map((node) => ({
    ...node,
    log: node.id === "C" ? nextLog : node.log,
  }));
  const final = finalProposed.map((node) =>
    NEXT.includes(node.id)
      ? applyCommitted({ ...node, log: nextLog, commitIndex: 3 })
      : { ...node, offline: true, note: "removed after CDE committed" },
  );
  const configuration = (acknowledgements: string[]) => ({
    old: OLD,
    next: NEXT,
    acknowledgements,
  });
  return [
    frame(
      "Catch up before granting votes",
      "ABC is the current configuration. D and E first receive the existing log as nonvoting members; the proposed new voter set is CDE.",
      nodes,
      { configuration: { old: OLD, next: [], acknowledgements: OLD } },
    ),
    frame(
      "Append the joint configuration",
      "C writes JOINT at index 2. From this entry onward C requires a majority of ABC and a separate majority of CDE.",
      joint,
      { focusIndex: 2, configuration: configuration(["C"]) },
    ),
    frame(
      "Three of five is not the rule",
      "A, B and C acknowledge JOINT: old quorum 3/3, new quorum 1/3. A majority of the five-server union is insufficient.",
      oldAcks,
      { focusIndex: 2, configuration: configuration(OLD) },
    ),
    frame(
      "Commit with both majorities",
      "D also acknowledges. A and C satisfy ABC; C and D satisfy CDE. C commits JOINT before proposing the final configuration.",
      jointCommitted,
      { focusIndex: 2, configuration: configuration(["A", "B", "C", "D"]) },
    ),
    frame(
      "Only now append CDE",
      "With JOINT committed, C appends the final CDE entry at index 3. The latest log configuration governs this entry: two of CDE are required.",
      finalProposed,
      {
        focusIndex: 3,
        configuration: { old: [], next: NEXT, acknowledgements: ["C"] },
      },
    ),
    frame(
      "The new set can operate alone",
      "C, D and E store the final configuration, and C commits it using the new majority. A and B can now leave; future quorums come from CDE.",
      final,
      {
        focusIndex: 3,
        configuration: { old: [], next: NEXT, acknowledgements: NEXT },
      },
    ),
  ];
}

function snapshot(): ConsensusFrame[] {
  const log = [...base, e(2, 2, "SET 5"), e(3, 2, "ADD 2"), e(4, 3, "ADD 3")];
  const a = server("A", log, {
    role: "leader",
    term: 3,
    leader: "A",
    commitIndex: 3,
    lastApplied: 3,
  });
  const b = server("B", log.slice(0, 3), {
    term: 3,
    leader: "A",
    commitIndex: 3,
    lastApplied: 3,
  });
  const c = server("C", base, { term: 3, leader: "A" });
  const compacted = compactSnapshot(a, ABC);
  const installed = installSnapshot(c, compacted.snapshot!);
  const caughtUp = replicate(compacted, installed);
  const commit = committed(compacted, [compacted, b, caughtUp], ABC);
  return [
    frame(
      "An applied prefix becomes history",
      "A and B have applied indexes 1–3 and hold 7. Index 4 is stored but uncommitted; C is behind at index 1.",
      [a, b, c],
      { focusIndex: 3 },
    ),
    frame(
      "Replace history with a snapshot",
      "A persists value 7, last included index 3, term 2 and voter configuration ABC, then removes entries 1–3. Its unapplied ADD 3 at index 4 remains.",
      [compacted, b, c],
      { focusIndex: 3 },
    ),
    frame(
      "Send the state to a lagging follower",
      "A no longer has the entries C needs. InstallSnapshot gives C value 7 and the index-3, term-2 boundary instead of replaying the old prefix.",
      [compacted, b, installed],
      {
        links: [{ from: "A", to: "C", label: "snapshot i3 / t2" }],
        focusIndex: 3,
      },
    ),
    frame(
      "Resume at the snapshot boundary",
      "AppendEntries checks previous index 3, term 2 against C’s snapshot, then appends index 4. C remains at value 7 until it learns the new commit boundary and applies that suffix.",
      [compacted, b, caughtUp],
      { focusIndex: 4 },
    ),
    frame(
      "Different storage, identical state",
      "A commits current-term index 4 and announces it. All apply ADD 3 and reach 10, whether their prefix is stored as entries or a snapshot.",
      [
        applyCommitted(commit),
        applyCommitted(replicate(commit, b)),
        applyCommitted(replicate(commit, caughtUp)),
      ],
      { focusIndex: 4 },
    ),
  ];
}

export const LESSONS: Record<ConsensusTopic, ConsensusLesson> = {
  replication: {
    id: "replication",
    title: "Log Replication",
    layout: "logs",
    guide:
      "Follow five entries across five servers. Blocks show their index and original term; the solid strip marks the known committed prefix.",
    frames: replication(),
  },
  partition: {
    id: "partition",
    title: "Network Partitions",
    layout: "network",
    guide:
      "Follow the two network islands. A server’s leader role is local knowledge; the voter set still contains five servers.",
    frames: partition(),
  },
  election: {
    id: "election",
    title: "Leader Election",
    layout: "logs",
    guide:
      "Compare the last block’s term first and its index second. Keep the election term separate from the term printed on each entry.",
    frames: election(),
  },
  repair: {
    id: "repair",
    title: "Log Repair",
    layout: "logs",
    guide:
      "Follow the previous-index / previous-term check as the leader backs up to an agreed position.",
    frames: repair(),
  },
  "current-term": {
    id: "current-term",
    title: "Current-Term Commit Rule",
    layout: "logs",
    guide:
      "This follows Figure 8, including an explicit rewind to compare two possible futures from the same term-4 state.",
    frames: currentTerm(),
  },
  apply: {
    id: "apply",
    title: "Applying Committed Entries",
    layout: "machines",
    guide:
      "Follow each input log into its state machine. The value changes only as that server applies the next committed command.",
    frames: application(),
  },
  membership: {
    id: "membership",
    title: "Membership Changes",
    layout: "membership",
    guide:
      "ABC is the old set; CDE is the new set. During JOINT, count acknowledgements separately inside each outline.",
    frames: membership(),
  },
  snapshot: {
    id: "snapshot",
    title: "Log Snapshots",
    layout: "logs",
    guide:
      "A snapshot slab stands in for an applied prefix. Its last included index and term anchor the retained log suffix.",
    frames: snapshot(),
  },
};

export const servers = ["B", "A", "C"] as const;
export type Server = (typeof servers)[number];
type Follower = Exclude<Server, "B">;
export const entries = [
  { index: 1, term: 5, command: "x = 1" },
  { index: 2, term: 5, command: "x += 2" },
  { index: 3, term: 5, command: "x = 8" },
] as const;

type Flight = { start: number; end: number };
export type Message = Flight &
  (
    | { kind: "command"; from: "client"; to: "B"; index: number }
    | {
        kind: "entry";
        from: "B";
        to: Follower;
        firstIndex: number;
        lastIndex: number;
        leaderCommit: number;
      }
    | { kind: "ack"; from: Follower; to: "B"; storedThrough: number }
    | { kind: "commit"; from: "B"; to: Follower; leaderCommit: number }
  );

// A deterministic teaching schedule, not network or election timeout values.
// Each RPC carries the leader's commit position captured when it is sent.
export const messages: readonly Message[] = [
  {
    kind: "command",
    from: "client",
    to: "B",
    index: 1,
    start: 2000,
    end: 3400,
  },
  {
    kind: "entry",
    from: "B",
    to: "A",
    firstIndex: 1,
    lastIndex: 1,
    leaderCommit: 0,
    start: 4800,
    end: 6200,
  },
  { kind: "ack", from: "A", to: "B", storedThrough: 1, start: 7700, end: 9100 },
  {
    kind: "commit",
    from: "B",
    to: "A",
    leaderCommit: 1,
    start: 10100,
    end: 11500,
  },
  {
    kind: "command",
    from: "client",
    to: "B",
    index: 2,
    start: 12500,
    end: 13900,
  },
  {
    kind: "entry",
    from: "B",
    to: "A",
    firstIndex: 2,
    lastIndex: 2,
    leaderCommit: 1,
    start: 15300,
    end: 16700,
  },
  {
    kind: "ack",
    from: "A",
    to: "B",
    storedThrough: 2,
    start: 18200,
    end: 19600,
  },
  {
    kind: "commit",
    from: "B",
    to: "A",
    leaderCommit: 2,
    start: 20600,
    end: 22000,
  },
  {
    kind: "entry",
    from: "B",
    to: "C",
    firstIndex: 1,
    lastIndex: 2,
    leaderCommit: 2,
    start: 23500,
    end: 24900,
  },
  {
    kind: "ack",
    from: "C",
    to: "B",
    storedThrough: 2,
    start: 26400,
    end: 27800,
  },
  {
    kind: "command",
    from: "client",
    to: "B",
    index: 3,
    start: 29200,
    end: 30600,
  },
  {
    kind: "entry",
    from: "B",
    to: "A",
    firstIndex: 3,
    lastIndex: 3,
    leaderCommit: 2,
    start: 32400,
    end: 33800,
  },
  {
    kind: "entry",
    from: "B",
    to: "C",
    firstIndex: 3,
    lastIndex: 3,
    leaderCommit: 2,
    start: 32000,
    end: 33400,
  },
  {
    kind: "ack",
    from: "A",
    to: "B",
    storedThrough: 3,
    start: 34900,
    end: 36300,
  },
  {
    kind: "ack",
    from: "C",
    to: "B",
    storedThrough: 3,
    start: 36800,
    end: 38200,
  },
  {
    kind: "commit",
    from: "B",
    to: "A",
    leaderCommit: 3,
    start: 39200,
    end: 40600,
  },
  {
    kind: "commit",
    from: "B",
    to: "C",
    leaderCommit: 3,
    start: 41000,
    end: 42400,
  },
];
export const storageDuration = 500;
export const cycleDuration = 45400;

export const beats = [
  {
    start: 0,
    settledAt: 0,
    index: 1,
    title: "Empty logs",
    event:
      "B leads in term 5. All logs, commit indices, and follower confirmations start at zero. C's replication is delayed; retry traffic is omitted.",
  },
  {
    start: 2000,
    settledAt: 3900,
    index: 1,
    title: "B stores command #1",
    event:
      "The client sends x = 1. B persists entry #1 before copying it. One stored copy is not a majority.",
  },
  {
    start: 4800,
    settledAt: 6700,
    index: 1,
    title: "A stores entry #1",
    event:
      "B sends entry #1 with commit index 0. A persists the entry before replying. Both copies are orange: commitment is not yet known locally.",
  },
  {
    start: 7700,
    settledAt: 9100,
    index: 1,
    title: "A confirms storage through #1",
    event:
      "A replies “Stored through #1.” Only when the reply arrives does B count A's copy. B now commits #1 with two of three confirmed copies; A still shows orange.",
  },
  {
    start: 10100,
    settledAt: 11500,
    index: 1,
    title: "A learns commit index 1",
    event:
      "B sends a heartbeat carrying commit index 1. A turns entry #1 green when it receives the message. C remains empty, while the majority can continue.",
  },
  {
    start: 12500,
    settledAt: 14400,
    index: 2,
    title: "B stores command #2",
    event:
      "The client sends x += 2. B appends entry #2 after #1, which stays green. C's lag does not block the new command.",
  },
  {
    start: 15300,
    settledAt: 17200,
    index: 2,
    title: "A stores entry #2",
    event:
      "B sends entry #2 with commit index 1. A stores the new entry in orange and keeps entry #1 green. B still has confirmation only through #1.",
  },
  {
    start: 18200,
    settledAt: 19600,
    index: 2,
    title: "A confirms storage through #2",
    event:
      "A replies “Stored through #2.” On arrival, B advances A's confirmed index to 2 and commits entry #2. C still has no entries.",
  },
  {
    start: 20600,
    settledAt: 22000,
    index: 2,
    title: "A learns commit index 2",
    event:
      "A receives B's heartbeat with commit index 2. B and A now know both entries are committed, without waiting for C.",
  },
  {
    start: 23500,
    settledAt: 25400,
    index: 2,
    title: "C stores the missing batch",
    event:
      "B sends entries #1–2 together, carrying commit index 2. C persists both entries, then marks them green using that commit index. B's confirmation for C is still zero until C's reply arrives.",
  },
  {
    start: 26400,
    settledAt: 27800,
    index: 2,
    title: "C confirms storage through #2",
    event:
      "C replies “Stored through #2.” B updates C's confirmed index to 2 on arrival. All three now store and know the same committed prefix.",
  },
  {
    start: 29200,
    settledAt: 31100,
    index: 3,
    title: "B stores command #3",
    event:
      "The client sends x = 8. B appends entry #3 in orange, while its first two entries remain green.",
  },
  {
    start: 32000,
    settledAt: 34300,
    index: 3,
    title: "Both followers store entry #3",
    event:
      "B sends entry #3 to A and C with commit index 2. Each follower persists it before acknowledging. B still has confirmations only through #2.",
  },
  {
    start: 34900,
    settledAt: 36300,
    index: 3,
    title: "A's reply establishes a majority",
    event:
      "A replies “Stored through #3.” B receives the reply and commits #3 with two confirmed copies. A and C remain orange for #3 until they hear the updated commit index.",
  },
  {
    start: 36800,
    settledAt: 38200,
    index: 3,
    title: "C confirms the third copy",
    event:
      "C's “Stored through #3” reply reaches B. All three copies are now confirmed, but the followers still know commitment only through #2.",
  },
  {
    start: 39200,
    settledAt: 40600,
    index: 3,
    title: "A learns commit index 3",
    event:
      "B sends a red heartbeat carrying commit index 3 to A. A turns entry #3 green on arrival; C still knows commitment only through #2.",
  },
  {
    start: 41000,
    settledAt: 42400,
    index: 3,
    title: "C learns commit index 3",
    event:
      "B sends a red heartbeat carrying commit index 3 to C. C turns entry #3 green only when the heartbeat arrives.",
  },
  {
    start: 42400,
    settledAt: 42400,
    index: 3,
    title: "All three commands replicated",
    event:
      "Every server stores commands #1, #2, and #3 in the same order and knows all three are committed. A majority allowed progress while C lagged; C caught up with a batch.",
  },
];

type TimelineEvent =
  | { at: number; kind: "delivery"; message: Message }
  | {
      at: number;
      kind: "persist";
      message: Extract<Message, { kind: "command" | "entry" }>;
    };
export const timeline: readonly TimelineEvent[] = messages
  .flatMap((message): TimelineEvent[] => [
    { at: message.end, kind: "delivery", message },
    ...(message.kind === "entry" || message.kind === "command"
      ? [
          {
            at: message.end + storageDuration,
            kind: "persist" as const,
            message,
          },
        ]
      : []),
  ])
  .sort((a, b) => a.at - b.at);

type NodeState = {
  server: Server;
  role: "Leader" | "Follower";
  term: number;
  stored: number;
  committed: number;
  writing: { firstIndex: number; lastIndex: number } | null;
};

export function replicationState(elapsed: number) {
  const nodes: NodeState[] = servers.map((server) => ({
    server,
    role: server === "B" ? "Leader" : "Follower",
    term: 5,
    stored: 0,
    committed: 0,
    writing: null,
  }));
  const node = (server: Server) =>
    nodes.find((node) => node.server === server)!;
  const confirmed = { A: 0, C: 0 };
  const copiesThrough = (index: number) =>
    Number(node("B").stored >= index) +
    Number(confirmed.A >= index) +
    Number(confirmed.C >= index);
  for (const event of timeline) {
    if (event.at > elapsed) break;
    const message = event.message;
    const destination = node(message.to);
    if (event.kind === "persist") {
      const persisted = event.message;
      destination.stored =
        persisted.kind === "command" ? persisted.index : persisted.lastIndex;
      destination.writing = null;
      if (persisted.kind === "entry") {
        destination.committed = Math.max(
          destination.committed,
          Math.min(persisted.leaderCommit, destination.stored),
        );
      }
    } else if (message.kind === "command" || message.kind === "entry") {
      destination.writing =
        message.kind === "command"
          ? { firstIndex: message.index, lastIndex: message.index }
          : { firstIndex: message.firstIndex, lastIndex: message.lastIndex };
    } else if (message.kind === "ack") {
      confirmed[message.from] = Math.max(
        confirmed[message.from],
        message.storedThrough,
      );
    } else {
      destination.committed = Math.max(
        destination.committed,
        Math.min(message.leaderCommit, destination.stored),
      );
    }
    // All entries in this scoped example are from the leader's current term.
    for (const entry of entries) {
      if (copiesThrough(entry.index) >= 2)
        node("B").committed = Math.max(node("B").committed, entry.index);
    }
  }
  const beat = Math.max(
    0,
    beats.findLastIndex((beat) => elapsed >= beat.start),
  );
  const entry = entries[beats[beat].index - 1];
  const copies = copiesThrough(entry.index);
  return {
    nodes,
    confirmed,
    entry,
    copies,
    beat,
    majority: node("B").committed >= entry.index,
  };
}

export function messageProgress(message: Message, elapsed: number) {
  return (elapsed - message.start) / (message.end - message.start);
}
export function entryRange(first: number, last: number) {
  return first === last ? `#${first}` : `#${first}–${last}`;
}

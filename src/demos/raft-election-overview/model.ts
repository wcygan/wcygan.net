export const servers = ["A", "B", "C", "D", "E"] as const;
export type Server = (typeof servers)[number];
export type Ballots = Partial<Record<Server, Server>>;
export type NodeState = {
  term: number;
  role: "Follower" | "Candidate" | "Leader";
  votedFor?: Server;
  leader?: Server;
};
export type Message =
  | { kind: "request" | "heartbeat"; from: Server; to: Server }
  | { kind: "vote"; from: Server; to: Server; granted: boolean };
export type Step = {
  name: string;
  event: string;
  term: number;
  candidates: Server[];
  // Votes recorded locally, before their replies reach a candidate.
  ballots: Ballots;
  leader?: Server;
  traffic?: Message[];
};
const requests = (from: Server): NonNullable<Step["traffic"]> =>
  servers
    .filter((to) => to !== from)
    .map((to) => ({ kind: "request", from, to }));
const waiting: Step = {
  name: "Waiting for a heartbeat",
  event:
    "No leader is sending heartbeats. The followers have different election timeouts.",
  term: 4,
  candidates: [],
  ballots: {},
};
const candidate: Step = {
  name: "B starts first",
  event:
    "B’s timer expires first. It starts term 5, votes for itself, and asks the others for votes.",
  term: 5,
  candidates: ["B"],
  ballots: { B: "B" },
  traffic: requests("B"),
};
const second: Step = {
  name: "A grants its vote",
  event: "A votes for B. Two votes are still short of a majority.",
  term: 5,
  candidates: ["B"],
  ballots: { A: "B", B: "B" },
  traffic: [{ kind: "vote", from: "A", to: "B", granted: true }],
};
const third: Step = {
  name: "C grants the third vote",
  event: "C votes for B. B now has three of five votes: a majority.",
  term: 5,
  candidates: ["B"],
  ballots: { A: "B", B: "B", C: "B" },
  traffic: [{ kind: "vote", from: "C", to: "B", granted: true }],
};
const elected: Step = {
  name: "B becomes leader",
  event:
    "B sends heartbeats. The followers reset their election timers. Three votes elected one leader.",
  term: 5,
  candidates: [],
  ballots: third.ballots,
  leader: "B",
  traffic: servers
    .filter((to) => to !== "B")
    .map((to) => ({ kind: "heartbeat", from: "B", to })),
};
export const lessons: Record<
  "success" | "split",
  { label: string; steps: Step[] }
> = {
  success: {
    label: "Successful election",
    steps: [waiting, candidate, second, third, elected],
  },
  split: {
    label: "Split vote",
    steps: [
      waiting,
      {
        name: "Two candidates start together",
        event:
          "B and D time out close together. Both start an election in term 5 and vote for themselves.",
        term: 5,
        candidates: ["B", "D"],
        ballots: { B: "B", D: "D" },
        traffic: [...requests("B"), ...requests("D")],
      },
      {
        name: "Neither has a majority",
        event:
          "A votes for B; C votes for D. Each refuses the other candidate. E has not voted. Two votes each cannot elect a leader.",
        term: 5,
        candidates: ["B", "D"],
        ballots: { A: "B", B: "B", C: "D", D: "D" },
        traffic: [
          { kind: "vote", from: "A", to: "B", granted: true },
          { kind: "vote", from: "C", to: "D", granted: true },
          { kind: "vote", from: "C", to: "B", granted: false },
          { kind: "vote", from: "A", to: "D", granted: false },
        ],
      },
      {
        ...candidate,
        term: 6,
        name: "A new term, a new chance",
        event:
          "The election times out. This time B starts term 6 before D’s randomized timer expires.",
      },
      { ...second, term: 6 },
      { ...third, term: 6 },
      { ...elected, term: 6 },
    ],
  },
};
export type Lesson = keyof typeof lessons;
export function countVotes(ballots: Ballots, candidate: Server) {
  return Object.values(ballots).filter((vote) => vote === candidate).length;
}

export const messageTravelTime = 1600;
export const voteTravelTime = messageTravelTime;
export const voteRecordingTime = 700;
export function voteReplyProgress(elapsed: number, index: number) {
  return Math.max(
    0,
    Math.min(1, (elapsed - voteRecordingTime - index * 220) / voteTravelTime),
  );
}
export function receivedBallots(
  step: Step,
  previous: Step | undefined,
  elapsed: number,
  reduced: boolean,
): Ballots {
  if (step.traffic?.[0]?.kind !== "vote") return step.ballots;
  const ballots = { ...previous?.ballots };
  step.traffic.forEach((message, index) => {
    if (
      message.kind === "vote" &&
      message.granted &&
      (reduced || voteReplyProgress(elapsed, index) === 1)
    )
      ballots[message.from] = message.to;
  });
  return ballots;
}

// Reconstruct local state from delivered messages, including earlier settled steps.
export function nodeStates(
  steps: readonly Step[],
  index: number,
  elapsed: number,
  reduced: boolean,
): Record<Server, NodeState> {
  const nodes = Object.fromEntries(
    servers.map((server) => [
      server,
      { term: steps[0].term, role: "Follower" },
    ]),
  ) as Record<Server, NodeState>;
  const advanceTerm = (node: NodeState, term: number) => {
    if (term > node.term) {
      node.term = term;
      node.role = "Follower";
      node.votedFor = undefined;
      node.leader = undefined;
    }
  };
  for (let current = 0; current <= index; current++) {
    const step = steps[current];
    for (const candidate of step.candidates) {
      const node = nodes[candidate];
      advanceTerm(node, step.term);
      node.role = "Candidate";
      node.votedFor = candidate;
    }
    if (step.leader) {
      const node = nodes[step.leader];
      advanceTerm(node, step.term);
      node.role = "Leader";
      node.leader = step.leader;
    }
    const delivered =
      current < index || reduced || elapsed >= messageTravelTime;
    for (const message of step.traffic ?? []) {
      if (message.kind === "vote" || !delivered) continue;
      const node = nodes[message.to];
      advanceTerm(node, step.term);
      if (message.kind === "heartbeat") {
        node.role = "Follower";
        node.leader = message.from;
      }
    }
    // These choices are recorded in the vote phase, before replies are sent.
    for (const server of servers) {
      if (nodes[server].term === step.term && step.ballots[server])
        nodes[server].votedFor = step.ballots[server];
    }
  }
  return nodes;
}
export function electionConnections(step: Step): Message[] {
  if (step.leader)
    return servers
      .filter((to) => to !== step.leader)
      .map((to) => ({ kind: "heartbeat", from: step.leader!, to }));
  return (step.candidates.length ? step.candidates : ["B" as Server]).flatMap(
    requests,
  );
}

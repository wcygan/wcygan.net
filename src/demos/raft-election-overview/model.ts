export const servers = ["A", "B", "C", "D", "E"] as const;
export type Server = (typeof servers)[number];
// The overlap figure retains five servers; this election uses three.
export const electionServers = ["A", "B", "C"] as const;
export type ElectionServer = (typeof electionServers)[number];
export const electionMajority = 2;
export type Ballots = Partial<Record<ElectionServer, ElectionServer>>;
export type NodeState = {
  term: number;
  role: "Follower" | "Candidate" | "Leader";
  votedFor?: ElectionServer;
  leader?: ElectionServer;
};
export type Message =
  | { kind: "request" | "heartbeat"; from: ElectionServer; to: ElectionServer }
  | {
      kind: "vote";
      from: ElectionServer;
      to: ElectionServer;
      granted: boolean;
    };
export type Step = {
  name: string;
  event: string;
  term: number;
  candidates: ElectionServer[];
  // Votes recorded locally, before their replies reach a candidate.
  ballots: Ballots;
  leader?: ElectionServer;
  traffic?: Message[];
};
const requests = (from: ElectionServer): NonNullable<Step["traffic"]> =>
  electionServers
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
  name: "B receives the votes",
  event:
    "A’s reply gives B two of three votes, enough to become leader. C’s later reply adds a third vote; B did not need to wait for it.",
  term: 5,
  candidates: ["B"],
  ballots: { A: "B", B: "B", C: "B" },
  traffic: [
    { kind: "vote", from: "A", to: "B", granted: true },
    { kind: "vote", from: "C", to: "B", granted: true },
  ],
};
const elected: Step = {
  name: "B sends heartbeats",
  event:
    "B sends heartbeats. The followers reset their election timers. B became leader as soon as its second vote arrived.",
  term: 5,
  candidates: [],
  ballots: second.ballots,
  leader: "B",
  traffic: electionServers
    .filter((to) => to !== "B")
    .map((to) => ({ kind: "heartbeat", from: "B", to })),
};
export const lessons: Record<
  "success" | "split",
  { label: string; steps: Step[] }
> = {
  success: {
    label: "Successful election",
    steps: [waiting, candidate, second, elected],
  },
  split: {
    label: "Split vote",
    steps: [
      {
        ...waiting,
        event:
          "No leader is sending heartbeats. This time, the three election timers expire together.",
      },
      {
        name: "Three candidates start together",
        event:
          "All three servers time out together, start term 5, and vote for themselves.",
        term: 5,
        candidates: ["A", "B", "C"],
        ballots: { A: "A", B: "B", C: "C" },
        traffic: electionServers.flatMap(requests),
      },
      {
        name: "Neither has a majority",
        event:
          "Each server has already voted for itself and refuses another candidate. One vote each is short of the two needed to win.",
        term: 5,
        candidates: ["A", "B", "C"],
        ballots: { A: "A", B: "B", C: "C" },
        traffic: [
          { kind: "vote", from: "A", to: "B", granted: false },
          { kind: "vote", from: "B", to: "C", granted: false },
          { kind: "vote", from: "C", to: "A", granted: false },
        ],
      },
      {
        ...candidate,
        term: 6,
        name: "A new term, a new chance",
        event:
          "The election times out. This time B starts term 6 before A’s and C’s randomized timers expire.",
      },
      { ...second, term: 6 },
      { ...elected, term: 6 },
    ],
  },
};
export type Lesson = keyof typeof lessons;
export function countVotes(ballots: Ballots, candidate: ElectionServer) {
  return Object.values(ballots).filter((vote) => vote === candidate).length;
}

export const messageTravelTime = 1600;
export const voteTravelTime = messageTravelTime;
export const voteRecordingTime = 700;
export function voteReplyProgress(
  elapsed: number,
  index: number,
  travelTime = voteTravelTime,
  departure = voteRecordingTime + index * 220,
) {
  if (elapsed >= departure + travelTime) return 1;
  return Math.max(0, (elapsed - departure) / travelTime);
}
// B broadcasts its requests and heartbeats together. Other authored exchanges
// retain their reading holds; a batch occupies only its longest flight.
export function messageDeparture(
  step: Step,
  index: number,
  travelTimes?: readonly number[],
) {
  const traffic = step.traffic!,
    current = traffic[index];
  const broadcast = traffic.flatMap((message, order) =>
    message.from === "B" && message.kind !== "vote" ? [order] : [],
  );
  let departure = current.kind === "vote" ? voteRecordingTime : 0;
  for (let order = 0; order < index; order++) {
    if (broadcast.includes(order)) {
      if (broadcast.includes(index) || order !== broadcast[0]) continue;
      departure +=
        Math.max(
          ...broadcast.map(
            (order) => travelTimes?.[order] ?? messageTravelTime,
          ),
        ) + 700;
    } else departure += (travelTimes?.[order] ?? messageTravelTime) + 700;
  }
  return departure;
}

export function receivedBallots(
  step: Step,
  previous: Step | undefined,
  elapsed: number,
  reduced: boolean,
  travelTimes?: readonly number[],
): Ballots {
  if (step.traffic?.[0]?.kind !== "vote") return step.ballots;
  const ballots = { ...previous?.ballots };
  step.traffic.forEach((message, index) => {
    if (
      message.kind === "vote" &&
      message.granted &&
      (reduced ||
        voteReplyProgress(
          elapsed,
          index,
          travelTimes?.[index],
          messageDeparture(step, index, travelTimes),
        ) === 1)
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
  travelTimes?: readonly (readonly number[])[],
): Record<ElectionServer, NodeState> {
  const nodes = Object.fromEntries(
    electionServers.map((server) => [
      server,
      { term: steps[0].term, role: "Follower" },
    ]),
  ) as Record<ElectionServer, NodeState>;
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
      if (node.role !== "Leader") node.role = "Candidate";
      node.votedFor = candidate;
    }
    if (step.leader) {
      const node = nodes[step.leader];
      advanceTerm(node, step.term);
      node.role = "Leader";
      node.leader = step.leader;
    }
    for (const [messageIndex, message] of (step.traffic ?? []).entries()) {
      const delivered =
        current < index ||
        reduced ||
        elapsed >=
          messageDeparture(step, messageIndex, travelTimes?.[current]) +
            (travelTimes?.[current]?.[messageIndex] ?? messageTravelTime);
      if (message.kind === "vote" || !delivered) continue;
      const node = nodes[message.to];
      advanceTerm(node, step.term);
      if (message.kind === "heartbeat") {
        node.role = "Follower";
        node.leader = message.from;
      } else if (
        node.term === step.term &&
        (!node.votedFor || node.votedFor === message.from)
      ) {
        // Every log in this lesson is equal. An eligible RequestVote records
        // the vote locally on arrival, before its reply can be counted.
        node.votedFor = message.from;
      }
    }
    // Retain the authored local choices in the reply phase; they are not
    // candidate receipts until their corresponding reply arrives.
    for (const server of electionServers) {
      if (nodes[server].term === step.term && step.ballots[server])
        nodes[server].votedFor = step.ballots[server];
    }
    // A received majority changes the role immediately. The next authored beat
    // illustrates heartbeats; its reading hold must not delay the election.
    const received = receivedBallots(
      step,
      steps[current - 1],
      elapsed,
      current < index || reduced,
      travelTimes?.[current],
    );
    for (const candidate of step.candidates) {
      if (countVotes(received, candidate) >= electionMajority) {
        nodes[candidate].role = "Leader";
        nodes[candidate].leader = candidate;
      }
    }
  }
  return nodes;
}
export function electionConnections(step: Step): Message[] {
  if (step.leader)
    return electionServers
      .filter((to) => to !== step.leader)
      .map((to) => ({ kind: "heartbeat", from: step.leader!, to }));
  return (
    step.candidates.length ? step.candidates : ["B" as ElectionServer]
  ).flatMap(requests);
}

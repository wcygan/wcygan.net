export type Role = "Follower" | "Candidate" | "Leader";
export type Vote = "granted" | "denied" | "pending";
export type Edge =
  | "election"
  | "majority"
  | "leader-found"
  | "candidate-term"
  | "leader-term"
  | "retry";
export type Phase = {
  role: Role;
  term: number;
  event: string;
  duration: number;
  votes: readonly Vote[];
  timer: readonly [number, number];
  edge?: Edge;
  message?: { kind: "heartbeat" | "leader-request"; term: number };
  noMajority?: boolean;
};

const pending: readonly Vote[] = [
  "pending",
  "pending",
  "pending",
  "pending",
  "pending",
];
const self: readonly Vote[] = [
  "granted",
  "pending",
  "pending",
  "pending",
  "pending",
];
const two: readonly Vote[] = [
  "granted",
  "granted",
  "pending",
  "pending",
  "pending",
];
const three: readonly Vote[] = [
  "granted",
  "granted",
  "granted",
  "pending",
  "pending",
];
const phase = (
  role: Role,
  term: number,
  event: string,
  duration: number,
  votes = pending,
  timer: readonly [number, number] = [0, 0],
  edge?: Edge,
): Phase => ({ role, term, event, duration, votes, timer, edge });
const waiting = phase(
  "Follower",
  4,
  "No heartbeat arrives. The election timer fills.",
  1500,
  pending,
  [0, 1],
);
const candidate = (term = 5, edge: Edge = "election") =>
  phase(
    "Candidate",
    term,
    "Start an election, advance the term, and vote for self.",
    1500,
    self,
    [0, 0.2],
    edge,
  );
const secondVote = (term = 5) =>
  phase(
    "Candidate",
    term,
    "Server B grants a vote. One more vote is needed.",
    2500,
    two,
    [0.2, 0.4],
  );
const thirdVote = (term = 5) =>
  phase(
    "Candidate",
    term,
    "Server C grants the third vote. A majority is reached.",
    2500,
    three,
    [0.4, 0.6],
  );
const elected = (term = 5) =>
  phase(
    "Leader",
    term,
    "The elected leader sends heartbeats. Three votes, including self, elected it.",
    4000,
    three,
    [0, 0],
    "majority",
  );

const incoming = (
  role: Role,
  term: number,
  messageTerm: number,
  kind: "heartbeat" | "leader-request",
  event: string,
  votes = pending,
  timer: readonly [number, number] = [0, 0],
): Phase => ({
  ...phase(role, term, event, 2400, votes, timer),
  message: { kind, term: messageTerm },
});

export const scenarios = {
  win: {
    label: "Win election",
    phases: [waiting, candidate(), secondVote(), thirdVote(), elected()],
  },
  heartbeat: {
    label: "Leader stays available",
    phases: [
      phase(
        "Follower",
        4,
        "Wait for the leader’s next heartbeat.",
        1500,
        pending,
        [0, 0.6],
      ),
      incoming(
        "Follower",
        4,
        4,
        "heartbeat",
        "The leader sends a heartbeat in term 4. Reset the timer when it arrives.",
        pending,
        [0.6, 0.6],
      ),
      phase(
        "Follower",
        4,
        "A heartbeat arrives. Reset the election timer and remain follower.",
        2000,
      ),
    ],
  },
  rival: {
    label: "Another candidate wins",
    phases: [
      waiting,
      candidate(),
      phase(
        "Candidate",
        5,
        "Server B denies its vote. This server remains a candidate.",
        2500,
        ["granted", "denied", "pending", "pending", "pending"],
        [0.2, 0.5],
      ),
      incoming(
        "Candidate",
        5,
        5,
        "leader-request",
        "A leader request arrives in term 5. Follow this term’s elected leader.",
        ["granted", "denied", "pending", "pending", "pending"],
      ),
      phase(
        "Follower",
        5,
        "Another server’s heartbeat announces a leader in this term. Become follower.",
        2000,
        pending,
        [0, 0],
        "leader-found",
      ),
    ],
  },
  split: {
    label: "Split vote",
    phases: [
      waiting,
      candidate(),
      secondVote(),
      {
        ...phase(
          "Candidate",
          5,
          "The remaining votes went to other candidates. Nobody won a majority.",
          2500,
          ["granted", "granted", "denied", "denied", "denied"],
          [0.4, 1],
        ),
        noMajority: true,
      },
      candidate(6, "retry"),
      secondVote(6),
      thirdVote(6),
      elected(6),
    ],
  },
  unreachable: {
    label: "Unreachable majority",
    phases: [
      waiting,
      candidate(),
      secondVote(),
      {
        ...phase(
          "Candidate",
          5,
          "Three servers have not replied. Two votes cannot elect a leader.",
          2500,
          two,
          [0.4, 1],
        ),
        noMajority: true,
      },
      {
        ...phase(
          "Candidate",
          6,
          "The timer expires. Start a new election; a majority is still unreachable.",
          2000,
          self,
          [0, 0],
          "retry",
        ),
        noMajority: true,
      },
    ],
  },
  candidateTerm: {
    label: "Candidate discovers a newer term",
    phases: [
      waiting,
      candidate(),
      incoming(
        "Candidate",
        5,
        6,
        "leader-request",
        "A leader request reports term 6. A newer term makes this candidate step down.",
        self,
      ),
      phase(
        "Follower",
        6,
        "A leader request reports term 6. Update the term and become follower.",
        2000,
        pending,
        [0, 0],
        "candidate-term",
      ),
    ],
  },
  leaderTerm: {
    label: "Leader discovers a newer term",
    phases: [
      waiting,
      candidate(),
      secondVote(),
      thirdVote(),
      elected(),
      incoming(
        "Leader",
        5,
        6,
        "leader-request",
        "Another leader’s request reports term 6. This leader must step down.",
        three,
      ),
      phase(
        "Follower",
        6,
        "A leader request reports term 6. The leader steps down to follower.",
        2000,
        pending,
        [0, 0],
        "leader-term",
      ),
    ],
  },
} satisfies Record<string, { label: string; phases: Phase[] }>;

export type Scenario = keyof typeof scenarios;

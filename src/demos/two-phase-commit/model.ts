export type Vote = "yes" | "no";
export type Votes = [Vote, Vote];
export type Phase = "prepare" | "decision";
export type ParticipantState =
  | "staged"
  | "requested"
  | "prepared"
  | "voted-yes"
  | "rejected"
  | "committed"
  | "aborted";
export type ProtocolTone = "neutral" | "info" | "yes" | "no" | "commit";
export interface ProtocolFrame {
  coordinator: string;
  coordinatorTone: ProtocolTone;
  coordinatorState:
    | "ready"
    | "collecting"
    | "votes"
    | "recorded"
    | "acknowledged";
  decision?: "COMMIT" | "ABORT";
  votesReceived?: number;
  yesVotesReceived?: number;
  participants: [ParticipantState, ParticipantState];
  status: string;
  message?: {
    labels: [string, string] | [string];
    direction: "out" | "in";
    tones: ProtocolTone[];
    targets: (0 | 1)[];
  };
}

export const participantRows = ["row42", "row17"] as const;
export const participantLabels: Record<
  ParticipantState,
  { title: string; detail?: string; locked: boolean }
> = {
  staged: { title: "STAGED", locked: true },
  requested: {
    title: "PREPARE RECEIVED",
    locked: true,
  },
  prepared: { title: "PREPARED", detail: "Saved durably", locked: true },
  "voted-yes": { title: "VOTED YES", detail: "Saved durably", locked: true },
  rejected: { title: "VOTED NO", detail: "Rolled back", locked: false },
  committed: { title: "COMMITTED", detail: "Outcome saved", locked: false },
  aborted: { title: "ROLLED BACK", detail: "Outcome saved", locked: false },
};

export function decisionFor(votes: Votes): "COMMIT" | "ABORT" {
  return votes.every((vote) => vote === "yes") ? "COMMIT" : "ABORT";
}

export function protocolFrames(phase: Phase, votes: Votes): ProtocolFrame[] {
  if (phase === "prepare") votes = ["yes", "yes"];
  const prepared: [ParticipantState, ParticipantState] = votes.map((vote) =>
    vote === "yes" ? "prepared" : "rejected",
  ) as [ParticipantState, ParticipantState];
  const votesReady: ProtocolFrame = {
    coordinator: "Waiting for votes",
    coordinatorTone: "info",
    coordinatorState: "collecting",
    votesReceived: 0,
    yesVotesReceived: 0,
    participants: votes.map((vote) =>
      vote === "yes" ? "voted-yes" : "rejected",
    ) as [ParticipantState, ParticipantState],
    status: "Both participants are ready to send their votes.",
  };
  const receivedVote = (index: 0 | 1): ProtocolFrame => {
    const count = index + 1;
    const receivedVotes = votes.slice(0, count);
    const yesCount = receivedVotes.filter((vote) => vote === "yes").length;
    const voteFor = (participant: string, vote: Vote) =>
      `${participant}: ${vote.toUpperCase()}`;
    return {
      coordinator:
        count === 1
          ? voteFor("A", votes[0])
          : `${voteFor("A", votes[0])} · ${voteFor("B", votes[1])}`,
      coordinatorTone: "info",
      coordinatorState: "collecting",
      votesReceived: count,
      yesVotesReceived: yesCount,
      participants: votesReady.participants,
      status:
        count === 1
          ? `Participant A's ${votes[0].toUpperCase()} vote arrived. Waiting for B's vote.`
          : `Both votes arrived. The coordinator can choose ${decisionFor(votes)}.`,
      message: {
        labels: [votes[index].toUpperCase()],
        direction: "in",
        tones: [votes[index]],
        targets: [index],
      },
    };
  };
  const firstVoteReceived = receivedVote(0);
  const bothVotesReceived = receivedVote(1);
  if (phase === "prepare") {
    return [
      {
        coordinator: "Ready to send",
        coordinatorTone: "neutral",
        coordinatorState: "ready",
        participants: ["staged", "staged"],
        status:
          "Before PREPARE: local changes are staged. Both rows are locked.",
      },
      {
        coordinator: "Waiting for votes",
        coordinatorTone: "info",
        coordinatorState: "collecting",
        participants: ["requested", "requested"],
        status:
          "Participants received PREPARE and validate their local changes. The coordinator waits for their votes; receipt is not acknowledged separately.",
        message: {
          labels: ["PREPARE", "PREPARE"],
          direction: "out",
          tones: ["info", "info"],
          targets: [0, 1],
        },
      },
      {
        coordinator: "Waiting for votes",
        coordinatorTone: "info",
        coordinatorState: "collecting",
        participants: prepared,
        status:
          "Both participants saved their prepared state. Each will vote YES; both rows stay locked.",
      },
      votesReady,
    ];
  }
  const outcome = decisionFor(votes);
  const outcomeTone = outcome === "COMMIT" ? "commit" : "no";
  const finalState = outcome === "COMMIT" ? "committed" : "aborted";
  const first: [ParticipantState, ParticipantState] = [
    finalState,
    bothVotesReceived.participants[1],
  ];
  const final: [ParticipantState, ParticipantState] = [finalState, finalState];
  return [
    votesReady,
    firstVoteReceived,
    bothVotesReceived,
    {
      coordinator: outcome,
      coordinatorTone: outcomeTone,
      coordinatorState: "recorded",
      decision: outcome,
      participants: bothVotesReceived.participants,
      votesReceived: 2,
      yesVotesReceived: votes.filter((vote) => vote === "yes").length,
      status: `${outcome} is saved durably before delivery. Prepared rows stay locked.`,
    },
    {
      coordinator: outcome,
      coordinatorTone: outcomeTone,
      coordinatorState: "recorded",
      decision: outcome,
      votesReceived: 2,
      yesVotesReceived: votes.filter((vote) => vote === "yes").length,
      participants: first,
      status: `A received ${outcome}. Its outcome is saved and its row is unlocked.`,
      message: {
        labels: [outcome],
        direction: "out",
        tones: [outcomeTone],
        targets: [0],
      },
    },
    {
      coordinator: outcome,
      coordinatorTone: outcomeTone,
      coordinatorState: "recorded",
      decision: outcome,
      votesReceived: 2,
      yesVotesReceived: votes.filter((vote) => vote === "yes").length,
      participants: final,
      status: `B received ${outcome}. Both outcomes are saved; both rows are unlocked.`,
      message: {
        labels: [outcome],
        direction: "out",
        tones: [outcomeTone],
        targets: [1],
      },
    },
    {
      coordinator: outcome,
      coordinatorTone: outcomeTone,
      coordinatorState: "acknowledged",
      decision: outcome,
      votesReceived: 2,
      yesVotesReceived: votes.filter((vote) => vote === "yes").length,
      participants: final,
      status: `Both acknowledgements arrived. ${outcome} is complete.`,
      message: {
        labels: ["ACK", "ACK"],
        direction: "in",
        tones: ["info", "info"],
        targets: [0, 1],
      },
    },
  ];
}

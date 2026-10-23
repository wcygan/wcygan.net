import { currentTermFrame, type Server, type Snapshot } from "./model";

import { payloadUnitsPerSecond } from "../raft-transport";
import { packetRouteLength } from "./route";

export const playbackRate = 1;
// Match the desktop pixel speed of the shared 600-unit / 560px log scenes.
const scaleRatio = 480 / 360 / (560 / 600);
const messagePause = 600;

export type Flight = {
  from: Server;
  to: Server;
  kind: "vote-request" | "vote" | "append" | "ack";
  label: string;
  start: number;
  end: number;
  granted?: boolean;
};
const flight = (
  from: Server,
  to: Server,
  kind: Flight["kind"],
  label: string,
  start: number,
  granted?: boolean,
): Flight => ({
  from,
  to,
  kind,
  label,
  start,
  end:
    start +
    ((packetRouteLength(from, to) * scaleRatio) / payloadUnitsPerSecond) * 1000,
  granted,
});
const election = (from: Server, to: Server, granted = true) => {
  const request = flight(
    from,
    to,
    "vote-request",
    "Request vote",
    messagePause,
  );
  return [
    request,
    flight(
      to,
      from,
      "vote",
      granted ? "Vote granted" : "Vote denied",
      request.end + messagePause,
      granted,
    ),
  ];
};
const replicate = (
  from: Server,
  to: Server,
  label: string,
  start = messagePause,
  entryIndex = 2,
) => {
  const request = flight(from, to, "append", label, start);
  return [
    request,
    flight(
      to,
      from,
      "ack",
      `Durably stored · entry ${entryIndex}`,
      request.end + messagePause,
    ),
  ];
};

export function flightsFor(frame: number): Flight[] {
  switch (frame) {
    case 1:
      return election("C", "B");
    case 2:
      return [
        ...election("A", "B"),
        ...replicate(
          "A",
          "B",
          "Entry 2 · term 2",
          election("A", "B").at(-1)!.end + messagePause,
        ),
      ];
    case 4:
      return election("C", "B");
    case 5:
      return [
        ...replicate("C", "B", "Replace with term 3"),
        ...replicate(
          "C",
          "A",
          "Replace with term 3",
          replicate("C", "B", "Replace with term 3").at(-1)!.end + messagePause,
        ),
      ];
    case 7:
      return replicate("A", "B", "Entry 3 · term 4", messagePause, 3);
    case 8:
      return election("C", "B", false);
    default:
      return [];
  }
}
export function frameDuration(frame: number) {
  const readingPause = frame === 2 || frame === 7 ? 6000 : 3200;
  return Math.max(4500, (flightsFor(frame).at(-1)?.end ?? 0) + readingPause);
}

// Each arrival changes the receiver first; the leader counts a vote or durable
// copy only after the return message arrives. This is an authored lesson.
export function transportState(frame: number, elapsed: number) {
  const target = currentTermFrame(frame);
  const flights = flightsFor(frame);
  const activeFlight = flights.find(
    (message) => elapsed >= message.start && elapsed < message.end,
  );
  const voteComparison =
    frame === 4 || frame === 8
      ? {
          voterTerm: frame === 4 ? 2 : 4,
          candidateTerm: 3,
          delivered: elapsed >= flights[0].end,
          granted: frame === 4,
        }
      : undefined;
  const acknowledged = elapsed >= (flights.at(-1)?.end ?? Infinity);
  const decision =
    frame === 2 && elapsed >= flights[2].start
      ? acknowledged
        ? "ACK received: entry 2 is durably stored on A and B, but its term is 2 and A leads term 4. It stays uncommitted: C’s term-3 log can still win a later election and overwrite it."
        : "Entry 2 is from term 2; A now leads term 4. B’s ACK will confirm durable storage. A cannot commit this older-term entry merely by counting its copies."
      : frame === 7
        ? acknowledged
          ? "ACK received: entry 3 is from A’s current term 4 and is durably stored on A and B. A commits entry 3 and the preceding entry 2 together."
          : "Entry 3 is from A’s current term 4. A waits for B’s durable-storage ACK before committing it. Entries 2 and 3 remain uncommitted until that reply arrives."
        : undefined;
  if (!flights.length)
    return {
      ...target,
      flights,
      activeFlight,
      decision,
      voteComparison,
      settled: true,
    };
  const before = currentTermFrame(Math.max(0, frame - 1));
  const nodes: Snapshot["nodes"] = before.nodes.map((node) => ({
    ...node,
    vote: undefined,
  }));
  let committedThrough = before.committedThrough;
  const node = (id: Server) => nodes.find((item) => item.id === id)!;
  const desired = (id: Server) => target.nodes.find((item) => item.id === id)!;
  for (const item of nodes) {
    if (desired(item.id).role === "offline") item.role = "offline";
    else if (item.role === "offline") item.role = "follower";
  }
  // A returns only for the second replication in (d), after B has caught up.
  if (frame === 5 && elapsed < flights[2].start) node("A").role = "offline";
  const request = flights.find((message) => message.kind === "vote-request");
  if (request) {
    node(request.from).role = "candidate";
    node(request.from).vote = request.from;
  }
  if (frame === 7) node("A").log = desired("A").log;
  for (const message of flights) {
    if (elapsed < message.end) continue;
    if (message.kind === "vote-request") {
      const reply = flights.find((item) => item.kind === "vote")!;
      node(message.to).role = "follower";
      node(message.to).vote = reply.granted ? message.from : "refused";
    }
    if (message.kind === "vote" && message.granted) {
      node(message.to).role = "leader";
      if (frame === 2) node("A").log = desired("A").log;
    }
    if (message.kind === "append")
      node(message.to).log = desired(message.to).log;
    if (message.kind === "ack" && frame === 7)
      committedThrough = target.committedThrough;
  }
  const settled = elapsed >= flights.at(-1)!.end;
  // C accepts its conflicting local entry only after winning the first election.
  if (frame === 1 && settled) node("C").log = desired("C").log;
  const leader = nodes.find((item) => item.role === "leader");
  return {
    ...target,
    decision,
    voteComparison,
    nodes,
    committedThrough,
    context: settled
      ? target.context
      : leader
        ? `${leader.id} leads · messages in flight`
        : `${request?.from} seeks a majority`,
    tally: settled
      ? target.tally
      : frame === 7
        ? "Waiting for entry 3’s durable-storage ACK"
        : "Following the request and reply",
    flights,
    activeFlight,
    settled,
  };
}

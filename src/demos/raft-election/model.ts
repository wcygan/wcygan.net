import {
  NODES,
  type Action,
  type NodeId,
  type NodeState,
  type Packet,
  type Scenario,
  type Simulation,
} from "./types";
export const MAJORITY = 3;
// 2,500 model milliseconds equals five seconds at half-speed playback.
export const RECOVERY_DELAY = 2500;
// Deliberately stretched, repeatable teaching schedules, not production timings.
function timeout(s: Simulation, id: NodeId) {
  const n = s.nodes[id];
  if (!s.election.peers.includes(id) && n.role === "follower") return 3600;
  if (n.role === "candidate")
    return 2400 + Math.max(0, s.election.peers.indexOf(id)) * 900;
  if (
    s.scenario === "split" &&
    n.term < s.election.term &&
    s.election.peers.slice(0, 2).includes(id)
  )
    return 1500;
  return 1500 + Math.max(0, s.election.peers.indexOf(id)) * 700;
}
function resetTimer(s: Simulation, id: NodeId) {
  s.nodes[id].timerDuration = timeout(s, id);
  s.nodes[id].deadline = s.now + s.nodes[id].timerDuration;
}
function send(
  s: Simulation,
  from: NodeId,
  to: NodeId,
  kind: Packet["kind"],
  granted?: boolean,
) {
  const node = s.nodes[from];
  let delay = 700;
  if (
    s.scenario === "split" &&
    node.term === s.election.term &&
    kind === "request"
  ) {
    const [first, second, firstVoter, secondVoter] = s.election.peers;
    delay =
      (from === first && to === firstVoter) ||
      (from === second && to === secondVoter)
        ? 700
        : 1000;
    // The recovering fifth voter is on the slower path in the split schedule.
    if (!s.election.peers.includes(to)) delay = 2000;
  }
  s.packets.push({
    id: s.nextId++,
    from,
    to,
    kind,
    granted,
    term: node.term,
    sentAt: s.now,
    arrivesAt: s.now + delay,
  });
}
function heartbeat(s: Simulation, id: NodeId) {
  s.nodes[id].heartbeatAt = s.now + 650;
  for (const peer of NODES) if (peer !== id) send(s, id, peer, "heartbeat");
}
function follow(s: Simulation, id: NodeId, term: number) {
  const n = s.nodes[id];
  n.role = "follower";
  n.term = term;
  n.votedFor = null;
  n.votes = [];
  n.leader = null;
  n.heartbeatAt = Infinity;
  resetTimer(s, id);
}
export function receive(s: Simulation, p: Packet) {
  if (s.crashed.includes(p.to)) return;
  const n = s.nodes[p.to];
  if (p.term > n.term) follow(s, p.to, p.term);
  if (p.term < n.term) {
    if (p.kind === "request") send(s, p.to, p.from, "reply", false);
    return;
  }
  if (p.kind === "heartbeat") {
    n.role = "follower";
    n.leader = p.from;
    n.votes = [];
    n.heartbeatAt = Infinity;
    resetTimer(s, p.to);
  } else if (p.kind === "request") {
    const granted = n.votedFor === null || n.votedFor === p.from;
    if (granted) {
      n.votedFor = p.from;
      resetTimer(s, p.to);
    }
    send(s, p.to, p.from, "reply", granted);
  } else if (n.role === "candidate" && p.granted && !n.votes.includes(p.from)) {
    n.votes.push(p.from);
    if (n.votes.length >= MAJORITY) {
      n.role = "leader";
      n.leader = p.to;
      n.deadline = Infinity;
      s.status = `${p.to} received ${n.votes.length} of 5 votes in term ${n.term}. It is leader and sends heartbeats.`;
      heartbeat(s, p.to);
    }
  }
}
function elect(s: Simulation, id: NodeId) {
  const n = s.nodes[id];
  n.term++;
  n.role = "candidate";
  n.votedFor = id;
  n.votes = [id];
  n.leader = null;
  resetTimer(s, id);
  s.status = `${id} timed out, started term ${n.term}, and voted for itself. It requests votes from its peers.`;
  for (const peer of NODES) if (peer !== id) send(s, id, peer, "request");
}
export function createSimulation(scenario: Scenario = "success"): Simulation {
  const s: Simulation = {
    now: 0,
    scenario,
    nextId: 1,
    crashed: [],
    recoverAt: {},
    splitSeen: false,
    election: { term: 2, peers: ["A", "C", "D", "E"] },
    packets: [],
    status: "B leads term 1. Crash the leader to follow the election.",
    nodes: Object.fromEntries(
      NODES.map((id) => [
        id,
        {
          role: id === "B" ? "leader" : "follower",
          term: 1,
          votedFor: "B",
          votes: [],
          deadline: Infinity,
          timerDuration: 1500,
          heartbeatAt: Infinity,
          leader: "B",
        } as NodeState,
      ]),
    ) as Simulation["nodes"],
  };
  for (const id of NODES) if (id !== "B") resetTimer(s, id);
  heartbeat(s, "B");
  return s;
}
export function nextEventAt(s: Simulation) {
  return Math.min(
    ...Object.values(s.recoverAt),
    ...s.packets.map((p) => p.arrivesAt),
    ...NODES.filter((id) => !s.crashed.includes(id)).map((id) =>
      s.nodes[id].role === "leader"
        ? s.nodes[id].heartbeatAt
        : s.nodes[id].deadline,
    ),
  );
}
export function transition(state: Simulation, action: Action): Simulation {
  if (action.type === "reset")
    return createSimulation(action.scenario ?? state.scenario);
  const s = structuredClone(state);
  if (action.type === "scenario") {
    applyScenario(s, action.scenario);
    return s;
  }
  if (action.type === "crash") {
    const leader = currentLeader(s);
    if (!leader) return state;
    applyScenario(s, s.scenario);
    s.crashed.push(leader);
    s.recoverAt[leader] = s.now + RECOVERY_DELAY;
    s.status = `${leader} has crashed and will return as a follower after five seconds of playback. Peers only observe silence; their election timers keep running.`;
    return s;
  }
  const target = action.type === "step" ? nextEventAt(s) : action.to;
  if (!Number.isFinite(target) || target < s.now) return state;
  while (nextEventAt(s) <= target) {
    s.now = nextEventAt(s);
    // Recovery precedes deliveries at the same timestamp. Durable term/vote survive.
    for (const id of s.crashed) {
      if ((s.recoverAt[id] ?? Infinity) > s.now) continue;
      delete s.recoverAt[id];
      const n = s.nodes[id];
      n.role = "follower";
      n.votes = [];
      n.leader = null;
      n.heartbeatAt = Infinity;
      resetTimer(s, id);
      s.status = `${id} is back online as a follower. Its term and vote survive the crash; messages tell it who leads.`;
    }
    s.crashed = s.crashed.filter((id) => s.recoverAt[id] !== undefined);
    // Deliveries precede timeouts at the same timestamp. No observer sees partial batches.
    const arriving = s.packets
      .filter((p) => p.arrivesAt <= s.now)
      .sort((a, b) => a.id - b.id);
    s.packets = s.packets.filter((p) => p.arrivesAt > s.now);
    for (const p of arriving) receive(s, p);
    for (const id of NODES) {
      if (s.crashed.includes(id)) continue;
      const n = s.nodes[id];
      if (n.role === "leader") {
        if (n.heartbeatAt <= s.now) heartbeat(s, id);
      } else if (n.deadline <= s.now) elect(s, id);
    }
    const contenders = s.election.peers.filter(
      (id) =>
        !s.crashed.includes(id) &&
        s.nodes[id].role === "candidate" &&
        s.nodes[id].term === s.election.term,
    );
    if (
      !s.splitSeen &&
      contenders.length >= 2 &&
      !s.packets.some(
        (p) =>
          p.term === s.election.term &&
          p.kind !== "heartbeat" &&
          s.election.peers.includes(p.from) &&
          s.election.peers.includes(p.to),
      )
    ) {
      s.splitSeen = true;
      s.status = `Split vote in term ${s.election.term}: ${contenders.map((id) => `${id} has ${s.nodes[id].votes.length} of 5 votes`).join("; ")}. Neither has a majority. Their retry timers differ.`;
    }
    const winner = currentLeader(s);
    if (
      winner &&
      s.nodes[winner].term > 1 &&
      NODES.filter((id) => !s.crashed.includes(id) && id !== winner).every(
        (id) =>
          s.nodes[id].leader === winner &&
          s.nodes[id].term === s.nodes[winner].term,
      )
    ) {
      s.status = `${winner} leads term ${s.nodes[winner].term}. Heartbeats continue. Crash the leader again to trigger another election.`;
    } else if (s.crashed.length > NODES.length - MAJORITY) {
      s.status =
        "Fewer than three nodes remain online. Candidates keep retrying, but cannot win a majority. Reset to restore the cluster.";
    }
  }
  s.now = target;
  return s;
}

export function currentLeader(s: Simulation) {
  return NODES.find(
    (id) => !s.crashed.includes(id) && s.nodes[id].role === "leader",
  );
}

/** Change only future scheduling; delivered votes and traveling packets stay real. */
function applyScenario(s: Simulation, scenario: Scenario) {
  const leader = currentLeader(s);
  // Rotate the teaching schedule around the current leader. Node IDs do not
  // confer a permanent timeout advantage; elections still require real votes.
  const cycle: NodeId[] = ["B", "A", "C", "D", "E"];
  const offset = leader ? cycle.indexOf(leader) + 1 : 0;
  const order = leader
    ? [...cycle.slice(offset), ...cycle.slice(0, offset)]
    : [
        ...s.election.peers,
        ...NODES.filter((id) => !s.election.peers.includes(id)),
      ];
  const peers = order.filter((id) => !s.crashed.includes(id) && id !== leader);
  s.scenario = scenario;
  s.splitSeen = false;
  s.election = {
    peers,
    term:
      Math.max(
        ...peers.map((id) => s.nodes[id].term),
        leader ? s.nodes[leader].term : 0,
      ) + 1,
  };
  // Preserve elapsed time. Switching scenarios never restarts a timer or clock.
  for (const id of peers) {
    const n = s.nodes[id];
    const startedAt = n.deadline - n.timerDuration;
    n.timerDuration = timeout(s, id);
    n.deadline = Math.max(s.now + 1, startedAt + n.timerDuration);
  }
  if (scenario === "split" && peers.length >= 2) {
    const first = s.nodes[peers[0]],
      second = s.nodes[peers[1]];
    const deadline = Math.min(first.deadline, second.deadline);
    for (const n of [first, second]) {
      const startedAt = n.deadline - n.timerDuration;
      n.deadline = deadline;
      n.timerDuration = Math.max(1, deadline - startedAt);
    }
  }
}

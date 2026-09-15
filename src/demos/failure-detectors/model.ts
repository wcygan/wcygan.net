import {
  FOLLOWERS,
  type Action,
  type Config,
  type FollowerId,
  type Observation,
  type Simulation,
} from "./types";

export const DEFAULT_CONFIG: Config = {
  nodeCount: 5,
  interval: 1000,
  delay: 200,
  jitter: 50,
  electionMin: 3000,
};
const LIMITS: Record<keyof Config, [number, number]> = {
  nodeCount: [2, 5],
  interval: [500, 3000],
  delay: [50, 2000],
  jitter: [0, 1000],
  electionMin: [1000, 5000],
};
function configure(config: Config, values: Partial<Config>): Config {
  const next = { ...config };
  for (const key of Object.keys(LIMITS) as (keyof Config)[]) {
    const value = values[key];
    if (value !== undefined && Number.isFinite(value)) {
      const [min, max] = LIMITS[key];
      next[key] = Math.max(
        min,
        Math.min(max, key === "nodeCount" ? Math.round(value) : value),
      );
    }
  }
  return next;
}
const nextSeed = (seed: number) =>
  (Math.imul(seed, 1664525) + 1013904223) >>> 0;
export const followerIds = (s: Simulation) =>
  FOLLOWERS.slice(0, s.config.nodeCount - 1);
export const follower = (s: Simulation, id: FollowerId = "A") =>
  s.followers[id]!;
export function electionTimeout(s: Simulation, id: FollowerId = "A") {
  return Math.round(
    s.config.electionMin * (1 + follower(s, id).timeoutFraction),
  );
}
export function deadline(s: Simulation, id: FollowerId = "A") {
  return follower(s, id).timerStartedAt + electionTimeout(s, id);
}
export const candidates = (s: Simulation) =>
  followerIds(s).filter((id) => follower(s, id).role === "candidate");
export const isSettled = (s: Simulation) => candidates(s).length > 0;
export const reachableFollowers = (s: Simulation) =>
  followerIds(s).filter(
    (id) =>
      !s.transport.cut.includes(id) && follower(s, id).role === "follower",
  );
function randomTarget(s: Simulation): FollowerId | undefined {
  const eligible = reachableFollowers(s);
  if (!eligible.length || s.transport.crashed) return;
  s.faultSeed = nextSeed(s.faultSeed);
  return eligible[Math.floor((s.faultSeed / 4294967296) * eligible.length)];
}
function restartTimer(o: Observation, now: number) {
  o.timerStartedAt = now;
  o.timerSeed = nextSeed(o.timerSeed);
  o.timeoutFraction = o.timerSeed / 4294967296;
}
function timerSeed(seed: number, id: FollowerId): number {
  if (id === "A") return (seed ^ 0x9e3779b9) >>> 0;
  // Mix node identities before seeding so the first timeouts are not correlated.
  let value = seed ^ Math.imul(FOLLOWERS.indexOf(id), 0x9e3779b9);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}
function createFollower(
  now: number,
  seed: number,
  id: FollowerId,
): Observation {
  const o: Observation = {
    role: "follower",
    received: 0,
    lastReceived: null,
    timerSeed: timerSeed(seed, id),
    timerStartedAt: now,
    timeoutFraction: 0,
    electionStartedAt: null,
    arrivals: [],
  };
  restartTimer(o, now);
  return o;
}
function send(s: Simulation) {
  s.leader.lastSent = s.now;
  s.leader.sent++;
  for (const to of followerIds(s)) {
    if (follower(s, to).role === "candidate") continue;
    const id = s.nextId++;
    const drop = s.transport.dropNext === to;
    if (drop) {
      s.transport.dropNext = null;
      s.transport.lastDrop = to;
    }
    if (drop || s.transport.cut.includes(to)) {
      s.transport.dropped++;
      continue;
    }
    s.networkSeed = nextSeed(s.networkSeed);
    const delay = Math.max(
      1,
      s.config.delay + ((s.networkSeed / 4294967296) * 2 - 1) * s.config.jitter,
    );
    s.packets.push({
      id,
      from: "B",
      to,
      sentAt: s.now,
      arrivesAt: s.now + delay,
    });
  }
  s.packets.sort((a, b) => a.arrivesAt - b.arrivesAt || a.id - b.id);
}
export function createSimulation(
  values: Partial<Config> = {},
  seed = 14731,
): Simulation {
  const s: Simulation = {
    now: 0,
    config: configure(DEFAULT_CONFIG, values),
    initialSeed: seed,
    networkSeed: seed >>> 0,
    faultSeed: (seed ^ 0x85ebca6b) >>> 0,
    nextId: 1,
    leader: { lastSent: 0, sent: 0 },
    followers: { A: createFollower(0, seed, "A") },
    transport: {
      crashed: false,
      cut: [],
      dropNext: null,
      lastDrop: null,
      dropped: 0,
    },
    packets: [],
  };
  for (const id of followerIds(s)) {
    if (id !== "A") s.followers[id] = createFollower(0, seed, id);
  }
  send(s);
  return s;
}
export function nextEventAt(s: Simulation): number {
  if (isSettled(s)) return Infinity;
  return Math.min(
    s.packets[0]?.arrivesAt ?? Infinity,
    s.transport.crashed
      ? Infinity
      : Math.max(s.now, s.leader.lastSent + s.config.interval),
    ...followerIds(s)
      .filter((id) => follower(s, id).role === "follower")
      .map((id) => Math.max(s.now, deadline(s, id))),
  );
}
function advance(s: Simulation, to: number) {
  if (!Number.isFinite(to) || to < s.now || isSettled(s)) return;
  let at = nextEventAt(s);
  while (at <= to) {
    s.now = at;
    // Equal-time deliveries precede every follower's deadline. Packets already
    // sent by B can still arrive after B crashes, including out-of-order ones.
    while (s.packets.length && s.packets[0].arrivesAt <= s.now) {
      const packet = s.packets.shift()!;
      const o = follower(s, packet.to);
      const arrival = { id: packet.id, at: s.now };
      o.received++;
      o.lastReceived = arrival;
      o.arrivals.push(arrival);
      o.arrivals = o.arrivals.slice(-8);
      restartTimer(o, s.now);
    }
    for (const id of followerIds(s)) {
      if (follower(s, id).role === "follower" && deadline(s, id) <= s.now) {
        follower(s, id).role = "candidate";
        follower(s, id).electionStartedAt = s.now;
      }
    }
    // Freeze the whole experiment at the first election boundary, including
    // other followers' timers and packets still in flight, until Reset.
    if (isSettled(s)) return;
    if (!s.transport.crashed && s.leader.lastSent + s.config.interval <= s.now)
      send(s);
    at = nextEventAt(s);
  }
  s.now = to;
}
export function transition(state: Simulation, action: Action): Simulation {
  if (action.type === "reset")
    return createSimulation(state.config, state.initialSeed);
  if (isSettled(state)) return state;
  const s = structuredClone(state);
  switch (action.type) {
    case "advance":
      advance(s, action.to);
      break;
    case "tick":
      advance(s, s.now + Math.max(0, action.elapsed));
      break;
    case "step":
      advance(s, nextEventAt(s));
      break;
    case "configure": {
      s.config = configure(s.config, action.values);
      const active = followerIds(s);
      for (const id of FOLLOWERS) {
        if (active.includes(id)) {
          // Added followers begin listening now and receive the next broadcast.
          s.followers[id] ??= createFollower(s.now, s.initialSeed, id);
        } else if (id !== "A") delete s.followers[id];
      }
      s.packets = s.packets.filter((p) => active.includes(p.to));
      s.transport.cut = s.transport.cut.filter((id) => active.includes(id));
      if (s.transport.dropNext && !active.includes(s.transport.dropNext))
        s.transport.dropNext = null;
      if (s.transport.lastDrop && !active.includes(s.transport.lastDrop))
        s.transport.lastDrop = null;
      // Keep existing random draws, timer start times and packet deadlines.
      advance(s, s.now);
      break;
    }
    case "cut": {
      const target = randomTarget(s);
      if (target) {
        s.transport.cut.push(target);
        s.transport.dropped += s.packets.filter((p) => p.to === target).length;
        s.packets = s.packets.filter((p) => p.to !== target);
        if (s.transport.dropNext === target) s.transport.dropNext = null;
      }
      break;
    }
    case "crash":
      s.transport.crashed = true;
      s.transport.dropNext = null;
      break;
    case "drop":
      if (!s.transport.dropNext) s.transport.dropNext = randomTarget(s) ?? null;
      break;
  }
  return s;
}

import type {
  AccountState,
  DemoDefinition,
  DemoKind,
  Message,
  NodeId,
  ReplicaState,
  TransactionFrame,
  TransactionScenario,
} from "./types";

// Finite teaching traces, not a general-purpose distributed database simulator.
// Every frame is a separate snapshot; messages describe the transition into it.
const account = (): AccountState => ({
  balance: 100,
  pending: 0,
  locked: false,
  state: "idle",
  records: [],
});

function initial(
  title: string,
  status: string,
  layout: TransactionFrame["layout"] = "split",
  coordinator = false,
): TransactionFrame {
  return {
    title,
    status,
    layout,
    accounts: [account(), account()],
    coordinator: {
      visible: coordinator,
      online: true,
      record: null,
      role: "dedicated",
    },
    isolated: false,
    replicas: [],
    messages: [],
  };
}

function next(
  frame: TransactionFrame,
  title: string,
  status: string,
  changes: Partial<TransactionFrame> = {},
): TransactionFrame {
  return structuredClone({
    ...frame,
    title,
    status,
    messages: [],
    recoveryAction: undefined,
    wait: undefined,
    ...changes,
  });
}

const message = (from: NodeId, to: NodeId, label: string): Message => ({
  from,
  to,
  label,
});
const broadcast = (label: string): Message[] => [
  message("coordinator", "a", label),
  message("coordinator", "b", label),
];
const replies = (label: string): Message[] => [
  message("a", "coordinator", label),
  message("b", "coordinator", label),
];
const begin = (a: AccountState, pending: number): AccountState => ({
  ...a,
  pending,
  locked: true,
  state: "pending",
  records: [...a.records],
});
const prepare = (a: AccountState): AccountState => ({
  ...a,
  state: "prepared",
  records: [...a.records, "PREPARE"],
});
const precommit = (a: AccountState): AccountState => ({
  ...a,
  state: "pre-commit",
  records: [...a.records, "PRE-COMMIT"],
});
const commit = (a: AccountState): AccountState => ({
  balance: a.balance + a.pending,
  pending: 0,
  locked: false,
  state: "committed",
  records: [...a.records, "COMMIT"],
});
const abort = (a: AccountState): AccountState => ({
  ...a,
  pending: 0,
  locked: false,
  state: "aborted",
  records: [...a.records, "ABORT"],
});
const both = (
  accounts: TransactionFrame["accounts"],
  update: (account: AccountState) => AccountState,
): TransactionFrame["accounts"] => [update(accounts[0]), update(accounts[1])];
const pending = (
  accounts: TransactionFrame["accounts"],
): TransactionFrame["accounts"] => [
  begin(accounts[0], -10),
  begin(accounts[1], 10),
];

function independent(): TransactionScenario {
  const start = initial(
    "One transfer",
    "Move $10 from A to B. The two balances begin at $100 each.",
    "together",
  );
  const split = next(
    start,
    "Two local transaction boundaries",
    "Move B to a second shard. Each shard can commit only its own change.",
    { layout: "split" },
  );
  const debit = next(
    split,
    "Stage the debit",
    "Shard A holds a pending −$10 change. The stored balance remains $100.",
    { accounts: [begin(split.accounts[0], -10), split.accounts[1]] },
  );
  const debited = next(
    debit,
    "Debit commits independently",
    "A commits at $90 before the application has secured B's credit.",
    { accounts: [commit(debit.accounts[0]), debit.accounts[1]] },
  );
  const credit = next(
    debited,
    "Try the credit",
    "The application starts a separate local transaction for B's +$10.",
    {
      accounts: [debited.accounts[0], begin(debited.accounts[1], 10)],
      messages: [message("a", "b", "Next request")],
    },
  );
  const failed = next(
    credit,
    "The second transaction fails",
    "A is $90 and B is $100: $10 is missing. Each local transaction was atomic; the transfer was not.",
    { accounts: [credit.accounts[0], abort(credit.accounts[1])] },
  );
  return {
    id: "partial-commit",
    label: "Independent commits",
    description:
      "The same transfer crosses two independent local transaction boundaries.",
    frames: [start, split, debit, debited, credit, failed],
  };
}

function placementTogether(): TransactionScenario {
  const start = initial(
    "Together on one shard",
    "A and B share one shard, so the transfer has one transaction participant.",
    "together",
  );
  const staged = next(
    start,
    "Stage both changes",
    "One local transaction holds both updates: −$10 for A and +$10 for B.",
    { accounts: pending(start.accounts) },
  );
  const done = next(
    staged,
    "One atomic commit",
    "A becomes $90 and B becomes $110 together. One shard owns the entire transaction.",
    { accounts: both(staged.accounts, commit) },
  );
  return {
    id: "together",
    label: "Together",
    description: "Colocated accounts need one local commit.",
    frames: [start, staged, done],
  };
}

function twoPhasePrefix(): TransactionFrame[] {
  const start = initial(
    "Two participants",
    "A coordinator will collect votes before choosing one outcome for the transfer.",
    "split",
    true,
  );
  const staged = next(
    start,
    "Prepare requested",
    "Each shard stages its change and holds a row lock. Neither balance has committed.",
    { accounts: pending(start.accounts), messages: broadcast("Prepare") },
  );
  const prepared = next(
    staged,
    "Durable promises",
    "Both shards durably record PREPARE. Their pending changes and locks must survive recovery.",
    { accounts: both(staged.accounts, prepare) },
  );
  const voted = next(
    prepared,
    "Both votes are Yes",
    "The coordinator receives both Yes votes. Prepared still does not mean committed.",
    { messages: replies("Yes") },
  );
  return [start, staged, prepared, voted];
}

function twoPhaseCommit(interrupted = false): TransactionScenario {
  const frames = twoPhasePrefix();
  let frame = frames.at(-1)!;
  frame = next(
    frame,
    "Record the global decision",
    "The coordinator durably records COMMIT before sending it to either participant.",
    { coordinator: { ...frame.coordinator, record: "COMMIT" } },
  );
  frames.push(frame);
  frame = next(
    frame,
    "A receives Commit",
    "A applies the debit. B remains prepared; these are internal progress states, not a consistent transaction read.",
    {
      accounts: [commit(frame.accounts[0]), frame.accounts[1]],
      messages: [message("coordinator", "a", "Commit")],
    },
  );
  frames.push(frame);
  if (interrupted) {
    frame = next(
      frame,
      "B cannot learn the decision",
      "The coordinator is unreachable and B is isolated from A. B keeps its +$10 pending and its lock held; a timeout cannot justify abort.",
      {
        coordinator: { ...frame.coordinator, online: false },
        isolated: true,
        recoveryAction: "Recover coordinator",
      },
    );
    frames.push(frame);
    frame = next(
      frame,
      "Recover the durable decision",
      "The coordinator recovers its COMMIT record and communication with B. It must complete that same decision.",
      { coordinator: { ...frame.coordinator, online: true }, isolated: false },
    );
    frames.push(frame);
  }
  frame = next(
    frame,
    "B receives Commit",
    "A is $90 and B is $110. Both participants committed the same transaction; both locks are released.",
    {
      accounts: [frame.accounts[0], commit(frame.accounts[1])],
      messages: [message("coordinator", "b", "Commit")],
    },
  );
  frames.push(frame);
  return {
    id: interrupted ? "interrupted" : "commit",
    label: interrupted ? "Decision interrupted" : "Commit",
    description: interrupted
      ? "Interrupt delivery after A commits; recover the decision to release B."
      : "Prepare both participants, then deliver one durable commit decision.",
    frames,
  };
}

function twoPhaseAbort(): TransactionScenario {
  const [start, staged] = twoPhasePrefix();
  const rejected = next(
    staged,
    "A prepares; B votes No",
    "A can commit and durably prepares. B rejects the credit before promising to commit, discarding its pending change.",
    {
      accounts: [prepare(staged.accounts[0]), abort(staged.accounts[1])],
      messages: [message("b", "coordinator", "No")],
    },
  );
  const voted = next(
    rejected,
    "One No is enough",
    "A's Yes vote arrives, but B's No rules out a global commit.",
    { messages: [message("a", "coordinator", "Yes")] },
  );
  const decision = next(
    voted,
    "Record Abort",
    "The coordinator durably records ABORT. A's prepared debit must be discarded.",
    { coordinator: { ...voted.coordinator, record: "ABORT" } },
  );
  const done = next(
    decision,
    "Both changes abort",
    "A and B remain $100 each. Neither change committed, and the prepared lock is released.",
    {
      accounts: [abort(decision.accounts[0]), decision.accounts[1]],
      messages: broadcast("Abort"),
    },
  );
  return {
    id: "abort",
    label: "Abort",
    description: "A No vote prevents the transfer from committing anywhere.",
    frames: [start, staged, rejected, voted, decision, done],
  };
}

function placementSeparate(): TransactionScenario {
  const commit = twoPhaseCommit();
  return {
    id: "separate",
    label: "Separate",
    description:
      "Separate shards require two participants to agree on one outcome.",
    frames: commit.frames.map((frame, index) =>
      index === 0
        ? next(
            frame,
            "Separate across two shards",
            "The same records now touch two participants. Placement adds a coordination boundary.",
          )
        : next(frame, frame.title, frame.status, { messages: frame.messages }),
    ),
  };
}

// Skeen, Nonblocking Commit Protocols (1981), §1 and §6:
// https://www.cs.cornell.edu/courses/cs614/2003sp/papers/Ske81.pdf
// This trace assumes connected survivors and reliable failure detection.
const threePhaseAssumption =
  "Assumes bounded message and processing delays, connected surviving participants, and one fail-stop coordinator crash. Recovery exchanges state; timeout alone is insufficient.";

function threePhase(partition: boolean): TransactionScenario {
  const frames = twoPhasePrefix();
  let frame = frames.at(-1)!;
  frame = next(
    frame,
    "Announce Pre-commit",
    "After both Yes votes, the coordinator records PRE-COMMIT and begins sending the additional phase.",
    { coordinator: { ...frame.coordinator, record: "PRE-COMMIT" } },
  );
  frames.push(frame);
  frame = next(
    frame,
    "A records Pre-commit",
    "A knows every participant voted Yes. B still has only its own prepared state.",
    {
      accounts: [precommit(frame.accounts[0]), frame.accounts[1]],
      messages: [message("coordinator", "a", "Pre-commit")],
    },
  );
  frames.push(frame);
  if (partition) {
    frames.push(
      next(
        frame,
        "The assumptions no longer hold",
        "The coordinator fails and A cannot reach B. Their states differ. This experiment stops unresolved: it will not infer a safe decision from silence.",
        {
          coordinator: { ...frame.coordinator, online: false },
          isolated: true,
        },
      ),
    );
  } else {
    frame = next(
      frame,
      "B records Pre-commit",
      "B also durably records PRE-COMMIT. Both still hold pending changes and locks.",
      {
        accounts: [frame.accounts[0], precommit(frame.accounts[1])],
        messages: [message("coordinator", "b", "Pre-commit")],
      },
    );
    frames.push(frame);
    frame = next(
      frame,
      "Both acknowledge Pre-commit",
      "Both acknowledgments arrive. The coordinator can now enter the final commit phase.",
      { messages: replies("Ack") },
    );
    frames.push(frame);
    frame = next(
      frame,
      "Coordinator crashes before Commit",
      "The coordinator stops. A and B remain connected and retain PRE-COMMIT; the bounded-delay assumption permits failure detection.",
      {
        coordinator: { ...frame.coordinator, online: false },
        recoveryAction: "Run participant recovery",
      },
    );
    frames.push(frame);
    frame = next(
      frame,
      "Survivors exchange state",
      "A leads recovery and collects B's state. Both report PRE-COMMIT, so recovery can finish this transaction without the old coordinator.",
      {
        messages: [
          message("a", "b", "State?"),
          { ...message("b", "a", "Pre-commit"), beat: 1 },
        ],
      },
    );
    frames.push(frame);
    frames.push(
      next(
        frame,
        "Recovery commits",
        "A and B durably commit, reaching $90 and $110. Progress depended on communication and failure assumptions as well as the extra phase.",
        {
          accounts: both(frame.accounts, commit),
          messages: [message("a", "b", "Commit")],
        },
      ),
    );
  }
  return {
    id: partition ? "partition" : "recovery",
    label: partition ? "Network partition" : "Participant recovery",
    description: partition
      ? "Partition the participants while Pre-commit is only partially delivered."
      : "Connected participants recover after both acknowledge the additional phase.",
    assumption: threePhaseAssumption,
    frames,
  };
}

function replicas(): ReplicaState[] {
  return (["a", "a2", "a3", "b", "b2", "b3"] as const).map((id) => ({
    id,
    group: id.startsWith("a") ? "a" : "b",
    online: true,
    leader: id === "a" || id === "b",
    record: null,
  }));
}

function recordReplicas(
  frame: TransactionFrame,
  ids: NodeId[],
  record: string,
): ReplicaState[] {
  return frame.replicas.map((replica) => ({
    ...replica,
    record: ids.includes(replica.id) ? record : replica.record,
  }));
}

// Spanner paper §4.2.1: the coordinator takes locks but skips its own
// prepare record; the other participant prepares through Paxos before voting.
// https://www.cs.cmu.edu/~15721-f24/papers/Spanner.pdf
function spanner(
  mode: "commit" | "leader-failure" | "quorum-loss",
): TransactionScenario {
  const start = initial(
    "Replicate each participant",
    "Each shard has three voting replicas. A's leader also coordinates this two-shard transaction.",
    "replicated",
    true,
  );
  start.replicas = replicas();
  start.coordinator.role = "a";
  const frames = [start];
  let frame = next(
    start,
    "Acquire the write locks",
    "Both leaders lock their account and stage the transfer. A also acts as coordinator.",
    { accounts: pending(start.accounts) },
  );
  frames.push(frame);
  frame = next(
    frame,
    "B proposes Prepare",
    "B writes PREPARE locally. One of three replicas is not yet a quorum, so B cannot vote Yes.",
    { replicas: recordReplicas(frame, ["b"], "PREPARE") },
  );
  frames.push(frame);
  frame = next(
    frame,
    "B's Prepare reaches a quorum",
    "B and B2 durably store PREPARE. Two of three replicas protect B's pending credit and locks.",
    {
      accounts: [frame.accounts[0], prepare(frame.accounts[1])],
      replicas: recordReplicas(frame, ["b2"], "PREPARE"),
      messages: [message("b", "b2", "Prepare")],
    },
  );
  frames.push(frame);
  frame = next(
    frame,
    "B votes after replication",
    "Only after the prepare quorum does B notify coordinator A that it can commit.",
    { messages: [message("b", "a", "Prepared")] },
  );
  frames.push(frame);
  frame = next(
    frame,
    "Replicate the global decision",
    "A and A2 durably record COMMIT. This quorum fixes the transaction's outcome before B learns it.",
    {
      coordinator: { ...frame.coordinator, record: "COMMIT" },
      replicas: recordReplicas(frame, ["a", "a2"], "COMMIT"),
      messages: [message("a", "a2", "Commit")],
    },
  );
  frames.push(frame);
  if (mode !== "commit") {
    const lost = mode === "quorum-loss" ? ["a", "a2"] : ["a"];
    frame = next(
      frame,
      mode === "quorum-loss"
        ? "A's group loses its quorum"
        : "Coordinator leader fails",
      mode === "quorum-loss"
        ? "A and A2 are offline. Their records survive, but A3 alone cannot form a quorum to recover the chosen decision. B must wait."
        : "A fails after its quorum chose COMMIT. A2 retains that decision, and A2 plus A3 can form a surviving quorum.",
      {
        coordinator: { ...frame.coordinator, online: false },
        replicas: frame.replicas.map((replica) => ({
          ...replica,
          online: !lost.includes(replica.id),
          leader: replica.group === "a" ? false : replica.leader,
        })),
        ...(mode === "leader-failure"
          ? { recoveryAction: "Elect surviving leader" }
          : {}),
      },
    );
    frames.push(frame);
    if (mode === "leader-failure") {
      frame = next(
        frame,
        "A2 recovers the chosen decision",
        "A2 becomes leader. Recovery with A3 preserves and replicates the existing COMMIT; it cannot choose a new outcome.",
        {
          coordinator: { ...frame.coordinator, online: true },
          replicas: recordReplicas(frame, ["a3"], "COMMIT").map((replica) => ({
            ...replica,
            leader:
              replica.group === "a" ? replica.id === "a2" : replica.leader,
          })),
          messages: [message("a2", "a3", "Recover Commit")],
        },
      );
      frames.push(frame);
    }
  }
  if (mode !== "quorum-loss") {
    frame = next(
      frame,
      "Complete commit wait",
      "The commit timestamp is now certainly in the past. This separate clock requirement precedes applying the coordinator's writes.",
      { wait: true },
    );
    frames.push(frame);
    const leader = mode === "leader-failure" ? "a2" : "a";
    frame = next(
      frame,
      "Send the decision across shards",
      "A's group applies its debit and sends COMMIT to B. B will durably replicate the outcome before applying its credit.",
      {
        accounts: [commit(frame.accounts[0]), frame.accounts[1]],
        messages: [message(leader, "b", "Commit")],
      },
    );
    frames.push(frame);
    frame = next(
      frame,
      "B replicates Commit",
      "B and B2 store COMMIT. Both participant groups now have the same outcome protected by a quorum.",
      {
        replicas: recordReplicas(frame, ["b", "b2"], "COMMIT"),
        messages: [message("b", "b2", "Commit")],
      },
    );
    frames.push(frame);
    frames.push(
      next(
        frame,
        "Apply the credit and release locks",
        "A is $90 and B is $110. Replication protected each group's state; two-phase commit coordinated the transaction across groups.",
        { accounts: [frame.accounts[0], commit(frame.accounts[1])] },
      ),
    );
  }
  return {
    id: mode,
    label:
      mode === "commit"
        ? "Commit"
        : mode === "leader-failure"
          ? "Leader failure"
          : "Quorum loss",
    description:
      mode === "commit"
        ? "Prepare within B's replica group, decide within A's group, then apply."
        : mode === "leader-failure"
          ? "Recover a replicated decision after the coordinator leader fails."
          : "Lose two replicas of the coordinator group after its commit decision.",
    assumption:
      "Three voting replicas per group; a quorum is two. This trace uses serializable locking and shows commit wait without simulating TrueTime.",
    frames,
  };
}

function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const DEMOS: Record<DemoKind, DemoDefinition> = freeze({
  independent: {
    title: "Cross-Shard Transactions",
    scenarios: [independent()],
  },
  placement: {
    title: "Shard Placement",
    scenarios: [placementTogether(), placementSeparate()],
  },
  "two-phase": {
    title: "Two-Phase Commit",
    scenarios: [twoPhaseCommit(), twoPhaseAbort(), twoPhaseCommit(true)],
  },
  "three-phase": {
    title: "Three-Phase Commit",
    scenarios: [threePhase(false), threePhase(true)],
  },
  spanner: {
    title: "Transactions Across Replicated Shards",
    scenarios: [
      spanner("commit"),
      spanner("leader-failure"),
      spanner("quorum-loss"),
    ],
  },
});

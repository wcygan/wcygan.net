export type Protocol = "2pc" | "3pc";
export type RecordKind = "PREPARE" | "PRE-COMMIT" | "COMMIT";
export interface RecoveryFrame {
  title: string;
  description: string;
  prepared: boolean;
  precommitted: boolean;
  committed: boolean;
  online: boolean;
  decision: RecordKind | null;
  traffic?: "prepare" | "votes" | "precommit" | "acks" | "exchange" | "commit";
  gate?: string;
  released: boolean;
}
const start: RecoveryFrame = {
  title: "A transfer needs two shards",
  description:
    "Move $10 from A to B. A second update will need A's row. The lower slabs represent durable storage.",
  prepared: false,
  precommitted: false,
  committed: false,
  online: true,
  decision: null,
  released: false,
};
const step = (
  previous: RecoveryFrame,
  change: Partial<RecoveryFrame>,
): RecoveryFrame => ({
  ...previous,
  traffic: undefined,
  gate: undefined,
  ...change,
});
export function recoveryFrames(protocol: Protocol): RecoveryFrame[] {
  const frames = [start];
  const add = (change: Partial<RecoveryFrame>) =>
    frames.push(step(frames.at(-1)!, change));
  add({
    title: "Prepare and hold the rows",
    description:
      "Each shard durably prepares its change before voting Yes. Both row locks remain held; the second update must wait.",
    prepared: true,
    traffic: "prepare",
  });
  add({
    title: "Both shards vote Yes",
    description:
      "The votes reach the coordinator. A prepared promise is not a committed change.",
    traffic: "votes",
  });
  if (protocol === "3pc") {
    add({
      title: "Persist the extra phase",
      description:
        "The coordinator sends Pre-commit. Both shards record it, keeping their changes pending and their locks held.",
      precommitted: true,
      decision: "PRE-COMMIT",
      traffic: "precommit",
    });
    add({
      title: "Both acknowledge Pre-commit",
      description:
        "The coordinator receives both acknowledgements. The final Commit messages have not been sent.",
      traffic: "acks",
    });
  } else {
    add({
      title: "Record the decision",
      description:
        "The coordinator durably records COMMIT, but neither shard has received it. Only the reader can see the coordinator's stored decision.",
      decision: "COMMIT",
    });
  }
  add({
    title: "The coordinator crashes",
    description:
      "Its process stops; its durable storage remains. Shard A and Shard B can still communicate.",
    online: false,
  });
  add({
    title: "Survivors exchange state",
    description:
      protocol === "2pc"
        ? "Both report PREPARE. Neither has learned the decision, so they cannot safely infer commit or abort."
        : "Both report PRE-COMMIT. A takes over recovery and gathers B's state before completing the protocol.",
    traffic: "exchange",
  });
  add({
    title:
      protocol === "2pc"
        ? "Waiting for the decision"
        : "Ready for participant recovery",
    description:
      protocol === "2pc"
        ? "Both rows stay locked. The second update stays queued. Restore access to the coordinator's durable decision to continue."
        : "The extra state permits this recovery under bounded delays and connected survivors. A timeout alone is not a commit decision.",
    gate:
      protocol === "2pc" ? "Recover coordinator" : "Run participant recovery",
  });
  add({
    title:
      protocol === "2pc"
        ? "Recover the stored decision"
        : "A coordinates completion",
    description:
      protocol === "2pc"
        ? "The recovered coordinator reads COMMIT and delivers that same decision to both shards."
        : "With both participants in PRE-COMMIT, A durably commits and sends the commit decision to B. The original coordinator stays down.",
    online: protocol === "2pc",
    decision: protocol === "2pc" ? "COMMIT" : "PRE-COMMIT",
    traffic: "commit",
  });
  add({
    title: "Commit releases both locks",
    description:
      "Both shards record COMMIT and apply the transfer: A has $90 and B has $110. Their locks are released.",
    committed: true,
  });
  add({
    title: "The waiting update can start",
    description:
      "The second update acquires A's now-available row. Its own transaction is outside this demonstration.",
    released: true,
  });
  return frames;
}
export function durableRecords(frame: RecoveryFrame): RecordKind[] {
  return [
    ...(frame.prepared ? ["PREPARE" as const] : []),
    ...(frame.precommitted ? ["PRE-COMMIT" as const] : []),
    ...(frame.committed ? ["COMMIT" as const] : []),
  ];
}

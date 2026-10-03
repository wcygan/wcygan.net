import { FlowConnections } from "~/demos/kafka-intro/FlowConnections";
import {
  KafkaPlaybackControls,
  useKafkaAutoplay,
} from "~/demos/kafka-intro/useKafkaAutoplay";
import { type ReactNode, useId, useRef, useState } from "react";
import {
  assignPartitions,
  cleanupRecords,
  type CleanupPolicy,
  committedLag,
  INITIAL_INTRO_READER,
  INTRO_RECORDS,
  moveReader,
  type ReaderAction,
  deliverySnapshot,
  pipelineSnapshot,
} from "~/demos/kafka-intro/model";

const DELIVERY_EDGES = [
  ["checkout", "orders"],
  ["orders", "shipping"],
  ["orders", "analytics"],
] as const;
const PIPELINE_EDGES = [
  ["orders", "streams"],
  ["streams", "totals"],
  ["totals", "export"],
  ["export", "warehouse"],
] as const;

function IntroFigure({
  title,
  graphicKey,
  children,
  controls,
  caption,
  playback,
}: {
  title: string;
  graphicKey: string;
  children: ReactNode;
  controls?: ReactNode;
  caption: ReactNode;
  playback: ReturnType<typeof useKafkaAutoplay>;
}) {
  const id = useId();
  return (
    <figure
      className="kafka-intro-figure"
      data-graphic-frame={controls ? "workbench" : "plate"}
      data-graphic-key={graphicKey}
      data-graphic-kind="dom"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-caption`}
    >
      <p
        id={`${id}-title`}
        className="article-graphic-title kafka-intro-heading"
      >
        {title}
      </p>
      <div
        ref={playback.stageRef}
        className="kafka-intro-stage"
        data-graphic-stage="padded"
      >
        {children}
      </div>
      <KafkaPlaybackControls playback={playback} />
      <div onClickCapture={playback.pause} onChangeCapture={playback.pause}>
        {controls}
      </div>
      <figcaption id={`${id}-caption`}>{caption}</figcaption>
    </figure>
  );
}

export function KafkaEventDemo() {
  const [published, setPublished] = useState(false);
  const playback = useKafkaAutoplay({
    steps: 1,
    intervalMs: 2400,
    onStep: () => setPublished(true),
    onReset: () => setPublished(false),
  });
  return (
    <IntroFigure
      playback={playback}
      title="An order becomes a record"
      graphicKey="kafka-order-record"
      controls={
        <div className="kafka-intro-controls">
          <button
            type="button"
            disabled={published}
            onClick={() => setPublished(true)}
          >
            Publish event
          </button>
          <button type="button" onClick={() => setPublished(false)}>
            Reset event
          </button>
          <p className="kafka-intro-status" role="status">
            {published
              ? "Accepted: orders / partition 1 / offset 42."
              : "OrderPlaced is ready to publish."}
          </p>
        </div>
      }
      caption="Applications supply keys and values; Kafka assigns partition offsets. This example uses JSON."
    >
      <div className="kafka-intro-record-route">
        <span>Checkout service</span>
        <span aria-hidden="true">→</span>
        <span>orders · partition 1</span>
      </div>
      <div className="kafka-intro-event-record" data-published={published}>
        <dl className="kafka-intro-record-fields">
          <div>
            <dt>Key</dt>
            <dd>order-101</dd>
          </div>
          <div>
            <dt>Timestamp</dt>
            <dd>
              <time dateTime="2026-10-01T15:00:00Z">15:00:00 UTC</time>
            </dd>
          </div>
          <div>
            <dt>Offset</dt>
            <dd>{published ? "42" : "not assigned"}</dd>
          </div>
        </dl>
        <div className="kafka-intro-payload">
          <p className="kafka-intro-label">Value · JSON</p>
          <pre>{`{
  "event": "OrderPlaced",
  "orderId": "order-101",
  "amount": 42,
  "currency": "USD"
}`}</pre>
        </div>
      </div>
    </IntroFigure>
  );
}

export function KafkaDecouplingDemo() {
  const flow = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"direct" | "kafka">("direct");
  const [recovered, setRecovered] = useState(false);
  const snapshot = deliverySnapshot(mode, recovered);
  const playback = useKafkaAutoplay({
    steps: 2,
    intervalMs: 2800,
    onStep: (step) => {
      setMode("kafka");
      setRecovered(step === 2);
    },
    onReset: () => {
      setMode("direct");
      setRecovered(false);
    },
  });
  return (
    <IntroFigure
      playback={playback}
      title="When a Service Is Down"
      graphicKey="kafka-decoupling"
      controls={
        <div className="kafka-intro-controls">
          <button
            type="button"
            aria-pressed={mode === "direct"}
            onClick={() => {
              setMode("direct");
              setRecovered(false);
            }}
          >
            Direct calls
          </button>
          <button
            type="button"
            aria-pressed={mode === "kafka"}
            onClick={() => {
              setMode("kafka");
              setRecovered(false);
            }}
          >
            Retained events
          </button>
          <button
            type="button"
            disabled={recovered}
            onClick={() => setRecovered(true)}
          >
            Recover analytics
          </button>
          <p className="kafka-intro-status" role="status">
            {snapshot.waiting
              ? "Checkout is waiting for analytics."
              : mode === "kafka" && !recovered
                ? "Kafka accepted the event. Checkout finishes; analytics reads later."
                : "Shipping and analytics have received the event."}
          </p>
        </div>
      }
      caption="Checkout depends on an available Kafka cluster; downstream readers can recover later. Recovery and reading share one step here."
    >
      <div
        ref={flow}
        className="kafka-intro-flow kafka-intro-decoupling"
        data-mode={mode}
      >
        <FlowConnections container={flow} edges={DELIVERY_EDGES} />
        <div
          className="kafka-intro-flow-node"
          data-tone="accent"
          data-flow-node="checkout"
        >
          <span className="kafka-intro-label">Producer</span>
          <strong>Checkout</strong>
          <span>{snapshot.checkoutCanFinish ? "can finish" : "waiting"}</span>
        </div>
        <span className="kafka-intro-flow-arrow" aria-hidden="true"></span>
        <div
          className="kafka-intro-flow-node"
          data-tone={mode === "kafka" ? "blue" : "yellow"}
          data-flow-node="orders"
        >
          <span className="kafka-intro-label">
            {mode === "kafka" ? "Retained topic" : "Direct dependency"}
          </span>
          <strong>{mode === "kafka" ? "orders" : "wait for both"}</strong>
          <span>
            {snapshot.retained ? "event remains here" : "no retained stream"}
          </span>
        </div>
        <span className="kafka-intro-flow-arrow" aria-hidden="true"></span>
        <div className="kafka-intro-fanout">
          <div
            className="kafka-intro-flow-node"
            data-tone="green"
            data-flow-node="shipping"
          >
            <strong>Shipping</strong>
            <span>received</span>
          </div>
          <div
            className="kafka-intro-flow-node"
            data-tone={recovered ? "green" : "red"}
            data-flow-node="analytics"
          >
            <strong>Analytics</strong>
            <span>{snapshot.analyticsReceived ? "received" : "offline"}</span>
          </div>
        </div>
      </div>
    </IntroFigure>
  );
}

function GroupAssignments({ name, count }: { name: string; count: number }) {
  return (
    <section
      className="kafka-intro-group"
      aria-label={`${name} partition ownership`}
    >
      <p className="kafka-intro-label">{name} group</p>
      <div className="kafka-intro-members">
        {assignPartitions(3, count).map(({ member, partitions }) => (
          <div
            key={member}
            className="kafka-intro-member"
            data-idle={partitions.length === 0}
          >
            <span>Member {member}</span>
            <span className="kafka-intro-assignment-wire" aria-hidden="true">
              ←
            </span>
            <span className="kafka-intro-owned-partitions">
              {partitions.length ? (
                partitions.map((partition) => (
                  <span key={partition}>P{partition}</span>
                ))
              ) : (
                <span className="kafka-intro-idle">Idle</span>
              )}
            </span>
          </div>
        ))}
      </div>
      <p className="kafka-intro-group-takeaway">
        All 3 partitions · all 6 records
      </p>
    </section>
  );
}

export function KafkaConsumerGroupsDemo() {
  const [analytics, setAnalytics] = useState(2);
  const [fulfillment, setFulfillment] = useState(1);
  const playback = useKafkaAutoplay({
    steps: 2,
    intervalMs: 2800,
    onStep: (step) => setAnalytics(step + 2),
    onReset: () => {
      setAnalytics(2);
      setFulfillment(1);
    },
  });
  return (
    <IntroFigure
      playback={playback}
      title="Two groups, two independent readers"
      graphicKey="kafka-consumer-groups"
      controls={
        <div className="kafka-intro-controls kafka-intro-group-controls">
          {[
            { name: "Analytics", value: analytics, set: setAnalytics },
            { name: "Fulfillment", value: fulfillment, set: setFulfillment },
          ].map(({ name, value, set }) => (
            <label key={name}>
              {name} members
              <select
                value={value}
                onChange={(event) => set(Number(event.target.value))}
              >
                {[1, 2, 3, 4].map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <p className="kafka-intro-status" role="status">
            {analytics === 4 || fulfillment === 4
              ? "Three partitions, three busy members. The fourth is idle."
              : "One owner per partition in each group."}
          </p>
        </div>
      }
      caption="Groups read independently; members share partitions within a group. This illustrative assignment may differ from Kafka's assignor."
    >
      <p className="kafka-intro-label">orders topic · 3 partitions</p>
      <div
        className="kafka-intro-topic-partitions"
        aria-label="Six records across three partitions"
      >
        {[0, 1, 2].map((partition) => (
          <div key={partition}>
            <span className="kafka-intro-partition-name">P{partition}</span>
            <span
              className="kafka-intro-partition-record"
              aria-label={`Partition ${partition}, offset 0`}
            >
              0
            </span>
            <span
              className="kafka-intro-partition-record"
              aria-label={`Partition ${partition}, offset 1`}
            >
              1
            </span>
          </div>
        ))}
      </div>
      <p className="kafka-intro-subscribe-note">
        Both groups subscribe to orders ↓
      </p>
      <div className="kafka-intro-groups">
        <GroupAssignments name="Analytics" count={analytics} />
        <GroupAssignments name="Fulfillment" count={fulfillment} />
      </div>
    </IntroFigure>
  );
}

export function KafkaOffsetsDemo() {
  const [reader, setReader] = useState(INITIAL_INTRO_READER);
  const [message, setMessage] = useState(
    "Read and committed through offset 1; offset 2 is next.",
  );
  const endOffset = INTRO_RECORDS.length;
  const act = (action: ReaderAction) => {
    setReader((current) => moveReader(current, action, endOffset));
    setMessage(
      {
        read: `Read offset ${reader.nextOffset}. Checkpoint remains ${reader.committedOffset}.`,
        commit: `Saved checkpoint ${reader.nextOffset}: restart here.`,
        restart: `Restarted at checkpoint ${reader.committedOffset}; uncommitted work may repeat.`,
        replay:
          "Reader returned to offset 0. Records and checkpoint are unchanged.",
      }[action],
    );
  };
  const playback = useKafkaAutoplay({
    steps: 6,
    intervalMs: 2800,
    onStep: (step) => {
      const actions: ReaderAction[] = [
        "read",
        "read",
        "restart",
        "read",
        "commit",
        "replay",
      ];
      act(actions[step - 1]);
    },
    onReset: () => {
      setReader(INITIAL_INTRO_READER);
      setMessage("Read and committed through offset 1; offset 2 is next.");
    },
  });
  return (
    <IntroFigure
      playback={playback}
      title="A reader remembers its place"
      graphicKey="kafka-reader-offsets"
      controls={
        <div className="kafka-intro-controls">
          <button
            type="button"
            onClick={() => act("read")}
            disabled={reader.nextOffset === endOffset}
          >
            Read next
          </button>
          <button
            type="button"
            onClick={() => act("commit")}
            disabled={reader.nextOffset === reader.committedOffset}
          >
            Save checkpoint
          </button>
          <button
            type="button"
            onClick={() => act("restart")}
            disabled={reader.nextOffset === reader.committedOffset}
          >
            Restart reader
          </button>
          <button
            type="button"
            onClick={() => act("replay")}
            disabled={reader.nextOffset === 0}
          >
            Replay from start
          </button>
          <p className="kafka-intro-status" role="status">
            {message}
          </p>
        </div>
      }
      caption="Reading preserves records. Committed offsets mark restart positions; replay here moves only this standalone reader."
    >
      <div className="kafka-intro-log-heading">
        <span className="kafka-intro-label">orders · partition 0</span>
        <span>End offset {endOffset}</span>
      </div>
      <ol className="kafka-intro-offset-log" aria-label="Retained records">
        {INTRO_RECORDS.map((record) => (
          <li
            key={record.offset}
            data-next={record.offset === reader.nextOffset}
            data-read={record.offset < reader.nextOffset}
          >
            <span className="kafka-intro-offset-number">{record.offset}</span>
            <span className="kafka-intro-offset-state">
              {record.offset === reader.nextOffset
                ? "next"
                : record.offset < reader.nextOffset
                  ? "read"
                  : "unread"}
            </span>
          </li>
        ))}
      </ol>
      <dl className="kafka-intro-reader-metrics">
        <div>
          <dt>Reader's next offset</dt>
          <dd>{reader.nextOffset}</dd>
        </div>
        <div>
          <dt>Committed next offset</dt>
          <dd>{reader.committedOffset}</dd>
        </div>
        <div>
          <dt>Committed lag</dt>
          <dd>{committedLag(reader, endOffset)} records</dd>
        </div>
      </dl>
      <p className="kafka-intro-lag-formula">
        Lag = end offset − committed next offset = {endOffset} −{" "}
        {reader.committedOffset}
      </p>
    </IntroFigure>
  );
}

export function KafkaRetentionDemo() {
  const [policy, setPolicy] = useState<CleanupPolicy>("delete");
  const retained = cleanupRecords(INTRO_RECORDS, policy);
  const keptOffsets = new Set(retained.map((record) => record.offset));
  const playback = useKafkaAutoplay({
    steps: 1,
    intervalMs: 3000,
    onStep: () => setPolicy("compact"),
    onReset: () => setPolicy("delete"),
  });
  return (
    <IntroFigure
      playback={playback}
      title="What stays in the log?"
      graphicKey="kafka-retention-compaction"
      controls={
        <div className="kafka-intro-controls">
          <div
            role="group"
            aria-label="Cleanup policy"
            className="kafka-intro-policy-options"
          >
            <button
              type="button"
              aria-pressed={policy === "delete"}
              onClick={() => setPolicy("delete")}
            >
              Delete retention
            </button>
            <button
              type="button"
              aria-pressed={policy === "compact"}
              onClick={() => setPolicy("compact")}
            >
              Key compaction
            </button>
          </div>
          <p className="kafka-intro-status" role="status">
            {policy === "delete"
              ? "Offsets 0–2 expire; 3–5 remain."
              : "Latest values remain at 1, 3, 4, 5. Offsets 0 and 2 become gaps."}
          </p>
        </div>
      }
      caption="Completed cleanup: retention expires old segments; compaction removes older keyed values. Surviving offsets stay fixed; tombstones and cleanup timing are omitted."
    >
      <p className="kafka-intro-label">Before cleanup · keys are order IDs</p>
      <div
        className="kafka-intro-cleanup-log"
        aria-label="Six records before cleanup"
      >
        {INTRO_RECORDS.map((record) => (
          <CleanupRecord key={record.offset} record={record} retained />
        ))}
      </div>
      <p className="kafka-intro-cleanup-operation">
        ↓{" "}
        {policy === "delete"
          ? "expire the old segment (offsets 0–2)"
          : "remove older values for the same key"}
      </p>
      <p className="kafka-intro-label">After cleanup · original offsets</p>
      <div
        className="kafka-intro-cleanup-log"
        aria-label={`${retained.length} retained records after cleanup`}
      >
        {INTRO_RECORDS.map((record) => (
          <CleanupRecord
            key={record.offset}
            record={record}
            retained={keptOffsets.has(record.offset)}
          />
        ))}
      </div>
    </IntroFigure>
  );
}

function CleanupRecord({
  record,
  retained,
}: {
  record: (typeof INTRO_RECORDS)[number];
  retained: boolean;
}) {
  return (
    <div
      className="kafka-intro-cleanup-record"
      data-retained={retained}
      data-key={record.key}
      aria-label={`Offset ${record.offset}, key ${record.key}, ${retained ? record.value : "removed"}`}
    >
      <span className="kafka-intro-cleanup-offset">{record.offset}</span>
      <span>{record.key}</span>
      <span>{retained ? record.value : "gap"}</span>
    </div>
  );
}

export function KafkaPipelineDemo() {
  const flow = useRef<HTMLDivElement>(null);
  const [processed, setProcessed] = useState(0);
  const snapshot = pipelineSnapshot(processed);
  const playback = useKafkaAutoplay({
    steps: 3,
    intervalMs: 2600,
    onStep: setProcessed,
    onReset: () => setProcessed(0),
  });
  return (
    <IntroFigure
      playback={playback}
      title="From events to useful data"
      graphicKey="kafka-streams-connect"
      controls={
        <div className="kafka-intro-controls">
          <button
            type="button"
            disabled={snapshot.next === null}
            onClick={() => setProcessed((n) => n + 1)}
          >
            {snapshot.next === null
              ? "All orders processed"
              : `Process $${snapshot.next} order`}
          </button>
          <button type="button" onClick={() => setProcessed(0)}>
            Reset pipeline
          </button>
          <p className="kafka-intro-status" role="status">
            {snapshot.count} of 3 orders processed. Customer total: $
            {snapshot.total}.
          </p>
        </div>
      }
      caption="Streams applications transform records; Connect exports them. Both run separately from brokers; each step combines processing, publishing, and export."
    >
      <div ref={flow} className="kafka-intro-pipeline-board">
        <FlowConnections container={flow} edges={PIPELINE_EDGES} />
        <div className="kafka-intro-pipeline">
          <div
            className="kafka-intro-pipeline-node"
            data-node="orders"
            data-flow-node="orders"
          >
            <span className="kafka-intro-label">Input topic</span>
            <strong>orders</strong>
            <span>$42 · $18 · $73</span>
          </div>
          <span
            className="kafka-intro-pipeline-arrow"
            aria-hidden="true"
          ></span>
          <div
            className="kafka-intro-pipeline-node"
            data-node="streams"
            data-flow-node="streams"
          >
            <span className="kafka-intro-label">Streams app</span>
            <strong>Aggregate</strong>
            <span>{snapshot.count} processed</span>
          </div>
          <span
            className="kafka-intro-pipeline-arrow"
            aria-hidden="true"
          ></span>
          <div
            className="kafka-intro-pipeline-node"
            data-node="totals"
            data-flow-node="totals"
          >
            <span className="kafka-intro-label">Output topic</span>
            <strong>order-totals</strong>
            <span>
              {snapshot.count
                ? `customer total: $${snapshot.total}`
                : "no output yet"}
            </span>
          </div>
        </div>
        <div className="kafka-intro-pipeline-down" aria-hidden="true"></div>
        <div className="kafka-intro-pipeline-sink">
          <div className="kafka-intro-pipeline-node" data-flow-node="export">
            <span className="kafka-intro-label">Connect sink</span>
            <strong>Export</strong>
            <span>reads order-totals</span>
          </div>
          <span
            className="kafka-intro-pipeline-arrow"
            aria-hidden="true"
          ></span>
          <div className="kafka-intro-pipeline-node" data-flow-node="warehouse">
            <span className="kafka-intro-label">External system</span>
            <strong>Warehouse</strong>
            <span>
              {snapshot.count ? `total: $${snapshot.total}` : "no rows yet"}
            </span>
          </div>
        </div>
      </div>
      <p className="kafka-intro-pipeline-takeaway">
        One retained stream can feed processing and integration.
      </p>
    </IntroFigure>
  );
}

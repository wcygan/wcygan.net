# Apache Flink research

Researched on October 1, 2026 for a beginner-oriented draft article. Sources are
Apache project documentation and source repositories. **Verified** marks a fact
supported by those sources; **inference** marks an editorial recommendation or
an example application rather than a measured result.

## Practical answer

**Verified:** Flink is a distributed computation engine for streams with or
without a defined end. It can remember information between records and use
event timestamps to decide when time-based calculations are ready. SQL is an
accessible entry point; Java DataStream code offers more control over custom
state and timers. Sources and sinks connect the computation to external
systems. [Flink applications](https://flink.apache.org/what-is-flink/flink-applications/)

**Inference:** A useful introductory mental model is a program that keeps
updating an answer as records arrive. For example, it can keep a five-minute
request count for each service rather than repeatedly rereading all request
logs. The interesting parts are remembering the partial answer, deciding which
time period an event belongs to, and recovering that work after a failure.

**Inference:** Begin with a concrete freshness, state-management, or recovery
requirement. A small periodic script may be a better fit when waiting for the
next scheduled run is acceptable. Flink becomes interesting when a continuously
updated answer or substantial retained state is part of the problem.

## Version and compatibility snapshot

**Verified:** The official downloads page lists **Flink 2.3.0**, released June
25, 2026, as the latest stable release. The [release announcement](https://flink.apache.org/2026/06/25/apache-flink-2.3.0-release-announcement/)
confirms that date. The main site also identifies **1.20**
as the LTS line. These are the research-date values, not promises about future
releases. The article's lab should identify its explicitly pinned Flink version
separately; a reproducible older pin must not be described as the newest
release. This draft's lab pins **2.3.0**.
[Downloads](https://flink.apache.org/downloads/),
[Flink documentation navigation](https://flink.apache.org/what-is-flink/flink-applications/)

**Verified:** External connectors have their own compatibility requirements.
For example, the current Flink CDC 3.6.0 release lists Flink 1.20.x and 2.2.x,
not 2.3.x. A future CDC example needs a supported combination rather than two
arbitrary latest releases. This connector is outside the first lab.
[Apache Flink CDC compatibility matrix](https://github.com/apache/flink-cdc#flink-version-compatibility)

## Core concepts and teaching boundaries

### Bounded and unbounded input

**Verified:** A bounded input has a defined end, such as a fixed collection of
files. An unbounded input has no defined end, such as a continuously produced
event stream. Batch processing can exploit the fact that all input is finite;
stream processing must keep making progress without waiting for all future
records. Flink supports both. Boundedness is a property of the source/input,
while batch and streaming are execution choices. A finite file can also be
processed in streaming mode. [Flink architecture introduction](https://flink.apache.org/what-is-flink/flink-architecture/),
[DataStream execution modes](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/dev/datastream/execution_mode/)

### Keyed state

**Verified:** State is information retained across records: a partial sum,
previous event, or pending window. With a keyed exchange such as `keyBy`,
records with the same key are routed to the corresponding parallel operator
instance. Its keyed state is accessible for the current record's key. Keys and
state move together during redistribution. Flink redistributes keyed state in
key groups, rather than treating each individual key as a scheduling slot.
[Stateful stream processing](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/concepts/stateful-stream-processing/)

**Inference:** A three-key example is sufficient for the article: Ada, Bo, Cy,
Ada, Cy, Ada gives counts 3, 1, and 2. Assign Ada and Bo to one illustrative
subtask and Cy to the other. More workers can distribute different keys, but adding
workers alone cannot split a single hot key's sequential state updates.

### Event time, windows, and watermarks

**Verified:** Event time is when the event happened according to its
timestamp; processing time is when a machine processes it. A window scopes a
calculation to a finite group, such as a five-minute interval. A watermark
communicates event-time progress. It lets downstream operators decide that a
time-based window is ready to emit under the chosen lateness policy. Late
records can still appear after the watermark passes their timestamps, so a
watermark is not proof that every relevant event has arrived. Tumbling windows
do not overlap, sliding windows do, and sessions group activity separated by
gaps. [Timely stream processing](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/concepts/time/)

**Verified:** An operator with multiple inputs advances using the **minimum
input watermark**. Idle input partitions can prevent that minimum advancing.
An idleness policy can mark silent inputs idle so active inputs can make
progress. A returning idle input can still deliver late data. Fast inputs can
also cause buffered state to grow while a slower input holds back progress;
watermark alignment is a separate mechanism for limiting this drift.
[Watermark strategies and idle sources](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/dev/datastream/event-time/generating_watermarks/)

**Inference:** Show both arrival order and event timestamp. End a window demo
with the exact included records, total, watermark, and treatment of one late
record. A label such as “window ready under this policy” is more accurate than
“all data received.”

### Checkpoints and recovery

**Verified:** A checkpoint associates operator state with positions in source
streams. Recovery restores a completed snapshot and replays source records
from its positions. Checkpointing is **disabled by default**, and a source must
support rewind for the full recovery guarantee. A checkpoint interval trades
regular snapshot overhead against how much work must be replayed after
failure. [Stateful stream processing](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/concepts/stateful-stream-processing/)

**Verified:** The working state backend and durable checkpoint storage have
different roles. Common state backends keep working state in JVM memory or
local RocksDB storage. Durable snapshots can live on separate storage.
Exactly-once state consistency means replayed events affect
restored state once; it does **not** mean the processor never executes an event
again. Exactly-once effects at an external destination additionally require
replayable sources and transactional or idempotent sinks. An arbitrary HTTP
request or email sent by user code is not made exactly once by enabling
checkpoints. [Fault tolerance](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/learn-flink/fault_tolerance/)

**Inference:** In the recovery visual, the saved count should restore before
the replayed records arrive. Mark a checkpoint complete only after the
snapshot is durably persisted. Keep the demo's claim limited to consistent
managed state unless it also models a transactional or idempotent sink.

### Workers and parallelism

**Verified:** The JobManager coordinates scheduling, checkpoints, and
recovery. TaskManagers execute tasks and exchange records. Operators may have
multiple parallel subtasks, and compatible operators can be chained into a
task. A TaskManager's slots divide managed-memory resources; slots do **not**
provide CPU isolation. With default same-job slot sharing, a slot can host
parts of an entire pipeline. Therefore “one slot equals one operator” and “one
slot equals one CPU core” are misleading models. A standalone ResourceManager
assigns existing slots but does not launch additional TaskManagers itself.
[Flink runtime architecture](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/concepts/flink-architecture/)

### Backpressure

**Verified:** A slow downstream operator can prevent upstream operators from
sending more records. The records flow downstream while this pressure
propagates upstream. The Web UI exposes busy, idle, and backpressured time for
subtasks; a backpressured source can be a symptom of a slow sink rather than a
source problem. [Monitoring backpressure](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/ops/monitoring/back_pressure/)

**Inference:** Use a finite buffer and a slower sink in the demo. End with
observed accepted, processed, and pending counts; do not imply that Flink's
network buffers grow without limit. The real upstream log may accumulate a
backlog while the computation is throttled.

## Local file input and output

**Verified:** The filesystem SQL source scans once by default. Setting
`source.monitor-interval` enables discovery of new paths. Its checkpointed
state tracks already discovered files, and directory ingestion has no defined
file order. A short poll interval increases listing activity. The filesystem
JSON format is newline-delimited JSON. Streaming file output uses rolling
part files; checkpoints and rolling policy affect when finished output
becomes visible and how many files are produced.
[Filesystem SQL connector](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/connectors/table/filesystem/)

**Inference:** A directory of fixed input files makes a useful bounded lab.
Discovering newly added immutable files provides a second streaming example.
This is not an ordered event log with per-record offsets; replacing the same
file path should not be presented as a change stream.

## Plausible use cases

The official project groups use cases into event-driven applications,
streaming analytics, and continuous data pipelines. Its examples include
monitoring, fraud detection, and moving/enriching data between systems.
[Official use cases](https://flink.apache.org/what-is-flink/use-cases/)

The following applications are **inferences** for an approachable introduction:

| Requirement                            | Example computation                                          |
| -------------------------------------- | ------------------------------------------------------------ |
| Count activity before a nightly report | Requests and errors per service per five-minute window       |
| Turn raw files into usable data        | Parse log files, normalize fields, remove invalid records    |
| Respond to a sequence                  | Detect repeated failures for a device and maintain a timeout |
| Maintain a derived view                | Enrich events and update a search index                      |
| Rebuild after changing a rule          | Reprocess a finite archived dataset                          |

## A first local experiment

**Verified:** The official Docker guide supports a small session cluster with
a JobManager, TaskManager, and SQL Client. Connector dependencies must be
available to the cluster and client. The built-in DataGen SQL connector needs
no external system: it emits unbounded random rows by default, or bounded
input when `number-of-rows` or a sequence generator is configured. Its emit
rate is configurable.
[Flink Docker guide](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/deployment/resource-providers/standalone/docker/),
[DataGen connector](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/connectors/table/datagen/)

**Inference:** Build the lab in two steps: first run a bounded file query that
finishes; then run a continuously updating query and inspect the job graph.
The contrast teaches boundedness without requiring an external broker. A
restart experiment should be described as a managed state-recovery
demonstration only if the source and sink actually support the claimed
guarantee. Do not label a synthetic random-source exercise as an end-to-end
exactly-once test without checking replay determinism.

**Verified:** Flink SQL continuous queries maintain a changing logical result.
An unwindowed grouped count updates previous result rows, while a finalized
window aggregation can append one result per closed group/window. Sink
selection must match the query's changelog behavior.
[Dynamic tables and continuous queries](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/concepts/sql-table-concepts/dynamic_tables/)

**Inference:** Prefer an append-only projection or finalized window output
for the first plain-file exercise. Showing a changing unwindowed count to a
reader is useful, but treating each successive count as a new permanent fact
in a file would misrepresent its meaning.

## Proposed teaching visuals

These are **editorial designs**, not measurements of a real Flink deployment.
Eight visuals give each lesson room without turning the article into an API
catalog. The first five favor direct reading in 2D; the last three use spatial
grouping where camera exploration can add information.

| Dimension | Plain name                | Invariant to make inspectable                                                       |
| --------- | ------------------------- | ----------------------------------------------------------------------------------- |
| 2D        | A Running Query           | Source records pass through operators and change an answer                          |
| 2D        | Bounded and Unbounded     | A finite input completes; an open input keeps waiting for records                   |
| 2D        | Event Time and Watermarks | Arrival order differs from event time; an explicit watermark policy closes a window |
| 2D        | A Slow Sink               | A finite downstream bottleneck throttles upstream processing                        |
| 2D        | Repeated Sink Writes      | An idempotent destination avoids a second effect for the same modeled event         |
| 3D        | State by Key              | A record changes the state associated with its own key                              |
| 3D        | Workers and Slots         | Logical parallel operators are placed into worker resource groups                   |
| 3D        | Checkpoint and Replay     | Restore state and matching source positions before replaying later records          |

Each should stop on a clear result, retain its labels, and offer a useful
settled view under reduced motion. Workers/slots must show that slots are
resource groups, not dedicated CPU cores. The sink visual should state its
idempotency rule explicitly and avoid promising that deduplication handles
every possible external side effect. The recovery scene must show that events
can execute again while the recovered state still counts their effects once.

## Remaining uncertainty and publication checks

- Verify container availability, SQL syntax, source/sink behavior, and observed
  output by running the supplied lab. These notes validate documented
  capabilities, not that local experiment.
- Validate checkpoint completion and restored source behavior before making
  any recovery claim about the lab.
- Recheck current releases and connector matrices when publishing the draft;
  moving `stable`, `latest`, and `master` documentation can change.
- Benchmark the reader's workload before claiming a throughput, latency,
  memory, or cost advantage. None is measured here.
- The public overview pages still contain older code/API examples. Use the
  pinned version's documentation for runnable snippets.

# Apache Kafka: beginner article research

Research date: October 1, 2026, using the user's client date. Sources are Apache
Kafka's documentation and tagged Apache Kafka source. This note records source
verification, not a successful local Kafka run. No Docker environment was
installed or started during this research.

## Version and practical recommendation

Pin the beginner lab to `apache/kafka:4.3.1`. The official downloads page lists
4.3.1, 4.2.2, and 4.1.2 as supported releases, and the current Apache quickstart
uses 4.3.1. Use the JVM image so the article follows that quickstart. Recheck
the release and commands before publishing a later revision. [Supported
releases](https://kafka.apache.org/community/downloads/#supported-releases),
[Apache quickstart](https://kafka.apache.org/quickstart/),
[Docker documentation](https://kafka.apache.org/43/getting-started/docker/).

## What the article should teach

Kafka stores streams of events, allows applications to write and read them,
and supplies APIs for processing and integration. An event records something
that happened; it can carry a key, value, timestamp, and headers. Producers
write records, brokers store them, and consumers read them. Topics name streams;
partitions divide a topic into separate ordered logs. Reading does not remove
the records. This makes a log that several applications can read at their own
pace a useful opening model. [Introduction](https://kafka.apache.org/43/getting-started/introduction/).

With the default producer partitioning policy, a record with a key and no
explicit partition is routed by a hash of that key. Keeping the key bytes,
partition count, and partitioning policy unchanged keeps related records
together. Order is per partition; Kafka provides no total order across a
multi-partition topic. Adding partitions can move future records for an
existing key to another partition, while the old data stays where it was.
Keys also need not spread load evenly. [Producer partitioning](https://kafka.apache.org/43/configuration/producer-configs/#partitioner.class),
[Changing topic partitions](https://kafka.apache.org/43/operations/basic-kafka-operations/#modifying-topics).

A consumer group is one logical subscriber with potentially several members.
For normal subscribed consumer groups, each partition is assigned to one
member at a time. Different groups can read the same topic independently.
An offset identifies a position within one partition, rather than within the
whole topic. A consumer's current position advances as it fetches records;
its committed position is the saved restart point. The committed offset names
the next record to read. There can be offset gaps after compaction or
transactions. [KafkaConsumer API](https://kafka.apache.org/43/javadoc/org/apache/kafka/clients/consumer/KafkaConsumer.html).

The group inspection tool shows `CURRENT-OFFSET`, `LOG-END-OFFSET`, and `LAG`
per partition. Lag is an offset distance behind the end, not a direct measure
of time or a universal count of outstanding business operations. Replay means
moving a consumer's position backward to retained history. Changing
`auto.offset.reset` to `earliest` does not rewind a group that already has valid
committed offsets; it applies when no starting offset exists or the stored
offset is unavailable. The reset tool requires inactive consumers and defaults
to previewing a reset until `--execute` is supplied.
[Checking position and resetting offsets](https://kafka.apache.org/43/operations/basic-kafka-operations/#checking-consumer-position),
[Consumer offset reset configuration](https://kafka.apache.org/43/configuration/consumer-configs/#auto.offset.reset).

Deletion retention expires old log segments by time or size. Compaction instead
removes superseded values for the same key, preserving the most recent state
in a compact-only topic. These policies can be combined; then time/size
deletion also applies to the retained data. Compaction is a background process,
not an immediate upsert. It removes records without renumbering the survivors.
A key with a null value is a deletion marker, called a tombstone, which itself
expires after the configured tombstone retention. Replay can only read what
the selected policy still preserves.
[Topic cleanup policies](https://kafka.apache.org/43/configuration/topic-configs/#cleanup.policy),
[Compaction design](https://kafka.apache.org/43/design/design/#log-compaction).

A partition can have a leader and follower replicas on several brokers.
`acks=1` acknowledges the leader's local write without waiting for followers;
the acknowledged write can be lost if that leader fails before replication.
`acks=all` waits for the current in-sync replica set (ISR), rather than every
configured replica. `min.insync.replicas` sets a lower bound: a common example
uses three replicas, `acks=all`, and a minimum ISR of two. A write fails when
the ISR is too small. With three ISR members, all three must acknowledge even
when the minimum is two. Availability and durability still depend on failures
and configuration.
[Producer acknowledgements](https://kafka.apache.org/43/configuration/producer-configs/#acks),
[Minimum in-sync replicas](https://kafka.apache.org/43/configuration/topic-configs/#min.insync.replicas).

Modern leader-election wording needs care: Eligible Leader Replicas (ELR) is
enabled by default on new clusters from Kafka 4.1. A controller can elect a
tracked safe replica outside the current ISR when the ISR is empty. A beginner
diagram may show an in-sync follower becoming leader, but must not claim that
the ISR is the only possible safe election source in current Kafka.
[Eligible Leader Replicas](https://kafka.apache.org/43/operations/eligible-leader-replicas/).

KRaft is Kafka's metadata quorum system. Broker roles handle record storage
and traffic; controller roles maintain cluster metadata and coordinate
leadership. A process can have both roles, which suits a small development
environment. Apache recommends separated roles for critical deployments.
Controller quorum majority and data-partition replication are two distinct
mechanisms. Three controllers tolerate one unavailable controller;
five tolerate two.
[KRaft process roles and controllers](https://kafka.apache.org/43/operations/kraft/#process-roles).

Kafka Connect runs reusable integrations that move data between Kafka and
external systems, using source and sink connectors. It can run standalone or
as a distributed service. Connector availability and guarantees depend on the
connector; a picture of a database feeding Kafka should label the capture
connector as a component, rather than imply every Kafka broker automatically
captures database changes.
[Kafka Connect overview](https://kafka.apache.org/43/kafka-connect/overview/).

Kafka Streams is a Java/Scala client library for applications that read and
write Kafka data; it does not require a separate stream-processing cluster.
Transforms, joins, windows, and aggregations are useful examples.
[Streams introduction](https://kafka.apache.org/43/streams/introduction/),
[Streams core concepts](https://kafka.apache.org/43/streams/core-concepts/).

Do not promise universal exactly-once side effects. Kafka transactions can
atomically publish output records and consumer offsets; reading transactional
results correctly also involves committed isolation. An email, payment, or
external database update needs cooperation at that boundary. A crash after
an external effect but before an offset commit can lead to another delivery;
idempotency or deduplication remains an application concern.
[Delivery semantics and transactions](https://kafka.apache.org/43/design/design/#message-delivery-semantics).

## Useful applications and decision framing

Apache lists activity tracking, operational metrics, log aggregation, stream
processing, event sourcing, and external commit logs among Kafka's uses.
For the article, use concrete examples: one order-event feed serving shipping,
analytics, and fraud applications; captured database changes feeding search;
and sensor readings feeding rolling aggregates. These examples demonstrate
independent readers and processing over time without making performance
promises. [Apache use cases](https://kafka.apache.org/uses/).

Editorial judgment, rather than an Apache guarantee: Kafka is particularly
interesting when several consumers need the same durable stream, delayed
readers need to catch up, or rebuilding a derived view requires retained
history. Start by stating those requirements. A direct call can suffice for
one synchronous action; a jobs table or simpler queue can suffice for a small
background-work flow; a scheduled export can suffice when fresh data is
unnecessary. Kafka introduces partition planning, consumer progress,
retention, replication, operations, and application failure semantics. Adopt
that machinery because it serves concrete needs.

## Command appendix for a fresh local lab

Requires an already installed, running Docker engine and an available host
port 9092. Commands below use the Kafka tools inside the container, so no host
JDK or Kafka download is required. This is one broker with one replica, which
demonstrates records and consumers rather than machine-failure tolerance.

The container setup adapts Apache's Docker quickstart. The pinned image's
Dockerfile installs Kafka at `/opt/kafka` and declares anonymous volumes;
cleanup therefore uses `-v` as well as removing the container.
[Apache Docker guide](https://kafka.apache.org/43/getting-started/docker/),
[4.3.1 Dockerfile](https://github.com/apache/kafka/blob/4.3.1/docker/jvm/Dockerfile).

```sh
docker pull apache/kafka:4.3.1
docker run --name kafka-lab --detach \
  --publish 127.0.0.1:9092:9092 apache/kafka:4.3.1

# Check readiness; retry this command while the broker is starting.
docker exec kafka-lab /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --list

# Make three independent logs within one topic.
docker exec kafka-lab /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --topic orders \
  --partitions 3 --replication-factor 1

docker exec kafka-lab /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --describe --topic orders
```

Supply keys explicitly. The first colon separates the key from the remaining
value. `--sync` makes the tiny experiment wait for each produce result. Kafka
4.3.1 supports `--reader-property` and `--command-property`; their older
`--property` and `--producer-property` equivalents are deprecated.
[Tagged console producer](https://github.com/apache/kafka/blob/4.3.1/tools/src/main/java/org/apache/kafka/tools/ConsoleProducer.java),
[Tagged line reader](https://github.com/apache/kafka/blob/4.3.1/tools/src/main/java/org/apache/kafka/tools/LineMessageReader.java).

```sh
docker exec -i kafka-lab /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic orders --sync \
  --reader-property parse.key=true --reader-property key.separator=: \
  --command-property acks=all <<'EVENTS'
alice:order-created
bob:order-created
alice:payment-received
bob:order-shipped
EVENTS
```

Run each group once. Both read all four retained records because their progress
is independent. Printed ordering across different partitions may vary; check
that each key keeps its partition and local sequence. The commands exit after
four records so the groups will become inactive before the reset. The
formatter and command options are checked against the tagged 4.3.1 CLI source.
[Console consumer options](https://github.com/apache/kafka/blob/4.3.1/tools/src/main/java/org/apache/kafka/tools/consumer/ConsoleConsumerOptions.java),
[Message formatter](https://github.com/apache/kafka/blob/4.3.1/tools/src/main/java/org/apache/kafka/tools/consumer/DefaultMessageFormatter.java).

```sh
docker exec kafka-lab /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic orders \
  --group shipping --from-beginning --max-messages 4 \
  --command-property enable.auto.commit=true \
  --formatter-property print.key=true \
  --formatter-property print.partition=true \
  --formatter-property print.offset=true

docker exec kafka-lab /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic orders \
  --group analytics --from-beginning --max-messages 4 \
  --command-property enable.auto.commit=true \
  --formatter-property print.key=true \
  --formatter-property print.partition=true \
  --formatter-property print.offset=true

docker exec kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group shipping

docker exec kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group analytics
```

For replay, confirm shipping has no active members, preview the reset, then
execute it. Rerun the shipping consumer command above; it reads the same four
records. Analytics' stored offsets remain unchanged. If shipping still has
active members, stop them and wait for the group to become inactive before
resetting. [Group inspection and reset procedure](https://kafka.apache.org/43/operations/basic-kafka-operations/#managing-consumer-groups).

```sh
docker exec kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group shipping --state

docker exec kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --group shipping --topic orders \
  --reset-offsets --to-earliest

docker exec kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --group shipping --topic orders \
  --reset-offsets --to-earliest --execute

# Removes this lab container and its anonymous volumes, including lab records.
docker rm --force --volumes kafka-lab
```

## Verification evidence and limits

| Item                                      | Evidence                                                        | Status                                             |
| ----------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Recommended release                       | Supported-release listing and current quickstart agree on 4.3.1 | Verified against live official pages               |
| Image startup                             | Official Docker guide documents default image setup and port    | Verified against docs                              |
| In-container tools path                   | 4.3.1 Dockerfile installs `/opt/kafka`                          | Verified against tagged source                     |
| Key parsing and formatter arguments       | 4.3.1 producer, reader, consumer, formatter source              | Verified against tagged source                     |
| Replay precondition                       | Operations docs require inactive consumer instances             | Verified against docs                              |
| Single-broker runtime, output and cleanup | No Kafka process was run by this research task                  | Requires live test by article implementation owner |

## Suggested visual lessons

1. Event Flow, 2D: one producer appends once; two groups read independently.
2. Partition Ordering, 2D: repeated keys stay on one lane; offsets belong to lanes.
3. Consumer Groups, 2D: varying workers changes ownership, bounded by partitions.
4. Lag and Replay, 2D: an append cursor and saved read cursor separate; rewinding preserves data.
5. Retention and Compaction, 2D: age deletion versus retaining keyed latest state; show surviving original offsets.
6. Stream Processing, 2D: records feed a visible count/window; output is another stream.
7. Broker Replicas, 3D: the same partition has spatially separated copies; show one leader and a safe failover.
8. Cluster Roles, 3D: keep metadata controllers separate from data brokers; reveal paths without implying record traffic crosses controllers.

These are illustrative teaching models, not a real broker connection,
complete replication protocol, benchmark, or production configuration.

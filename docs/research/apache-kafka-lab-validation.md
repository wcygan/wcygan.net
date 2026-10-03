# Apache Kafka draft lab validation

Tested October 1, 2026, in America/Chicago, using Docker Engine 29.4.0 on
Linux/arm64 through the local OrbStack Docker context. This note records a
runtime check of the draft article's local Kafka exercise.

## Version and primary references

The [official quickstart](https://kafka.apache.org/quickstart/) currently uses
`apache/kafka:4.3.1`. The local image was pulled successfully and reported:

```text
arm64 apache/kafka@sha256:77e3df9054047a88b520d0cc46e16696d3b22022e1d580aeccd2632df6532837
```

The [4.3 operations guide](https://kafka.apache.org/43/operations/basic-kafka-operations/#managing-consumer-groups)
documents consumer group inspection and offset resets. A reset applies to a
selected topic or all topics, and requires inactive consumers. The runtime
check below used explicit `--dry-run` before `--execute`.

## Isolation and cleanup

Tests used fresh containers named `codex-kafka-validation-431-6e245f91` and
`codex-kafka-validation-431-947c32d2`. The first published no host ports. The
second published only `127.0.0.1:19092:9092`. All Kafka commands ran inside their
container against `localhost:9092`; neither existing containers nor volumes
were changed. An exit trap removed only the newly created container after each
run. No named volumes were created, but the image automatically creates
anonymous volumes at `/etc/kafka/secrets`, `/mnt/shared/config`, and
`/var/lib/kafka/data`, as confirmed by `docker image inspect`.

The original validation traps used `docker rm -f` without `-v`. They removed the
containers but did not request removal of their anonymous volumes. The volume
IDs were not captured before container removal, and the retained Docker events
did not identify mounts for either validation container. Those volumes may
remain. No unidentified volumes were deleted. The article cleanup command below
includes `-v` to avoid this mistake on a fresh run.

For the article, use a dedicated `kafka-lab` container and loopback port 9092:

```sh
docker pull apache/kafka:4.3.1
docker run --detach --name kafka-lab \
  --publish 127.0.0.1:9092:9092 apache/kafka:4.3.1
```

This article command uses the same image and configuration as the tested
container. The test's unique name and alternative host port avoided affecting
an existing local environment. Host port 9092 must be available, and `kafka-lab`
must not already name another container. The Docker image includes Java and the
Kafka tools, so the exercise needs no separate host Java installation.

## Tested commands

The commands below use the article's container name. The runtime scripts used
the unique container names above instead. A readiness loop successfully listed
topics on its first attempt in both runs. A retry accommodates slower machines:

```sh
ready=0
for attempt in $(seq 1 30); do
  if docker exec kafka-lab /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server localhost:9092 --list >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if [ "$ready" != 1 ]; then
  docker logs kafka-lab
  exit 1
fi

docker exec kafka-lab /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --create --topic orders \
  --partitions 3 --replication-factor 1

docker exec kafka-lab /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 --describe --topic orders
```

Topic creation printed `Created topic orders.` Description confirmed three
partitions, replication factor one, and broker 1 as each partition's leader,
replica, and in-sync replica.

The new 4.3 console tool options worked without deprecated `--property`,
`--producer-property`, or `--consumer-property` aliases:

```sh
docker exec -i kafka-lab /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 --topic orders \
  --reader-property parse.key=true \
  --reader-property key.separator=: \
  --command-property acks=all <<'EVENTS'
order-101:{"event":"OrderPlaced","orderId":"order-101","amount":42}
order-102:{"event":"OrderPlaced","orderId":"order-102","amount":18}
order-101:{"event":"OrderPaid","orderId":"order-101","amount":42}
order-103:{"event":"OrderPlaced","orderId":"order-103","amount":73}
order-102:{"event":"OrderPaid","orderId":"order-102","amount":18}
order-103:{"event":"OrderPaid","orderId":"order-103","amount":73}
EVENTS

docker exec kafka-lab /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic orders \
  --from-beginning --max-messages 6 --group analytics \
  --command-property enable.auto.commit=true \
  --formatter-property print.key=true \
  --formatter-property print.partition=true \
  --formatter-property print.offset=true
```

The explicit `enable.auto.commit=true` made the checkpoint behavior part of the
exercise. After all six records were printed and the consumer closed, group
inspection confirmed that its committed offsets reached the log ends.

Run the same consumer command with `--group fulfillment` to check an independent
reader. Both groups printed `Processed a total of 6 messages`.

```sh
docker exec kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --describe --group analytics
```

All partition rows reported zero lag, and the group had no active members.
For the `order-101`/`order-102`/`order-103` records, the observed rows were:

```text
GROUP       TOPIC   PARTITION   CURRENT-OFFSET   LOG-END-OFFSET   LAG
analytics   orders  0           4                4                0
analytics   orders  1           2                2                0
analytics   orders  2           0                0                0
```

`order-101` appeared in partition 1 at offsets 0 and 1. `order-102` and
`order-103` appeared in partition 0, with their records interleaved at offsets
0 through 3. Partition 2 received no records. Within each order, `OrderPlaced`
preceded `OrderPaid`, even though the displayed rows across partitions differed
from the order in which the six input lines were submitted.

Running `analytics` again used its committed positions, despite retaining
`--from-beginning`. The following bounded check printed no records:

```sh
docker exec kafka-lab /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic orders \
  --from-beginning --max-messages 6 --timeout-ms 5000 --group analytics \
  --command-property enable.auto.commit=true \
  --formatter-property print.key=true \
  --formatter-property print.partition=true \
  --formatter-property print.offset=true
```

In 4.3.1 this check exits with status 0 and prints `Processed a total of 0
messages`. It also logs a `TimeoutException` as an error after five seconds of
no records. That timeout is expected in this particular check; it does not
indicate loss of the earlier six records. An article may instead invite a
reader to leave the resumed consumer open briefly and stop it with Ctrl-C.

Once the consumer has exited, replay works through an explicit reset:

```sh
docker exec kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --group analytics --topic orders \
  --reset-offsets --to-earliest --dry-run

docker exec kafka-lab /opt/kafka/bin/kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 --group analytics --topic orders \
  --reset-offsets --to-earliest --execute
```

Both reset commands reported new offset 0 for partitions 0, 1, and 2. Rerunning
the original six-record `analytics` command printed all six records again.
Final inspection showed zero lag for `analytics` and `fulfillment`; resetting
`analytics` did not reset `fulfillment`.

End the exercise by deleting only its dedicated container:

```sh
docker rm --force --volumes kafka-lab
```

`--volumes` removes the anonymous volumes associated with the dedicated lab
container as well as its writable container layer. It does not delete named
volumes. This exercise does not create a named volume.

## Findings and limits

- A single broker with replication factor one teaches records, keys, topic
  partitions, independent group checkpoints, and replay. It does not validate
  replication, failover, production security, or production durability.
- Keys `A`, `B`, and `C` all mapped to partition 1 in the first test. Distinct
  keys can share a partition; distinct keys do not imply distinct partitions.
  The article should avoid claiming that each key gets its own partition.
- Record display order between partitions is not a global ordering guarantee.
  Inspect the offset sequence within each partition.
- These runtime checks used Kafka CLI clients inside a Docker container. A
  separately installed host client, a multi-container network, and other CPU
  architectures were not exercised.
- After both scripts exited, `docker ps --all --filter
name=codex-kafka-validation-431` returned no matching containers, confirming
  container cleanup. Anonymous volume cleanup remains unverified because the
  initial traps omitted `-v` and the volume IDs were not retained.
- The readiness retry count is bounded, but each individual Kafka administration
  command also has its own connection timeouts. Thirty retries are not a strict
  sixty-second wall-clock deadline.

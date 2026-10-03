# Try Flink locally

Run two small SQL jobs: aggregate a finite file, then keep a pipeline running as
new files arrive. The lab uses Apache Flink **2.3.0**, Java 17, and a pinned
multi-platform image digest. Version 2.3.0 is the stable release checked on
October 1, 2026. [Apache downloads](https://flink.apache.org/downloads/)

You need Docker with Compose, `curl`, and a few GB of Docker memory. No host Java
installation or additional connector JARs are needed. The image includes the
filesystem connector and JSON/CSV formats. The small Dockerfile creates a
directory owned by the `flink` user; Compose shares that directory through one
named volume. [Flink Docker deployment](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/deployment/resource-providers/standalone/docker/),
[JSON format](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/connectors/table/formats/json/),
[CSV format](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/connectors/table/formats/csv/)

## Start the cluster

From the repository root:

```sh
cd examples/flink
docker compose config --quiet
docker compose up --build -d
curl -fsS http://localhost:8081/overview
```

Startup takes a few seconds. Repeat the `curl` command until it reports
`"taskmanagers":1` and `"slots-total":2`. Open the
[Flink dashboard](http://localhost:8081). The JobManager coordinates jobs; the
TaskManager executes their tasks. This lab runs one of each.
[Flink architecture](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/concepts/flink-architecture/)

The REST service and dashboard are exposed only on loopback port 8081. If that
port is occupied,
change the left-hand port in `compose.yaml`, for example
`127.0.0.1:8082:8081`, and use port 8082 in host URLs.

## 1. Aggregate a bounded file

`data/orders.jsonl` contains six orders, one JSON object per line, with amounts
stored in integer cents. `sql/batch.sql`
declares the source schema, groups orders by customer, and writes CSV results:

```sql
INSERT INTO customer_totals
SELECT customer, COUNT(*), SUM(amount_cents)
FROM orders
GROUP BY customer;
```

Submit it:

```sh
docker compose run --rm sql-client \
  /opt/flink/bin/sql-client.sh -f /lab/sql/batch.sql
```

The SQL client waits for completion because the script sets
`table.dml-sync = true`. Look for `Complete execution of the SQL update
statement`, and confirm that **Customer totals** is **FINISHED** in the
dashboard. The default SQL client mode submits work asynchronously; synchronous
submission is useful here because this job has an end.
[SQL client](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/sql/interfaces/sql-client/)

Read the finished part files and sort only for a reproducible display:

```sh
docker compose exec -T taskmanager \
  sh -c 'cat /lab/state/output/batch/part-* | sort'
```

Expected rows (`customer,order_count,total_cents`):

```text
alice,3,3500
bob,2,1500
carol,1,525
```

Run this batch job once per clean lab. Repeated submissions append another set
of result files; use the cleanup command below before starting over.

## 2. Keep a pipeline running

The second script watches an initially empty directory every two seconds. It
normalizes customer names and removes orders with nonpositive amounts:

```sql
INSERT INTO cleaned_orders
SELECT order_id, LOWER(customer), amount_cents
FROM arriving_orders
WHERE amount_cents > 0;
```

Submit it once:

```sh
docker compose run --rm sql-client \
  /opt/flink/bin/sql-client.sh -f /lab/sql/streaming.sql
```

The client prints a Job ID and exits. **New-file discovery** keeps running in the
cluster. Record its Job ID from the client or dashboard. The filesystem source
is bounded by default; `source.monitor-interval` changes it to continuous
discovery of new paths. Appending to, or replacing, an already discovered file
does not make that path a new input. File arrival order is unspecified.
[Filesystem SQL connector](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/connectors/table/filesystem/#directory-watching)

Publish the first file. Copy to a hidden temporary name, then rename on the same
filesystem so discovery sees a complete file:

```sh
docker compose exec -T taskmanager sh -c \
  'cp /lab/data/orders.jsonl /lab/state/input/.orders.pending &&
   mv /lab/state/input/.orders.pending /lab/state/input/orders-001.jsonl'
```

Wait about 15 seconds, then read the finished files:

```sh
docker compose exec -T taskmanager \
  sh -c 'cat /lab/state/output/streaming/part-* | sort -t, -k1,1n'
```

Expected first six rows:

```text
1,alice,1250
2,bob,700
3,alice,2000
4,carol,525
5,bob,800
6,alice,250
```

Publish a different path while the same job is running:

```sh
docker compose exec -T taskmanager sh -c \
  'cp /lab/data/new-orders.jsonl /lab/state/input/.new-orders.pending &&
   mv /lab/state/input/.new-orders.pending /lab/state/input/orders-002.jsonl'
```

Wait about 15 seconds and repeat the output command. It should contain the same
six rows plus these two:

```text
7,carol,1000
8,bob,300
```

Order 9 has `amount_cents = -400`, so it is filtered out. The new uppercase customer
names become lowercase. The job remains **RUNNING** even when the directory has
no new files.

## Inspect checkpoints and recovery

The streaming script enables five-second checkpoints and rolls CSV files after
five seconds. In streaming execution, a rolled part file becomes finished only
after a successful checkpoint. The directory-discovery state and file-sink
state are checkpointed as well. This explains why output is not visible
immediately after publishing a file.
[File sink lifecycle](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/connectors/datastream/filesystem/#part-file-lifecycle)

In the dashboard, open **New-file discovery → Checkpoints** and confirm a
completed checkpoint. Inspect the stored metadata:

```sh
docker compose exec -T taskmanager \
  find /lab/state/checkpoints -name _metadata
```

The `output/` directory holds application results. The `checkpoints/` directory
holds Flink recovery data; it is not a table to query.
[Checkpoints](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/ops/state/checkpoints/)

After both files appear in output and a checkpoint completes, restart only the
worker:

```sh
docker compose restart taskmanager
```

Watch the dashboard until the job returns to **RUNNING**. Its checkpoint page
should show a restored checkpoint. Repeat the streaming output command: there
should still be eight rows, with no duplicated orders. Flink's restart strategy
restores the job from a completed checkpoint after a task failure.
[Task failure recovery](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/ops/state/task_failure_recovery/)

This experiment retains the JobManager and shared volume. Restarting the whole
Compose stack does not automatically rediscover and resubmit jobs; this is not
a highly available cluster.

## What to try next

- Change the batch query to count orders by amount range.
- Publish a third immutable file under a new name and inspect the same running
  pipeline.
- Inspect the job graph and checkpoint durations in the dashboard.
- Explore event-time windows with a timestamp column and watermark. A running
  global `GROUP BY customer` produces updates, so it requires a sink that can
  represent those changes; it cannot be substituted directly into this
  append-only CSV pipeline.
  [Dynamic tables](https://nightlies.apache.org/flink/flink-docs-release-2.3/docs/concepts/sql-table-concepts/dynamic_tables/)

The finite aggregation alone would also fit a short script or database query.
The second experiment shows the reason to investigate Flink further: leave a
pipeline running, accept new data, track progress, and recover its work.

## Cleanup

```sh
docker compose down --volumes --remove-orphans
```

This removes this lab's containers, network, input copies, output, and
checkpoints. It keeps the source samples and locally built images. Run the
startup instructions again for a fresh experiment.

## Verification record

Verified on October 1, 2026 using Docker Engine 29.4.0 on Linux ARM64, Compose
5.1.2, and the pinned Flink image above:

- Compose configuration parsed, images built, and one TaskManager registered
  with two slots.
- The batch job finished and produced exactly the three documented rows.
- The streaming job discovered two input paths, normalized names, rejected the
  negative amount, and produced exactly eight finished output rows.
- Completed checkpoints were visible in the REST API and local volume.
- Worker restart recovered the streaming job from checkpoint 7; the REST API
  reported one restoration, the job returned to **RUNNING**, and output
  remained eight rows.
- Lab containers, network, and scratch volume were removed after verification.

The image manifest also supports Linux AMD64; that platform was not executed.
This local shared-volume example does not test a distributed filesystem,
JobManager failure, event-time windows, a message broker, or production load.

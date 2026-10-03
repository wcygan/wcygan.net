# ClickHouse web-events lab

This local lab runs ClickHouse **26.9.8.3** with Docker and the Compose plugin.
The image pins the [stable release](https://github.com/ClickHouse/ClickHouse/releases/tag/v26.9.8.3-stable)
and its manifest digest. It publishes the HTTP port only on `127.0.0.1:8124`.
The password in `compose.yaml` is for this disposable exercise.

Run the commands from this directory. If port 8124 is occupied, change the host
port in `compose.yaml` and the curl command below.

## Start a server

```sh
docker compose up -d --wait --wait-timeout 180

ch() {
  docker compose exec -T clickhouse clickhouse-client \
    --user practice --password practice-local-only "$@"
}

ch --query 'SELECT version()'
```

Expect `26.9.8.3`. The `ch` shell function sends subsequent commands to the client
inside the container; no host ClickHouse installation is needed. The volume
preserves data when the container stops. The container has an authenticated
query health check. See the [official Docker setup guide](https://clickhouse.com/docs/get-started/setup/self-managed/docker)
for the image's configuration options.

## Generate a million events

```sh
ch --multiquery < 01-events.sql
ch --multiquery < 02-inspect.sql
```

`01-events.sql` creates `lab.events` and inserts one million deterministic
synthetic rows using `numbers(1000000)`. IDs start at zero, timestamps start on
September 1, 2026 in UTC, countries cycle through `DE`, `GB`, and `US`, and events
include `view`, `cart`, and `buy`. Purchases have integer revenue in cents. This
small dataset is useful for exploring behavior; it is not a production benchmark.

The schema uses:

```sql
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (country, event_time)
```

The count is **1,000,000**. The country aggregation returns:

| Country | Events | Purchases | Revenue, cents |
| ------- | -----: | --------: | -------------: |
| DE      | 333334 |     33334 |      167817130 |
| GB      | 333333 |     33333 |      168150270 |
| US      | 333333 |     33333 |      168483600 |

The query for US events from September 2 inclusive to September 3 exclusive
returns **28,800 events** and **14,477,400 cents**.

The [EXPLAIN](https://clickhouse.com/docs/reference/statements/explain) output
shows `PrimaryKey` selecting **5/123 granules** in the tested run. These are
groups of rows read through the sparse index, not individual matching rows.
The monthly partition admits the entire September part, so the sorting key
provides the useful pruning for this query. Exact part and granule counts can
vary with insert settings and background merges. The two explicit settings in
the EXPLAIN query disable caches/read-time skipping that can obscure index
analysis in newer versions.

The [system.parts](https://clickhouse.com/docs/reference/system-tables/parts)
query reports active storage parts. The tested first insert produced one part
with 1,000,000 rows, 124 marks, 10.26 MiB of compressed data, and 24.80 MiB of
uncompressed data. With the default adaptive granularity, the sparse index
includes an [additional final mark](https://clickhouse.com/docs/guides/clickhouse/data-modelling/sparse-primary-indexes#the-primary-index-has-one-entry-per-granule),
so marks do not necessarily equal the granule count. These sizes describe this
synthetic table, excluding other server files and overhead.

## Aggregate future inserts

```sh
ch --multiquery < 03-rollup.sql
ch --multiquery < 04-verify.sql
```

`03-rollup.sql` creates a daily `SummingMergeTree` target and an incremental
materialized view. It checks that the target initially contains **zero events**,
then inserts a second batch with IDs 1,000,000 through 1,099,999.

An [incremental materialized view](https://clickhouse.com/docs/materialized-view/incremental-materialized-view)
processes blocks arriving through new inserts. Creating this view does not
backfill the existing million rows. Consequently, the raw table now contains
**1,100,000 events**, while the target summarizes only the **100,000** later
events. Existing-data backfills require a separate, coordinated operation.

The daily target query returns:

| Day        | Country | Events | Revenue, cents |
| ---------- | ------- | -----: | -------------: |
| 2026-09-12 | DE      |  12266 |        5868470 |
| 2026-09-12 | GB      |  12267 |        5880930 |
| 2026-09-12 | US      |  12267 |        5893200 |
| 2026-09-13 | DE      |  21067 |       10770130 |
| 2026-09-13 | GB      |  21067 |       10791200 |
| 2026-09-13 | US      |  21066 |       10811070 |

Always read the target with `sum()` and `GROUP BY`, as this file does.
[SummingMergeTree background merges](https://clickhouse.com/docs/reference/engines/table-engines/mergetree-family/summingmergetree)
may not have combined every row with the same sorting key yet.

`04-verify.sql` compares every daily country group in the target with the raw
table's second batch. Expect these outputs, in order:

```text
1100000  100000
100000   50015000
0
```

The first line is the raw count and second-batch count. The second is the target's
event and revenue totals. The final **zero mismatched groups** verifies that
the target agrees with an aggregation of the later batch.

Run the numbered files once, in order, on a fresh lab. The create statements
deliberately fail if the objects already exist. They do not silently duplicate
the seed or reload an existing table.

## Send SQL over HTTP

```sh
curl --fail --silent --show-error \
  --user practice:practice-local-only \
  'http://127.0.0.1:8124/' \
  --data-binary 'SELECT version(), count() FROM lab.events'
```

After both insert batches, expect `26.9.8.3` followed by `1100000`, separated by
a tab. This sends SQL directly through the server's
[HTTP interface](https://clickhouse.com/docs/interfaces/http).

For an interactive SQL prompt, use:

```sh
docker compose exec clickhouse clickhouse-client \
  --user practice --password practice-local-only --database lab
```

Exit with `exit`.

## Stop, resume, or erase the lab

```sh
docker compose down
docker compose up -d --wait --wait-timeout 180
ch --query 'SELECT count() FROM lab.events'
```

Expect **1,100,000** after restarting. Stopping the container keeps its named
volume; do not rerun the inserts to resume this state.

To stop and **delete this lab's saved data**, run:

```sh
docker compose down -v
```

The next startup has an empty server, ready for `01-events.sql` again.

## Verification record

Verified October 1, 2026 with Docker Engine 29.4.0, Docker Compose 5.1.2, and
the Linux arm64 image. Native-client queries, the country aggregation,
index-plan inspection, the daily view, the per-group comparison, and the HTTP
query all passed against a real server. Container replacement preserved the
1,100,000-row table and 100,000-event rollup. The verification container and its
volume were removed afterward.

# ClickHouse research for a beginner draft

Research date: **2026-10-01**. Primary sources only: the upstream repository and official ClickHouse documentation. The findings below are original summaries, not benchmark results. Documentation links were checked on this date; the site currently redirects many older links into new `/get-started`, `/concepts`, and `/reference` paths.

## The useful first mental model

ClickHouse is an open-source, column-oriented database with a SQL interface, built for online analytical processing (OLAP). OLAP queries summarize many records: events by country, error rate by service, or purchases by hour. Online transaction processing (OLTP) usually changes or retrieves a few records at a time, such as placing an order. These access patterns favor different storage and execution choices. “Real-time analytics” describes timely ingestion and interactive analytical answers; it is not a guarantee that every query finishes within a fixed latency.

Sources: [upstream repository](https://github.com/ClickHouse/ClickHouse), [What is ClickHouse?](https://clickhouse.com/docs/get-started/about/intro). The repository uses the [Apache 2.0 license](https://github.com/ClickHouse/ClickHouse/blob/v26.9.8.3-stable/LICENSE).

## Why columns help

If an events table contains dozens of fields but a query needs `country` and `revenue`, a columnar layout can avoid reading the other fields. Adjacent values also share a type and often a distribution, which benefits compression. Reading fewer bytes and processing less irrelevant data is the key beginner explanation; avoid claiming that columnar storage alone makes every query faster. Point lookups and frequent small updates have different needs.

Source: [What is ClickHouse? — row-oriented vs. column-oriented storage](https://clickhouse.com/docs/get-started/about/intro#row-oriented-vs-column-oriented-storage).

## Vectorized execution and parallel lanes

Query operators pass batches of column values between stages, rather than passing a single row on each call. This improves CPU cache use and enables optimized operations including SIMD where applicable. ClickHouse can divide selected data among multiple processing lanes, then combine partial aggregate results. `max_threads` is an upper bound; small amounts of work can use fewer lanes. More cores or servers do not promise proportional speedups because storage, memory, scheduling, and coordination still matter.

Sources: [Why is ClickHouse so fast?](https://clickhouse.com/docs/get-started/about/why-clickhouse-is-so-fast), [query parallelism](https://clickhouse.com/docs/concepts/core-concepts/query-parallelism).

## MergeTree: sorted parts, granules, and merges

`MergeTree` is a commonly used table engine, meaning a storage implementation selected in the table definition. Inserts produce new sorted data parts. `ORDER BY (country, event_time)` defines the physical sorting key within each part. If a separate `PRIMARY KEY` is omitted, the sorting key is also used for the primary index. Existing parts need not be globally rewritten for each new insert.

In the background, merges combine parts while keeping the sort order. Ordinary `MergeTree` does not turn repeated business keys into one row. Specialized engines, such as `ReplacingMergeTree`, have additional semantics. Parts from different partitions are not merged. A partition is a table lifecycle grouping, not a server shard.

Each part has a sparse primary index. It records key values at granule boundaries instead of a pointer for every row. The index helps reject granules that cannot satisfy a predicate; candidate granules still need to be read and filtered. The primary key does **not** impose uniqueness. The default row granularity is 8,192, but adaptive byte sizing and large rows can produce smaller granules. Avoid presenting every actual granule as exactly 8,192 rows.

Sources: [MergeTree reference](https://clickhouse.com/docs/reference/engines/table-engines/mergetree-family/mergetree), [primary indexes](https://clickhouse.com/docs/concepts/core-concepts/primary-indexes).

## Ingest choices

Many tiny synchronous inserts create many parts and add merge overhead. Official guidance favors batching, with at least 1,000 rows and ideally 10,000–100,000 as a starting point rather than a universal optimum. Server-side asynchronous inserts provide another batching option. Buffered rows are not queryable before the buffer is flushed. With `wait_for_async_insert=1`, acknowledgment waits for successful flush; the fire-and-forget alternative changes the reliability contract.

Source: [selecting an insert strategy](https://clickhouse.com/docs/concepts/best-practices/selecting-an-insert-strategy).

Do not conflate row deduplication with safe insert retries. Deduplication depends on engine, settings, and the deduplication log/window. A plain MergeTree table can still store repeated key values.

## Incremental materialized views

An incremental materialized view runs a query over the newly inserted block and writes the result into a target table. A simple example converts incoming purchases into counts and sums per country. This shifts repeatable work from reads to ingestion. Target tables can contain several partial records for a group before background merging; query-time `GROUP BY` and `sum` or aggregate-state merge functions still matter.

The view does not automatically rescan old source rows when created, and source updates/deletes do not retroactively repair its target. Backfilling and corrections need an explicit plan. Averages require sufficient aggregate state, such as sum and count; averaging averages of unequal groups is incorrect. A refreshable materialized view is a different mechanism.

Source: [incremental materialized views](https://clickhouse.com/docs/concepts/features/materialized-views/incremental-materialized-view).

## Use cases and fit

Useful examples for the draft:

- Product analytics: event counts, funnels, usage trends, and revenue breakdowns.
- Observability: aggregate and investigate large log, metric, and trace streams.
- Customer-facing analytics: dashboards over recent continuously arriving data.
- Exploratory analysis and warehouse-style queries over large datasets.

These are workload examples, not a recommendation to replace an existing application database. A common arrangement keeps operational state in PostgreSQL or MySQL and sends events or change data into ClickHouse for analytics. Actual freshness then includes transport, batching, and ingestion delay.

Source: [official use cases](https://clickhouse.com/docs/get-started/use-cases/overview). The pipeline arrangement above is an architectural suggestion inferred from the workload distinction, not a statement that every deployment requires a separate OLTP database.

## Limits worth explaining honestly

ClickHouse supports joins, updates, and deletes; do not say these features are absent. It is still a poor default for an application centered on high-rate individual record edits and transactional workflows. Traditional `ALTER TABLE ... UPDATE/DELETE` mutations run as background work and rewrite affected parts, which can amplify I/O. Point lookups can read substantially more data than one result row because the index is sparse. The database's transaction capabilities are not a substitute for a general-purpose OLTP transaction model.

Sources: [distinctive features and disadvantages](https://clickhouse.com/docs/get-started/about/distinctive-features#features-that-can-be-considered-disadvantages), [avoid mutations](https://clickhouse.com/docs/concepts/best-practices/avoid-mutations). The feature list contains simplifying language, so keep the draft caveat about workload fit rather than an absolute “no transactions” assertion.

## Shards, replicas, and the Cloud distinction

A classic self-managed sharded deployment divides different subsets of data across shards. A shard can have replicas holding copies for availability. A distributed analytical query can compute a partial aggregate on each shard and combine the results. Replicas must not be counted as additional independent rows. A `Distributed` table provides routing and distributed reads; it does not itself store the table's data.

Sources: [distributed table engine](https://clickhouse.com/docs/reference/engines/table-engines/special/distributed), [distributed processing](https://clickhouse.com/docs/get-started/about/distinctive-features#distributed-processing-on-multiple-servers), [query parallelism](https://clickhouse.com/docs/concepts/core-concepts/query-parallelism).

ClickHouse Cloud is a managed offering, not simply an instruction to run the same classic cluster diagram elsewhere. Its SharedMergeTree family uses shared object storage and ClickHouse Keeper for metadata and coordination, separating compute from storage. Cloud can scale compute with parallel replicas without splitting the table into classic shards. Label any shard/replica visual as a **self-managed cluster model** and mention this distinction in nearby prose.

Source: [SharedMergeTree](https://clickhouse.com/docs/products/cloud/features/infrastructure/shared-merge-tree).

## Ways to try it

For a local server lab, the official Docker image is `clickhouse/clickhouse-server`. It includes `clickhouse-client`, so readers can use `docker exec -it <name> clickhouse-client` without opening host ports. The image supports database, user, and password environment variables. Port 8123 is HTTP and 9000 is the native protocol if an exercise needs them. Local data persistence requires a volume; an intentionally disposable container exercise should say that its sample data is disposable.

`latest` tracks the latest stable branch; full release tags enable reproducibility. Upstream `/releases/latest` resolved to **v26.9.8.3-stable** on the research date. The lab worker should check the actual Docker tag and record the tested server version before publication.

Sources: [Docker installation](https://clickhouse.com/docs/get-started/setup/self-managed/docker), [observed stable release](https://github.com/ClickHouse/ClickHouse/releases/tag/v26.9.8.3-stable).

The official quick-install script currently installs a single ClickHouse binary and, on Linux/macOS, `clickhousectl`. `CLICKHOUSE_ONLY=1` opts into just the binary. `./clickhouse local` runs a local SQL session; by default its table storage is temporary. `./clickhouse server` starts a persistent server using the current directory, and `./clickhouse client` connects in a second terminal. A file-oriented local query can use `file(...)`; this should be a brief alternative to a persistent-server lab, not mixed into its commands.

Sources: [quick install](https://clickhouse.com/docs/get-started/setup/self-managed/quick-install), [clickhouse-local overview](https://clickhouse.com/resources/engineering/what-is-clickhouse-local).

Another low-friction path is the [SQL playground](https://sql.clickhouse.com/) linked by the official introduction, or the managed [Cloud quickstart](https://clickhouse.com/docs/get-started/setup/cloud). Avoid quoting a current free-trial price or duration without a separate check.

## A small map of the repository

These paths were verified against the upstream stable tag `v26.9.8.3-stable` via GitHub's contents API and header inspection. This is an entrypoint map, not an exhaustive code review:

| Area                      | Verified source                                                                                                                                      | What to look for                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| In-memory columns         | [ColumnVector.h](https://github.com/ClickHouse/ClickHouse/blob/v26.9.8.3-stable/src/Columns/ColumnVector.h)                                          | Numeric column values backed by an array, with whole-column filter and permutation operations |
| MergeTree writes          | [MergeTreeDataWriter.h](https://github.com/ClickHouse/ClickHouse/blob/v26.9.8.3-stable/src/Storages/MergeTree/MergeTreeDataWriter.h)                 | Split incoming blocks by partition and create temporary data parts                            |
| MergeTree reads           | [MergeTreeDataSelectExecutor.h](https://github.com/ClickHouse/ClickHouse/blob/v26.9.8.3-stable/src/Storages/MergeTree/MergeTreeDataSelectExecutor.h) | Select columns, parts, and mark ranges; use primary-key conditions and indexes                |
| Pipeline aggregation      | [AggregatingTransform.h](https://github.com/ClickHouse/ClickHouse/blob/v26.9.8.3-stable/src/Processors/Transforms/AggregatingTransform.h)            | Aggregation processor in the query pipeline                                                   |
| Aggregate implementations | [AggregateFunctionSum.h](https://github.com/ClickHouse/ClickHouse/blob/v26.9.8.3-stable/src/AggregateFunctions/AggregateFunctionSum.h)               | Implementation of a familiar SQL aggregate                                                    |

## Ten visual teaching contracts

The visual plan was revised on October 2, 2026 for the requested dark PlanetScale
presentation, with five 2D and five 3D explanations. See
[the visual contract](./clickhouse-visual-overhaul.md) for the implementation and
verification requirements.

All quantities must be labeled illustrative unless produced by the executed lab. Geometry represents logical structure, not exact file byte offsets, rack layout, or benchmark timing.

1. **Transaction or analysis? — 2D.** Compare retrieving/changing one order with scanning many events into a summary. The invariant is the access pattern, not that an OLTP database can never aggregate.
2. **Analytics pipeline — 2D.** Source commit, insertion into ClickHouse, and dashboard refresh happen separately. The insert-only demonstration counts pending events, not milliseconds of real ingestion lag. A connector is configured separately; ClickPipes is a Cloud service.
3. **Read two columns — 3D.** Keep the same rows in both layouts and select the same result. Show relevant logical values versus unneeded values; do not convert colored-cell counts into an unsupported disk-I/O ratio or promise one physical file per column.
4. **Dictionary encoding — 3D.** Encode repeated country strings into references and preserve exact decoding and row order. Show the dictionary as well as the references. Tiny strings and symbol counts are not proof of byte savings; dictionary encoding and general compression codecs are distinct.
5. **Process a block — 2D.** Filter a batch and aggregate surviving rows; partial lanes combine to the same answer as one lane. Vectorization and thread parallelism are distinct explanations.
6. **Skip granules — 2D.** Ordered key marks identify candidate ranges, then exact filtering produces the final rows. A candidate is not a guarantee of a match. The model uses small granules for readability.
7. **Monthly partitions — 3D.** Month groups contain parts. A query filter can exclude groups while preserving their stored rows; removing an old partition is a separate operation. Groups are not servers or shards. Merge boundaries and lifecycle management are the primary lesson.
8. **Parts and merges — 3D.** Inserts create separately sorted parts; a background merge forms a larger sorted part. Queryable rows and sums stay unchanged. For plain MergeTree, repeated keys remain repeated.
9. **Aggregate on insert — 2D.** A new block contributes a delta to an already populated target aggregate table. Earlier source rows are not rescanned. Updates/backfills are outside this insert-only illustration.
10. **Shards and replicas — 3D.** Shards hold disjoint row subsets; replicas copy each subset. A global sum adds one contribution per shard. More replicas do not multiply the logical row count. Label the classic self-managed architecture explicitly.

Sources for the added contracts: [LowCardinality](https://clickhouse.com/docs/reference/data-types/lowcardinality),
[partitioning](https://clickhouse.com/docs/concepts/core-concepts/partitions),
[physical part formats](https://clickhouse.com/docs/reference/engines/table-engines/mergetree-family/mergetree#data-storage),
and [PostgreSQL ingestion through ClickPipes](https://clickhouse.com/docs/integrations/clickpipes/postgres).

## Draft fact-check checklist

- Keep `ORDER BY` in table creation distinct from query result `ORDER BY`.
- Keep a part, a granule, a processing block, a partition, and a shard distinct.
- Explain “engine,” “OLAP,” “vectorized,” and “materialized view” at first use.
- Prefer exact `uniqExact` or clearly name approximate aggregates in the beginner lab.
- Never make a miniature visual count or animation duration a performance claim.
- Record tested lab output independently; links and SQL inspection alone do not establish a successful run.
- Keep the draft unpublished until the user chooses to publish it.

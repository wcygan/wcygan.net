# Prometheus research for a beginner draft

Researched **October 1, 2026** against official documentation and the
`prometheus/prometheus` repository. The latest stable release resolved to
**v3.15.0**, released September 24, 2026. Pin an executable lab to that version;
the `/latest/` documentation can change after publication.
[Release](https://github.com/prometheus/prometheus/releases/tag/v3.15.0)

## The practical answer

Prometheus is an open-source monitoring and alerting system with a time series
database. It collects measurements on a schedule, stores them, evaluates queries
and rules, and exposes results through a web interface and API. The server can
work independently; Grafana and Alertmanager are separate, optional ecosystem
components. [Repository](https://github.com/prometheus/prometheus)

It is useful for service request volume, error rates, latency, queue depth,
resource usage, and capacity trends. It fits numeric operational measurements,
including changing microservice deployments. Its documentation explicitly warns
against using sampled monitoring data for exact per-request billing. A counter
can miss activity when a process starts and dies between scrapes, or when its
state disappears during an outage. This last example is an inference from the
scrape model, rather than a completeness guarantee in the documentation.
[Overview](https://prometheus.io/docs/introduction/overview/)

The editorial comparison should be about questions:

| Data                | Example question                             | Suitable home          |
| ------------------- | -------------------------------------------- | ---------------------- |
| Application records | What did customer 42 order?                  | Transactional database |
| Metric              | How many requests per second are we serving? | Prometheus             |
| Log event           | What error text did this request produce?    | Log storage            |
| Distributed trace   | Which service consumed this request's time?  | Trace storage          |

The first row is an editorial contrast, not a complete taxonomy of SQL systems.
Metrics summarize measurements; logs record events; traces follow request paths.
They complement each other. [OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/)

## The data model and the meaning of schema

A series is identified by a metric name and its **complete label set**:

```promql
demo_requests_total{route="/work",status="200",job="demo",instance="app:8000"}
```

Each ordinary scalar sample adds a timestamp and a float64 value. Native
histogram samples hold a composite distribution instead. Changing, adding, or
removing any identifying label creates a different series. Internally, the
metric name is represented by the special `__name__` label.
[Data model](https://prometheus.io/docs/concepts/data_model/)

There is no SQL-style `CREATE TABLE` step in the normal instrumentation flow.
The metric contract is authored in application code: name, meaning, unit, type,
and bounded label dimensions. A collector registry gathers these instruments
and a bridge exposes them in a supported scrape format.
[Client-library structure](https://prometheus.io/docs/instrumenting/writing_clientlibs/)

Illustrative exposition, assembled for this draft rather than copied from docs:

```text
# HELP demo_requests_total Completed demonstration requests.
# TYPE demo_requests_total counter
demo_requests_total{route="/work",status="200"} 120
demo_requests_total{route="/work",status="500"} 3
```

`HELP` and `TYPE` describe the instrument; they do not create a relational table.
The HTTP response is line-oriented, newline-terminated text. Explicit sample
timestamps are optional in the classic text format; the normal lesson should
use scrape timestamps. [Exposition formats](https://prometheus.io/docs/instrumenting/exposition_formats/)

Choose base units in names, for example `demo_request_duration_seconds`, and use
`_total` for cumulative counters. Avoid labels such as user IDs, request IDs,
email addresses, and unbounded raw URL paths. Use a route template such as
`/orders/:id` when the route itself is a useful dimension. Every observed
combination adds a series. [Metric and label naming](https://prometheus.io/docs/practices/naming/)

For a cardinality visual, use **potential combinations**, not a false guarantee
that all combinations exist. With three methods, four route templates, five
statuses, and ten instances, the full Cartesian product has `3 × 4 × 5 × 10 =
600` combinations. A populated `user_id` dimension with 1,000 possibilities
could multiply that to 600,000. Actual series count depends on combinations
observed. This arithmetic is an editorial example.

## Writing means instrumenting, exposing, and scraping

The default flow is:

1. Application code increments a counter or updates a gauge in its own process.
2. Its HTTP `/metrics` endpoint reports current instrument values.
3. Prometheus requests that endpoint at `scrape_interval` and appends samples.

An exporter performs step 2 for software that does not expose Prometheus metrics
directly. Static targets or service discovery tell Prometheus where to scrape.
Prometheus can even scrape itself.
[First steps](https://prometheus.io/docs/introduction/first_steps/)

Prometheus normally attaches `job` and `instance` labels. It also creates
`up{job="demo",instance="app:8000"}`: `1` means the scrape succeeded and `0`
means it failed. A successful scrape is not proof that users can complete the
application's business workflow; `up` is the scrape's health signal.
[Jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/)

Do not teach `POST /api/v1/write` as a JSON row insertion endpoint. A disabled-
by-default receiver supports the Remote Write protocol, but official guidance
limits it to specific low-volume uses and says it should not replace scraping.
An optional OTLP metrics receiver also exists. Reading through the HTTP API is
different: `/api/v1/query` evaluates an instant PromQL expression;
`/api/v1/query_range` evaluates over a start, end, and step and returns JSON.
[HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/)

The Pushgateway serves limited cases such as service-level batch jobs that
finish before they can be scraped. Prometheus still scrapes the gateway.
Pushed series remain there until explicitly deleted, and target `up` cannot
describe the original process's health. It is not the default mechanism for
long-running application services.
[Pushgateway guidance](https://prometheus.io/docs/practices/pushing/)

## Metric types and reading data

| Type      | What changes                                               | Example                |
| --------- | ---------------------------------------------------------- | ---------------------- |
| Counter   | Increases, with resets on restart                          | Completed requests     |
| Gauge     | Moves up or down                                           | Queue depth            |
| Histogram | Counts observations into a distribution                    | Request durations      |
| Summary   | Exposes count/sum and optionally client-computed quantiles | Instrumented durations |

Classic histograms expose cumulative `_bucket{le="..."}` counters plus `_sum`
and `_count`. Native histograms hold their buckets, count, and sum in one
composite sample. For float series, the server does not enforce counter/gauge
semantics; a syntactically valid `rate()` on a gauge can still be meaningless.
[Metric types](https://prometheus.io/docs/concepts/metric_types/)

Start with selection, then rates, then aggregation:

```promql
# One dimension filtered; output still contains separate series.
demo_requests_total{route="/work"}

# Average requests per second for each series over the last five minutes.
rate(demo_requests_total[5m])

# Requests per second per route, across instances and statuses.
sum by (route) (rate(demo_requests_total[5m]))

# Total estimated requests in the window.
sum(increase(demo_requests_total[5m]))

# Mean queue depth over time for each series.
avg_over_time(demo_queue_depth[5m])
```

`rate()` corrects observed counter resets and extrapolates to the range edges.
It is an estimate from samples, not event-by-event reconstruction.
`increase()` is effectively `rate()` multiplied by window seconds and can be
fractional. `avg_over_time()` weights samples equally, even if spacing differs.
[Functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

For a lab using ordinary classic text exposition without start timestamps,
wait for at least two scrapes before expecting a rate. The pinned rate
implementation normally requires two samples; experimental start-timestamp
handling can support a special single-sample case, which this introductory
lab should not enable. [Rate implementation](https://github.com/prometheus/prometheus/blob/v3.15.0/promql/functions.go)

Compute a rate **before** summing, so an individual instance's reset remains
visible to the rate function. [Prometheus practices](https://prometheus.io/docs/practices/the_zen/)
`sum by (route)` preserves `route` and discards other labels; it combines values
across series at an evaluation time. An aggregation across label dimensions
differs from `avg_over_time`, which reduces time samples within each series.
[Operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)

An instant query evaluates at one time. A range query repeatedly evaluates the
same expression at equally spaced times; `step` changes evaluation resolution,
not ingestion frequency. Missing or stale series are not automatically zero.
The default lookback is five minutes, but stale markers stop old values from
being returned after a series disappears.
[Querying basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)

Latency example for a classic histogram with consistent bucket boundaries:

```promql
histogram_quantile(
  0.95,
  sum by (le) (rate(demo_request_duration_seconds_bucket[5m]))
)
```

The percentile is estimated from buckets. Do not average instance p95 values
to obtain a fleet p95. Client-computed summary quantiles cannot generally be
aggregated across workers. Current guidance prefers native histograms when the
instrumentation and surrounding tools support them.
[Histograms and summaries](https://prometheus.io/docs/practices/histograms/)

## Rollups, recording rules, compaction, and retention

“Rollup” is ambiguous; teach its operations explicitly. A recording rule
periodically evaluates a query and stores the output as **new** series:

```yaml
groups:
  - name: demo
    interval: 15s
    rules:
      - record: route:demo_requests:rate5m
        expr: sum by (route) (rate(demo_requests_total[5m]))
```

Load this file via `rule_files` in `prometheus.yml`. Check syntax with
`promtool check rules rules.yml`. A rule avoids repeatedly recomputing an
expensive expression; it does not rewrite or erase its source series and is
not a historical backfill by default. The last two distinctions follow from
recording evaluations as new samples.
[Recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)

The local TSDB holds incoming data in the **Head**, backed by a write-ahead log
(WAL) for restart recovery. It writes initial two-hour blocks with sample
chunks, label/metric index, and metadata. Background compaction combines
blocks into larger time ranges. This storage organization is not an automatic
semantic rollup of old samples. Local storage is not clustered or replicated;
WAL recovery does not protect against loss of the disk or node.
[Storage](https://prometheus.io/docs/prometheus/latest/storage/)

Retention removes old data. The default time retention is 15 days when neither
time nor size retention is configured. Current config uses:

```yaml
storage:
  tsdb:
    retention:
      time: 15d
```

The old `--storage.tsdb.retention.time` and `.size` flags are now deprecated.
The storage documentation still lists them, so cite current configuration and
command-line documentation if discussing tuning. The article's first lab
can omit retention configuration entirely.
[Configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tsdb),
[CLI](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
The pinned release's YAML structs also confirm this nesting.
[v3.15.0 configuration types](https://github.com/prometheus/prometheus/blob/v3.15.0/config/config.go)

Downsampling reduces temporal resolution; it differs from grouping labels and
from block compaction. Systems such as Thanos add long-range downsampling and
object storage around Prometheus. Thanos preserves multiple aggregates, not
just one naïve average; retaining raw and downsampled resolutions can actually
increase storage. Do not promise that “downsampling saves disk” universally.
[Thanos Compactor](https://thanos.io/tip/components/compact.md/#downsampling)

## Alerts and the interview explanation

Prometheus evaluates an alert expression on a schedule. A `for: 2m` condition
must remain active on each evaluation for that duration before firing. It is
pending first; a false evaluation resets that pending condition. An optional
`keep_firing_for` can extend firing after the expression stops matching.
[Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

Alertmanager receives the resulting alerts and handles grouping,
deduplication, routing, silences, and inhibition. Prometheus determining that
a condition is firing differs from Alertmanager deciding when and where to
send a notification.
[Alertmanager](https://prometheus.io/docs/alerting/latest/alertmanager/)

Draft interview explanation: “I would instrument the service with bounded
labels, scrape its metrics into Prometheus, use PromQL to measure throughput,
errors, latency, and saturation, and use rules to detect sustained problems.
I would plan separately for logs, tracing, exact business records, and any
long-term or highly available metrics storage.” This is a suggested synthesis,
not a quoted product guarantee.

## Seven proposed visual lessons

These are editorial recommendations. Keep any simulations explicitly labeled
as illustrative and make their settled states readable without animation.

1. **Scrape Cycle (2D):** application instrument updates, HTTP request/response,
   and appended samples. Distinguish scrape success from business health.
2. **Series Identity (2D):** label chips beside separate sample lanes. Selecting
   another `status` changes the lane's identity, not a column inside one row.
3. **Label Combinations (3D):** a bounded lattice for method × route × status;
   show potential combinations and inspect one cell. Increasing a dimension
   exposes multiplicative cost, with numeric summary always visible.
4. **Counter to Rate (2D):** observed cumulative samples, a visible process
   restart, and the rate window. Label simple delta arithmetic as a teaching
   approximation unless implementing Prometheus's actual extrapolation.
5. **Latency Buckets (2D):** add observations to cumulative classic buckets;
   show why a percentile falls inside a bucket and is estimated.
6. **Recording a Rollup (2D):** many instance rates group into one route rate,
   then a scheduled evaluation appends it to a derived series. Keep the
   original lanes visible to show they remain stored.
7. **Storage Lifecycle (3D):** distinct spatial regions for WAL, Head, and
   immutable blocks; advancing time produces blocks, compacts them, and
   retires old ones. State that geometry is conceptual, not a physical
   arrangement of files or a distributed cluster.

If an eighth visual is useful, **Sustained Alert (2D)** could compare a short
spike with a threshold held across evaluation ticks through `for: 2m`.

## Repository map and scope of evidence

The pinned server code separates the main concepts into clear packages:

- [Scrape implementation](https://github.com/prometheus/prometheus/blob/v3.15.0/scrape/scrape.go)
- [PromQL query engine](https://github.com/prometheus/prometheus/blob/v3.15.0/promql/engine.go)
- [TSDB database](https://github.com/prometheus/prometheus/blob/v3.15.0/tsdb/db.go)
- [Block compaction](https://github.com/prometheus/prometheus/blob/v3.15.0/tsdb/compact.go)
- [Recording and alerting rule manager](https://github.com/prometheus/prometheus/blob/v3.15.0/rules/manager.go)

Documentation supports the behavioral explanation; source files verify where
those responsibilities live. This note is not a production sizing exercise or
a recommendation for a specific remote backend. Native-histogram feature
support should be checked against the lab's chosen client library. The container
lab was exercised locally, with the checks below supporting the draft's examples.

## Completed draft and verification

The draft is `src/posts/prometheus.draft.mdx`, previewed at `/prometheus` in
development and excluded from the production post index and prerender output.
It embeds five 2D workbenches and two interactive 3D models. The accompanying
`examples/prometheus/README.md` documents the runnable Docker lab.

- `bun run pre-commit` passed: formatting, typecheck, 119 test files, 863 tests.
  This includes 22 Prometheus model and component tests.
- `bun run build` passed; the draft was absent from public routes and feeds.
- Browser inspection at 1440×900 and 390×844 verified all seven figures, one
  stage each, 44px controls, no horizontal overflow, manual steps, scenarios,
  reset, camera drag/orbit/zoom, keyboard controls, and reduced motion.
- The draft's accessibility scan reported zero violations. Generated code
  buttons have accessible names, code blocks accept keyboard focus, and a real
  code-copy action succeeded. Graphical contrast still requires visual
  inspection, which was performed.
- Docker config/rule checks and rule tests passed. Mixed traffic produced 534
  successful responses and 178 server errors, a roughly 25% error ratio, and a
  firing error alert. Healthy traffic cleared it. Restarted counters were
  detected; stopped targets produced `up=0` and the sustained target-down alert;
  recovery restored `up=1` and cleared the alert.

These are functional checks of a small teaching workload, not production sizing
or performance measurements. The lab containers were stopped after verification;
their named data volume remains until deliberately removed.

## Visual revision, October 2

The original seven-figure review is superseded by the ten-demo redesign. See [visual redesign and current verification](./prometheus-visual-redesign.md) for the PlanetScale palette, added beginner lessons, and current checks.

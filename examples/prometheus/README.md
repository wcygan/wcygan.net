# Prometheus local lab

A tiny HTTP app, a real Prometheus server, and enough traffic to explore counts,
latency, recording rules, and alert state. Requires Docker with Compose. No Python
installation is needed on the host.

Prometheus is pinned to [3.15.0](https://github.com/prometheus/prometheus/releases/tag/v3.15.0),
the latest stable release checked on October 1, 2026. The official Python client
is pinned to [0.26.0](https://github.com/prometheus/client_python/releases/tag/v0.26.0).
The Python container uses `3.13.7-slim-bookworm`. These are explicit version tags;
the container images are not locked to immutable digests.

## Start and make requests

From the repository root:

```sh
cd examples/prometheus
docker compose up -d --build
docker compose ps

curl -i http://127.0.0.1:18080/fast
curl -i http://127.0.0.1:18080/slow
curl -i http://127.0.0.1:18080/fail
curl -fsS http://127.0.0.1:18080/metrics

# Four concurrent requests per batch; one is an intentional HTTP 500.
docker compose exec -T app python traffic.py --seconds 90 --mode mixed
```

The app deliberately returns 200 from `/fast` after about 20 ms, 200 from `/slow`
after about 350 ms, and 500 from `/fail` after about 100 ms. It maps every other
application path to the label `/other` with status 404. `/metrics` and `/healthz`
are excluded from the application metrics. The generator treats HTTP 500 as an
expected response and prints its counts. A connection failure still fails the
generator.

Visit [Prometheus](http://127.0.0.1:19090), then its
[targets](http://127.0.0.1:19090/targets) and
[query page](http://127.0.0.1:19090/query). The `demo` target should be healthy.
Prometheus scrapes `http://app:8080/metrics` inside the Compose network every
five seconds. Published ports bind only to `127.0.0.1`. If a port is occupied,
change the host side of its mapping in `compose.yml` and use that port in the
host commands; the internal scrape address stays the same.

## What counts as a schema?

There is no `CREATE TABLE` here. `app.py` defines the metric names, their meaning,
and a bounded set of labels. The same metric name and complete label set identify
a time series. Prometheus adds `job="demo"` and `instance="app:8080"` to scraped
samples. Each successful scrape saves the current values with a timestamp.
See the official [data model](https://prometheus.io/docs/concepts/data_model/) and
[jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/).

| Metric                               | Meaning                                                     | Application labels |
| ------------------------------------ | ----------------------------------------------------------- | ------------------ |
| `demo_http_requests_total`           | Counter of completed requests; resets when the app restarts | `route`, `status`  |
| `demo_http_requests_in_flight`       | Gauge of requests currently being handled                   | `route`            |
| `demo_http_request_duration_seconds` | Classic histogram of elapsed request durations, in seconds  | `route`            |

The client exposes a classic histogram as cumulative `_bucket{le="..."}` series,
plus `_sum` and `_count`. `le="0.5"` counts **all** durations at most 0.5 seconds,
including those already counted by smaller buckets. The `+Inf` bucket equals the
total observation count. This lab uses classic histograms to make the text format
inspectable; current Prometheus guidance prefers native histograms where the
instrumentation supports them. Their storage and queries differ. See
[Python histograms](https://prometheus.github.io/client_python/instrumenting/histogram/)
and [histogram guidance](https://prometheus.io/docs/practices/histograms/).

Raw URLs, request IDs, and user IDs never become label values in this app. Creating
a new label combination creates another series. The client initializes the four
known route combinations before any requests, so zero counts are visible.
See [Python labels](https://prometheus.github.io/client_python/instrumenting/labels/).

## Read the data with PromQL

Run these expressions in the query page during or just after generating traffic.
Initial rate results need at least two scrapes; use 90 seconds of traffic to fill
the one-minute windows.

```promql
# Did the scrape succeed? An application HTTP 500 can coexist with up == 1.
up{job="demo"}

# Current cumulative counters, including the intentional failures.
demo_http_requests_total{job="demo"}

# Requests per second over a one-minute window, grouped by route.
sum by (route) (rate(demo_http_requests_total{job="demo"}[1m]))

# Fraction of completed requests whose status was 5xx.
sum(rate(demo_http_requests_total{job="demo",status=~"5.."}[1m]))
/
sum(rate(demo_http_requests_total{job="demo"}[1m]))

# Mean latency in seconds over the same window, grouped by route.
sum by (route) (rate(demo_http_request_duration_seconds_sum{job="demo"}[1m]))
/
sum by (route) (rate(demo_http_request_duration_seconds_count{job="demo"}[1m]))

# Estimated p95 latency in seconds across the routes.
histogram_quantile(0.95,
  sum by (le) (rate(demo_http_request_duration_seconds_bucket{job="demo"}[1m]))
)

# Sampled requests currently being handled, rather than completed requests.
sum(demo_http_requests_in_flight{job="demo"})
```

`rate()` handles counter resets and estimates a per-second change over the window.
Apply it to each counter series **before** summing. The one-minute denominator
produces `NaN` when no requests occurred, rather than claiming a zero error ratio.
The gauge is sampled every five seconds and can miss brief work between scrapes.
The p95 is an estimate from bucket counts, not the exact percentile of preserved
individual requests. See [query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/).

Query the same data through the HTTP API:

```sh
curl -fsS --get http://127.0.0.1:19090/api/v1/query \
  --data-urlencode 'query=sum by (route) (rate(demo_http_requests_total{job="demo"}[1m]))'
```

An instant query evaluates an expression at one time. `/api/v1/query_range` repeats
the evaluation between `start` and `end` at the requested `step`; that step is
separate from the scrape interval. See the [HTTP API](https://prometheus.io/docs/prometheus/latest/querying/api/).

## Record an aggregation

`rules.yml` evaluates this expression every five seconds:

```yaml
- record: job_route:demo_http_requests:rate1m
  expr: sum by (job, route) (rate(demo_http_requests_total[1m]))
```

The result is saved as a new series. Query it directly:

```promql
job_route:demo_http_requests:rate1m{job="demo"}
```

The rule keeps `job` and `route`, combining `instance` and `status`. It trades
detail for a simpler reusable result. The lab also records total request rate
and error ratio by job. These recordings begin when the rule is evaluated;
they do not automatically backfill history, replace raw series, or downsample
them. Both recorded and raw samples remain subject to storage retention.
See [recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/).

## Watch an alert and a counter reset

After mixed traffic, open [Alerts](http://127.0.0.1:19090/alerts).
`DemoHighErrorRatio` becomes pending while the error ratio exceeds 20% and total
traffic exceeds 0.1 requests/second. It fires once that condition has held for
20 seconds. The mixed workload produces about 25% failures. To create a more
obvious failure and then recover:

```sh
docker compose exec -T app python traffic.py --seconds 90 --mode failing
docker compose exec -T app python traffic.py --seconds 90 --mode healthy
```

Recovery depends on the one-minute query window and the next evaluation. This lab
has no Alertmanager, so it shows alert state without sending a notification.
See [alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/).

After generating traffic, restart only the app:

```sh
docker compose restart app
# Wait at least one scrape (five seconds), then produce fresh traffic.
docker compose exec -T app python traffic.py --seconds 90 --mode healthy
```

The in-memory counters return to zero. Prometheus retains their earlier samples.
Within five minutes of the restart, inspect:

```promql
resets(demo_http_requests_total{job="demo"}[5m])
```

The routes with earlier nonzero counters should show a reset, provided a scrape
observed the decrease. The route that has always remained at zero cannot show
one. `rate()` accounts for observed resets, but cannot reconstruct work hidden
by an outage or multiple restarts between scrapes.

For scrape failure, `docker compose stop app` makes `up{job="demo"}` become zero;
`DemoTargetDown` fires after 15 seconds of failed scrapes. Use
`docker compose start app` to recover. A failed scrape is different from a
successful scrape reporting application failures.

## Validate and stop

```sh
docker compose run --rm --no-deps --entrypoint /bin/promtool prometheus \
  check config /etc/prometheus/prometheus.yml
docker compose run --rm --no-deps --entrypoint /bin/promtool prometheus \
  check rules /etc/prometheus/rules.yml
docker compose run --rm --no-deps -v "$PWD:/lab:ro" \
  --entrypoint /bin/promtool prometheus test rules /lab/rules.test.yml

# Stop the lab and keep the Prometheus data volume.
docker compose down

# Optional: erase only this lab's saved data and start fresh later.
docker compose down -v
```

The rule tests cover recording outputs, pending versus firing, the strict 20%
threshold, idle traffic, and sustained scrape failure. See
[unit testing rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/).

This is a single-process teaching app with simulated delays and failures. It
omits service discovery, Grafana, remote storage, authentication, and notification
routing. Its ports stay local and its volume belongs to the `prometheus-lab`
Compose project. Restarting the app resets its metrics; stopping and starting
Prometheus preserves its data in that volume.

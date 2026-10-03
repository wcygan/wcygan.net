SELECT version();

SELECT count() AS events FROM lab.events;

SELECT
    country,
    count() AS events,
    countIf(event_type = 'buy') AS purchases,
    sum(revenue_cents) AS revenue_cents
FROM lab.events
GROUP BY country
ORDER BY country;

-- Inspect granules selected by the sorting key, then run the same query.
EXPLAIN indexes = 1
SELECT sum(revenue_cents)
FROM lab.events
WHERE country = 'US'
  AND event_time >= toDateTime('2026-09-02 00:00:00', 'UTC')
  AND event_time < toDateTime('2026-09-03 00:00:00', 'UTC')
SETTINGS use_query_condition_cache = 0,
         use_skip_indexes_on_data_read = 0;

SELECT
    count() AS events,
    sum(revenue_cents) AS revenue_cents
FROM lab.events
WHERE country = 'US'
  AND event_time >= toDateTime('2026-09-02 00:00:00', 'UTC')
  AND event_time < toDateTime('2026-09-03 00:00:00', 'UTC');

SELECT
    partition,
    name,
    rows,
    marks,
    formatReadableSize(data_compressed_bytes) AS compressed,
    formatReadableSize(data_uncompressed_bytes) AS uncompressed
FROM system.parts
WHERE database = 'lab' AND table = 'events' AND active
ORDER BY name;

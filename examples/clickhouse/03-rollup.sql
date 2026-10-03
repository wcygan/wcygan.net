CREATE TABLE lab.daily_events
(
    day Date,
    country LowCardinality(String),
    events UInt64,
    revenue_cents UInt64
)
ENGINE = SummingMergeTree
PARTITION BY toYYYYMM(day)
ORDER BY (country, day);

-- This view sees future insert blocks. It does not backfill existing rows.
CREATE MATERIALIZED VIEW lab.daily_events_mv TO lab.daily_events AS
SELECT
    toDate(event_time) AS day,
    country,
    count() AS events,
    sum(revenue_cents) AS revenue_cents
FROM lab.events
GROUP BY country, day;

SELECT sum(events) AS rollup_events_before_insert FROM lab.daily_events;

-- IDs 1,000,000 through 1,099,999 are a separate second batch.
INSERT INTO lab.events
SELECT
    number AS event_id,
    toDateTime('2026-09-01 00:00:00', 'UTC')
        + toIntervalSecond(number % 2592000) AS event_time,
    toUInt32(number % 10000) AS user_id,
    ['DE', 'GB', 'US'][1 + number % 3] AS country,
    multiIf(number % 10 = 0, 'buy', number % 10 < 3, 'cart', 'view') AS event_type,
    if(number % 10 = 0, number % 9900 + 100, 0) AS revenue_cents
FROM numbers(1000000, 100000);

-- Always aggregate the target at read time; background merges may be incomplete.
SELECT
    day,
    country,
    sum(events) AS events,
    sum(revenue_cents) AS revenue_cents
FROM lab.daily_events
GROUP BY country, day
ORDER BY day, country;

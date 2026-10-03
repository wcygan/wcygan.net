CREATE DATABASE lab;

CREATE TABLE lab.events
(
    event_id UInt64,
    event_time DateTime('UTC'),
    user_id UInt32,
    country LowCardinality(String),
    event_type LowCardinality(String),
    revenue_cents UInt64
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (country, event_time);

-- Synthetic events: one million rows, starting at a fixed UTC timestamp.
INSERT INTO lab.events
SELECT
    number AS event_id,
    toDateTime('2026-09-01 00:00:00', 'UTC')
        + toIntervalSecond(number % 2592000) AS event_time,
    toUInt32(number % 10000) AS user_id,
    ['DE', 'GB', 'US'][1 + number % 3] AS country,
    multiIf(number % 10 = 0, 'buy', number % 10 < 3, 'cart', 'view') AS event_type,
    if(number % 10 = 0, number % 9900 + 100, 0) AS revenue_cents
FROM numbers(1000000);

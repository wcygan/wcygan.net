SELECT
    count() AS raw_events,
    countIf(event_id >= 1000000) AS second_batch_events
FROM lab.events;

SELECT
    sum(events) AS rollup_events,
    sum(revenue_cents) AS rollup_revenue_cents
FROM lab.daily_events;

-- Compare per-day, per-country totals against ONLY the second insert batch.
-- Zero mismatches verifies that the view processed the newly inserted rows.
SELECT count() AS mismatched_groups
FROM
(
    SELECT
        country,
        day,
        sum(event_delta) AS event_difference,
        sum(revenue_delta) AS revenue_difference
    FROM
    (
        SELECT
            country,
            toDate(event_time) AS day,
            toInt64(count()) AS event_delta,
            toInt64(sum(revenue_cents)) AS revenue_delta
        FROM lab.events
        WHERE event_id >= 1000000
        GROUP BY country, day
        UNION ALL
        SELECT
            country,
            day,
            -toInt64(sum(events)) AS event_delta,
            -toInt64(sum(revenue_cents)) AS revenue_delta
        FROM lab.daily_events
        GROUP BY country, day
    )
    GROUP BY country, day
    HAVING event_difference != 0 OR revenue_difference != 0
);

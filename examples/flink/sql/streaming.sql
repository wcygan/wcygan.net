SET 'execution.runtime-mode' = 'streaming';
SET 'parallelism.default' = '1';
SET 'pipeline.name' = 'New-file discovery';
SET 'execution.checkpointing.interval' = '5 s';
SET 'execution.checkpointing.storage' = 'filesystem';
SET 'execution.checkpointing.dir' = 'file:///lab/state/checkpoints/';

CREATE TABLE arriving_orders (
  order_id BIGINT,
  customer STRING,
  amount_cents BIGINT
) WITH (
  'connector' = 'filesystem',
  'path' = 'file:///lab/state/input/',
  'source.monitor-interval' = '2 s',
  'format' = 'json'
);

CREATE TABLE cleaned_orders (
  order_id BIGINT,
  customer STRING,
  amount_cents BIGINT
) WITH (
  'connector' = 'filesystem',
  'path' = 'file:///lab/state/output/streaming/',
  'format' = 'csv',
  'sink.rolling-policy.rollover-interval' = '5 s',
  'sink.rolling-policy.check-interval' = '1 s'
);

INSERT INTO cleaned_orders
SELECT order_id, LOWER(customer), amount_cents
FROM arriving_orders
WHERE amount_cents > 0;

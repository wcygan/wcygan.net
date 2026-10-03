SET 'execution.runtime-mode' = 'batch';
SET 'table.dml-sync' = 'true';
SET 'parallelism.default' = '1';
SET 'pipeline.name' = 'Customer totals';

CREATE TABLE orders (
  order_id BIGINT,
  customer STRING,
  amount_cents BIGINT
) WITH (
  'connector' = 'filesystem',
  'path' = 'file:///lab/data/orders.jsonl',
  'format' = 'json'
);

CREATE TABLE customer_totals (
  customer STRING,
  order_count BIGINT,
  total_cents BIGINT
) WITH (
  'connector' = 'filesystem',
  'path' = 'file:///lab/state/output/batch/',
  'format' = 'csv'
);

INSERT INTO customer_totals
SELECT customer, COUNT(*), SUM(amount_cents)
FROM orders
GROUP BY customer;

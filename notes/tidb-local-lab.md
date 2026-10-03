# TiDB local lab

Expanded companion to the visual draft. Commands are researched, not executed.

## Start the cluster

**TiUP Playground** runs the components on one machine. The [quick start](https://docs.pingcap.com/tidb/stable/quick-start-with-tidb/) supports macOS and Linux. Have a MySQL command-line client available. These commands are pinned to [v8.5.8](https://docs.pingcap.com/tidb/stable/release-8.5.8/) and follow the documented interfaces; I have not run this database lab yet.

Install TiUP using PingCAP's installer, then open a new terminal so its environment changes take effect:

```sh
curl --proto '=https' --tlsv1.2 -sSf \
  https://tiup-mirrors.pingcap.com/install.sh | sh

# In a new terminal:
tiup --version
tiup list tidb
tiup playground v8.5.8 --db 1 --pd 1 --kv 1 --tiflash 1
```

Keep that terminal running. This small topology lets you inspect SQL and both storage engines. It cannot demonstrate replica failover. For a larger local topology, the quick start recommends at least **10 GiB RAM and four CPU cores**; multiple processes on the same host still share its failure domain.

TiFlash has additional [platform and CPU requirements](https://docs.pingcap.com/tidb/stable/hardware-and-software-requirements/), including AVX2 on Linux AMD64. If it cannot run on your machine, start with `--tiflash 0` and skip the TiFlash steps.

In a second terminal, connect using the address printed by Playground, normally:

```sh
mysql --comments --host 127.0.0.1 --port 4000 -u root
```

`--comments` preserves the optimizer hints used later. Create a tiny table:

```sql
SELECT VERSION();
CREATE DATABASE tidb_learning;
USE tidb_learning;

CREATE TABLE orders (
  id BIGINT PRIMARY KEY CLUSTERED,
  customer_id BIGINT NOT NULL,
  status VARCHAR(16) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  INDEX customer_idx (customer_id)
);

INSERT INTO orders VALUES
  (1, 101, 'paid', 29.00),
  (2, 102, 'paid', 49.00),
  (3, 101, 'pending', 19.00),
  (4, 103, 'paid', 99.00),
  (5, 104, 'cancelled', 15.00),
  (6, 102, 'paid', 39.00);

SELECT * FROM orders WHERE id = 4;

BEGIN;
UPDATE orders SET status = 'paid' WHERE id = 3;
COMMIT;

SELECT status, COUNT(*) AS orders, SUM(amount) AS revenue
FROM orders
GROUP BY status
ORDER BY status;
```

The point lookup should return order `4`, with amount `99.00`. After the transaction, the grouped query should report five paid orders totaling `235.00`, and one cancelled order totaling `15.00`.

### Inspect an index lookup

Use a hint to make the small dataset's index path inspectable:

```sql
EXPLAIN
SELECT /*+ USE_INDEX(orders, customer_idx) */ id, amount
FROM orders
WHERE customer_id = 101;

SHOW WARNINGS;
```

Look for `IndexLookUp`, its index scan, and its table-row scan. The requested `amount` requires the row lookup. Then change the projection to `id, customer_id`; those values are available from this secondary index, so an index-only path becomes possible. Exact plans depend on the optimizer and version. [Optimizer hints](https://docs.pingcap.com/tidb/stable/optimizer-hints/) and [`EXPLAIN`](https://docs.pingcap.com/tidb/stable/explain-overview/) help interpret the result.

### Enable and query TiFlash

Create a columnar replica and check its status:

```sql
ALTER TABLE orders SET TIFLASH REPLICA 1;

SELECT TABLE_SCHEMA, TABLE_NAME, REPLICA_COUNT, AVAILABLE, PROGRESS
FROM information_schema.tiflash_replica
WHERE TABLE_SCHEMA = 'tidb_learning'
  AND TABLE_NAME = 'orders';
```

Repeat the status query until `AVAILABLE = 1`. `PROGRESS` runs from zero to one; availability means the replica can be queried, rather than promising every later write has already arrived. See [creating TiFlash replicas](https://docs.pingcap.com/tidb/stable/create-tiflash-replicas/).

Compare the same aggregation through each engine:

```sql
EXPLAIN
SELECT /*+ READ_FROM_STORAGE(TIKV[orders]) */
  status, SUM(amount)
FROM orders
GROUP BY status;
SHOW WARNINGS;

EXPLAIN
SELECT /*+ READ_FROM_STORAGE(TIFLASH[orders]) */
  status, SUM(amount)
FROM orders
GROUP BY status;
SHOW WARNINGS;
```

Look for `tikv` or `tiflash` in the plan's task column. A hint can be ignored if the requested engine is unavailable or unsuitable, so inspect warnings too. Remove `EXPLAIN` to execute the queries and compare results. Six rows are enough to explore engine selection; a performance comparison needs a larger, representative workload.

Press **Ctrl+C** in the Playground terminal to stop. Untagged Playground data is disposable. To keep the experiment between runs, start it with `--tag tidb-learning`. The [Playground reference](https://docs.pingcap.com/tidb/stable/tiup-playground/) covers instance management.

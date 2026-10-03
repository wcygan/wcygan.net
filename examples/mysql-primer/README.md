# MySQL bookstore lab

This disposable lab runs MySQL Community Server 8.4 in Docker. It needs Docker
with the Compose plugin; no host MySQL installation is needed. Run the commands
from this directory. The passwords in `compose.yaml` are only for this local
exercise. `practice` has access to the `bookstore` database; reserve `root` for
administration. This is not a production configuration.

## Start and connect

```sh
docker compose up -d --wait --wait-timeout 180
docker compose exec mysql mysql -upractice -p bookstore
```

Enter `practice-local-only` when prompted. The health check waits for an
authenticated TCP query against an initialized table. A desktop SQL client can
connect to `127.0.0.1:3307`, database `bookstore`, using the same practice account.
If that port is occupied, change `3307` in `compose.yaml` before starting.

The first start imports `schema.sql`. Later starts preserve the named volume and
do not rerun that file. The two inventory stocks are the _remaining_ copies;
seeded historical orders are already accounted for. Each order in this small
schema contains a single book, with a quantity and recorded price in integer
cents. A real store would usually separate orders from line items.

## Read across tables

Run these statements at the `mysql>` prompt; omit the prompt itself.

```sql
SELECT o.id, c.name, i.title, o.total_cents
FROM orders AS o
JOIN customers AS c ON c.id = o.customer_id
JOIN inventory AS i ON i.id = o.book_id
ORDER BY o.id;

SELECT c.name, SUM(o.total_cents) AS spent_cents
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY c.id;
```

The join returns three rows: 101 / Ada / SQL Basics / 2900, 102 / Ada / Reliable
Systems / 4500, and 103 / Lin / SQL Basics / 2900. The totals are Ada 7400 cents
and Lin 2900 cents.

```sql
SHOW INDEX FROM orders;
EXPLAIN SELECT * FROM orders WHERE customer_id = 1;
```

`orders_customer_id` is already declared in the schema. MySQL needs an index
for the foreign key and would create one if absent. With only three orders,
the optimizer may choose a table scan; this is a plan inspection, not an index
speed benchmark.

## Preview a checkout

Keep these steps in the same connection. First lock the book and reserve one
copy. The conditional update also prevents a negative stock.

```sql
START TRANSACTION;
SELECT stock, unit_price_cents
FROM inventory WHERE id = 1 FOR UPDATE;
UPDATE inventory SET stock = stock - 1
WHERE id = 1 AND stock > 0;
SELECT ROW_COUNT() AS reserved;
```

On the fresh seed, the read returns stock 2 and price 2900, and `reserved` is 1.
Continue only if `reserved` is 1. If it is 0, run `ROLLBACK;` and stop: the book
cannot be reserved. An application must check the affected row count and roll
back on zero or on any error before inserting an order. Retrying transactions
also needs its own handling for deadlocks and duplicate requests.

```sql
INSERT INTO orders (id, customer_id, book_id, quantity, total_cents)
VALUES (104, 2, 1, 1, 2900);
SELECT stock FROM inventory WHERE id = 1;
SELECT COUNT(*) AS order_count FROM orders;
ROLLBACK;
SELECT stock FROM inventory WHERE id = 1;
SELECT COUNT(*) AS order_count FROM orders;
```

Inside the transaction, stock is 1 and the order count is 4. After rollback,
stock is 2 and the count is 3. Repeat both steps with the same row-count check
and replace `ROLLBACK` with `COMMIT` to keep the checkout. Stock becomes 1 and
the count becomes 4. The manual ID 104 is for this exercise; a second insertion
with the same ID fails. A foreign key requires a real customer and book, and
the `CHECK` constraints reject negative stock and nonpositive quantities/prices.

## See a row lock

Open two SQL clients using the same connection command. In the first, run:

```sql
START TRANSACTION;
SELECT stock FROM inventory WHERE id = 1 FOR UPDATE;
```

In the second, run the same statements. Its locking read waits. Run `ROLLBACK;`
in the first; the second read can now return. Run `ROLLBACK;` in the second too.
Neither connection changed stock. This demonstrates contention; it is not a
timing benchmark. Release the first transaction promptly.

## Automated verification and persistence

Exit the SQL client with `exit`. Run the assertions against a fresh lab; this
commits order 104, so do not run it after completing the checkout above.

```sh
docker compose exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql -u"$MYSQL_USER" "$MYSQL_DATABASE"' \
  < verify.sql
```

It asserts joins and totals, expected constraint rejections, the empty-stock
guard, rollback, and commit. A failure exits with a SQL error. Success ends
with `PASS: joins, totals, constraints, empty stock, rollback, commit`, stock 1,
and 4 orders.

```sh
docker compose down
docker compose up -d --wait --wait-timeout 180
docker compose exec mysql mysql -upractice -p bookstore
```

At the SQL prompt, verify the committed state survived container replacement:

```sql
SELECT stock FROM inventory WHERE id = 1;
SELECT COUNT(*) AS order_count FROM orders;
```

Expect stock 1 and 4 orders. `docker compose down` keeps the volume. To stop
and erase only this lab's data, exit the client and run:

```sh
docker compose down -v
```

The next start imports a fresh seed. Removing the volume deletes this lab's
saved work.

## Tested environment

Verified with Docker Engine 29.4.0 and Compose 5.1.2 on arm64. The `mysql:8.4`
image resolved to MySQL Community Server 8.4.11 and digest
`sha256:6ea90827b1100f8f2ae306a539f86d2c264a26ed435a2a9f75551dd5c3aeb242`.
The tag follows 8.4 patch releases; use `mysql:8.4@sha256:6ea90827b1100f8f2ae306a539f86d2c264a26ed435a2a9f75551dd5c3aeb242`
instead of `mysql:8.4` in the Compose file to reproduce this image exactly.
The tested query plan used `orders_customer_id` with access type `ref` and an
estimate of two rows. The SQL assertions passed, and container replacement
preserved the committed stock of 1 and four orders. A second connection's
locking read waited until the first released its row lock; both rolled back
without changing data.

Sources: [Docker Official Image](https://hub.docker.com/_/mysql),
[MySQL locking reads](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html),
[foreign keys](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html),
and [check constraints](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html).

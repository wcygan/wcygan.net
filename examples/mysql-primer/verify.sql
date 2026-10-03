-- Run once against the fresh seed. This test deliberately commits order 104.
USE bookstore;

SELECT VERSION() AS server_version, CURRENT_USER() AS account;

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

EXPLAIN SELECT * FROM orders WHERE customer_id = 1;

DELIMITER //
CREATE PROCEDURE verify_lab()
BEGIN
  DECLARE rejected BOOLEAN DEFAULT FALSE;
  DECLARE remaining INT;
  DECLARE price INT;
  DECLARE changed INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF (SELECT COUNT(*) FROM customers) <> 2
    OR (SELECT COUNT(*) FROM inventory) <> 2
    OR (SELECT COUNT(*) FROM orders) <> 3
    OR (SELECT stock FROM inventory WHERE id = 1) <> 2
    OR (SELECT SUM(total_cents) FROM orders WHERE customer_id = 1) <> 7400
    OR (SELECT SUM(total_cents) FROM orders WHERE customer_id = 2) <> 2900
    OR (SELECT COUNT(*) FROM orders o
        JOIN customers c ON c.id = o.customer_id
        JOIN inventory i ON i.id = o.book_id) <> 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unexpected seed; reset the lab first';
  END IF;

  -- Only these specific constraint errors count as expected rejection.
  START TRANSACTION;
  BEGIN
    DECLARE CONTINUE HANDLER FOR 3819 SET rejected = TRUE;
    UPDATE inventory SET stock = -1 WHERE id = 1;
  END;
  IF NOT rejected THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Negative stock was accepted';
  END IF;
  SET rejected = FALSE;
  BEGIN
    DECLARE CONTINUE HANDLER FOR 1452 SET rejected = TRUE;
    INSERT INTO orders VALUES (999, 999, 1, 1, 2900);
  END;
  IF NOT rejected THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Missing customer was accepted';
  END IF;
  SET rejected = FALSE;
  BEGIN
    DECLARE CONTINUE HANDLER FOR 1062 SET rejected = TRUE;
    INSERT INTO orders VALUES (101, 1, 1, 1, 2900);
  END;
  IF NOT rejected THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Duplicate order was accepted';
  END IF;
  ROLLBACK;

  -- An empty inventory must reserve zero rows and create no order.
  START TRANSACTION;
  UPDATE inventory SET stock = 0 WHERE id = 1;
  SELECT stock INTO remaining FROM inventory WHERE id = 1 FOR UPDATE;
  UPDATE inventory SET stock = stock - 1 WHERE id = 1 AND stock > 0;
  SET changed = ROW_COUNT();
  IF remaining <> 0 OR changed <> 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Empty-stock guard failed';
  END IF;
  ROLLBACK;

  -- Preview a checkout, then undo both writes.
  START TRANSACTION;
  SELECT stock, unit_price_cents INTO remaining, price
    FROM inventory WHERE id = 1 FOR UPDATE;
  UPDATE inventory SET stock = stock - 1 WHERE id = 1 AND stock > 0;
  SET changed = ROW_COUNT();
  IF remaining < 1 OR changed <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Could not reserve the book';
  END IF;
  INSERT INTO orders VALUES (104, 2, 1, 1, price);
  IF (SELECT stock FROM inventory WHERE id = 1) <> 1
    OR (SELECT COUNT(*) FROM orders) <> 4 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transaction preview failed';
  END IF;
  ROLLBACK;
  IF (SELECT stock FROM inventory WHERE id = 1) <> 2
    OR (SELECT COUNT(*) FROM orders) <> 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Rollback did not restore both tables';
  END IF;

  -- Repeat the checkout and keep both writes.
  START TRANSACTION;
  SELECT stock, unit_price_cents INTO remaining, price
    FROM inventory WHERE id = 1 FOR UPDATE;
  UPDATE inventory SET stock = stock - 1 WHERE id = 1 AND stock > 0;
  SET changed = ROW_COUNT();
  IF remaining < 1 OR changed <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Could not reserve the book';
  END IF;
  INSERT INTO orders VALUES (104, 2, 1, 1, price);
  COMMIT;
  IF (SELECT stock FROM inventory WHERE id = 1) <> 1
    OR (SELECT COUNT(*) FROM orders) <> 4
    OR (SELECT total_cents FROM orders WHERE id = 104) <> 2900 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Commit did not preserve both writes';
  END IF;

  SELECT 'PASS: joins, totals, constraints, empty stock, rollback, commit' AS result;
  SELECT stock AS remaining_stock FROM inventory WHERE id = 1;
  SELECT COUNT(*) AS committed_orders FROM orders;
END//
DELIMITER ;

CALL verify_lab();
DROP PROCEDURE verify_lab;

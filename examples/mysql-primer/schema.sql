USE bookstore;

CREATE TABLE customers (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE inventory (
  id INT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  stock INT NOT NULL CHECK (stock >= 0),
  unit_price_cents INT NOT NULL CHECK (unit_price_cents > 0)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT NOT NULL,
  book_id INT NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  total_cents INT NOT NULL CHECK (total_cents > 0),
  INDEX orders_customer_id (customer_id),
  INDEX orders_book_id (book_id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (book_id) REFERENCES inventory(id)
) ENGINE=InnoDB;

INSERT INTO customers VALUES (1, 'Ada'), (2, 'Lin');
INSERT INTO inventory VALUES
  (1, 'SQL Basics', 2, 2900),
  (2, 'Reliable Systems', 5, 4500);
INSERT INTO orders VALUES
  (101, 1, 1, 1, 2900),
  (102, 1, 2, 1, 4500),
  (103, 2, 1, 1, 2900);

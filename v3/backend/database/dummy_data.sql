-- Tally v3 — dummy data generator for performance / load testing.
-- =============================================================================
-- Populates book #1 with a large, self-consistent dataset:
--   * 120 products, each with 120–300 stock/sale transactions  (~25k rows)
--   * 120 customers, each with 500–700 balance entries          (~72k rows)
--
-- Every denormalised field the app reads (current_stock, totals, last prices,
-- balance_after, total_balance, transaction_count, last_transaction_time, …) is
-- computed here exactly the way index.php's recompute* functions would, so the
-- data is internally consistent and the UI shows correct values without any
-- recompute pass.
--
-- Times are stored in UTC (matches config.php / schema.sql convention) and are
-- spread realistically into the past.
--
-- HOW TO RUN
--   mysql -u root -p < dummy_data.sql          (from this folder)
--   -- or paste into phpMyAdmin's SQL tab (it understands DELIMITER).
--
-- WARNING (idempotency): running this DELETES all existing products and
-- customers (and their children) for book #1 first, so it is safe to re-run but
-- it will wipe any manual test data you created in that book.
--
-- Tuning: change the arguments to the final CALL — see its signature below.
-- Generating ~97k rows typically takes a few seconds to a couple of minutes.
-- =============================================================================

USE tally_v3;
SET time_zone = '+00:00';

-- Make sure the target book exists (schema.sql already seeds it).
INSERT IGNORE INTO books (id, name, type) VALUES (1, 'Samad''s Store', 'store');

DROP PROCEDURE IF EXISTS seed_dummy_data;

DELIMITER $$

CREATE PROCEDURE seed_dummy_data(
    IN p_book_id      INT,   -- target book
    IN p_products     INT,   -- number of products to create
    IN p_prod_txn_min INT,   -- min transactions per product
    IN p_prod_txn_max INT,   -- max transactions per product
    IN p_customers    INT,   -- number of customers to create
    IN p_cust_txn_min INT,   -- min balance entries per customer
    IN p_cust_txn_max INT    -- max balance entries per customer
)
BEGIN
    DECLARE i INT;
    DECLARE j INT;
    DECLARE v_count INT;

    -- Product loop state
    DECLARE v_prod_id       INT;
    DECLARE v_type          VARCHAR(10);
    DECLARE v_qty           DECIMAL(14,3);
    DECLARE v_price         DECIMAL(14,2);
    DECLARE v_stock         DECIMAL(14,3);
    DECLARE v_in            DECIMAL(14,3);
    DECLARE v_out           DECIMAL(14,3);
    DECLARE v_last_purchase DECIMAL(14,2);
    DECLARE v_last_sale     DECIMAL(14,2);
    DECLARE v_qtype         VARCHAR(20);

    -- Customer loop state
    DECLARE v_cust_id       CHAR(36);
    DECLARE v_amount        DECIMAL(14,2);
    DECLARE v_signed        DECIMAL(14,2);
    DECLARE v_balance       DECIMAL(14,2);
    DECLARE v_ctype         VARCHAR(10);

    DECLARE v_ts            DATETIME;

    -- --- Clean prior data for this book (children first; FK cascades are off
    --     during the bulk insert below, so we delete explicitly by book_id) ---
    DELETE FROM customer_balance_history WHERE book_id = p_book_id;
    DELETE FROM product_transactions     WHERE book_id = p_book_id;
    DELETE FROM customers                WHERE book_id = p_book_id;
    DELETE FROM products                 WHERE book_id = p_book_id;

    -- Bulk-load speed: one transaction, relaxed per-row checks.
    SET autocommit = 0;
    SET unique_checks = 0;
    SET foreign_key_checks = 0;
    START TRANSACTION;

    -- =====================================================================
    -- Products + product_transactions
    -- =====================================================================
    SET i = 1;
    WHILE i <= p_products DO
        SET v_qtype = ELT(1 + FLOOR(RAND() * 5), 'piece', 'kg', 'liter', 'packet', 'cartoon');

        INSERT INTO products (book_id, name, quantity_type, image_url)
        VALUES (p_book_id, CONCAT('Product ', LPAD(i, 4, '0')), v_qtype, NULL);
        SET v_prod_id = LAST_INSERT_ID();

        SET v_count = p_prod_txn_min + FLOOR(RAND() * (p_prod_txn_max - p_prod_txn_min + 1));
        SET v_stock = 0; SET v_in = 0; SET v_out = 0;
        SET v_last_purchase = NULL; SET v_last_sale = NULL;
        SET v_ts = DATE_SUB(UTC_TIMESTAMP(), INTERVAL v_count * 3 HOUR);

        SET j = 1;
        WHILE j <= v_count DO
            SET v_ts    = DATE_ADD(v_ts, INTERVAL (1 + FLOOR(RAND() * 120)) MINUTE);
            SET v_qty   = ROUND(1 + RAND() * 50, 3);
            SET v_price = ROUND(5 + RAND() * 500, 2);

            -- First entry is always a stock-in; otherwise only sell what exists,
            -- so stock_after never goes negative (realistic + valid).
            IF j = 1 OR v_stock < v_qty OR RAND() < 0.5 THEN
                SET v_type          = 'stock';
                SET v_stock         = v_stock + v_qty;
                SET v_in            = v_in + v_qty;
                SET v_last_purchase = v_price;
            ELSE
                SET v_type      = 'sale';
                SET v_stock     = v_stock - v_qty;
                SET v_out       = v_out + v_qty;
                SET v_last_sale = v_price;
            END IF;

            INSERT INTO product_transactions
                (product_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, created_at)
            VALUES
                (v_prod_id, p_book_id, v_type, v_qty, v_price, ROUND(v_qty * v_price, 2), v_stock,
                 IF(RAND() < 0.2, ELT(1 + FLOOR(RAND() * 3), 'restock', 'bulk sale', 'correction'), NULL),
                 v_ts);

            SET j = j + 1;
        END WHILE;

        UPDATE products
        SET current_stock         = v_stock,
            total_stock_in        = v_in,
            total_stock_out       = v_out,
            last_purchase_price   = v_last_purchase,
            last_sale_price       = v_last_sale,
            transaction_count     = v_count,
            last_transaction_time = v_ts
        WHERE id = v_prod_id;

        SET i = i + 1;
    END WHILE;

    -- =====================================================================
    -- Customers + customer_balance_history
    -- =====================================================================
    SET i = 1;
    WHILE i <= p_customers DO
        SET v_cust_id = UUID();

        INSERT INTO customers (id, book_id, name, nickname, phone, address)
        VALUES (v_cust_id, p_book_id, CONCAT('Customer ', LPAD(i, 4, '0')), '',
                CONCAT('017', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
                CONCAT('House ', 1 + FLOOR(RAND() * 200), ', Road ', 1 + FLOOR(RAND() * 30), ', Dhaka'));

        SET v_count = p_cust_txn_min + FLOOR(RAND() * (p_cust_txn_max - p_cust_txn_min + 1));
        SET v_balance = 0;
        SET v_ts = DATE_SUB(UTC_TIMESTAMP(), INTERVAL v_count * 2 HOUR);

        SET j = 1;
        WHILE j <= v_count DO
            SET v_ts     = DATE_ADD(v_ts, INTERVAL (1 + FLOOR(RAND() * 90)) MINUTE);
            SET v_amount = ROUND(10 + RAND() * 2000, 2);

            IF RAND() < 0.5 THEN
                SET v_ctype  = 'paid';
                SET v_signed = v_amount;
            ELSE
                SET v_ctype  = 'unpaid';
                SET v_signed = -v_amount;
            END IF;
            SET v_balance = v_balance + v_signed;

            INSERT INTO customer_balance_history
                (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, expression, timestamp)
            VALUES
                (UUID(), v_cust_id, p_book_id, v_amount, v_ctype, v_signed, v_balance,
                 IF(RAND() < 0.3, ELT(1 + FLOOR(RAND() * 4), 'Cash payment', 'Due', 'Adjustment', 'Order'), NULL),
                 NULL, v_ts);

            SET j = j + 1;
        END WHILE;

        UPDATE customers
        SET total_balance         = v_balance,
            transaction_count     = v_count,
            last_transaction_time = v_ts
        WHERE id = v_cust_id;

        SET i = i + 1;
    END WHILE;

    COMMIT;
    SET foreign_key_checks = 1;
    SET unique_checks = 1;
    SET autocommit = 1;
END$$

DELIMITER ;

-- seed_dummy_data(book, products, prodTxnMin, prodTxnMax, customers, custTxnMin, custTxnMax)
CALL seed_dummy_data(1, 120, 120, 300, 120, 500, 700);

-- Tidy up: the generator procedure is no longer needed after seeding.
DROP PROCEDURE IF EXISTS seed_dummy_data;

-- Quick summary of what was generated.
SELECT
    (SELECT COUNT(*) FROM products                 WHERE book_id = 1) AS products,
    (SELECT COUNT(*) FROM product_transactions     WHERE book_id = 1) AS product_transactions,
    (SELECT COUNT(*) FROM customers                WHERE book_id = 1) AS customers,
    (SELECT COUNT(*) FROM customer_balance_history WHERE book_id = 1) AS balance_entries;

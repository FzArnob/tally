-- Tally v3 — realistic dummy data for demo + performance/load testing.
-- =============================================================================
-- Creates TWO demo books and fills them with realistic, self-consistent data:
--
--   "Samad General Store"  (store)
--     * 120 products — real grocery names across 3 brands, each with a public
--       sample image (loremflickr, keyword-matched), 120–300 stock/sale txns.
--     * 120 customers — real-looking names, 500–700 balance entries each.
--
--   "Personal Finance"     (personal)
--     * 15 categories (5 income / 10 expense).
--     * ~6,000 income/expense transactions with realistic notes & amounts.
--
-- Every denormalised field the app reads (current_stock, totals, balance_after,
-- transaction_count, category transaction_count, last_transaction_time, …) is
-- written exactly as index.php's recompute* helpers would, so the UI shows
-- correct values with no recompute pass. Times are UTC (matches config.php),
-- spread into the past, and never in the future.
--
-- IMAGES: product image_url points at https://loremflickr.com/<w>/<h>/<keyword>
-- (public, Creative-Commons Flickr photos; ?lock=<id> keeps each stable). No API
-- key needed. Swap the base URL below if you prefer another source.
--
-- HOW TO RUN
--   mysql -u root -p tally_v3 < dummy_data.sql
--   -- or paste into phpMyAdmin's SQL tab (it understands DELIMITER).
--
-- IDEMPOTENT: the two demo books are deleted by name and recreated on each run
-- (cascades wipe their children). Your other books are left untouched.
--
-- Tuning: change the two CALL argument lists near the bottom. Generating the
-- full set (~100k rows) typically takes a few seconds to a couple of minutes.
-- =============================================================================

USE tally_v3;
SET time_zone = '+00:00';

-- Re-runnable: drop previous demo books (FK cascades remove all their children).
DELETE FROM books WHERE name IN ('Samad General Store', 'Personal Finance');

INSERT INTO books (name, type) VALUES ('Samad General Store', 'store');
SET @store_book = LAST_INSERT_ID();
INSERT INTO books (name, type) VALUES ('Personal Finance', 'personal');
SET @personal_book = LAST_INSERT_ID();

DROP PROCEDURE IF EXISTS seed_store;
DROP PROCEDURE IF EXISTS seed_personal;

DELIMITER $$

-- ===========================================================================
-- STORE: realistic products (+images) and customers with balance history.
-- ===========================================================================
CREATE PROCEDURE seed_store(
    IN p_book         INT,
    IN p_products     INT,   -- products to create (uses 40 item types x brands)
    IN p_prod_txn_min INT,
    IN p_prod_txn_max INT,
    IN p_customers    INT,
    IN p_cust_txn_min INT,
    IN p_cust_txn_max INT
)
BEGIN
    DECLARE i INT; DECLARE j INT; DECLARE v_count INT;
    DECLARE n_base INT; DECLARE n_first INT; DECLARE n_last INT;

    DECLARE v_prod INT; DECLARE v_base VARCHAR(60); DECLARE v_unit VARCHAR(20);
    DECLARE v_kw VARCHAR(60); DECLARE v_brand VARCHAR(20);
    DECLARE v_type VARCHAR(10); DECLARE v_qty DECIMAL(14,3); DECLARE v_price DECIMAL(14,2);
    DECLARE v_stock DECIMAL(14,3); DECLARE v_in DECIMAL(14,3); DECLARE v_out DECIMAL(14,3);
    DECLARE v_lastp DECIMAL(14,2); DECLARE v_lasts DECIMAL(14,2);

    DECLARE v_first VARCHAR(40); DECLARE v_last VARCHAR(40); DECLARE v_cid CHAR(36);
    DECLARE v_amount DECIMAL(14,2); DECLARE v_signed DECIMAL(14,2); DECLARE v_balance DECIMAL(14,2);
    DECLARE v_ctype VARCHAR(10);
    DECLARE v_ts DATETIME;

    -- Real grocery/general-store item types: name, unit, image keyword.
    DROP TEMPORARY TABLE IF EXISTS _base;
    CREATE TEMPORARY TABLE _base (idx INT PRIMARY KEY AUTO_INCREMENT, base VARCHAR(60), unit VARCHAR(20), kw VARCHAR(60));
    INSERT INTO _base (base, unit, kw) VALUES
        ('Basmati Rice','kg','rice'),        ('Miniket Rice','kg','rice'),
        ('Soybean Oil','liter','cooking-oil'),('Mustard Oil','liter','mustard-oil'),
        ('Sugar','kg','sugar'),              ('Salt','kg','salt'),
        ('Wheat Flour','kg','flour'),        ('Red Lentils','kg','lentils'),
        ('Chickpeas','kg','chickpeas'),      ('Farm Eggs','piece','eggs'),
        ('Fresh Milk','liter','milk'),       ('Milk Powder','packet','milk-powder'),
        ('Green Tea','packet','tea'),        ('Black Tea','packet','tea'),
        ('Biscuits','packet','biscuit'),     ('Bath Soap','piece','soap'),
        ('Shampoo','piece','shampoo'),       ('Toothpaste','piece','toothpaste'),
        ('Detergent Powder','packet','detergent'),('Onion','kg','onion'),
        ('Potato','kg','potato'),            ('Garlic','kg','garlic'),
        ('Ginger','kg','ginger'),            ('Chili Powder','packet','chili'),
        ('Turmeric Powder','packet','turmeric'),('Cumin Powder','packet','cumin'),
        ('Coriander Powder','packet','coriander'),('Instant Noodles','packet','noodles'),
        ('Pasta','packet','pasta'),          ('Tomato Ketchup','piece','ketchup'),
        ('Honey','piece','honey'),           ('Butter','piece','butter'),
        ('Cheese Slice','packet','cheese'),  ('Yogurt','piece','yogurt'),
        ('Chocolate Bar','piece','chocolate'),('Potato Chips','packet','chips'),
        ('Mango Juice','liter','juice'),     ('Drinking Water','liter','water-bottle'),
        ('Cola Drink','liter','soda'),       ('Coffee','packet','coffee');
    SET n_base = (SELECT COUNT(*) FROM _base);

    DROP TEMPORARY TABLE IF EXISTS _first;
    CREATE TEMPORARY TABLE _first (idx INT PRIMARY KEY AUTO_INCREMENT, nm VARCHAR(40));
    INSERT INTO _first (nm) VALUES
        ('Rahim'),('Karim'),('Jamal'),('Kamal'),('Farhan'),('Tanvir'),('Sabbir'),('Rakib'),
        ('Sumon'),('Arif'),('Nayeem'),('Imran'),('Shohel'),('Masud'),('Rasel'),('Jahid'),
        ('Mamun'),('Robiul'),('Faruk'),('Bappi');
    SET n_first = (SELECT COUNT(*) FROM _first);

    DROP TEMPORARY TABLE IF EXISTS _last;
    CREATE TEMPORARY TABLE _last (idx INT PRIMARY KEY AUTO_INCREMENT, nm VARCHAR(40));
    INSERT INTO _last (nm) VALUES
        ('Uddin'),('Islam'),('Ahmed'),('Hossain'),('Rahman'),('Khan'),('Chowdhury'),('Sarkar'),
        ('Molla'),('Mia'),('Sheikh'),('Talukder'),('Bhuiyan'),('Akter'),('Alam'),('Haque'),
        ('Miah'),('Sikder'),('Barua'),('Karim');
    SET n_last = (SELECT COUNT(*) FROM _last);

    SET autocommit = 0; SET unique_checks = 0; SET foreign_key_checks = 0;
    START TRANSACTION;

    -- ---- Products (item type cycles fastest; brand every n_base products) ----
    SET i = 1;
    WHILE i <= p_products DO
        SELECT base, unit, kw INTO v_base, v_unit, v_kw FROM _base WHERE idx = ((i - 1) % n_base) + 1;
        SET v_brand = ELT(1 + (FLOOR((i - 1) / n_base) % 6), 'Fresh', 'Pure', 'Royal', 'Daily', 'Prime', 'Gold');

        INSERT INTO products (book_id, name, quantity_type, image_url)
        VALUES (p_book, CONCAT(v_brand, ' ', v_base), v_unit,
                CONCAT('https://loremflickr.com/320/320/', v_kw, '?lock=', i));
        SET v_prod = LAST_INSERT_ID();

        SET v_count = p_prod_txn_min + FLOOR(RAND() * (p_prod_txn_max - p_prod_txn_min + 1));
        SET v_stock = 0; SET v_in = 0; SET v_out = 0; SET v_lastp = NULL; SET v_lasts = NULL;
        SET v_ts = DATE_SUB(UTC_TIMESTAMP(), INTERVAL v_count * 3 HOUR);

        SET j = 1;
        WHILE j <= v_count DO
            SET v_ts    = DATE_ADD(v_ts, INTERVAL (1 + FLOOR(RAND() * 120)) MINUTE);
            SET v_qty   = ROUND(1 + RAND() * 30, 3);
            SET v_price = ROUND(20 + RAND() * 1200, 2);

            -- First entry is a stock-in; only sell what exists (stock stays >= 0).
            IF j = 1 OR v_stock < v_qty OR RAND() < 0.5 THEN
                SET v_type = 'stock'; SET v_stock = v_stock + v_qty; SET v_in = v_in + v_qty; SET v_lastp = v_price;
            ELSE
                SET v_type = 'sale';  SET v_stock = v_stock - v_qty; SET v_out = v_out + v_qty; SET v_lasts = v_price;
            END IF;

            INSERT INTO product_transactions
                (product_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, created_at)
            VALUES
                (v_prod, p_book, v_type, v_qty, v_price, ROUND(v_qty * v_price, 2), v_stock,
                 IF(RAND() < 0.2, ELT(1 + FLOOR(RAND() * 3), 'restock', 'bulk sale', 'correction'), NULL),
                 v_ts);
            SET j = j + 1;
        END WHILE;

        UPDATE products
        SET current_stock = v_stock, total_stock_in = v_in, total_stock_out = v_out,
            last_purchase_price = v_lastp, last_sale_price = v_lasts,
            transaction_count = v_count, last_transaction_time = v_ts
        WHERE id = v_prod;

        SET i = i + 1;
    END WHILE;

    -- ---- Customers + balance history ----
    SET i = 1;
    WHILE i <= p_customers DO
        SELECT nm INTO v_first FROM _first WHERE idx = ((i - 1) % n_first) + 1;
        SELECT nm INTO v_last  FROM _last  WHERE idx = (FLOOR((i - 1) / n_first) % n_last) + 1;
        SET v_cid = UUID();

        INSERT INTO customers (id, book_id, name, nickname, phone, address)
        VALUES (v_cid, p_book, CONCAT(v_first, ' ', v_last), '',
                CONCAT('017', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
                CONCAT('House ', 1 + FLOOR(RAND() * 200), ', Road ', 1 + FLOOR(RAND() * 30), ', Dhaka'));

        SET v_count = p_cust_txn_min + FLOOR(RAND() * (p_cust_txn_max - p_cust_txn_min + 1));
        SET v_balance = 0;
        SET v_ts = DATE_SUB(UTC_TIMESTAMP(), INTERVAL v_count * 2 HOUR);

        SET j = 1;
        WHILE j <= v_count DO
            SET v_ts     = DATE_ADD(v_ts, INTERVAL (1 + FLOOR(RAND() * 90)) MINUTE);
            SET v_amount = ROUND(20 + RAND() * 3000, 2);

            IF RAND() < 0.5 THEN
                SET v_ctype = 'paid';   SET v_signed = v_amount;
            ELSE
                SET v_ctype = 'unpaid'; SET v_signed = -v_amount;
            END IF;
            SET v_balance = v_balance + v_signed;

            INSERT INTO customer_balance_history
                (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, expression, timestamp)
            VALUES
                (UUID(), v_cid, p_book, v_amount, v_ctype, v_signed, v_balance,
                 IF(RAND() < 0.35, ELT(1 + FLOOR(RAND() * 6),
                     'Grocery purchase', 'Monthly bill', 'Advance payment', 'Due cleared', 'Cash payment', 'Credit sale'), NULL),
                 NULL, v_ts);
            SET j = j + 1;
        END WHILE;

        UPDATE customers
        SET total_balance = v_balance, transaction_count = v_count, last_transaction_time = v_ts
        WHERE id = v_cid;

        SET i = i + 1;
    END WHILE;

    COMMIT;
    SET foreign_key_checks = 1; SET unique_checks = 1; SET autocommit = 1;

    DROP TEMPORARY TABLE _base; DROP TEMPORARY TABLE _first; DROP TEMPORARY TABLE _last;
END$$

-- ===========================================================================
-- PERSONAL: income/expense categories + realistic transactions.
-- ===========================================================================
CREATE PROCEDURE seed_personal(
    IN p_book INT,
    IN p_txns INT           -- number of transactions to create
)
BEGIN
    DECLARE i INT;
    DECLARE v_cat INT; DECLARE v_cname VARCHAR(100); DECLARE v_type VARCHAR(10);
    DECLARE v_amin DECIMAL(14,2); DECLARE v_amax DECIMAL(14,2);
    DECLARE v_notes VARCHAR(255); DECLARE v_ncnt INT;
    DECLARE v_amount DECIMAL(14,2); DECLARE v_signed DECIMAL(14,2); DECLARE v_note VARCHAR(120);
    DECLARE v_pick VARCHAR(10); DECLARE v_ts DATETIME; DECLARE v_step INT;

    -- Category pool: category row + its amount range + '|'-separated note bank.
    DROP TEMPORARY TABLE IF EXISTS _cat;
    CREATE TEMPORARY TABLE _cat (
        cat_id INT, cat_name VARCHAR(100), type VARCHAR(10),
        amin DECIMAL(14,2), amax DECIMAL(14,2), notes VARCHAR(255), ncnt INT
    );

    -- Income
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Salary', 'income');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Salary', 'income', 30000, 60000, 'Monthly salary|Salary credited', 2);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Freelance', 'income');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Freelance', 'income', 5000, 25000, 'Client payment|Design work|Freelance project', 3);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Business', 'income');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Business', 'income', 2000, 30000, 'Shop sales|Business income|Reseller profit', 3);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Interest', 'income');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Interest', 'income', 200, 3000, 'Bank interest|Savings interest', 2);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Gift', 'income');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Gift', 'income', 500, 10000, 'Gift received|Eid gift|Bonus', 3);

    -- Expense
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Groceries', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Groceries', 'expense', 300, 3000, 'Weekly groceries|Supermarket|Vegetables & fruits', 3);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Food', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Food', 'expense', 80, 700, 'Lunch|Snacks|Breakfast|Tea & coffee', 4);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Dining', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Dining', 'expense', 300, 2500, 'Restaurant|Dinner out|Cafe', 3);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Bills', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Bills', 'expense', 500, 5000, 'Electricity bill|Internet bill|Water bill|Gas bill', 4);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Transport', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Transport', 'expense', 30, 600, 'Bus fare|Rickshaw|Ride share|Fuel', 4);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Shopping', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Shopping', 'expense', 500, 8000, 'Clothes|Electronics|Household items', 3);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Health', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Health', 'expense', 200, 5000, 'Medicine|Doctor visit|Pharmacy', 3);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Entertainment', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Entertainment', 'expense', 150, 2000, 'Movie|Subscription|Games', 3);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Rent', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Rent', 'expense', 8000, 20000, 'House rent', 1);
    INSERT INTO categories (book_id, name, type) VALUES (p_book, 'Education', 'expense');
    INSERT INTO _cat VALUES (LAST_INSERT_ID(), 'Education', 'expense', 1000, 12000, 'Course fee|Books|Tuition', 3);

    SET autocommit = 0; SET unique_checks = 0; SET foreign_key_checks = 0;
    START TRANSACTION;

    -- Running timestamp across ~2 years so ordering by id matches chronology.
    SET v_ts = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 800 DAY);
    SET v_step = GREATEST(1, FLOOR((760 * 86400 * 2) / p_txns));

    SET i = 1;
    WHILE i <= p_txns DO
        -- ~20% of entries are income: fewer but larger (salary/freelance/…),
        -- which keeps the net balance comfortably positive (a saver's book).
        SET v_pick = IF(RAND() < 0.20, 'income', 'expense');
        SELECT cat_id, cat_name, type, amin, amax, notes, ncnt
          INTO v_cat, v_cname, v_type, v_amin, v_amax, v_notes, v_ncnt
          FROM _cat WHERE type = v_pick ORDER BY RAND() LIMIT 1;

        SET v_amount = ROUND(v_amin + RAND() * (v_amax - v_amin), 2);
        SET v_signed = IF(v_type = 'income', v_amount, -v_amount);
        SET v_note   = SUBSTRING_INDEX(SUBSTRING_INDEX(v_notes, '|', 1 + FLOOR(RAND() * v_ncnt)), '|', -1);
        SET v_ts     = DATE_ADD(v_ts, INTERVAL (1 + FLOOR(RAND() * v_step)) SECOND);

        INSERT INTO personal_transactions
            (book_id, category_id, category_name, type, note, amount, signed_amount, timestamp)
        VALUES
            (p_book, v_cat, v_cname, v_type, v_note, v_amount, v_signed, v_ts);

        SET i = i + 1;
    END WHILE;

    COMMIT;
    SET foreign_key_checks = 1; SET unique_checks = 1; SET autocommit = 1;

    -- Denormalise each category's transaction_count (write-time, like the API).
    UPDATE categories c
    SET c.transaction_count = (SELECT COUNT(*) FROM personal_transactions p WHERE p.category_id = c.id)
    WHERE c.book_id = p_book;

    DROP TEMPORARY TABLE _cat;
END$$

DELIMITER ;

-- seed_store(book, products, prodTxnMin, prodTxnMax, customers, custTxnMin, custTxnMax)
CALL seed_store(@store_book, 120, 120, 300, 120, 500, 700);

-- seed_personal(book, transactions)
CALL seed_personal(@personal_book, 6000);

DROP PROCEDURE IF EXISTS seed_store;
DROP PROCEDURE IF EXISTS seed_personal;

-- Quick summary of what was generated.
SELECT
    (SELECT COUNT(*) FROM products                 WHERE book_id = @store_book)    AS products,
    (SELECT COUNT(*) FROM product_transactions     WHERE book_id = @store_book)    AS product_txns,
    (SELECT COUNT(*) FROM customers                WHERE book_id = @store_book)    AS customers,
    (SELECT COUNT(*) FROM customer_balance_history WHERE book_id = @store_book)    AS balance_entries,
    (SELECT COUNT(*) FROM categories               WHERE book_id = @personal_book) AS categories,
    (SELECT COUNT(*) FROM personal_transactions    WHERE book_id = @personal_book) AS personal_txns;

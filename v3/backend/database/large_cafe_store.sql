-- Tally v3 — large, realistic demo data for "Cafe Afree" (a luxury cafe).
-- =============================================================================
-- Seeds ONE store book for the real signed-in owner so it shows up on login,
-- at load-testing scale with realistic names and info:
--
--   ~54 materials  — real cafe raw stock (beans, dairy, meats, bakery, packaging),
--                    each with 1–3 stock/used moves and a keyword-matched image.
--   ~110 products  — ~72% manufacture (made from linked materials, SALE-ONLY) and
--                    ~28% ready-made (bought & resold), across named "collections".
--   ~520 customers — realistic Bangladeshi names, upscale Dhaka addresses, phones.
--   ~1000+ balance entries per customer (running advance/due tabs).
--
-- Every denormalised field the app reads is recomputed at the end exactly as
-- index.php's recompute* helpers would. Per-row running values (stock_after /
-- balance_after) are generated correctly; manufacture stock columns stay NULL.
--
-- IMAGES: image_url points at https://loremflickr.com/<w>/<h>/<tags> (public,
-- keyword-matched Flickr photos; ?lock=<id> keeps each stable). No API key needed.
--
-- HOW TO RUN
--   mysql -u root -p tally_v3 < dummy_data.sql   (understands DELIMITER)
--   -- or paste into phpMyAdmin's SQL tab.
--
-- IDEMPOTENT: the "Cafe Afree" book is deleted by name and recreated on each run
-- (FK cascades wipe its children). Other books are left untouched.
--
-- TUNING: change the CALL argument list near the bottom. The full set (~530k
-- rows) typically takes ~1–3 minutes.
-- =============================================================================

USE tally_v3;
SET time_zone = '+00:00';
-- Match the tables' collation so string variables (e.g. @owner) compare cleanly.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Recursive CTE generates each customer's 1000+ entries in one batch.
SET SESSION cte_max_recursion_depth = 100000;

-- Owner — the real signed-in account, so the book appears when they log in.
SET @owner := '09cd48c2-21e8-43b0-8ecf-4ff643e5764c';
INSERT INTO users (id, google_id, email, name, picture)
VALUES (@owner, '103449430925193454062', 'fz.arnob@gmail.com', 'FZ. Arnob',
        'https://lh3.googleusercontent.com/a/ACg8ocLczb7SoEAffjFTm8fdu9hPnGxWjcvscFCAqn2onW6HzzRuPKKs=s96-c')
ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), picture = VALUES(picture);

-- Re-runnable: drop a previous "Cafe Afree" (cascades remove all its children).
DELETE FROM books WHERE user_id = @owner AND name = 'Cafe Afree';
INSERT INTO books (user_id, name, type) VALUES (@owner, 'Cafe Afree', 'store');
SET @book := LAST_INSERT_ID();

DROP PROCEDURE IF EXISTS seed_cafe;

DELIMITER $$

CREATE PROCEDURE seed_cafe(
    IN p_book      INT,
    IN p_products  INT,   -- products to create (base pool x collection prefixes)
    IN p_ptx_min   INT,   -- product transactions per product (min/max)
    IN p_ptx_max   INT,
    IN p_customers INT,   -- customers to create
    IN p_ctx_min   INT,   -- balance entries per customer (min/max)
    IN p_ctx_max   INT
)
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE i INT; DECLARE j INT; DECLARE v_count INT; DECLARE v_k INT;
    DECLARE n_pbase INT; DECLARE n_first INT; DECLARE n_last INT;
    DECLARE v_base VARCHAR(60); DECLARE v_unit VARCHAR(20); DECLARE v_ptype VARCHAR(15); DECLARE v_kw VARCHAR(60);
    DECLARE v_prefix VARCHAR(20); DECLARE v_prod INT; DECLARE v_type VARCHAR(10);
    DECLARE v_qty DECIMAL(14,3); DECLARE v_uq DECIMAL(14,3);
    DECLARE v_price DECIMAL(14,2); DECLARE v_p DECIMAL(14,2); DECLARE v_stock DECIMAL(14,3);
    DECLARE v_mid INT;
    DECLARE v_first VARCHAR(40); DECLARE v_last VARCHAR(40); DECLARE v_cid CHAR(36);
    DECLARE v_area VARCHAR(30);
    DECLARE v_ts DATETIME; DECLARE v_start DATETIME; DECLARE v_step INT;
    DECLARE cur_mat CURSOR FOR SELECT id FROM materials WHERE book_id = p_book ORDER BY id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    -- ---- Reference pools -----------------------------------------------------
    -- Materials: real cafe raw stock (name, unit, image keyword).
    DROP TEMPORARY TABLE IF EXISTS _mat;
    CREATE TEMPORARY TABLE _mat (idx INT PRIMARY KEY AUTO_INCREMENT, nm VARCHAR(60), unit VARCHAR(20), kw VARCHAR(60));
    INSERT INTO _mat (nm, unit, kw) VALUES
        ('Arabica Beans','kg','coffee,beans'),        ('Robusta Beans','kg','coffee,beans'),
        ('Espresso Blend','kg','coffee,roast'),       ('Decaf Beans','kg','coffee,beans'),
        ('Ethiopia Single Origin','kg','coffee,beans'),('Colombia Single Origin','kg','coffee,beans'),
        ('Cocoa Powder','kg','cocoa,powder'),         ('Matcha Powder','kg','matcha'),
        ('Chai Spice Mix','kg','spice,tea'),          ('Vanilla Syrup','liter','vanilla,syrup'),
        ('Caramel Syrup','liter','caramel,syrup'),    ('Hazelnut Syrup','liter','hazelnut,syrup'),
        ('Chocolate Syrup','liter','chocolate,syrup'),('Whole Milk','liter','milk'),
        ('Skimmed Milk','liter','milk'),              ('Oat Milk','liter','oat,milk'),
        ('Almond Milk','liter','almond,milk'),        ('Soy Milk','liter','soy,milk'),
        ('Fresh Cream','liter','cream,dairy'),        ('Whipping Cream','liter','cream'),
        ('Butter','kg','butter'),                     ('Cheddar Cheese','kg','cheese'),
        ('Mozzarella','kg','mozzarella'),             ('Cream Cheese','kg','cream,cheese'),
        ('Farm Eggs','piece','eggs'),                 ('Wheat Flour','kg','flour'),
        ('Cane Sugar','kg','sugar'),                  ('Brown Sugar','kg','brown,sugar'),
        ('Raw Honey','liter','honey'),                ('Sea Salt','kg','salt'),
        ('Brioche Bun','piece','burger,bun'),         ('Sourdough Loaf','piece','sourdough,bread'),
        ('Baguette','piece','baguette'),              ('Croissant Dough','kg','pastry,dough'),
        ('Tortilla Wrap','piece','tortilla'),         ('Beef Patty','kg','raw,beef'),
        ('Chicken Breast','kg','raw,chicken'),        ('Smoked Bacon','kg','bacon'),
        ('Turkey Ham','kg','ham'),                    ('Salmon Fillet','kg','salmon'),
        ('Lettuce','kg','lettuce'),                   ('Tomato','kg','tomato'),
        ('Red Onion','kg','onion'),                   ('Avocado','piece','avocado'),
        ('Coffee Cups','piece','coffee,cup'),         ('Paper Napkins','packet','napkin'),
        ('Takeaway Lids','piece','cup,lid'),          ('Paper Straws','packet','paper,straw'),
        ('Ice Cubes','kg','ice'),                     ('Sparkling Water','liter','sparkling,water'),
        ('Juicing Oranges','kg','orange'),            ('Lemon','kg','lemon'),
        ('Mint Leaves','kg','mint'),                  ('Espresso Machine','piece','espresso,machine');

    -- Products: base name, unit, type, image keyword.
    DROP TEMPORARY TABLE IF EXISTS _pbase;
    CREATE TEMPORARY TABLE _pbase (idx INT PRIMARY KEY AUTO_INCREMENT, base VARCHAR(60), unit VARCHAR(20), ptype VARCHAR(15), kw VARCHAR(60));
    INSERT INTO _pbase (base, unit, ptype, kw) VALUES
        ('Espresso','piece','manufacture','espresso'),          ('Double Espresso','piece','manufacture','espresso'),
        ('Americano','piece','manufacture','americano,coffee'), ('Cappuccino','piece','manufacture','cappuccino'),
        ('Caffe Latte','piece','manufacture','latte'),          ('Flat White','piece','manufacture','flat,white,coffee'),
        ('Cortado','piece','manufacture','cortado,coffee'),     ('Macchiato','piece','manufacture','macchiato'),
        ('Cafe Mocha','piece','manufacture','mocha'),           ('Affogato','piece','manufacture','affogato'),
        ('Cold Brew','piece','manufacture','cold,brew,coffee'), ('Iced Latte','piece','manufacture','iced,latte'),
        ('Matcha Latte','piece','manufacture','matcha,latte'),  ('Chai Latte','piece','manufacture','chai,latte'),
        ('Hot Chocolate','piece','manufacture','hot,chocolate'),('Caramel Frappe','piece','manufacture','frappe'),
        ('Wagyu Beef Burger','piece','manufacture','gourmet,burger'), ('Grilled Chicken Sandwich','piece','manufacture','chicken,sandwich'),
        ('Club Sandwich','piece','manufacture','club,sandwich'),('Smoked Salmon Bagel','piece','manufacture','salmon,bagel'),
        ('Chicken Panini','piece','manufacture','panini'),      ('Beef Wrap','piece','manufacture','beef,wrap'),
        ('Butter Croissant','piece','manufacture','croissant'), ('Avocado Toast','piece','manufacture','avocado,toast'),
        ('Caesar Salad','piece','manufacture','caesar,salad'),  ('Truffle Pasta','piece','manufacture','pasta'),
        ('Artisan Biscuit','packet','ready_made','biscuit,cookie'), ('Roasted Coffee Beans','packet','ready_made','coffee,beans,bag'),
        ('Tiramisu Jar','piece','ready_made','dessert,tiramisu'),('Belgian Chocolate Bar','piece','ready_made','chocolate,bar'),
        ('Blueberry Muffin','piece','ready_made','muffin'),     ('Cookie Box','packet','ready_made','cookie,box'),
        ('Herbal Tea Box','packet','ready_made','tea,box'),     ('Honey Jar','piece','ready_made','honey,jar'),
        ('Granola Pack','packet','ready_made','granola'),       ('Macaron Box','packet','ready_made','macaron');
    SET n_pbase = (SELECT COUNT(*) FROM _pbase);

    -- Realistic Bangladeshi names (mixed) + upscale Dhaka areas.
    DROP TEMPORARY TABLE IF EXISTS _first;
    CREATE TEMPORARY TABLE _first (idx INT PRIMARY KEY AUTO_INCREMENT, nm VARCHAR(40));
    INSERT INTO _first (nm) VALUES
        ('Ayesha'),('Tanvir'),('Zara'),('Rafiq'),('Nadia'),('Imran'),('Sadia'),('Farhan'),
        ('Rumana'),('Shakib'),('Nusrat'),('Arif'),('Tania'),('Mahmud'),('Sabrina'),('Riyad'),
        ('Farzana'),('Kamrul'),('Sohana'),('Tahmid'),('Ishrat'),('Nayeem'),('Anika'),('Rezaul'),
        ('Maliha'),('Jubayer'),('Samira'),('Fahim'),('Lamia'),('Naimur'),('Tasnim'),('Adnan');
    SET n_first = (SELECT COUNT(*) FROM _first);

    DROP TEMPORARY TABLE IF EXISTS _last;
    CREATE TEMPORARY TABLE _last (idx INT PRIMARY KEY AUTO_INCREMENT, nm VARCHAR(40));
    INSERT INTO _last (nm) VALUES
        ('Rahman'),('Ahmed'),('Chowdhury'),('Islam'),('Hossain'),('Khan'),('Karim'),('Akter'),
        ('Haque'),('Sarker'),('Bhuiyan'),('Alam'),('Kabir'),('Siddiqui'),('Mahmud'),('Nasrin'),
        ('Talukder'),('Sheikh'),('Uddin'),('Molla'),('Chakraborty'),('Das'),('Roy'),('Barua'),
        ('Sultana'),('Jahan'),('Parvez'),('Aziz'),('Mia'),('Kabir');
    SET n_last = (SELECT COUNT(*) FROM _last);

    DROP TEMPORARY TABLE IF EXISTS _area;
    CREATE TEMPORARY TABLE _area (idx INT PRIMARY KEY AUTO_INCREMENT, nm VARCHAR(30));
    INSERT INTO _area (nm) VALUES
        ('Gulshan 1'),('Gulshan 2'),('Banani'),('Baridhara'),('Dhanmondi'),('Uttara'),
        ('Bashundhara R/A'),('Niketan'),('Mohakhali DOHS'),('Banani DOHS');

    SET foreign_key_checks = 0; SET unique_checks = 0;

    -- ---- Materials + their stock/used moves ---------------------------------
    INSERT INTO materials (book_id, name, quantity_type, image_url)
    SELECT p_book, nm, unit, CONCAT('https://loremflickr.com/320/320/', kw, '?lock=', 400 + idx)
    FROM _mat ORDER BY idx;

    OPEN cur_mat;
    mat_loop: LOOP
        FETCH cur_mat INTO v_mid;
        IF done THEN LEAVE mat_loop; END IF;

        SET v_ts  = DATE_SUB(UTC_TIMESTAMP(), INTERVAL (40 + FLOOR(RAND() * 20)) DAY);
        SET v_qty = ROUND(10 + RAND() * 200, 3);
        SET v_p   = ROUND(10 + RAND() * 1500, 2);
        SET v_stock = v_qty;
        INSERT INTO material_transactions (material_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, created_at)
        VALUES (v_mid, p_book, 'stock', v_qty, v_p, ROUND(v_qty * v_p, 2), v_stock, 'Initial stock', v_ts);

        IF RAND() < 0.6 THEN
            SET v_ts = DATE_ADD(v_ts, INTERVAL (5 + FLOOR(RAND() * 20)) DAY);
            SET v_uq = ROUND(v_stock * (0.1 + RAND() * 0.4), 3);
            SET v_stock = v_stock - v_uq;
            INSERT INTO material_transactions (material_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, created_at)
            VALUES (v_mid, p_book, 'used', v_uq, 0, 0, v_stock, 'Consumption', v_ts);
        END IF;
        IF RAND() < 0.3 THEN
            SET v_ts  = DATE_ADD(v_ts, INTERVAL (2 + FLOOR(RAND() * 10)) DAY);
            SET v_qty = ROUND(10 + RAND() * 100, 3);
            SET v_p   = ROUND(10 + RAND() * 1500, 2);
            SET v_stock = v_stock + v_qty;
            INSERT INTO material_transactions (material_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, created_at)
            VALUES (v_mid, p_book, 'stock', v_qty, v_p, ROUND(v_qty * v_p, 2), v_stock, 'Restock', v_ts);
        END IF;
    END LOOP;
    CLOSE cur_mat;

    -- ---- Products (+ material links + transactions) -------------------------
    SET i = 1;
    WHILE i <= p_products DO
        SELECT base, unit, ptype, kw INTO v_base, v_unit, v_ptype, v_kw
          FROM _pbase WHERE idx = ((i - 1) % n_pbase) + 1;
        SET v_prefix = ELT(1 + (FLOOR((i - 1) / n_pbase) % 6), 'Signature','Classic','Grand','Reserve','Deluxe','Royal');

        INSERT INTO products (book_id, name, quantity_type, product_type, image_url)
        VALUES (p_book, CONCAT(v_prefix, ' ', v_base), v_unit, v_ptype,
                CONCAT('https://loremflickr.com/320/320/', v_kw, '?lock=', 500 + i));
        SET v_prod = LAST_INSERT_ID();

        -- Manufacture products link 2–5 random materials.
        IF v_ptype = 'manufacture' THEN
            SET v_k = 2 + FLOOR(RAND() * 4);
            INSERT INTO product_materials (product_id, material_id, book_id)
            SELECT v_prod, m.id, p_book FROM materials m WHERE m.book_id = p_book ORDER BY RAND() LIMIT v_k;
        END IF;

        SET v_count = p_ptx_min + FLOOR(RAND() * (p_ptx_max - p_ptx_min + 1));
        SET v_ts    = DATE_SUB(UTC_TIMESTAMP(), INTERVAL v_count * 6 HOUR);

        IF v_ptype = 'manufacture' THEN
            -- Sale-only; stock_after is NULL (a manufacture product's stock is unknown).
            SET v_price = ROUND(180 + RAND() * 900, 2);
            SET j = 1;
            WHILE j <= v_count DO
                SET v_ts  = DATE_ADD(v_ts, INTERVAL (30 + FLOOR(RAND() * 300)) MINUTE);
                SET v_qty = 1 + FLOOR(RAND() * 30);
                SET v_p   = ROUND(v_price * (0.9 + RAND() * 0.2), 2);
                INSERT INTO product_transactions (product_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, created_at)
                VALUES (v_prod, p_book, 'sale', v_qty, v_p, ROUND(v_qty * v_p, 2), NULL, NULL, v_ts);
                SET j = j + 1;
            END WHILE;
        ELSE
            -- Ready-made: stock-in / sale with running stock (never negative).
            SET v_stock = 0;
            SET j = 1;
            WHILE j <= v_count DO
                SET v_ts  = DATE_ADD(v_ts, INTERVAL (30 + FLOOR(RAND() * 300)) MINUTE);
                SET v_qty = ROUND(1 + RAND() * 15, 3);
                IF j = 1 OR v_stock < v_qty OR RAND() < 0.45 THEN
                    SET v_type = 'stock'; SET v_qty = ROUND(40 + RAND() * 120, 3);
                    SET v_stock = v_stock + v_qty; SET v_p = ROUND(50 + RAND() * 900, 2);
                ELSE
                    SET v_type = 'sale'; SET v_stock = v_stock - v_qty; SET v_p = ROUND(80 + RAND() * 1200, 2);
                END IF;
                INSERT INTO product_transactions (product_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, created_at)
                VALUES (v_prod, p_book, v_type, v_qty, v_p, ROUND(v_qty * v_p, 2), v_stock,
                        IF(RAND() < 0.15, ELT(1 + FLOOR(RAND() * 3), 'restock', 'bulk order', 'correction'), NULL), v_ts);
                SET j = j + 1;
            END WHILE;
        END IF;

        SET i = i + 1;
    END WHILE;

    -- ---- Customers + running balance history (set-based per customer) --------
    SET i = 1;
    WHILE i <= p_customers DO
        SELECT nm INTO v_first FROM _first WHERE idx = ((i - 1) % n_first) + 1;
        SELECT nm INTO v_last  FROM _last  WHERE idx = (FLOOR((i - 1) / n_first) % n_last) + 1;
        SELECT nm INTO v_area  FROM _area  WHERE idx = ((i - 1) % 10) + 1;
        SET v_cid = UUID();

        INSERT INTO customers (id, book_id, name, nickname, phone, address)
        VALUES (v_cid, p_book, CONCAT(v_first, ' ', v_last),
                IF(RAND() < 0.4, v_first, ''),
                CONCAT('+88017', LPAD(FLOOR(RAND() * 100000000), 8, '0')),
                CONCAT('House ', 1 + FLOOR(RAND() * 120), ', Road ', 1 + FLOOR(RAND() * 30), ', ', v_area, ', Dhaka'));

        SET v_count = p_ctx_min + FLOOR(RAND() * (p_ctx_max - p_ctx_min + 1));
        -- Spread this customer's entries across ~2 years, ending near now.
        SET v_step  = GREATEST(1, FLOOR((730 * 24 * 60) / v_count));
        SET v_start = DATE_SUB(UTC_TIMESTAMP(), INTERVAL (v_count * v_step) MINUTE);

        -- One batch per customer. Amounts are DETERMINISTIC (CRC32 of id+row) so
        -- the value is identical everywhere it's read, keeping the running
        -- balance_after (window SUM) exactly consistent with signed_amount.
        INSERT INTO customer_balance_history
            (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, expression, timestamp)
        WITH RECURSIVE nums(n) AS (
            SELECT 1 UNION ALL SELECT n + 1 FROM nums WHERE n < v_count
        ),
        base AS (
            SELECT n,
                   ROUND(20 + (CRC32(CONCAT(v_cid, ':', n)) % 500000) / 100.0, 2) AS amt,
                   (CRC32(CONCAT('p:', v_cid, ':', n)) % 2)  AS is_paid,
                   (CRC32(CONCAT('r:', v_cid, ':', n)) % 12) AS rsel
            FROM nums
        )
        SELECT
            UUID(), v_cid, p_book, amt,
            IF(is_paid = 1, 'paid', 'unpaid'),
            IF(is_paid = 1, amt, -amt),
            SUM(IF(is_paid = 1, amt, -amt)) OVER (ORDER BY n ROWS UNBOUNDED PRECEDING),
            IF(rsel < 7, ELT(rsel + 1,
                'Table reservation', 'Event catering', 'Coffee tab', 'Weekend brunch',
                'High tea', 'Corporate meeting', 'Advance payment'), NULL),
            NULL,
            DATE_ADD(v_start, INTERVAL n * v_step MINUTE)
        FROM base
        ORDER BY n;

        SET i = i + 1;
    END WHILE;

    SET foreign_key_checks = 1; SET unique_checks = 1;

    -- ---- Recompute denormalised fields (mirrors index.php recompute*) --------
    UPDATE materials m SET
        current_stock       = (SELECT COALESCE(SUM(IF(t.type='stock', t.quantity, -t.quantity)), 0) FROM material_transactions t WHERE t.material_id = m.id),
        total_stock_in      = (SELECT COALESCE(SUM(IF(t.type='stock', t.quantity, 0)), 0)            FROM material_transactions t WHERE t.material_id = m.id),
        total_stock_out     = (SELECT COALESCE(SUM(IF(t.type IN ('sale','used'), t.quantity, 0)), 0) FROM material_transactions t WHERE t.material_id = m.id),
        last_purchase_price = (SELECT t.price_per_unit FROM material_transactions t WHERE t.material_id = m.id AND t.type='stock' ORDER BY t.id DESC LIMIT 1),
        last_sale_price     = (SELECT t.price_per_unit FROM material_transactions t WHERE t.material_id = m.id AND t.type='sale'  ORDER BY t.id DESC LIMIT 1),
        transaction_count   = (SELECT COUNT(*)         FROM material_transactions t WHERE t.material_id = m.id),
        last_transaction_time = (SELECT MAX(t.created_at) FROM material_transactions t WHERE t.material_id = m.id)
    WHERE m.book_id = p_book;

    UPDATE products p SET
        current_stock       = (SELECT COALESCE(SUM(IF(t.type='stock', t.quantity, -t.quantity)), 0) FROM product_transactions t WHERE t.product_id = p.id),
        total_stock_in      = (SELECT COALESCE(SUM(IF(t.type='stock', t.quantity, 0)), 0)            FROM product_transactions t WHERE t.product_id = p.id),
        total_stock_out     = (SELECT COALESCE(SUM(IF(t.type='sale',  t.quantity, 0)), 0)            FROM product_transactions t WHERE t.product_id = p.id),
        last_purchase_price = (SELECT t.price_per_unit FROM product_transactions t WHERE t.product_id = p.id AND t.type='stock' ORDER BY t.id DESC LIMIT 1),
        last_sale_price     = (SELECT t.price_per_unit FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale'  ORDER BY t.id DESC LIMIT 1),
        transaction_count   = (SELECT COUNT(*)         FROM product_transactions t WHERE t.product_id = p.id),
        last_transaction_time = (SELECT MAX(t.created_at) FROM product_transactions t WHERE t.product_id = p.id)
    WHERE p.book_id = p_book AND p.product_type = 'ready_made';

    UPDATE products p SET
        current_stock       = NULL, total_stock_in = NULL, last_purchase_price = NULL,
        total_stock_out     = (SELECT COALESCE(SUM(t.quantity), 0) FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale'),
        last_sale_price     = (SELECT t.price_per_unit FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale' ORDER BY t.id DESC LIMIT 1),
        transaction_count   = (SELECT COUNT(*)         FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale'),
        last_transaction_time = (SELECT MAX(t.created_at) FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale')
    WHERE p.book_id = p_book AND p.product_type = 'manufacture';

    UPDATE customers c SET
        total_balance         = (SELECT COALESCE(SUM(h.signed_amount), 0) FROM customer_balance_history h WHERE h.customer_id = c.id),
        transaction_count     = (SELECT COUNT(*)          FROM customer_balance_history h WHERE h.customer_id = c.id),
        last_transaction_time = (SELECT MAX(h.timestamp)  FROM customer_balance_history h WHERE h.customer_id = c.id)
    WHERE c.book_id = p_book;

    DROP TEMPORARY TABLE _mat; DROP TEMPORARY TABLE _pbase;
    DROP TEMPORARY TABLE _first; DROP TEMPORARY TABLE _last; DROP TEMPORARY TABLE _area;
END$$

DELIMITER ;

-- seed_cafe(book, products, prodTxnMin, prodTxnMax, customers, custTxnMin, custTxnMax)
CALL seed_cafe(@book, 110, 30, 90, 520, 1000, 1050);

DROP PROCEDURE IF EXISTS seed_cafe;

-- Quick summary of what was generated.
SELECT
  (SELECT COUNT(*) FROM materials              WHERE book_id = @book) AS materials,
  (SELECT COUNT(*) FROM material_transactions  WHERE book_id = @book) AS material_txns,
  (SELECT COUNT(*) FROM products               WHERE book_id = @book) AS products,
  (SELECT SUM(product_type='manufacture')      FROM products WHERE book_id = @book) AS manufacture,
  (SELECT COUNT(*) FROM product_materials      WHERE book_id = @book) AS material_links,
  (SELECT COUNT(*) FROM product_transactions   WHERE book_id = @book) AS product_txns,
  (SELECT COUNT(*) FROM customers              WHERE book_id = @book) AS customers,
  (SELECT COUNT(*) FROM customer_balance_history WHERE book_id = @book) AS balance_entries;

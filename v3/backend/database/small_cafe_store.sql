-- Tally v3 — curated demo data for "Cafe Afree" (a luxury cafe).
-- =============================================================================
-- Seeds ONE store book for the real signed-in owner so it shows up on login:
--
--   Materials (raw stock, some consumed via 'used'):
--     Coffee Beans, Coffee Cups, Milk, Cream, Coffee Machine, Bun, Beef, Chicken
--
--   Products:
--     * manufacture — made from linked materials, SALE-ONLY (Espresso, Cappuccino,
--       Latte, Cold Brew, Wagyu Beef Burger, Grilled Chicken Sandwich, Truffle Latte).
--       current_stock/total_stock_in/last_purchase_price/stock_value stay NULL
--       (analytics later).
--     * ready_made — bought & resold (Artisan Biscuit, Fresh Coffee Beans, Dessert Jar).
--
--   Customers with running balance history (advance / due tabs).
--
-- SCHEMA CONVENTION (see schema.sql): every row carries a UUID `id`, an
-- auto-increment `seq` (insert order — the ONLY sort key) and a business
-- `timestamp`. Ids are therefore spelled out with UUID() into @variables, and
-- rows are inserted oldest-first so `seq` matches chronology exactly as the app
-- would have written them.
--
-- Every denormalised field the app reads is recomputed at the bottom exactly as
-- index.php's recompute* helpers would, so the UI is correct with no extra pass.
-- Per-row running values (stock_after / balance_after) are authored inline.
--
-- IMAGES: image_url points at https://loremflickr.com/<w>/<h>/<tags> (public,
-- keyword-matched Flickr photos; ?lock=<id> keeps each stable). No API key needed.
--
-- HOW TO RUN
--   mysql -u root -p tally_v3 < small_cafe_store.sql   (or paste into phpMyAdmin's SQL tab)
--
-- IDEMPOTENT: the "Cafe Afree" book is deleted by name and recreated on each run
-- (FK cascades wipe its children). Other books are left untouched.
-- =============================================================================

USE tally_v3;
SET time_zone = '+00:00';
-- Match the tables' collation so string variables (e.g. @owner) compare cleanly.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Owner — the real signed-in account, so the book appears when they log in.
SET @owner := '09cd48c2-21e8-43b0-8ecf-4ff643e5764c';
INSERT INTO users (id, google_id, email, name, picture)
VALUES (@owner, '103449430925193454062', 'fz.arnob@gmail.com', 'FZ. Arnob',
        'https://lh3.googleusercontent.com/a/ACg8ocLczb7SoEAffjFTm8fdu9hPnGxWjcvscFCAqn2onW6HzzRuPKKs=s96-c')
ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), picture = VALUES(picture);

-- Re-runnable: drop a previous "Cafe Afree" (cascades remove all its children).
DELETE FROM books WHERE user_id = @owner AND name = 'Cafe Afree';
SET @book := UUID();
INSERT INTO books (id, user_id, name, type) VALUES (@book, @owner, 'Cafe Afree', 'store');

-- ===========================================================================
-- MATERIALS (raw stock)
-- ===========================================================================
SET @m_beans   := UUID();
SET @m_cups    := UUID();
SET @m_milk    := UUID();
SET @m_cream   := UUID();
SET @m_machine := UUID();
SET @m_bun     := UUID();
SET @m_beef    := UUID();
SET @m_chicken := UUID();

INSERT INTO materials (id, book_id, name, quantity_type, image_url) VALUES
  (@m_beans,   @book, 'Coffee Beans',   'kg',    'https://loremflickr.com/320/320/coffee,beans?lock=101'),
  (@m_cups,    @book, 'Coffee Cups',    'piece', 'https://loremflickr.com/320/320/coffee,cup?lock=102'),
  (@m_milk,    @book, 'Milk',           'liter', 'https://loremflickr.com/320/320/milk,bottle?lock=103'),
  (@m_cream,   @book, 'Cream',          'liter', 'https://loremflickr.com/320/320/cream,dairy?lock=104'),
  (@m_machine, @book, 'Coffee Machine', 'piece', 'https://loremflickr.com/320/320/espresso,machine?lock=105'),
  (@m_bun,     @book, 'Bun',            'piece', 'https://loremflickr.com/320/320/burger,bun?lock=106'),
  (@m_beef,    @book, 'Beef',           'kg',    'https://loremflickr.com/320/320/raw,beef?lock=107'),
  (@m_chicken, @book, 'Chicken',        'kg',    'https://loremflickr.com/320/320/raw,chicken?lock=108');

-- Material moves: initial stock-ins, plus a couple of 'used' (consumption) entries.
-- Oldest first, so seq order matches the timestamps.
INSERT INTO material_transactions (id, material_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, timestamp) VALUES
  (UUID(), @m_machine, @book, 'stock', 2, 250000.00,500000.00, 2,   'La Marzocco units',     DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 DAY)),
  (UUID(), @m_beans,   @book, 'stock', 25,  1800.00, 45000.00, 25,  'Single-origin arabica', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 40 DAY)),
  (UUID(), @m_cups,    @book, 'stock', 500,   12.00,  6000.00, 500, 'Branded cups',          DATE_SUB(UTC_TIMESTAMP(), INTERVAL 39 DAY)),
  (UUID(), @m_milk,    @book, 'stock', 60,    90.00,  5400.00, 60,  'Fresh full-cream',      DATE_SUB(UTC_TIMESTAMP(), INTERVAL 38 DAY)),
  (UUID(), @m_cream,   @book, 'stock', 20,   350.00,  7000.00, 20,  'Whipping cream',        DATE_SUB(UTC_TIMESTAMP(), INTERVAL 37 DAY)),
  (UUID(), @m_bun,     @book, 'stock', 200,   25.00,  5000.00, 200, 'Brioche buns',          DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY)),
  (UUID(), @m_beef,    @book, 'stock', 30,   950.00, 28500.00, 30,  'Premium cuts',          DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 DAY)),
  (UUID(), @m_chicken, @book, 'stock', 40,   320.00, 12800.00, 40,  'Free-range',            DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 DAY)),
  (UUID(), @m_beans,   @book, 'used',  5,      0.00,     0.00, 20,  'Brew consumption',      DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY)),
  (UUID(), @m_milk,    @book, 'used',  12,     0.00,     0.00, 48,  'Steaming & lattes',     DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY));

-- ===========================================================================
-- PRODUCTS — manufacture (linked to materials, sale-only)
-- ===========================================================================
SET @p_espresso     := UUID();
SET @p_cappuccino   := UUID();
SET @p_latte        := UUID();
SET @p_coldbrew     := UUID();
SET @p_burger       := UUID();
SET @p_sandwich     := UUID();
SET @p_trufflelatte := UUID();
SET @p_biscuit      := UUID();
SET @p_beansbag     := UUID();
SET @p_dessert      := UUID();

INSERT INTO products (id, book_id, name, quantity_type, product_type, image_url) VALUES
  (@p_espresso,     @book, 'Signature Espresso',        'piece',  'manufacture', 'https://loremflickr.com/320/320/espresso?lock=201'),
  (@p_cappuccino,   @book, 'Cappuccino',                'piece',  'manufacture', 'https://loremflickr.com/320/320/cappuccino?lock=202'),
  (@p_latte,        @book, 'Caffe Latte',               'piece',  'manufacture', 'https://loremflickr.com/320/320/latte?lock=203'),
  (@p_coldbrew,     @book, 'Cold Brew',                 'piece',  'manufacture', 'https://loremflickr.com/320/320/cold,brew,coffee?lock=204'),
  (@p_burger,       @book, 'Wagyu Beef Burger',         'piece',  'manufacture', 'https://loremflickr.com/320/320/gourmet,burger?lock=205'),
  (@p_sandwich,     @book, 'Grilled Chicken Sandwich',  'piece',  'manufacture', 'https://loremflickr.com/320/320/chicken,sandwich?lock=206'),
  (@p_trufflelatte, @book, 'Truffle Cream Latte',       'piece',  'manufacture', 'https://loremflickr.com/320/320/latte,art?lock=207'),
  -- PRODUCTS — ready-made (bought & resold)
  (@p_biscuit,      @book, 'Artisan Biscuit',           'packet', 'ready_made',  'https://loremflickr.com/320/320/biscuit,cookie?lock=208'),
  (@p_beansbag,     @book, 'Fresh Coffee Beans',        'packet', 'ready_made',  'https://loremflickr.com/320/320/coffee,beans,bag?lock=209'),
  (@p_dessert,      @book, 'Dessert Jar',               'piece',  'ready_made',  'https://loremflickr.com/320/320/dessert,tiramisu?lock=210');

-- ---- Product ↔ material links (which materials each product is made from) ----
INSERT INTO product_materials (product_id, material_id, book_id) VALUES
  (@p_espresso,     @m_beans,  @book), (@p_espresso,     @m_cups,  @book),
  (@p_cappuccino,   @m_beans,  @book), (@p_cappuccino,   @m_cups,  @book), (@p_cappuccino,   @m_milk,  @book),
  (@p_latte,        @m_beans,  @book), (@p_latte,        @m_cups,  @book), (@p_latte,        @m_milk,  @book),
  (@p_coldbrew,     @m_beans,  @book), (@p_coldbrew,     @m_cups,  @book), (@p_coldbrew,     @m_cream, @book),
  (@p_burger,       @m_beef,   @book), (@p_burger,       @m_bun,   @book),
  (@p_sandwich,     @m_chicken,@book), (@p_sandwich,     @m_bun,   @book),
  (@p_trufflelatte, @m_beans,  @book), (@p_trufflelatte, @m_cups,  @book), (@p_trufflelatte, @m_milk,  @book), (@p_trufflelatte, @m_cream, @book);

-- ---- Manufacture sales (stock_after is NULL — a manufacture product's stock is unknown) ----
INSERT INTO product_transactions (id, product_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, timestamp) VALUES
  (UUID(), @p_espresso, @book, 'sale', 25, 320.00,  8000.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 DAY)),
  (UUID(), @p_espresso, @book, 'sale', 30, 320.00,  9600.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY)),
  (UUID(), @p_espresso, @book, 'sale', 22, 320.00,  7040.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
  (UUID(), @p_espresso, @book, 'sale', 28, 320.00,  8960.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),

  (UUID(), @p_cappuccino, @book, 'sale', 20, 420.00, 8400.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 DAY)),
  (UUID(), @p_cappuccino, @book, 'sale', 24, 420.00, 10080.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY)),
  (UUID(), @p_cappuccino, @book, 'sale', 18, 420.00, 7560.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),

  (UUID(), @p_latte, @book, 'sale', 26, 450.00, 11700.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 19 DAY)),
  (UUID(), @p_latte, @book, 'sale', 19, 450.00, 8550.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 11 DAY)),
  (UUID(), @p_latte, @book, 'sale', 23, 450.00, 10350.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
  (UUID(), @p_latte, @book, 'sale', 21, 450.00, 9450.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),

  (UUID(), @p_coldbrew, @book, 'sale', 15, 480.00, 7200.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 16 DAY)),
  (UUID(), @p_coldbrew, @book, 'sale', 12, 480.00, 5760.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)),
  (UUID(), @p_coldbrew, @book, 'sale', 18, 480.00, 8640.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),

  (UUID(), @p_burger, @book, 'sale', 8,  950.00, 7600.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)),
  (UUID(), @p_burger, @book, 'sale', 11, 950.00, 10450.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY)),
  (UUID(), @p_burger, @book, 'sale', 9,  950.00, 8550.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),

  (UUID(), @p_sandwich, @book, 'sale', 14, 650.00, 9100.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY)),
  (UUID(), @p_sandwich, @book, 'sale', 10, 650.00, 6500.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
  (UUID(), @p_sandwich, @book, 'sale', 12, 650.00, 7800.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY)),

  (UUID(), @p_trufflelatte, @book, 'sale', 9,  620.00, 5580.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
  (UUID(), @p_trufflelatte, @book, 'sale', 13, 620.00, 8060.00, NULL, NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY));

-- ---- Ready-made moves (running stock_after authored inline) ----
INSERT INTO product_transactions (id, product_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note, timestamp) VALUES
  (UUID(), @p_biscuit, @book, 'stock', 100, 120.00, 12000.00, 100, 'Initial stock',  DATE_SUB(UTC_TIMESTAMP(), INTERVAL 25 DAY)),
  (UUID(), @p_biscuit, @book, 'sale',  12,  180.00,  2160.00, 88,  NULL,             DATE_SUB(UTC_TIMESTAMP(), INTERVAL 18 DAY)),
  (UUID(), @p_biscuit, @book, 'sale',  18,  180.00,  3240.00, 70,  NULL,             DATE_SUB(UTC_TIMESTAMP(), INTERVAL 12 DAY)),
  (UUID(), @p_biscuit, @book, 'stock', 50,  120.00,  6000.00, 120, 'Restock',        DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY)),
  (UUID(), @p_biscuit, @book, 'sale',  20,  180.00,  3600.00, 100, NULL,             DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY)),

  (UUID(), @p_beansbag, @book, 'stock', 80, 1200.00, 96000.00, 80, 'Retail bags',    DATE_SUB(UTC_TIMESTAMP(), INTERVAL 22 DAY)),
  (UUID(), @p_beansbag, @book, 'sale',  10, 1600.00, 16000.00, 70, NULL,             DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY)),
  (UUID(), @p_beansbag, @book, 'sale',  8,  1600.00, 12800.00, 62, NULL,             DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY)),

  (UUID(), @p_dessert, @book, 'stock', 60, 250.00, 15000.00, 60, 'Tiramisu jars',    DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 DAY)),
  (UUID(), @p_dessert, @book, 'sale',  9,  380.00,  3420.00, 51, NULL,               DATE_SUB(UTC_TIMESTAMP(), INTERVAL 9 DAY)),
  (UUID(), @p_dessert, @book, 'sale',  14, 380.00,  5320.00, 37, NULL,               DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY)),
  (UUID(), @p_dessert, @book, 'sale',  7,  380.00,  2660.00, 30, NULL,               DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

-- ===========================================================================
-- CUSTOMERS + running balance history (advance = +, due = -)
-- ===========================================================================
SET @c1 := UUID();
INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES
  (@c1, @book, 'Ayesha Rahman', 'Ayesha', '+8801711000001', 'Road 11, Gulshan 1, Dhaka');
INSERT INTO customer_balance_history (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, source, timestamp) VALUES
  (UUID(), @c1, @book, 3200.00, 'unpaid', -3200.00, -3200.00, 'Dinner tab',        'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 30 DAY)),
  (UUID(), @c1, @book, 5000.00, 'paid',    5000.00,  1800.00, 'Reservation advance','cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 DAY));

SET @c2 := UUID();
INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES
  (@c2, @book, 'Tanvir Ahmed', 'Tanvir', '+8801711000002', 'Road 27, Banani, Dhaka');
INSERT INTO customer_balance_history (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, source, timestamp) VALUES
  (UUID(), @c2, @book, 8500.00, 'unpaid', -8500.00, -8500.00, 'Private event catering', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 DAY)),
  (UUID(), @c2, @book, 5000.00, 'paid',    5000.00, -3500.00, 'Partial settlement',     'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY));

SET @c3 := UUID();
INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES
  (@c3, @book, 'Zara Chowdhury', 'Zara', '+8801711000003', 'Road 50, Gulshan 2, Dhaka');
INSERT INTO customer_balance_history (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, source, timestamp) VALUES
  (UUID(), @c3, @book, 12000.00, 'paid',  12000.00, 12000.00, 'Membership advance', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 28 DAY)),
  (UUID(), @c3, @book, 4600.00,  'unpaid', -4600.00,  7400.00, 'Weekend brunch',    'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 14 DAY)),
  (UUID(), @c3, @book, 2800.00,  'unpaid', -2800.00,  4600.00, 'Coffee tab',        'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 4 DAY));

SET @c4 := UUID();
INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES
  (@c4, @book, 'Rafiq Islam', '', '+8801711000004', 'Road 7, Dhanmondi, Dhaka');
INSERT INTO customer_balance_history (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, source, timestamp) VALUES
  (UUID(), @c4, @book, 1500.00, 'unpaid', -1500.00, -1500.00, 'Lunch tab', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 20 DAY)),
  (UUID(), @c4, @book, 2200.00, 'unpaid', -2200.00, -3700.00, 'Dessert & coffee', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 6 DAY));

SET @c5 := UUID();
INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES
  (@c5, @book, 'Nadia Karim', 'Nadia', '+8801711000005', 'Road 12, Baridhara, Dhaka');
INSERT INTO customer_balance_history (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, source, timestamp) VALUES
  (UUID(), @c5, @book, 3000.00, 'paid',   3000.00, 3000.00, 'Advance', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 15 DAY)),
  (UUID(), @c5, @book, 3000.00, 'unpaid', -3000.00,    0.00, 'Birthday high tea', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 DAY));

SET @c6 := UUID();
INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES
  (@c6, @book, 'Imran Hossain', 'Imran', '+8801711000006', 'Road 15, Uttara, Dhaka');
INSERT INTO customer_balance_history (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, source, timestamp) VALUES
  (UUID(), @c6, @book, 6400.00, 'unpaid', -6400.00, -6400.00, 'Corporate meeting', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 8 DAY));

SET @c7 := UUID();
INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES
  (@c7, @book, 'Sadia Khan', 'Sadia', '+8801711000007', 'Road 3, Gulshan 1, Dhaka');
INSERT INTO customer_balance_history (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, source, timestamp) VALUES
  (UUID(), @c7, @book, 8000.00, 'paid',   8000.00, 8000.00, 'Membership advance', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 26 DAY)),
  (UUID(), @c7, @book, 2100.00, 'unpaid', -2100.00, 5900.00, 'Afternoon tab',     'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 DAY));

SET @c8 := UUID();
INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES
  (@c8, @book, 'Farhan Kabir', '', '+8801711000008', 'Road 9, Bashundhara, Dhaka');
INSERT INTO customer_balance_history (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, source, timestamp) VALUES
  (UUID(), @c8, @book, 990.00, 'unpaid', -990.00, -990.00, 'Espresso & biscuit', 'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 13 DAY)),
  (UUID(), @c8, @book, 990.00, 'paid',    990.00,    0.00, 'Due cleared',        'cash', DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 DAY));

-- ===========================================================================
-- Recompute denormalised fields (mirrors index.php recompute* helpers).
-- "Last" values follow seq — the insert order — exactly as the app reads them.
-- ===========================================================================

-- Materials.
UPDATE materials m SET
  current_stock       = (SELECT COALESCE(SUM(IF(t.type='stock', t.quantity, -t.quantity)), 0) FROM material_transactions t WHERE t.material_id = m.id),
  total_stock_in      = (SELECT COALESCE(SUM(IF(t.type='stock', t.quantity, 0)), 0)            FROM material_transactions t WHERE t.material_id = m.id),
  total_stock_out     = (SELECT COALESCE(SUM(IF(t.type IN ('sale','used'), t.quantity, 0)), 0) FROM material_transactions t WHERE t.material_id = m.id),
  last_purchase_price = (SELECT t.price_per_unit FROM material_transactions t WHERE t.material_id = m.id AND t.type='stock' ORDER BY t.seq DESC LIMIT 1),
  last_sale_price     = (SELECT t.price_per_unit FROM material_transactions t WHERE t.material_id = m.id AND t.type='sale'  ORDER BY t.seq DESC LIMIT 1),
  transaction_count   = (SELECT COUNT(*)         FROM material_transactions t WHERE t.material_id = m.id),
  last_transaction_time = (SELECT t.timestamp    FROM material_transactions t WHERE t.material_id = m.id ORDER BY t.seq DESC LIMIT 1)
WHERE m.book_id = @book;

-- Material stock value, FIFO — the same walk fifoStockValue() does in index.php.
-- The oldest units are the ones that have left, so the stock in hand is filled
-- from the NEWEST stock-in backwards: `newer` is how much arrived after a lot,
-- so what is left of that lot on the shelf is current_stock - newer, capped at
-- the lot itself and floored at nothing. Runs after the UPDATE above, which is
-- what put current_stock there.
UPDATE materials m SET stock_value = COALESCE((
  SELECT SUM(LEAST(l.quantity, GREATEST(m.current_stock - l.newer, 0)) * l.price_per_unit)
  FROM (
    SELECT material_id, quantity, price_per_unit,
           COALESCE(SUM(quantity) OVER (PARTITION BY material_id ORDER BY seq DESC
                                        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS newer
    FROM material_transactions WHERE type = 'stock'
  ) l WHERE l.material_id = m.id
), 0)
WHERE m.book_id = @book;

-- Ready-made products.
UPDATE products p SET
  current_stock       = (SELECT COALESCE(SUM(IF(t.type='stock', t.quantity, -t.quantity)), 0) FROM product_transactions t WHERE t.product_id = p.id),
  total_stock_in      = (SELECT COALESCE(SUM(IF(t.type='stock', t.quantity, 0)), 0)            FROM product_transactions t WHERE t.product_id = p.id),
  total_stock_out     = (SELECT COALESCE(SUM(IF(t.type='sale',  t.quantity, 0)), 0)            FROM product_transactions t WHERE t.product_id = p.id),
  last_purchase_price = (SELECT t.price_per_unit FROM product_transactions t WHERE t.product_id = p.id AND t.type='stock' ORDER BY t.seq DESC LIMIT 1),
  last_sale_price     = (SELECT t.price_per_unit FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale'  ORDER BY t.seq DESC LIMIT 1),
  transaction_count   = (SELECT COUNT(*)         FROM product_transactions t WHERE t.product_id = p.id),
  last_transaction_time = (SELECT t.timestamp    FROM product_transactions t WHERE t.product_id = p.id ORDER BY t.seq DESC LIMIT 1)
WHERE p.book_id = @book AND p.product_type = 'ready_made';

-- Ready-made stock value, FIFO — see the materials pass above for the walk.
UPDATE products p SET stock_value = COALESCE((
  SELECT SUM(LEAST(l.quantity, GREATEST(p.current_stock - l.newer, 0)) * l.price_per_unit)
  FROM (
    SELECT product_id, quantity, price_per_unit,
           COALESCE(SUM(quantity) OVER (PARTITION BY product_id ORDER BY seq DESC
                                        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS newer
    FROM product_transactions WHERE type = 'stock'
  ) l WHERE l.product_id = p.id
), 0)
WHERE p.book_id = @book AND p.product_type = 'ready_made';

-- Manufacture products: sale-only; stock columns stay NULL (analytics later).
UPDATE products p SET
  current_stock       = NULL,
  total_stock_in      = NULL,
  last_purchase_price = NULL,
  stock_value         = NULL,
  total_stock_out     = (SELECT COALESCE(SUM(t.quantity), 0) FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale'),
  last_sale_price     = (SELECT t.price_per_unit FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale' ORDER BY t.seq DESC LIMIT 1),
  transaction_count   = (SELECT COUNT(*)         FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale'),
  last_transaction_time = (SELECT t.timestamp    FROM product_transactions t WHERE t.product_id = p.id AND t.type='sale' ORDER BY t.seq DESC LIMIT 1)
WHERE p.book_id = @book AND p.product_type = 'manufacture';

-- Customers. Mirrors recomputeCustomer(): what still stands (cash / goods) and
-- the lifetime totals either side of it. Every seeded entry here is plain cash
-- with no goods on any tab, so the cash side is simply the whole balance.
UPDATE customers c SET
  total_balance         = (SELECT COALESCE(SUM(h.signed_amount), 0) FROM customer_balance_history h WHERE h.customer_id = c.id),
  cash_balance          = (SELECT COALESCE(SUM(h.signed_amount), 0) FROM customer_balance_history h WHERE h.customer_id = c.id AND h.source = 'cash'),
  items_due             = (SELECT COALESCE(SUM(i.total_amount - i.paid_amount), 0) FROM customer_items i WHERE i.customer_id = c.id),
  total_unpaid          = (SELECT COALESCE(SUM(h.amount), 0)        FROM customer_balance_history h WHERE h.customer_id = c.id AND h.type = 'unpaid'),
  total_paid_back       = (SELECT COALESCE(SUM(h.amount), 0)        FROM customer_balance_history h WHERE h.customer_id = c.id AND h.type = 'paid'),
  transaction_count     = (SELECT COUNT(*)       FROM customer_balance_history h WHERE h.customer_id = c.id),
  last_transaction_time = (SELECT h.timestamp    FROM customer_balance_history h WHERE h.customer_id = c.id ORDER BY h.seq DESC LIMIT 1)
WHERE c.book_id = @book;

-- Quick summary of what was generated.
SELECT
  (SELECT COUNT(*) FROM materials              WHERE book_id = @book) AS materials,
  (SELECT COUNT(*) FROM material_transactions  WHERE book_id = @book) AS material_txns,
  (SELECT COUNT(*) FROM products               WHERE book_id = @book) AS products,
  (SELECT COUNT(*) FROM product_materials      WHERE book_id = @book) AS material_links,
  (SELECT COUNT(*) FROM product_transactions   WHERE book_id = @book) AS product_txns,
  (SELECT COUNT(*) FROM customers              WHERE book_id = @book) AS customers,
  (SELECT COUNT(*) FROM customer_balance_history WHERE book_id = @book) AS balance_entries;

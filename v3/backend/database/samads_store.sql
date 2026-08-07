-- Tally v3 — starting data for "Samad's Store" (a neighbourhood cigarette &
-- paan shop).
-- =============================================================================
-- Seeds ONE store book for the real signed-in owner so it shows up on login,
-- with its catalogue and nothing else:
--
--   Materials (9) — the loose goods the shop keeps behind the counter:
--     No.1 Condensed Milk, Tea Leaves, Slaked Lime (Chun), Betel Leaf (Pan),
--     Betel Nut (Shupari), Egol Gul, Mostafa Gul, Sugar, Zarda
--
--   Products (21) — all 'ready_made' (bought and resold as they come):
--     18 cigarette brands, Biscuit, and two gas lighters
--
--   Operation costs (1): Rent & Electricity
--
-- DELIBERATELY EMPTY: no stock-ins, no sales, no customers, no cost entries.
-- This is a catalogue to start from, not a demo — the shop enters its own
-- figures. Every derived column is therefore at its zero state (stock 0, no
-- last prices, no transactions), exactly as the app leaves a freshly created
-- item, so nothing needs recomputing at the bottom of this file.
--
-- SCHEMA CONVENTION (see schema.sql): every row carries a UUID `id`, an
-- auto-increment `seq` (insert order — the ONLY sort key) and a business
-- `timestamp`. Ids are spelled out with UUID() into @variables. Rows are listed
-- in the order the shop would have added them, so `seq` reads naturally.
--
-- IMAGES: image_url points at https://placehold.co/<w>x<h>/<bg>/<fg>/png?text=…
-- — a generated label, not a photo, so the SAME url always renders the SAME
-- image. (A photo service such as loremflickr picks from a pool that shifts
-- over time, so its pictures change underneath you.) Cigarettes and the other
-- resale goods share a dark plate; materials use a warmer one, so the two
-- sections are told apart at a glance.
--
-- NAMES: written out in full where the shop's shorthand was given (e.g. "Bns
-- Red" → "Benson & Hedges Red Cigarette"), with the local name kept in
-- parentheses where the English one alone would not be recognised at the
-- counter ("Betel Nut (Shupari)").
--
-- HOW TO RUN — after schema.sql has created the database:
--   mysql -u root -p tally_v3 < samads_store.sql   (or paste into phpMyAdmin's SQL tab)
--
-- IDEMPOTENT: the "Samad's Store" book is deleted by name and recreated on each
-- run (FK cascades wipe its children). Other books are left untouched.
-- =============================================================================

USE tally_v3;
SET time_zone = '+00:00';
-- Match the tables' collation so string variables (e.g. @owner) compare cleanly.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Owner — the real signed-in account, so the book appears when they log in.
SET @owner := '5a24a5d0-8874-4e22-93c3-38ea3c2dc841';
INSERT INTO users (id, google_id, email, name, picture, created_at, updated_at)
VALUES (@owner, '117125771542496567702', 'mdsammadmiah@gmail.com', 'MD SAMMAD MIAH',
        'https://lh3.googleusercontent.com/a/ACg8ocKAMRzkY2DryUI3lA-HoUOJyHyjwBzOpUlSBIKRGV-9_eXDX0hx=s96-c',
        '2026-07-26 02:06:10', '2026-07-26 02:06:10')
ON DUPLICATE KEY UPDATE email = VALUES(email), name = VALUES(name), picture = VALUES(picture);

-- Re-runnable: drop a previous "Samad's Store" (cascades remove all its children).
DELETE FROM books WHERE user_id = @owner AND name = 'Samad''s Store';
SET @book := UUID();
INSERT INTO books (id, user_id, name, type) VALUES (@book, @owner, 'Samad''s Store', 'store');

-- ===========================================================================
-- MATERIALS — loose goods sold by weight or by the piece, and the makings of
-- the paan the shop rolls itself.
-- ===========================================================================
SET @m_milk    := UUID();
SET @m_tea     := UUID();
SET @m_chun    := UUID();
SET @m_pan     := UUID();
SET @m_shupari := UUID();
SET @m_egolgul := UUID();
SET @m_mostafa := UUID();
SET @m_sugar   := UUID();
SET @m_zarda   := UUID();

INSERT INTO materials (id, book_id, name, quantity_type, image_url) VALUES
  (@m_milk,    @book, 'No.1 Condensed Milk',  'piece', 'https://placehold.co/320x320/7c2d12/fff7ed/png?text=No.1%0AMilk'),
  (@m_tea,     @book, 'Tea Leaves (Cha Pati)','kg',    'https://placehold.co/320x320/7c2d12/fff7ed/png?text=Tea%0ALeaves'),
  (@m_chun,    @book, 'Slaked Lime (Chun)',   'kg',    'https://placehold.co/320x320/7c2d12/fff7ed/png?text=Chun'),
  (@m_pan,     @book, 'Betel Leaf (Pan)',     'piece', 'https://placehold.co/320x320/7c2d12/fff7ed/png?text=Pan'),
  (@m_shupari, @book, 'Betel Nut (Shupari)',  'kg',    'https://placehold.co/320x320/7c2d12/fff7ed/png?text=Shupari'),
  (@m_egolgul, @book, 'Egol Gul',             'piece', 'https://placehold.co/320x320/7c2d12/fff7ed/png?text=Egol%0AGul'),
  (@m_mostafa, @book, 'Mostafa Gul',          'piece', 'https://placehold.co/320x320/7c2d12/fff7ed/png?text=Mostafa%0AGul'),
  (@m_sugar,   @book, 'Sugar',                'kg',    'https://placehold.co/320x320/7c2d12/fff7ed/png?text=Sugar'),
  (@m_zarda,   @book, 'Zarda (Jorda)',        'piece', 'https://placehold.co/320x320/7c2d12/fff7ed/png?text=Zarda');

-- ===========================================================================
-- PRODUCTS — all 'ready_made': bought in and resold unchanged, so each carries
-- its own stock and buying/selling prices once trading starts. current_stock,
-- total_stock_in and stock_value are written as 0 rather than left NULL, which
-- is where recomputeProduct() puts a ready-made item with no movements yet.
-- (The materials above need no such column list: theirs are NOT NULL DEFAULT 0.)
-- ===========================================================================
SET @p_camel     := UUID();
SET @p_star      := UUID();
SET @p_glred     := UUID();
SET @p_royal     := UUID();
SET @p_hollywood := UUID();
SET @p_luckies   := UUID();
SET @p_derby     := UUID();
SET @p_lscool    := UUID();
SET @p_lsorig    := UUID();
SET @p_navy      := UUID();
SET @p_blackdia  := UUID();
SET @p_deshgold  := UUID();
SET @p_kings     := UUID();
SET @p_glwhite   := UUID();
SET @p_bhwhite   := UUID();
SET @p_bhred     := UUID();
SET @p_marladv   := UUID();
SET @p_marlgold  := UUID();
SET @p_biscuit   := UUID();
SET @p_ltsunlive := UUID();
SET @p_ltstar    := UUID();

INSERT INTO products (id, book_id, name, quantity_type, product_type, image_url, current_stock, total_stock_in, stock_value) VALUES
  -- Cigarettes, counted by the packet.
  (@p_camel,     @book, 'Camel Cigarette',                    'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Camel', 0, 0, 0),
  (@p_star,      @book, 'Star Cigarette',                     'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Star', 0, 0, 0),
  (@p_glred,     @book, 'Gold Leaf Red Cigarette',            'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Gold+Leaf%0ARed', 0, 0, 0),
  (@p_royal,     @book, 'Royal Next Cigarette',               'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Royal%0ANext', 0, 0, 0),
  (@p_hollywood, @book, 'Hollywood Cigarette',                'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Hollywood', 0, 0, 0),
  (@p_luckies,   @book, 'Luckies Cigarette',                  'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Luckies', 0, 0, 0),
  (@p_derby,     @book, 'Derby Cigarette',                    'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Derby', 0, 0, 0),
  (@p_lscool,    @book, 'Lucky Strike Cool Crunch Cigarette', 'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Lucky+Strike%0ACool+Crunch', 0, 0, 0),
  (@p_lsorig,    @book, 'Lucky Strike Original Cigarette',    'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Lucky+Strike%0AOriginal', 0, 0, 0),
  (@p_navy,      @book, 'Navy Cigarette',                     'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Navy', 0, 0, 0),
  (@p_blackdia,  @book, 'Black Diamond Cigarette',            'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Black%0ADiamond', 0, 0, 0),
  (@p_deshgold,  @book, 'Desh Gold Cigarette',                'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Desh%0AGold', 0, 0, 0),
  (@p_kings,     @book, 'Kings Cigarette',                    'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Kings', 0, 0, 0),
  (@p_glwhite,   @book, 'Gold Leaf White Cigarette',          'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Gold+Leaf%0AWhite', 0, 0, 0),
  (@p_bhwhite,   @book, 'Benson & Hedges White Cigarette',    'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=B%26H%0AWhite', 0, 0, 0),
  (@p_bhred,     @book, 'Benson & Hedges Red Cigarette',      'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=B%26H%0ARed', 0, 0, 0),
  (@p_marladv,   @book, 'Marlboro Advance Cigarette',         'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Marlboro%0AAdvance', 0, 0, 0),
  (@p_marlgold,  @book, 'Marlboro Gold Cigarette',            'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Marlboro%0AGold', 0, 0, 0),
  -- Everything else the shop resells over the counter.
  (@p_biscuit,   @book, 'Biscuit',                            'packet', 'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Biscuit', 0, 0, 0),
  (@p_ltsunlive, @book, 'Sunlive Gas Lighter',                'piece',  'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Sunlive%0ALighter', 0, 0, 0),
  (@p_ltstar,    @book, 'Star Gas Lighter',                   'piece',  'ready_made', 'https://placehold.co/320x320/1e293b/f8fafc/png?text=Star%0ALighter', 0, 0, 0);

-- ===========================================================================
-- OPERATION COSTS — the shop's one standing outgoing. Named only: the amount
-- stays 0 with no history until the first month is entered from the app, which
-- is what appends the snapshot to operation_cost_entries.
-- ===========================================================================
INSERT INTO operation_costs (id, book_id, reason, note, amount)
VALUES (UUID(), @book, 'Rent & Electricity', '', 0);

-- Quick summary of what was created.
SELECT
  (SELECT COUNT(*) FROM materials       WHERE book_id = @book) AS materials,
  (SELECT COUNT(*) FROM products        WHERE book_id = @book) AS products,
  (SELECT COUNT(*) FROM operation_costs WHERE book_id = @book) AS operation_costs;

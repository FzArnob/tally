-- Tally v3 — production-ready schema (self-contained, separate DB from v1/v2).
-- Design principle: every "calculative" value is DENORMALISED and kept up to date on
-- write (insert/delete) so the UI only ever needs a plain SELECT — no aggregation at
-- read time. See v3/backend/index.php recomputeCustomer()/recomputeProduct().
--
-- Time convention: ALL time columns (DATE/DATETIME/TIMESTAMP) store UTC. The API
-- connection runs with `SET time_zone = '+00:00'` and PHP uses UTC (config.php), so
-- CURRENT_TIMESTAMP/NOW() and any written value are UTC. The frontend renders them in
-- the viewer's local zone (v3/src/lib/format.ts parseServerTime()).

CREATE DATABASE IF NOT EXISTS tally_v3
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tally_v3;

-- Drop in dependency order so the file is re-runnable.
DROP TABLE IF EXISTS operation_cost_entries;
DROP TABLE IF EXISTS operation_costs;
DROP TABLE IF EXISTS material_transactions;
DROP TABLE IF EXISTS materials;
DROP TABLE IF EXISTS personal_transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS customer_balance_history;
DROP TABLE IF EXISTS product_transaction_costs;
DROP TABLE IF EXISTS product_transactions;
DROP TABLE IF EXISTS product_cost_items;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------------
-- Users — one row per Google account (UUID primary key). Identity comes from
-- Google Sign-In: google_id is the token's `sub` claim (stable per account);
-- email/name/picture are refreshed from the ID token on every login.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id         CHAR(36)     NOT NULL PRIMARY KEY,
    google_id  VARCHAR(255) NOT NULL,               -- Google ID-token `sub`
    email      VARCHAR(255) NOT NULL DEFAULT '',
    name       VARCHAR(255) NOT NULL DEFAULT '',
    picture    VARCHAR(512) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_google UNIQUE (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Books (a "store") — owned by exactly one user; a user can have many books.
-- ---------------------------------------------------------------------------
CREATE TABLE books (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    CHAR(36)     NOT NULL,               -- owner (users.id)
    name       VARCHAR(100) NOT NULL,
    -- 'store' books use products + customer balances; 'personal' books use transactions.
    -- The UI renders a type-based icon (no per-book logo).
    type       ENUM('store','personal') NOT NULL DEFAULT 'store',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_books_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_books_user ON books(user_id, id);

-- ---------------------------------------------------------------------------
-- Sessions — opaque bearer tokens issued on login (revocable, server-side).
-- The frontend stores the token and sends it as `Authorization: Bearer <token>`.
-- ---------------------------------------------------------------------------
CREATE TABLE sessions (
    token      CHAR(64)  NOT NULL PRIMARY KEY,       -- random 32-byte hex
    user_id    CHAR(36)  NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME  NOT NULL,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ---------------------------------------------------------------------------
-- Customers — UUID primary key; names are NOT unique (a nickname disambiguates).
-- total_balance / transaction_count / last_transaction_time are precomputed.
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
    id                    CHAR(36)      NOT NULL PRIMARY KEY,
    book_id               INT           NOT NULL,
    name                  VARCHAR(100)  NOT NULL,
    nickname              VARCHAR(100)  NOT NULL DEFAULT '',
    phone                 VARCHAR(30)   NOT NULL DEFAULT '',
    address               VARCHAR(255)  NOT NULL DEFAULT '',
    total_balance         DECIMAL(14,2) NOT NULL DEFAULT 0.00,  -- + advance paid, - owed
    transaction_count     INT           NOT NULL DEFAULT 0,
    last_transaction_time DATETIME      NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_customers_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    -- Same name is allowed only when the nickname differs; blocks exact duplicates.
    CONSTRAINT uq_customer_identity UNIQUE (book_id, name, nickname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_customers_book_name     ON customers(book_id, name);
CREATE INDEX idx_customers_book_last_txn ON customers(book_id, last_transaction_time DESC);

-- ---------------------------------------------------------------------------
-- Customer balance history — one paid/unpaid entry. Keyed to the customer UUID.
-- signed_amount / balance_after are precomputed snapshots for the history view.
-- ---------------------------------------------------------------------------
CREATE TABLE customer_balance_history (
    id            CHAR(36)             NOT NULL PRIMARY KEY,
    seq           BIGINT               NOT NULL AUTO_INCREMENT,  -- monotonic insert order
    customer_id   CHAR(36)             NOT NULL,
    book_id       INT                  NOT NULL,
    amount        DECIMAL(14,2)        NOT NULL,            -- always positive
    type          ENUM('paid','unpaid') NOT NULL,
    signed_amount DECIMAL(14,2)        NOT NULL,            -- +amount paid / -amount unpaid
    balance_after DECIMAL(14,2)        NOT NULL DEFAULT 0,  -- running balance after this entry
    reason        VARCHAR(255)         NULL,
    expression    VARCHAR(255)         NULL,
    timestamp     DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP            DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cbh_seq (seq),
    CONSTRAINT fk_cbh_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_cbh_book     FOREIGN KEY (book_id)     REFERENCES books(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_cbh_customer_seq ON customer_balance_history(customer_id, seq DESC);

-- ---------------------------------------------------------------------------
-- Products — derived stock is precomputed onto the row (current_stock, totals,
-- last prices, last_transaction_time) so listing needs no JOIN/aggregation.
-- image_url is MEDIUMTEXT to hold base64 data URLs.
-- ---------------------------------------------------------------------------
CREATE TABLE products (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    book_id               INT           NOT NULL,
    name                  VARCHAR(100)  NOT NULL,
    quantity_type         VARCHAR(50)   NOT NULL DEFAULT 'piece',
    -- 'ready_made' products are bought and resold (one buying price per stock-in);
    -- 'manufacture' products are produced from raw materials/costs, so a stock-in
    -- carries a per-line cost breakdown (see product_cost_items / _transaction_costs)
    -- and price_per_unit is the derived per-unit production cost.
    product_type          ENUM('ready_made','manufacture') NOT NULL DEFAULT 'ready_made',
    image_url             MEDIUMTEXT     NULL,
    current_stock         DECIMAL(14,3) NOT NULL DEFAULT 0,
    total_stock_in        DECIMAL(14,3) NOT NULL DEFAULT 0,
    total_stock_out       DECIMAL(14,3) NOT NULL DEFAULT 0,
    last_purchase_price   DECIMAL(14,2) NULL,
    last_sale_price       DECIMAL(14,2) NULL,
    transaction_count     INT           NOT NULL DEFAULT 0,
    last_transaction_time DATETIME      NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    -- A product name is unique within a book. (Also serves book_id+name lookups
    -- and the "ORDER BY name" listing, so no separate index is needed.)
    CONSTRAINT uq_product_identity UNIQUE (book_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_book_last_txn ON products(book_id, last_transaction_time DESC);

-- ---------------------------------------------------------------------------
-- Product cost items (manufacture products only) — the reusable *template* of
-- cost-line labels defined when the product is added/edited (e.g. Flour, Sugar,
-- Labour). During a stock-in the user fills an amount for each; the entered
-- amounts live in product_transaction_costs. Empty for ready-made products.
-- ---------------------------------------------------------------------------
CREATE TABLE product_cost_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT          NOT NULL,
    book_id    INT          NOT NULL,
    name       VARCHAR(100) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pci_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pci_book    FOREIGN KEY (book_id)    REFERENCES books(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pci_product ON product_cost_items(product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Product transactions — stock in / sale. total_amount and stock_after are
-- precomputed running values. For a manufacture stock-in, total_amount is the
-- sum of the batch's cost lines and price_per_unit = total_amount / quantity.
-- ---------------------------------------------------------------------------
CREATE TABLE product_transactions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    product_id     INT                   NOT NULL,
    book_id        INT                   NOT NULL,
    type           ENUM('stock','sale')  NOT NULL,
    quantity       DECIMAL(14,3)         NOT NULL,
    price_per_unit DECIMAL(14,2)         NOT NULL,
    total_amount   DECIMAL(14,2)         NOT NULL,   -- quantity * price_per_unit
    stock_after    DECIMAL(14,3)         NOT NULL DEFAULT 0,
    note           VARCHAR(255)          NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pt_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_pt_book    FOREIGN KEY (book_id)    REFERENCES books(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_pt_product ON product_transactions(product_id, id DESC);

-- ---------------------------------------------------------------------------
-- Product transaction costs — the per-line cost breakdown entered for one
-- manufacture stock-in. name is a DENORMALISED snapshot of the cost-item label
-- at entry time, so history renders even after the template is edited/deleted.
-- Rows cascade-delete with their transaction (which is how an edit's swap works).
-- ---------------------------------------------------------------------------
CREATE TABLE product_transaction_costs (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT           NOT NULL,
    name           VARCHAR(100)  NOT NULL,           -- denormalised label snapshot
    amount         DECIMAL(14,2) NOT NULL,
    sort_order     INT           NOT NULL DEFAULT 0,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ptc_txn FOREIGN KEY (transaction_id) REFERENCES product_transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ptc_txn ON product_transaction_costs(transaction_id, sort_order);

-- ---------------------------------------------------------------------------
-- Categories (personal books) — income/expense buckets. transaction_count is
-- precomputed on write so the manager needs no aggregation at read time.
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    book_id           INT           NOT NULL,
    name              VARCHAR(100)  NOT NULL,
    details           VARCHAR(255)  NOT NULL DEFAULT '',
    type              ENUM('income','expense') NOT NULL,
    transaction_count INT           NOT NULL DEFAULT 0,   -- denormalised
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    -- A category name is unique per type within a book.
    CONSTRAINT uq_category_identity UNIQUE (book_id, type, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_categories_book_type ON categories(book_id, type, name);

-- ---------------------------------------------------------------------------
-- Personal transactions (personal books) — income/expense entries. category_name
-- is a denormalised snapshot so the list needs no JOIN; signed_amount (+income /
-- -expense) makes the summary a trivial sum. On category delete the FK nulls the
-- link but the row keeps its category_name label.
-- ---------------------------------------------------------------------------
CREATE TABLE personal_transactions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    book_id       INT           NOT NULL,
    category_id   INT           NULL,
    category_name VARCHAR(100)  NOT NULL DEFAULT '',   -- denormalised snapshot
    type          ENUM('income','expense') NOT NULL,
    note          VARCHAR(255)  NOT NULL DEFAULT '',
    amount        DECIMAL(14,2) NOT NULL,              -- always positive
    signed_amount DECIMAL(14,2) NOT NULL,              -- +income / -expense
    timestamp     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ptx_book     FOREIGN KEY (book_id)     REFERENCES books(id)      ON DELETE CASCADE,
    CONSTRAINT fk_ptx_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_ptx_book_time ON personal_transactions(book_id, id DESC);
CREATE INDEX idx_ptx_category  ON personal_transactions(category_id);

-- ---------------------------------------------------------------------------
-- Materials (store books) — raw stock tracked independently of products (not
-- linked to any product yet). Modelled on `products` (ready-made): a stock-in
-- carries one buying price, a sale one selling price. Derived stock/totals/last
-- prices are DENORMALISED onto the row (see recomputeMaterial()).
-- image_url is MEDIUMTEXT to hold base64 data URLs.
-- ---------------------------------------------------------------------------
CREATE TABLE materials (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    book_id               INT           NOT NULL,
    name                  VARCHAR(100)  NOT NULL,
    quantity_type         VARCHAR(50)   NOT NULL DEFAULT 'piece',
    image_url             MEDIUMTEXT    NULL,
    current_stock         DECIMAL(14,3) NOT NULL DEFAULT 0,
    total_stock_in        DECIMAL(14,3) NOT NULL DEFAULT 0,
    total_stock_out       DECIMAL(14,3) NOT NULL DEFAULT 0,
    last_purchase_price   DECIMAL(14,2) NULL,
    last_sale_price       DECIMAL(14,2) NULL,
    transaction_count     INT           NOT NULL DEFAULT 0,
    last_transaction_time DATETIME      NULL,
    created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_materials_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    -- A material name is unique within a book (also serves the "ORDER BY name" listing).
    CONSTRAINT uq_material_identity UNIQUE (book_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_materials_book_last_txn ON materials(book_id, last_transaction_time DESC);

-- ---------------------------------------------------------------------------
-- Material transactions — stock in / sale / used. For stock-in and sale the
-- user enters the total price and price_per_unit is the derived per-unit cost
-- (total_amount / quantity). A 'used' entry is consumption only: it lowers
-- stock with no price (price_per_unit and total_amount are 0). total_amount and
-- stock_after are precomputed running values (recomputeMaterial()).
-- ---------------------------------------------------------------------------
CREATE TABLE material_transactions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    material_id    INT                        NOT NULL,
    book_id        INT                        NOT NULL,
    type           ENUM('stock','sale','used') NOT NULL,
    quantity       DECIMAL(14,3)         NOT NULL,
    price_per_unit DECIMAL(14,2)         NOT NULL,   -- derived: total_amount / quantity (0 for 'used')
    total_amount   DECIMAL(14,2)         NOT NULL,   -- entered total price (0 for 'used')
    stock_after    DECIMAL(14,3)         NOT NULL DEFAULT 0,
    note           VARCHAR(255)          NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mt_material FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    CONSTRAINT fk_mt_book     FOREIGN KEY (book_id)     REFERENCES books(id)     ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_mt_material ON material_transactions(material_id, id DESC);

-- ---------------------------------------------------------------------------
-- Operation costs (store books) — a named recurring cost (reason) with a
-- current amount + note. There is no stock/sale action; instead every add/edit
-- appends an immutable snapshot to operation_cost_entries, so the row keeps a
-- full amount history. The parent's `amount` mirrors the latest snapshot and
-- entry_count/last_entry_time are DENORMALISED (see recomputeOperationCost()).
-- ---------------------------------------------------------------------------
CREATE TABLE operation_costs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    book_id         INT           NOT NULL,
    reason          VARCHAR(100)  NOT NULL,
    note            VARCHAR(255)  NOT NULL DEFAULT '',
    amount          DECIMAL(14,2) NOT NULL DEFAULT 0,   -- current (latest) amount
    entry_count     INT           NOT NULL DEFAULT 0,   -- denormalised
    last_entry_time DATETIME      NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_operation_costs_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    -- A reason is unique within a book (the amount history captures changes over time).
    CONSTRAINT uq_operation_identity UNIQUE (book_id, reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_operation_costs_book ON operation_costs(book_id, last_entry_time DESC);

-- ---------------------------------------------------------------------------
-- Operation cost entries — one immutable amount snapshot per add/edit of an
-- operation cost. note is a snapshot at entry time so history renders as it was.
-- ---------------------------------------------------------------------------
CREATE TABLE operation_cost_entries (
    id                CHAR(36)      NOT NULL PRIMARY KEY,
    seq               BIGINT        NOT NULL AUTO_INCREMENT,  -- monotonic insert order
    operation_cost_id INT           NOT NULL,
    book_id           INT           NOT NULL,
    amount            DECIMAL(14,2) NOT NULL,
    note              VARCHAR(255)  NULL,
    timestamp         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_oce_seq (seq),
    CONSTRAINT fk_oce_operation FOREIGN KEY (operation_cost_id) REFERENCES operation_costs(id) ON DELETE CASCADE,
    CONSTRAINT fk_oce_book      FOREIGN KEY (book_id)           REFERENCES books(id)           ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_oce_operation_seq ON operation_cost_entries(operation_cost_id, seq DESC);


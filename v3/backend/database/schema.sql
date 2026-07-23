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
DROP TABLE IF EXISTS customer_balance_history;
DROP TABLE IF EXISTS product_transactions;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS books;

-- ---------------------------------------------------------------------------
-- Books (a "store")
-- ---------------------------------------------------------------------------
CREATE TABLE books (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    logo_url   VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    CONSTRAINT fk_products_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_products_book_name     ON products(book_id, name);
CREATE INDEX idx_products_book_last_txn ON products(book_id, last_transaction_time DESC);

-- ---------------------------------------------------------------------------
-- Product transactions — stock in / sale. total_amount and stock_after are
-- precomputed running values.
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
-- Seed
-- ---------------------------------------------------------------------------
INSERT INTO books (id, name, logo_url) VALUES (1, 'Samad''s Store', './store.svg');

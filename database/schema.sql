-- Tally Application Database Schema
-- Created for cash management and customer balance tracking

CREATE DATABASE IF NOT EXISTS tally;
USE tally;

-- Books table (stores like "Samad's store")
CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    logo_url VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    book_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    total_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (book_id, name),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Customer balance history table
CREATE TABLE customer_balance_history (
    id VARCHAR(50) PRIMARY KEY,
    book_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    type ENUM('paid', 'unpaid') NOT NULL,
    reason TEXT,
    expression TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id, customer_name) REFERENCES customers(book_id, name) ON DELETE CASCADE
);


-- Indexes for performance optimization

-- Index on customers table for lookups
CREATE INDEX idx_customers_book_id ON customers(book_id);
CREATE INDEX idx_customers_name ON customers(name);

-- Index on customer_balance_history table for frequent queries
CREATE INDEX idx_customer_history_book_customer ON customer_balance_history(book_id, customer_name);
CREATE INDEX idx_customer_history_timestamp ON customer_balance_history(timestamp DESC);
CREATE INDEX idx_customer_history_book_customer_timestamp ON customer_balance_history(book_id, customer_name, timestamp DESC);

-- Products table (inventory management)
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity_type VARCHAR(50) NOT NULL DEFAULT 'piece',  -- 'piece' | 'packet' | 'cartoon' | 'kg' | 'liter' | custom
    image_url VARCHAR(500),                               -- nullable
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- Product transactions table (stock and sales tracking)
CREATE TABLE product_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    type ENUM('stock', 'sale') NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,                 -- quantity * price_per_unit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for product tables
CREATE INDEX idx_products_book_id ON products(book_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_product_transactions_product ON product_transactions(product_id);
CREATE INDEX idx_product_transactions_type ON product_transactions(type);

-- Insert a new book
INSERT INTO books (name, logo_url) 
VALUES ('Samad''s Store', './assest/store.svg');
-- Tally Application Database Schema
-- Created for cash management and customer balance tracking

CREATE DATABASE IF NOT EXISTS tally;
USE tally;

-- Books table (stores like "Samad's store")
CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    current_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    logo_url VARCHAR(500) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Transactions table for cash in/out operations
CREATE TABLE transactions (
    id VARCHAR(50) PRIMARY KEY,
    book_id INT NOT NULL,
    type ENUM('cash_in', 'cash_out') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expression TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
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

-- Index on transactions table for frequent queries
CREATE INDEX idx_transactions_book_id ON transactions(book_id);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);
CREATE INDEX idx_transactions_book_timestamp ON transactions(book_id, timestamp DESC);

-- Index on customers table for lookups
CREATE INDEX idx_customers_book_id ON customers(book_id);
CREATE INDEX idx_customers_name ON customers(name);

-- Index on customer_balance_history table for frequent queries
CREATE INDEX idx_customer_history_book_customer ON customer_balance_history(book_id, customer_name);
CREATE INDEX idx_customer_history_timestamp ON customer_balance_history(timestamp DESC);
CREATE INDEX idx_customer_history_book_customer_timestamp ON customer_balance_history(book_id, customer_name, timestamp DESC);

-- Insert a new book
INSERT INTO books (name, current_balance, logo_url) 
VALUES ('Samad''s Store', 0.00, './assest/store.svg');
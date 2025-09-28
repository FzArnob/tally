-- Tally Application Database Schema
-- Created for cash management and customer balance tracking

CREATE DATABASE IF NOT EXISTS tally_app;
USE tally_app;

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
    expression TEXT DEFAULT '',
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
    reason TEXT DEFAULT '',
    expression TEXT DEFAULT '',
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id, customer_name) REFERENCES customers(book_id, name) ON DELETE CASCADE
);
# Tally - Cash Management & Customer Balance Tracking Application

## Overview

**Tally** is a modern, mobile-first web application designed for cash management and customer balance tracking. Built with vanilla HTML, CSS, JavaScript, and PHP, it provides a seamless experience for managing financial transactions without requiring any backend framework or database server beyond MySQL.

The application features a clean Material Design-inspired interface with support for both English and Bengali languages, making it accessible to a wider audience.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [File Structure](#file-structure)
- [Core Features](#core-features)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Localization](#localization)
- [User Interface Components](#user-interface-components)
- [Technical Details](#technical-details)
- [Usage Guide](#usage-guide)
- [Best Practices](#best-practices)

---

## Features

### Core Functionality

1. **Cash Transaction Management**
   - Cash In (revenue tracking)
   - Cash Out (expense tracking)
   - Real-time balance updates
   - Transaction history with timestamps
   - Expression-based calculations (e.g., `5+10*3`)
   - Quick amount buttons for common values

2. **Customer Balance Tracking**
   - Add new customers with order details
   - Track paid/unpaid amounts per customer
   - Individual customer balance history
   - Search and filter customers
   - Real-time balance calculations
   - Embedded calculator for balance adjustments

3. **Advanced Calculator**
   - Full-featured mathematical operations (+, -, ×, ÷)
   - Expression-based input with live preview
   - Percent calculation support
   - Backspace and clear functions
   - Keyboard-friendly interface
   - Smooth slide-up animation

4. **Localization System**
   - English (en-US) and Bengali (bn-BD) language support
   - Cookie-based language persistence
   - Dynamic content updates on language switch
   - Localized number formatting (English/Bengali numerals)
   - Time format localization

5. **Data Management**
   - Transaction deletion with balance reversal
   - Customer balance history management
   - Automatic data synchronization
   - Optimistic UI updates with server reconciliation

---

## Architecture

### Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: PHP 7.4+
- **Database**: MySQL 5.7+
- **Icons**: Material Symbols Outlined (Google Fonts)
- **Currency**: Bangladeshi Taka (৳)

### Design Principles

1. **Mobile-First Approach**: Optimized for touch interactions and mobile devices
2. **Progressive Enhancement**: Works without JavaScript, enhanced with it
3. **State Management**: Client-side state with server reconciliation
4. **Separation of Concerns**: Clear separation between UI, logic, and data layers
5. **Responsive Design**: Adapts to different screen sizes

---

## Installation

### Prerequisites

- XAMPP or similar LAMP stack (Linux/MySQL/PHP/Apache)
- MySQL server running on `localhost`
- PHP 7.4 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Setup Steps

1. **Clone/Copy Files**
   ```bash
   # Copy the entire tally folder to your htdocs directory
   # Example: c:\xampp\htdocs\tally
   ```

2. **Configure Database**
   
   Open `config/database.php` and update credentials:
   ```php
   $host = 'localhost';
   $dbname = 'tally';
   $username = 'root';
   $password = 'root'; // Change from default if needed
   ```

3. **Create Database**
   
   Access phpMyAdmin or MySQL command line and run:
   ```sql
   SOURCE database/schema.sql
   # Or copy-paste the schema.sql content into phpMyAdmin SQL tab
   ```

4. **Verify Installation**
   
   - Open browser and navigate to `http://localhost/tally/v1/`
   - Check that the app loads without errors
   - Verify database connection in console if needed

---

## File Structure

```
tally/
├── api/                          # Backend API endpoints
│   ├── transaction.php          # Create cash transactions (POST)
│   ├── customer-balance.php     # Create customer balance entries (POST)
│   ├── delete-transaction.php   # Delete transactions (DELETE)
│   ├── delete-customer-balance-history.php  # Delete history entries (DELETE)
│   ├── get-book-details.php     # Fetch book details (GET)
│   ├── get-book-transaction-history.php    # Get transaction history (GET)
│   ├── get-book-customers.php   # Get customer list (GET)
│   └── get-book-customer-balance-history.php  # Get customer history (GET)
│
├── config/                      # Configuration files
│   ├── database.php             # Database connection settings
│   └── localization.js          # Language translations
│
├── database/                    # Database-related files
│   └── schema.sql               # Complete database schema
│
├── v1/                         # Frontend application
│   ├── index.html              # Main HTML structure
│   ├── script.js               # Application logic and state management
│   ├── styles.css              # Styling and responsive design
│   └── assest/                 # Static assets
│       └── store.svg           # Store logo/icon
│
├── LICENSE                     # License file
└── README.md                   # This documentation
```

---

## Core Features

### 1. Cash Entry System

**Main Calculator Interface**
- Click on the amount input field to open calculator
- Build mathematical expressions (e.g., `5+10*3`)
- Press "Cash In" for revenue or "Cash Out" for expenses
- Quick buttons for common amounts (৳ 5, ৳ 10, ৳ 20, etc.)

**Calculator Features**
```javascript
// Expression-based calculation
expression = "5+10*3";  // Evaluates to 35 using BODMAS
display = "35";          // Shows result
```

**Transaction Types**
- `cash_in`: Increases book balance (revenue)
- `cash_out`: Decreases book balance (expenses)

### 2. Customer Balance Management

**Adding Customers**
1. Click "Customer Balances" button in header
2. Click "Add" or long-press a customer name
3. Enter customer name and order details
4. Use embedded calculator to calculate amount
5. Press "Paid" (green) or "Unpaid" (red) button

**Customer Balance States**
- **Positive balance**: Customer has paid advance (shown in green)
- **Negative balance**: Customer owes money (shown in red)

**Balance Operations**
- `Paid`: Adds to customer balance (advance payment)
- `Unpaid`: Subtracts from customer balance (deduction/return)

### 3. Transaction History

**Summary View**
- Total Cash In: Sum of all revenue transactions
- Total Cash Out: Sum of all expense transactions
- Net Amount: Difference between cash in and out

**Transaction List**
- Chronological order (newest first)
- Shows expression used for calculation
- Timestamp with date and time
- Delete button for each transaction

### 4. Customer Balance History

**Accessing History**
- Click on a customer name (short press) to edit
- Long-press (600ms) to view history

**History Display**
- All balance changes for the customer
- Reason for each change
- Expression used in calculation
- Timestamp of each entry

---

## API Endpoints

### Base URL
```
http://localhost/tally/api/
```

### 1. Create Transaction (POST)
**Endpoint**: `transaction.php`

**Request Body**:
```json
{
  "book_id": 1,
  "type": "cash_in",
  "amount": 150.50,
  "expression": "5+10*3",
  "timestamp": "2026-07-17 14:30:00"
}
```

**Response**:
```json
{
  "success": true,
  "transaction_id": "67a8b9c0d1e2f3g4h5i6j7k8l9m0n1o2",
  "new_balance": 150.50
}
```

### 2. Create Customer Balance (POST)
**Endpoint**: `customer-balance.php`

**Request Body**:
```json
{
  "book_id": 1,
  "customer_name": "Rahim Uddin",
  "type": "paid",
  "amount": 500.00,
  "reason": "Advance payment for order #123",
  "expression": "100+200+200",
  "timestamp": "2026-07-17 14:35:00"
}
```

**Response**:
```json
{
  "success": true,
  "history_id": "abc123def456ghi789jkl012mno345pqr",
  "customer_name": "Rahim Uddin",
  "new_balance": 500.00
}
```

### 3. Get Book Details (GET)
**Endpoint**: `get-book-details.php?book_id=1`

**Response**:
```json
{
  "id": 1,
  "name": "Samad's Store",
  "current_balance": 150.50,
  "logo_url": "./assest/store.svg"
}
```

### 4. Get Transaction History (GET)
**Endpoint**: `get-book-transaction-history.php?book_id=1`

**Response**:
```json
{
  "transactions": [
    {
      "id": "tx123",
      "type": "cash_in",
      "amount": 150.50,
      "expression": "5+10*3",
      "timestamp": "2026-07-17 14:30:00"
    }
  ],
  "summary": {
    "total_cash_in": 500.00,
    "total_cash_out": 200.00,
    "net_amount": 300.00
  }
}
```

### 5. Get Customers (GET)
**Endpoint**: `get-book-customers.php?book_id=1`

**Response**:
```json
{
  "customers": [
    {
      "name": "Rahim Uddin",
      "total_balance": 500.00
    }
  ],
  "totals": {
    "total_paid": 500.00,
    "total_unpaid": 0.00
  }
}
```

### 6. Get Customer Balance History (GET)
**Endpoint**: `get-book-customer-balance-history.php?book_id=1&customer_name=Rahim%20Uddin`

**Response**:
```json
{
  "customer_name": "Rahim Uddin",
  "history": [
    {
      "id": "hist123",
      "amount": 500.00,
      "type": "paid",
      "reason": "Advance payment",
      "expression": "100+200+200",
      "timestamp": "2026-07-17 14:35:00"
    }
  ]
}
```

### 7. Delete Transaction (DELETE)
**Endpoint**: `delete-transaction.php`

**Request Body**:
```json
{
  "transaction_id": "tx123",
  "book_id": 1
}
```

**Response**:
```json
{
  "success": true,
  "message": "Transaction deleted successfully",
  "new_balance": 0.00,
  "deleted_transaction": {
    "id": "tx123",
    "type": "cash_in",
    "amount": 150.50
  }
}
```

### 8. Delete Customer Balance History (DELETE)
**Endpoint**: `delete-customer-balance-history.php`

**Request Body**:
```json
{
  "history_id": "hist123",
  "book_id": 1,
  "customer_name": "Rahim Uddin"
}
```

**Response**:
```json
{
  "success": true,
  "message": "History entry deleted successfully",
  "new_customer_balance": 0.00,
  "deleted_entry": {
    "id": "hist123",
    "type": "paid",
    "amount": 500.00,
    "customer_name": "Rahim Uddin"
  }
}
```

---

## Database Schema

### Tables Overview

#### 1. `books` Table
Stores book/store information including current balance.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key, auto-increment |
| name | VARCHAR(255) | Book/store name (e.g., "Samad's Store") |
| current_balance | DECIMAL(10,2) | Current balance for the book |
| logo_url | VARCHAR(500) | URL to store logo |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

#### 2. `transactions` Table
Stores all cash in/out transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(50) | Unique transaction identifier |
| book_id | INT | Foreign key to books table |
| type | ENUM | 'cash_in' or 'cash_out' |
| amount | DECIMAL(10,2) | Transaction amount |
| expression | TEXT | Mathematical expression used |
| timestamp | DATETIME | Transaction timestamp |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes**:
- `idx_transactions_book_id` - For book-based queries
- `idx_transactions_timestamp` - For chronological sorting
- `idx_transactions_book_timestamp` - Composite index for common queries

#### 3. `customers` Table
Stores customer information and total balance.

| Column | Type | Description |
|--------|------|-------------|
| book_id | INT | Foreign key to books table |
| name | VARCHAR(255) | Customer name (unique per book) |
| total_balance | DECIMAL(10,2) | Total balance for customer |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Primary Key**: Composite (`book_id`, `name`)

**Indexes**:
- `idx_customers_book_id` - For book-based queries
- `idx_customers_name` - For name lookups

#### 4. `customer_balance_history` Table
Stores detailed history of customer balance changes.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(50) | Unique history entry identifier |
| book_id | INT | Foreign key to books table |
| customer_name | VARCHAR(255) | Customer name |
| amount | DECIMAL(10,2) | Amount of change |
| type | ENUM | 'paid' or 'unpaid' |
| reason | TEXT | Reason for balance change |
| expression | TEXT | Mathematical expression used |
| timestamp | DATETIME | Entry timestamp |
| created_at | TIMESTAMP | Record creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

**Indexes**:
- `idx_customer_history_book_customer` - Composite for customer queries
- `idx_customer_history_timestamp` - For chronological sorting
- `idx_customer_history_book_customer_timestamp` - Composite index

---

## Localization

### Supported Languages

1. **English (en)**
   - Locale: `en-US`
   - Number Format: English numerals (0, 1, 2, ...)
   - Currency: Bangladeshi Taka (৳)

2. **Bengali (bn)**
   - Locale: `bn-BD`
   - Number Format: Bengali numerals (০, ১, ২, ...)
   - Currency: Bangladeshi Taka (৳)

### Language Switching

- Click the language button in header
- Select desired language from dropdown
- Changes persist via cookie (`selectedLanguage`)
- All UI text updates dynamically

### Translation Structure

Located in `config/localization.js`:

```javascript
const translations = {
  en: {
    pageTitle: "Cash Entry - Tally",
    cashIn: "Cash In",
    cashOut: "Cash Out",
    // ... more translations
  },
  bn: {
    pageTitle: "নগদ এন্ট্রি - ট্যালি",
    cashIn: "নগদ জমা",
    cashOut: "খরচ",
    // ... more translations
  }
};
```

### Number Formatting

- **English**: Uses standard digits, comma as thousands separator
- **Bengali**: Uses Bengali digits, localized number formatting

Example:
- English: `৳ 1,234.56`
- Bengali: `৳ ১,২৩৪.৫৬`

---

## User Interface Components

### Main Screen

1. **Header**
   - Language switcher dropdown
   - Customer Balances button
   - History button

2. **Logo Section**
   - Store logo/icon
   - Store name display

3. **Cash Input Section**
   - Read-only amount input field
   - Current balance display (when book has transactions)

4. **Quick Amount Buttons**
   - Pre-set values: ৳ 5, ৳ 10, ৳ 20, ৳ 30, ৳ 40, ৳ 50, ৳ 100, ৳ 500

### Calculator Overlay

**Display Area**
- Main calculation display (large text)
- Expression preview (small text below)

**Keypad Layout** (5 columns × 5 rows)

| Row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 |
|-----|----------|----------|----------|----------|----------|
| 1   | AC       | Backspace| %        | Cash Out |          |
| 2   | 7        | 8        | 9        | ×        | Cash In  |
| 3   | 4        | 5        | 6        | ÷        |          |
| 4   | 1        | 2        | 3        | -        | + (span) |
| 5   | .        | 0        | 00       | =        |          |

**Button Colors**:
- Orange: AC, =, +
- Gray: Numbers, operators
- Green: Cash In
- Red: Cash Out
- Light Gray: %, Backspace

### Transaction History Sidebar

**Summary Section**
- Total Cash In (green)
- Total Cash Out (red)
- Net Amount (color-coded)

**Transaction List**
- Individual transaction cards
- Type indicator (dot + label)
- Timestamp
- Expression and amount
- Delete button

### Customer Balances Sidebar

**Top Row**
- Search input for filtering customers
- Add button to add new customer

**Totals Section** (when customers exist)
- Advance Paid (positive balances)
- Total Unpaid (negative balances)

**Customer List**
- Scrollable list of customers
- Name and balance display
- Color-coded amounts (green/red)
- Click to edit, long-press for history

### Customer Balance Modal

**Header**
- Title: "Add Customer" or "Edit Customer"
- Close button

**Form Fields**
- Customer Name (read-only in edit mode)
- Order Details (textarea)
- Current Balance display

**Embedded Calculator**
- Same layout as main calculator
- Paid/Unpaid buttons instead of Cash In/Out

**Actions**
- Save button (orange)
- Cancel/close options

### Customer Balance History Modal

**Header**
- Customer name + "History" title
- Close button

**History List**
- Scrollable list of balance entries
- Amount with color coding
- Timestamp
- Reason for change
- Expression used
- Delete button for each entry

---

## Technical Details

### State Management

**Global State Variables**:
```javascript
// Cash Entry State
let cashAmount = "";
let isCalculatorOpen = false;
let isHistoryOpen = false;
let transactions = [];
let currentBook = null;

// Customer Balance State
let customerBalances = {}; // { name: { total, history: [] } }
let cbEditingCustomer = null;
let cbHistoryCustomer = null;
let cbLongPressTimer = null;
let cbSearchQuery = "";

// Calculator State
let display = "0";
let expression = "";
let lastEvaluatedValue = 0;
```

### Event Handling

**Click Events**:
- Calculator buttons → Input numbers/operators
- Cash In/Out buttons → Create transactions
- History button → Open transaction history
- Customer Balances button → Open customer list
- Delete buttons → Remove entries with confirmation

**Keyboard Events**:
- Number keys → Calculator input
- Operators (+, -, *, /) → Expression building
- Enter → Perform calculation or save entry
- Escape → Close overlays
- Backspace → Delete last character
- C → Clear calculator

**Touch Events**:
- Touch start/end for button press feedback
- Long press (600ms) for customer history
- Prevents zoom on double tap

### Data Flow

1. **User Action** → Event listener triggered
2. **State Update** → Local state modified
3. **UI Update** → DOM manipulation reflects changes
4. **API Call** → Server-side persistence (if needed)
5. **Reconciliation** → Local state synced with server data

### Error Handling

- Try-catch blocks around API calls
- User-friendly error messages
- Graceful degradation on network failures
- Form validation before submission

---

## Usage Guide

### Getting Started

1. **First Launch**
   - App loads with "Samad's Store" as default book
   - Current balance starts at ৳ 0.00
   - No transactions or customers yet

2. **Recording First Transaction**
   ```
   1. Click on amount input field
   2. Use calculator to enter amount (e.g., "5+10" = 15)
   3. Press "Cash In" for revenue or "Cash Out" for expense
   4. Transaction is recorded and balance updates
   ```

3. **Adding First Customer**
   ```
   1. Click "Customer Balances" in header
   2. Click "Add" button
   3. Enter customer name (e.g., "Rahim Uddin")
   4. Enter order details (optional)
   5. Use calculator to calculate amount
   6. Press "Paid" for advance or "Unpaid" for deduction
   ```

### Common Workflows

#### Recording Daily Cash

**Morning Routine**:
1. Open app and check current balance
2. Record all cash receipts using "Cash In"
3. Record any expenses using "Cash Out"
4. Review transaction history for verification

#### Managing Customer Advances

**Recording Advance Payment**:
1. Navigate to Customer Balances
2. Add or select existing customer
3. Enter advance amount
4. Press "Paid" (green button)
5. Customer balance becomes positive

**Recording Return/Deduction**:
1. Select customer from list
2. Enter deduction amount
3. Press "Unpaid" (red button)
4. Customer balance decreases

#### Deleting Transactions

**Transaction Deletion**:
1. Open transaction history
2. Click delete icon on transaction
3. Confirm deletion
4. Balance automatically reverses

**Customer History Deletion**:
1. Long-press customer name to open history
2. Click delete icon on entry
3. Confirm deletion
4. Customer balance updates

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 0-9 | Calculator input |
| . | Decimal point |
| +, -, *, / | Operators |
| % | Percent calculation |
| Enter | Calculate/Save |
| Escape | Close overlay |
| Backspace | Delete character |
| C | Clear calculator |
| Ctrl+Enter | Save as unpaid (in CB modal) |

---

## Best Practices

### For Users

1. **Regular Data Entry**: Record transactions promptly for accurate tracking
2. **Customer Details**: Always add order details for better context
3. **Review History**: Periodically check transaction and customer history
4. **Language Preference**: Set language preference in settings for consistency

### For Developers

1. **API Security**: Consider adding authentication for production use
2. **Data Validation**: Implement server-side validation for all inputs
3. **Error Logging**: Add comprehensive error logging for debugging
4. **Backup Strategy**: Implement regular database backups
5. **Performance**: Add pagination for large transaction histories

### Database Maintenance

1. **Regular Backups**: Export database regularly using phpMyAdmin or mysqldump
2. **Index Optimization**: Monitor query performance and optimize indexes
3. **Data Cleanup**: Archive old transactions if needed (maintain last 1-2 years)

---

## Troubleshooting

### Common Issues

**Calculator Not Working**
- Ensure JavaScript is enabled in browser
- Check for console errors (F12 → Console)
- Clear browser cache and reload

**Database Connection Failed**
- Verify `config/database.php` credentials
- Ensure MySQL server is running
- Check database exists: `SHOW DATABASES;`

**Transactions Not Saving**
- Verify API endpoints are accessible
- Check PHP error logs in XAMPP
- Ensure POST method is used for create/delete operations

**Language Not Switching**
- Clear cookies and reload
- Check `config/localization.js` for translation keys
- Ensure translations object is properly exported

---

## Security Considerations

1. **Input Validation**: All user inputs are sanitized before database insertion
2. **SQL Injection Prevention**: Prepared statements used throughout
3. **XSS Protection**: HTML escaping for displayed content
4. **CORS Configuration**: Current setup allows all origins (change for production)

### Production Recommendations

- Enable HTTPS
- Add authentication/authorization
- Implement rate limiting on API endpoints
- Add audit logging
- Configure proper CORS policies
- Set up database backups

---

## Future Enhancements

Potential features for future development:

1. **Multi-Book Support**: Manage multiple stores/books from one app
2. **Export Functionality**: Export transactions to CSV/Excel
3. **Reports**: Generate income/expense reports
4. **Notifications**: Push notifications for low balances
5. **Cloud Sync**: Multi-device synchronization
6. **Barcode Scanner**: Quick customer lookup via barcode
7. **Dark Mode**: Additional theme option
8. **Multi-language Support**: Add more languages (Hindi, Urdu, etc.)

---

## License

This project is licensed under the terms specified in the LICENSE file.

---

## Support

For issues or questions:
- Check browser console for errors (F12)
- Review XAMPP error logs
- Verify database schema matches `database/schema.sql`
- Ensure all API endpoints are accessible

---

## Version History

**Current Version**: 1.0.0

**Release Date**: July 2026

**Notable Features Added**:
- Expression-based calculator
- Customer balance tracking
- Multi-language support
- Mobile-first responsive design
- Transaction history management

---

*Built with ❤️ for efficient cash and customer management*

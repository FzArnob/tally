# Tally — Inventory & Customer Balance Tracking

**Tally** is a lightweight point-of-shop app for a small store ("book"). It tracks a store's
**product inventory** (stock in / sales, with derived stock levels) and its **customer balances**
(advance-paid / unpaid ledgers), with an English/Bengali interface and Bangladeshi Taka (৳)
formatting.

It ships in two frontends over one shared backend:

- **`v1/`** — the original mobile-first **web** client (vanilla HTML/CSS/JS).
- **`v2/`** — a **Flutter** app (phone / tablet / desktop / web) — see [`v2/BUILD.md`](v2/BUILD.md).
- **`api/` + `database/` + `config/`** — the shared **PHP + MySQL** backend both clients use.

> **Note:** earlier versions of Tally had a book-level *cash in / cash out* calculator and a
> `transactions` table. Those were removed (commit *"Refactor UI; remove transaction APIs"*). The
> current app is **inventory + customer balances**, documented below.

---

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Project structure](#project-structure)
- [Database schema](#database-schema)
- [API endpoints](#api-endpoints)
- [Localization](#localization)
- [The v2 Flutter app](#the-v2-flutter-app)
- [Security notes](#security-notes)

---

## Features

### 1. Products / Inventory ("Product-wise Cash Flow")
- A grid of products, each with an image, name and **current stock**.
- Add / edit products: name, unit type (piece · packet · cartoon · kg · liter · custom), optional image.
- Record **Stock In** (buying) and **Sale** (selling) entries — `quantity × price` totals computed server-side.
- Per-product **history** with edit and delete.
- **Stock is never stored** — it is always derived: `current_stock = Σ(stock qty) − Σ(sale qty)`.

### 2. Customer Balances
- List customers with a signed balance (green = advance paid, red = owed) and aggregate totals.
- Search / filter customers.
- Add or edit a customer with an **embedded calculator** — **Paid** adds to the balance, **Unpaid** subtracts.
- Per-customer balance **history** with delete (the server reverses the balance on delete).

### 3. Global
- **English / Bengali** UI with **Bengali numerals** (০–৯) and ৳ formatting; the choice is persisted.
- Light / dark theme (follows the OS).
- Interaction model: **tap** a product/customer to act, **long-press** to open its history.

---

## Architecture

**Backend:** PHP 7.4+ with PDO, MySQL 5.7+/8.x, one PHP file per endpoint (no framework/router).
Open CORS (`Access-Control-Allow-Origin: *`), **no authentication**. Served by Apache (XAMPP).

**Data model:** everything is scoped to a **book** (store) via `book_id`, which defaults to `1`
(the seeded "Samad's Store"). Stock and customer balances are recomputed/kept consistent on the
server inside SQL transactions.

**Clients:** `v1/` is a thin vanilla-JS client (`API_BASE = "../api/"`); `v2/` is a Flutter app
that consumes the same endpoints (base URL configurable via `--dart-define`).

---

## Installation (backend + v1 web)

**Prerequisites:** XAMPP (Apache + MySQL + PHP 7.4+), a modern browser.

1. **Copy files** to your web root, e.g. `c:\xampp\htdocs\tally`.
2. **Configure the DB** in `config/database.php` (defaults: host `localhost`, db `tally`, user
   `root`, password `root`).
3. **Create the schema** — import `database/schema.sql` via phpMyAdmin or:
   ```sql
   SOURCE database/schema.sql;
   ```
   This creates the tables and seeds one book ("Samad's Store", `book_id = 1`).
4. **Open the web app:** `http://localhost/tally/v1/`.

For the Flutter app, see [`v2/BUILD.md`](v2/BUILD.md).

---

## Project structure

```
tally/
├── api/                                   # PHP endpoints (one file each)
│   ├── get-book-details.php               # book name + logo
│   ├── get-book-customers.php             # customer list + totals
│   ├── get-book-customer-balance-history.php
│   ├── customer-balance.php               # add paid/unpaid entry (POST)
│   ├── delete-customer-balance-history.php# (DELETE)
│   ├── get-products.php                   # product list (no stock)
│   ├── get-products-with-stock.php        # products + derived stock + transactions
│   ├── get-product.php                    # one product + derived stock
│   ├── save-product.php                   # create/update product (POST)
│   ├── get-product-transactions.php       # a product's stock/sale history
│   ├── save-product-transaction.php       # add stock/sale entry (POST)
│   └── delete-product-transaction.php     # (DELETE)
├── config/
│   ├── database.php                       # PDO connection + JSON helpers
│   └── localization.js                    # v1 web translations (en / bn)
├── database/
│   └── schema.sql                         # complete schema + seed book
├── v1/                                    # web client (HTML / CSS / JS)
│   ├── index.html · script.js · styles.css
│   └── assest/store.svg
├── v2/                                    # Flutter app (see v2/BUILD.md)
├── LICENSE
└── README.md
```

---

## Database schema

Five tables (`database/schema.sql`). All foreign keys cascade on delete.

**`books`** — the store. `id` (PK), `name` (unique), `logo_url`, timestamps.

**`customers`** — `book_id` + `name` (**composite PK — no numeric id**), `total_balance`
(signed: `>0` advance paid, `<0` owed), timestamps.

**`customer_balance_history`** — `id` (string PK, `uniqid`), `book_id`, `customer_name`,
`amount` (always positive), `type` ENUM(`paid`,`unpaid`), `reason`, `expression` (raw calculator
string), `timestamp`, timestamps.

**`products`** — `id` (PK), `book_id`, `name`, `quantity_type` (default `piece`), `image_url`
(nullable; v1/v2 store a base64 data URL), `created_at`. **No stock column** — stock is derived.

**`product_transactions`** — `id` (PK), `product_id`, `type` ENUM(`stock`,`sale`), `quantity`,
`price_per_unit`, `total_amount` (= qty × price, computed server-side), timestamps.

---

## API endpoints

Base URL: `http://localhost/tally/api/<file>.php`. All bodies are **JSON**
(`Content-Type: application/json`), **including DELETE** (the id is read from the body). `book_id`
defaults to `1`. Errors return `{ "error": "..." }` with a 4xx/5xx status. Timestamps are MySQL
`"YYYY-MM-DD HH:MM:SS"` strings.

### Book & customers

| Method | Endpoint | Request | Response (success) |
|---|---|---|---|
| GET | `get-book-details.php?book_id=1` | — | `{ id, name, logo_url }` |
| GET | `get-book-customers.php?book_id=1` | — | `{ customers:[{ name, total_balance }], totals:{ total_paid, total_unpaid } }` |
| GET | `get-book-customer-balance-history.php?book_id=1&customer_name=<enc>` | — | `{ customer_name, history:[{ id, amount, type, reason, expression, timestamp }] }` |
| POST | `customer-balance.php` | `{ book_id, customer_name, type:"paid"\|"unpaid", amount, reason?, expression?, timestamp? }` | `{ success, history_id, customer_name, new_balance }` |
| DELETE | `delete-customer-balance-history.php` | `{ history_id, book_id, customer_name }` | `{ success, new_customer_balance, deleted_entry }` |

The customer is created lazily on the first `customer-balance.php` post. Deleting a history entry
reverses its effect on the customer's balance.

### Products & inventory

| Method | Endpoint | Request | Response (success) |
|---|---|---|---|
| GET | `get-products.php?book_id=1` | — | `{ products:[{ id, name, quantity_type, image_url }] }` |
| GET | `get-products-with-stock.php?book_id=1` | — | `{ products:[{ id, name, quantity_type, image_url, total_stock_in, total_stock_out, current_stock, transactions:[…] }] }` |
| GET | `get-product.php?product_id=<id>` | — | `{ id, name, quantity_type, image_url, total_stock_in, total_stock_out, current_stock }` |
| POST | `save-product.php` | `{ book_id, product_id?, name, quantity_type, image_url? }` (`product_id` present ⇒ update) | `{ success, product }` |
| GET | `get-product-transactions.php?product_id=<id>` | — | `{ product_id, transactions:[{ id, type, quantity, price_per_unit, total_amount, created_at }] }` |
| POST | `save-product-transaction.php` | `{ product_id, type:"stock"\|"sale", quantity, price_per_unit }` | `{ success, transaction }` |
| DELETE | `delete-product-transaction.php` | `{ transaction_id, product_id }` | `{ success, deleted_entry }` |

There is **no "update transaction" endpoint** — editing an entry is a delete + create (this is how
the v2 client implements "edit"). Numeric fields are returned inconsistently (some as strings, e.g.
the nested `transactions` in `get-products-with-stock.php`); parse defensively in clients.

---

## Localization

- **English (`en`, `en-US`)** and **Bengali (`bn`, `bn-BD`)**.
- Currency symbol **৳** is fixed; locale controls digit grouping and (for Bengali) numerals
  (`০–৯`) and month names.
- v1 stores the choice in the `selectedLanguage` cookie; v2 persists it via `shared_preferences`.
- v1 translations live in `config/localization.js`; v2 uses Flutter ARB files
  (`v2/lib/l10n/app_en.arb`, `app_bn.arb`) which also localize the product/inventory strings.

---

## The v2 Flutter app

`v2/` is a Material 3 Flutter app built to be responsive across phone, tablet and desktop:

- **Riverpod** state management, **go_router**, **Dio** networking, feature-first structure
  (`core/`, `features/products`, `features/customers`, `shared/`).
- Responsive layout: the product grid reflows its columns; the Customer Balances panel is an
  end-drawer on phones/tablets and a docked side panel on desktop; forms are bottom sheets on
  phones and dialogs on wider screens.
- Same theme identity as v1 (colors, ৳, green/red balances) rebuilt with Material 3; light/dark.
- Uses the **exact same API/DB** — no backend changes. API base URL is configurable via
  `--dart-define=API_BASE_URL` (default `http://localhost/tally/api/`).

Build and run instructions (APK / IPA / web / dev over adb): **[`v2/BUILD.md`](v2/BUILD.md)**.

---

## Security notes

This app is designed for trusted local/LAN use. Before any public deployment, consider:

- **Authentication/authorization** — the API currently has none and open CORS (`*`).
- **HTTPS** — the API is plain HTTP; serve over TLS in production.
- Prepared statements are used throughout (SQL-injection safe), but error responses can leak
  DB messages — sanitize them for production.
- `image_url` is `VARCHAR(500)`; storing large base64 images inline can exceed it — keep product
  images small or move to file/object storage if needed.

---

## License

See the [LICENSE](LICENSE) file.

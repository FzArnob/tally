-- Tally v3 — migrate an EXISTING tally_v3 in place (no data loss).
--
-- schema.sql is the authority and is re-runnable, but it DROPs every table, so
-- this file exists for a database that already holds real books. It brings the
-- customer tab up to the current schema:
--
--   * customer_balance_history gains `source` ('cash' | 'item') plus the item
--     snapshot columns, and loses the calculator's `expression`.
--   * customer_items gains `paid_amount`, so a line can be part paid instead of
--     being deleted the moment it clears.
--   * customers gains the three denormalised splits the tab sheet reads.
--
-- Re-runnable: every step is guarded, and the backfill is idempotent.
--
--   mysql -u root -p tally_v3 < 2026-07-31-customer-cash-and-partial-payments.sql
--   php recompute_customers.php     <-- REQUIRED second step, see step 4 below
-- =============================================================================

USE tally_v3;
SET time_zone = '+00:00';

-- ---------------------------------------------------------------------------
-- 1. Columns. ADD COLUMN IF NOT EXISTS is MariaDB-only, so each is guarded by
--    information_schema and run through a prepared statement.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS tally_add_column;
DELIMITER //
CREATE PROCEDURE tally_add_column(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
        PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
    END IF;
END //
DELIMITER ;

CALL tally_add_column('customer_balance_history', 'source',
    "source ENUM('cash','item') NOT NULL DEFAULT 'cash' AFTER type");
CALL tally_add_column('customer_balance_history', 'customer_item_id',
    'customer_item_id CHAR(36) NULL AFTER reason');
CALL tally_add_column('customer_balance_history', 'item_name',
    'item_name VARCHAR(100) NULL AFTER customer_item_id');
CALL tally_add_column('customer_balance_history', 'quantity_type',
    "quantity_type VARCHAR(50) NULL AFTER item_name");
CALL tally_add_column('customer_balance_history', 'quantity',
    'quantity DECIMAL(14,3) NULL AFTER quantity_type');
CALL tally_add_column('customer_balance_history', 'price_per_unit',
    'price_per_unit DECIMAL(14,2) NULL AFTER quantity');

CALL tally_add_column('customer_items', 'paid_amount',
    'paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER total_amount');

CALL tally_add_column('customers', 'cash_balance',
    'cash_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER total_balance');
CALL tally_add_column('customers', 'items_due',
    'items_due DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER cash_balance');
CALL tally_add_column('customers', 'total_unpaid',
    'total_unpaid DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER items_due');
CALL tally_add_column('customers', 'total_paid_back',
    'total_paid_back DECIMAL(14,2) NOT NULL DEFAULT 0.00 AFTER total_unpaid');

DROP PROCEDURE tally_add_column;

-- ---------------------------------------------------------------------------
-- 2. Indexes for the reverse lookup from a debt entry back to its sale.
-- ---------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS tally_add_index;
DELIMITER //
CREATE PROCEDURE tally_add_index(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols VARCHAR(255))
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND INDEX_NAME = idx
    ) THEN
        SET @sql = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '` (', cols, ')');
        PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
    END IF;
END //
DELIMITER ;

CALL tally_add_index('customer_balance_history', 'idx_cbh_customer_source', 'customer_id, source');
CALL tally_add_index('product_transactions',  'idx_pt_customer_history', 'customer_history_id');
CALL tally_add_index('material_transactions', 'idx_mt_customer_history', 'customer_history_id');

DROP PROCEDURE tally_add_index;

-- ---------------------------------------------------------------------------
-- 3. Backfill `source` and the item snapshots.
--
-- Every entry a sale points at is a taking; its goods are read straight off
-- that sale. Entries booked by the old settle endpoint are recognised by the
-- label it wrote ("Name × 3") against a line whose id we can still match on the
-- name. Anything else stays 'cash', which is what it is.
-- ---------------------------------------------------------------------------
UPDATE customer_balance_history h
JOIN product_transactions t ON t.customer_history_id = h.id
JOIN products p             ON p.id = t.product_id
SET h.source           = 'item',
    h.customer_item_id = COALESCE(h.customer_item_id, t.customer_item_id),
    h.item_name        = COALESCE(h.item_name, p.name),
    h.quantity_type    = COALESCE(h.quantity_type, p.quantity_type),
    h.quantity         = COALESCE(h.quantity, t.quantity),
    h.price_per_unit   = COALESCE(h.price_per_unit, t.price_per_unit);

UPDATE customer_balance_history h
JOIN material_transactions t ON t.customer_history_id = h.id
JOIN materials m             ON m.id = t.material_id
SET h.source           = 'item',
    h.customer_item_id = COALESCE(h.customer_item_id, t.customer_item_id),
    h.item_name        = COALESCE(h.item_name, m.name),
    h.quantity_type    = COALESCE(h.quantity_type, m.quantity_type),
    h.quantity         = COALESCE(h.quantity, t.quantity),
    h.price_per_unit   = COALESCE(h.price_per_unit, t.price_per_unit);

-- Old settlements: 'paid' entries labelled "<item> × <qty>" that name a line the
-- customer still holds. One that cleared its line entirely cannot be matched and
-- stays 'cash' — it is still the right amount, just counted as cash paid back.
UPDATE customer_balance_history h
JOIN customer_items i
  ON i.customer_id = h.customer_id
 AND h.reason LIKE CONCAT(i.item_name, ' × %')
SET h.source           = 'item',
    h.customer_item_id = COALESCE(h.customer_item_id, i.id),
    h.item_name        = COALESCE(h.item_name, i.item_name),
    h.quantity_type    = COALESCE(h.quantity_type, i.quantity_type),
    h.price_per_unit   = COALESCE(h.price_per_unit, i.price_per_unit),
    h.quantity         = COALESCE(h.quantity, ROUND(h.amount / NULLIF(i.price_per_unit, 0), 3))
WHERE h.type = 'paid' AND h.source = 'cash';

-- Drop the calculator's expression column — nothing reads it any more.
SET @sql = (
    SELECT IF(COUNT(*) > 0,
        'ALTER TABLE customer_balance_history DROP COLUMN expression',
        'DO 0')
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'customer_balance_history' AND COLUMN_NAME = 'expression'
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ---------------------------------------------------------------------------
-- 4. Existing tab lines were stored as "units still unpaid" and deleted once
--    cleared, so nothing has been part paid yet: paid_amount starts at 0 and
--    total_amount is already what is owed.
--
--    This fills the splits straight from the ledger, which is enough to leave
--    the database consistent — but NOT the payment waterfall, which decides
--    which cash covers which goods and lives in recomputeCustomer(). Run
--
--        php recompute_customers.php
--
--    next (same folder) to apply it with the API's own code. Until then a
--    customer may show an advance and unpaid goods at the same time.
-- ---------------------------------------------------------------------------
UPDATE customers c SET
  total_balance   = (SELECT COALESCE(SUM(h.signed_amount), 0) FROM customer_balance_history h WHERE h.customer_id = c.id),
  cash_balance    = (SELECT COALESCE(SUM(h.signed_amount), 0) FROM customer_balance_history h WHERE h.customer_id = c.id AND h.source = 'cash'),
  items_due       = (SELECT COALESCE(SUM(i.total_amount - i.paid_amount), 0) FROM customer_items i WHERE i.customer_id = c.id),
  total_unpaid    = (SELECT COALESCE(SUM(h.amount), 0) FROM customer_balance_history h WHERE h.customer_id = c.id AND h.type = 'unpaid'),
  total_paid_back = (SELECT COALESCE(SUM(h.amount), 0) FROM customer_balance_history h WHERE h.customer_id = c.id AND h.type = 'paid');

-- What the migration ended up with.
SELECT
  (SELECT COUNT(*) FROM customer_balance_history WHERE source = 'item') AS item_entries,
  (SELECT COUNT(*) FROM customer_balance_history WHERE source = 'cash') AS cash_entries,
  (SELECT COUNT(*) FROM customer_items)                                 AS open_lines,
  (SELECT COUNT(*) FROM customers)                                      AS customers;

-- ---------------------------------------------------------------------------
-- Credit limits on a book, and the age of each customer's standing debt.
--
-- Run once against an existing tally_v3 database. schema.sql already carries
-- these columns, so a database created from it needs nothing here.
--
--   mysql -u root -p tally_v3 < migrate_credit_limits.sql
--
-- Every column is nullable with no default, so existing rows are untouched and
-- every book starts with no limits set — the warnings stay silent until someone
-- decides what the rule is.
--
-- debt_since is filled in by recomputeCustomer(), which replays the ledger from
-- the beginning. It stays NULL on existing customers until each one's next
-- entry; the UPDATE at the bottom seeds a reasonable value for the ones already
-- in debt so the feature is not blind on day one. See the note there.
-- ---------------------------------------------------------------------------

ALTER TABLE books
    ADD COLUMN credit_limit DECIMAL(14,2) NULL AFTER type,
    ADD COLUMN credit_days  INT           NULL AFTER credit_limit;

ALTER TABLE customers
    ADD COLUMN debt_since DATETIME NULL AFTER last_transaction_time;

-- Seed: for every customer currently in the red, the moment their present run of
-- owing began. The ledger is walked in SEQ order, not time order — an entry can
-- be booked with an earlier timestamp than the one before it — so this finds the
-- last entry that left the balance square or ahead and takes the one after it.
-- Everything past that point is negative, so the next entry by seq is precisely
-- the one that took them into debt.
--
-- Taking MIN(timestamp) over that run instead would be wrong for exactly the
-- customers whose entries are out of time order, and right everywhere else,
-- which is the worst way to be wrong. recomputeCustomer() walks by seq, so this
-- has to as well or the two would disagree until the next recompute.
--
-- Compared against a plain 0, NOT the epsilon recomputeCustomer() uses. These
-- columns are DECIMAL(14,2): there is no sub-cent noise here to tolerate, and
-- MySQL 8 matches NOTHING for `DECIMAL(14,2) >= -0.005` — the whole subquery
-- comes back NULL and every debt looks as if it began at the customer's very
-- first entry. The epsilon belongs in the PHP replay, where the running balance
-- is a float, and nowhere else.
UPDATE customers c
SET c.debt_since = (
    SELECT h.timestamp
    FROM customer_balance_history h
    WHERE h.customer_id = c.id
      AND h.seq > COALESCE((
          SELECT MAX(h2.seq)
          FROM customer_balance_history h2
          WHERE h2.customer_id = c.id
            AND h2.balance_after >= 0
      ), 0)
    ORDER BY h.seq ASC
    LIMIT 1
)
WHERE c.total_balance < 0;

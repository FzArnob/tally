<?php
/**
 * Re-derive every customer's denormalised figures with the API's own code.
 *
 * Run this ONCE after 2026-07-31-customer-cash-and-partial-payments.sql: the
 * SQL fills the new columns from the ledger as it stands, but the payment
 * waterfall (which cash covers which goods, and how far) only exists in
 * recomputeCustomer(). This walks every customer through it, so an existing
 * database ends up exactly as the app would have written it.
 *
 * Safe to re-run: the recompute is a pure function of the ledger.
 *
 *   php recompute_customers.php
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    exit("Run this from the command line.\n");
}

// index.php is the API's front controller; this flag stops it from trying to
// serve a request when all we want are its helpers.
define('TALLY_NO_DISPATCH', true);
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI']    = '/';
$_SERVER['SCRIPT_NAME']    = '/index.php';

require __DIR__ . '/../../index.php';

$pdo = db();
$customers = $pdo->query('SELECT id, name FROM customers ORDER BY name')->fetchAll();

echo 'Recomputing ' . count($customers) . " customers…\n";
foreach ($customers as $c) {
    $pdo->beginTransaction();
    try {
        $t = recomputeCustomer($pdo, $c['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        echo "  FAILED {$c['name']}: {$e->getMessage()}\n";
        continue;
    }
    printf(
        "  %-20s balance=%10s cash=%10s items=%9s paid_back=%10s\n",
        $c['name'],
        number_format($t['total_balance'], 2, '.', ''),
        number_format($t['cash_balance'], 2, '.', ''),
        number_format($t['items_due'], 2, '.', ''),
        number_format($t['total_paid_back'], 2, '.', '')
    );
}
echo "Done.\n";

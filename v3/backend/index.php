<?php
// Tally v3 — single-file REST API (front controller).
// All requests are routed here by .htaccess. Every calculative value is kept
// denormalised on write (see recomputeCustomer/recomputeProduct) so reads are
// plain SELECTs.

declare(strict_types=1);

require __DIR__ . '/config.php';

// ---- CORS ------------------------------------------------------------------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---- Resolve the route relative to this script's directory -----------------
$method    = $_SERVER['REQUEST_METHOD'];
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$path      = (string) parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($scriptDir !== '' && strpos($path, $scriptDir) === 0) {
    $path = substr($path, strlen($scriptDir));
}
$path = '/' . trim(rawurldecode($path), '/');

// ---- Tiny router -----------------------------------------------------------
$routes = [];
function on(string $method, string $pattern, callable $handler): void
{
    global $routes;
    // Turn "/customers/{id}/history" into a regex with named groups.
    $regex = preg_replace('#\{([a-z_]+)\}#', '(?P<$1>[^/]+)', $pattern);
    $routes[] = [$method, '#^' . $regex . '$#', $handler];
}

function dispatch(): void
{
    global $routes, $method, $path;
    $pathMatched = false;
    foreach ($routes as [$m, $regex, $handler]) {
        if (preg_match($regex, $path, $params)) {
            $pathMatched = true;
            if ($m === $method) {
                // Every route except the API banner and the login endpoint needs a
                // valid session; the resolved user is stashed for authUser().
                if (!($path === '/' || ($path === '/auth/google' && $method === 'POST'))) {
                    $GLOBALS['AUTH_USER'] = requireAuth(db());
                }
                $args = array_filter($params, 'is_string', ARRAY_FILTER_USE_KEY);
                $handler($args);
                return;
            }
        }
    }
    if ($pathMatched) {
        json_error('Method not allowed.', 405);
    }
    json_error('Not found.', 404);
}

// ===========================================================================
// Authentication (Google Sign-In → server-issued session token)
// ===========================================================================

/** Resolve the caller from their bearer token + an unexpired session, or null. */
function currentUser(PDO $pdo): ?array
{
    $token = bearer_token();
    if ($token === null) {
        return null;
    }
    $stmt = $pdo->prepare(
        'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > UTC_TIMESTAMP()'
    );
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

/** Like currentUser() but 401s when there is no valid session. */
function requireAuth(PDO $pdo): array
{
    $u = currentUser($pdo);
    if (!$u) {
        json_error('Please sign in to continue.', 401, 'unauthenticated');
    }
    return $u;
}

/** The user resolved for this request by dispatch() (guaranteed on all guarded routes). */
function authUser(): array
{
    if (empty($GLOBALS['AUTH_USER'])) {
        json_error('Please sign in to continue.', 401, 'unauthenticated');
    }
    return $GLOBALS['AUTH_USER'];
}

/** Fetch the book only if it belongs to the caller; 404 otherwise. */
function requireOwnedBook(PDO $pdo, string $bookId): array
{
    $stmt = $pdo->prepare('SELECT id, user_id, name, type FROM books WHERE id = ? AND user_id = ?');
    $stmt->execute([$bookId, authUser()['id']]);
    $b = $stmt->fetch();
    if (!$b) {
        json_error('Book not found.', 404, 'not_found');
    }
    return $b;
}

/** Google's active signing certificates (PEM keyed by `kid`), cached ~1h on disk. */
function googleSigningCert(string $kid): ?string
{
    static $certs = null;
    if ($certs === null) {
        $cacheFile = sys_get_temp_dir() . '/tally_google_certs.json';
        $raw = false;
        if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < 3600) {
            $raw = file_get_contents($cacheFile);
        }
        if ($raw === false) {
            $raw = @file_get_contents('https://www.googleapis.com/oauth2/v1/certs');
            if ($raw !== false) {
                @file_put_contents($cacheFile, $raw);
            }
        }
        $certs = is_string($raw) ? (json_decode($raw, true) ?: []) : [];
    }
    return $certs[$kid] ?? null;
}

/**
 * Verify a Google ID token locally (RS256 against Google's certs) and return its
 * claims. Any failure ends the request with a 401. This is the whole trust anchor
 * for login, so every check (signature, issuer, audience, expiry) is enforced.
 */
function verifyGoogleIdToken(string $jwt): array
{
    if (GOOGLE_CLIENT_ID === '') {
        json_error('Google sign-in is not configured on the server.', 500, 'not_configured');
    }
    $parts = explode('.', $jwt);
    if (count($parts) !== 3) {
        json_error('Invalid sign-in token.', 401, 'auth_failed');
    }
    [$h64, $p64, $s64] = $parts;
    $header  = json_decode(b64url_decode($h64), true);
    $payload = json_decode(b64url_decode($p64), true);
    if (!is_array($header) || !is_array($payload)) {
        json_error('Invalid sign-in token.', 401, 'auth_failed');
    }
    if (($header['alg'] ?? '') !== 'RS256' || ($header['kid'] ?? '') === '') {
        json_error('Unsupported sign-in token.', 401, 'auth_failed');
    }
    $pem = googleSigningCert((string) $header['kid']);
    if ($pem === null || openssl_verify("$h64.$p64", b64url_decode($s64), $pem, OPENSSL_ALGO_SHA256) !== 1) {
        json_error('Could not verify sign-in token.', 401, 'auth_failed');
    }
    if (!in_array($payload['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)) {
        json_error('Sign-in token has the wrong issuer.', 401, 'auth_failed');
    }
    if (($payload['aud'] ?? '') !== GOOGLE_CLIENT_ID) {
        json_error('Sign-in token was issued for a different app.', 401, 'auth_failed');
    }
    if ((int) ($payload['exp'] ?? 0) < time()) {
        json_error('Sign-in token has expired. Please try again.', 401, 'auth_failed');
    }
    if (empty($payload['sub'])) {
        json_error('Sign-in token is missing a user id.', 401, 'auth_failed');
    }
    return $payload;
}

// ===========================================================================
// Shared recompute helpers (denormalisation lives here)
// ===========================================================================

/** Recompute a customer's total_balance, count, last time + per-row snapshots. */
function recomputeCustomer(PDO $pdo, string $customerId): array
{
    $rows = $pdo->prepare(
        'SELECT id, signed_amount, timestamp FROM customer_balance_history
         WHERE customer_id = ? ORDER BY seq ASC'
    );
    $rows->execute([$customerId]);
    $entries = $rows->fetchAll();

    $running = 0.0;
    $lastTime = null;
    $update = $pdo->prepare('UPDATE customer_balance_history SET balance_after = ? WHERE id = ?');
    foreach ($entries as $e) {
        $running += (float) $e['signed_amount'];
        $update->execute([$running, $e['id']]);
        $lastTime = $e['timestamp'];
    }

    $pdo->prepare(
        'UPDATE customers
         SET total_balance = ?, transaction_count = ?, last_transaction_time = ?
         WHERE id = ?'
    )->execute([$running, count($entries), $lastTime, $customerId]);

    return ['total_balance' => round($running, 2), 'transaction_count' => count($entries), 'last_transaction_time' => $lastTime];
}

/**
 * Recompute a product's denormalised stock/totals/last prices + per-row running
 * stock. Branches on product_type:
 *  - ready_made: stock-in and sale entries drive stock/totals as usual.
 *  - manufacture: SALE-ONLY. Only sales are counted (total_stock_out, last_sale_price,
 *    transaction_count, last_transaction_time). current_stock/total_stock_in/
 *    last_purchase_price stay NULL and each row's stock_after is NULL, because a
 *    sale's material consumption is unknown until the analytics feature lands.
 */
function recomputeProduct(PDO $pdo, string $productId): array
{
    $typeStmt = $pdo->prepare('SELECT product_type FROM products WHERE id = ?');
    $typeStmt->execute([$productId]);
    $isManufacture = $typeStmt->fetchColumn() === 'manufacture';

    // seq ASC is the insert order and never changes, so an edited row keeps its
    // place in the chain: the running stock and "last price" stay chronological.
    $rows = $pdo->prepare(
        'SELECT id, type, quantity, price_per_unit, timestamp FROM product_transactions
         WHERE product_id = ? ORDER BY seq ASC'
    );
    $rows->execute([$productId]);
    $entries = $rows->fetchAll();

    $update = $pdo->prepare('UPDATE product_transactions SET stock_after = ? WHERE id = ?');

    if ($isManufacture) {
        // Sale-only: ignore any stray stock rows, keep running stock NULL.
        $out = 0.0; $lastSale = null; $lastTime = null; $saleCount = 0;
        foreach ($entries as $e) {
            if ($e['type'] === 'sale') {
                $out += (float) $e['quantity'];
                $lastSale = (float) $e['price_per_unit'];
                $lastTime = $e['timestamp'];
                $saleCount++;
            }
            $update->execute([null, $e['id']]);
        }
        $pdo->prepare(
            'UPDATE products SET current_stock = NULL, total_stock_in = NULL, total_stock_out = ?,
                 last_purchase_price = NULL, last_sale_price = ?, transaction_count = ?, last_transaction_time = ?
             WHERE id = ?'
        )->execute([$out, $lastSale, $saleCount, $lastTime, $productId]);

        return [
            'current_stock' => null, 'total_stock_in' => null,
            'total_stock_out' => round($out, 3), 'transaction_count' => $saleCount,
        ];
    }

    $stock = 0.0; $in = 0.0; $out = 0.0;
    $lastPurchase = null; $lastSale = null; $lastTime = null;
    foreach ($entries as $e) {
        $qty = (float) $e['quantity'];
        if ($e['type'] === 'stock') {
            $stock += $qty; $in += $qty; $lastPurchase = (float) $e['price_per_unit'];
        } else {
            $stock -= $qty; $out += $qty; $lastSale = (float) $e['price_per_unit'];
        }
        $update->execute([$stock, $e['id']]);
        $lastTime = $e['timestamp'];
    }

    $pdo->prepare(
        'UPDATE products SET current_stock = ?, total_stock_in = ?, total_stock_out = ?,
             last_purchase_price = ?, last_sale_price = ?, transaction_count = ?, last_transaction_time = ?
         WHERE id = ?'
    )->execute([$stock, $in, $out, $lastPurchase, $lastSale, count($entries), $lastTime, $productId]);

    return [
        'current_stock' => round($stock, 3), 'total_stock_in' => round($in, 3),
        'total_stock_out' => round($out, 3), 'transaction_count' => count($entries),
    ];
}

/** Recompute a material's stock/totals/last prices + per-row running stock. */
function recomputeMaterial(PDO $pdo, string $materialId): array
{
    $rows = $pdo->prepare(
        'SELECT id, type, quantity, price_per_unit, timestamp FROM material_transactions
         WHERE material_id = ? ORDER BY seq ASC'
    );
    $rows->execute([$materialId]);
    $entries = $rows->fetchAll();

    $stock = 0.0; $in = 0.0; $out = 0.0;
    $lastPurchase = null; $lastSale = null; $lastTime = null;
    $update = $pdo->prepare('UPDATE material_transactions SET stock_after = ? WHERE id = ?');
    foreach ($entries as $e) {
        $qty = (float) $e['quantity'];
        if ($e['type'] === 'stock') {
            $stock += $qty; $in += $qty; $lastPurchase = (float) $e['price_per_unit'];
        } elseif ($e['type'] === 'sale') {
            $stock -= $qty; $out += $qty; $lastSale = (float) $e['price_per_unit'];
        } else { // 'used' — stock consumed with no price
            $stock -= $qty; $out += $qty;
        }
        $update->execute([$stock, $e['id']]);
        $lastTime = $e['timestamp'];
    }

    $pdo->prepare(
        'UPDATE materials SET current_stock = ?, total_stock_in = ?, total_stock_out = ?,
             last_purchase_price = ?, last_sale_price = ?, transaction_count = ?, last_transaction_time = ?
         WHERE id = ?'
    )->execute([$stock, $in, $out, $lastPurchase, $lastSale, count($entries), $lastTime, $materialId]);

    return [
        'current_stock' => round($stock, 3), 'total_stock_in' => round($in, 3),
        'total_stock_out' => round($out, 3), 'transaction_count' => count($entries),
    ];
}

/** Recompute an operation cost's denormalised total/count/last time from its entries. */
function recomputeOperationCost(PDO $pdo, string $operationId): void
{
    $agg = $pdo->prepare(
        'SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS cnt, MAX(timestamp) AS last
         FROM operation_cost_entries WHERE operation_cost_id = ?'
    );
    $agg->execute([$operationId]);
    $r = $agg->fetch();

    $pdo->prepare(
        'UPDATE operation_costs SET amount = ?, entry_count = ?, last_entry_time = ? WHERE id = ?'
    )->execute([(float) $r['total'], (int) $r['cnt'], $r['last'], $operationId]);
}

/** Recompute a category's denormalised transaction_count. No-op for null id. */
function recomputeCategory(PDO $pdo, ?string $categoryId): void
{
    if ($categoryId === null) {
        return;
    }
    $pdo->prepare(
        'UPDATE categories
         SET transaction_count = (SELECT COUNT(*) FROM personal_transactions WHERE category_id = ?)
         WHERE id = ?'
    )->execute([$categoryId, $categoryId]);
}

// ---- Shaping helpers (cast SQL strings to clean JSON types) ----------------
function shapeUser(array $u): array
{
    return [
        'id'      => $u['id'],
        'email'   => $u['email'],
        'name'    => $u['name'],
        'picture' => ($u['picture'] ?? '') !== '' ? $u['picture'] : null,
    ];
}

function shapeBook(array $b): array
{
    return [
        'id'   => $b['id'],
        'name' => $b['name'],
        'type' => $b['type'],
    ];
}

function shapeCustomer(array $c): array
{
    return [
        'id'                    => $c['id'],
        'book_id'               => $c['book_id'],
        'name'                  => $c['name'],
        'nickname'              => $c['nickname'],
        'phone'                 => $c['phone'],
        'address'               => $c['address'],
        'total_balance'         => (float) $c['total_balance'],
        'transaction_count'     => (int) $c['transaction_count'],
        'last_transaction_time' => $c['last_transaction_time'],
    ];
}

function shapeProduct(array $p, array $materials = []): array
{
    return [
        'id'                    => $p['id'],
        'book_id'               => $p['book_id'],
        'name'                  => $p['name'],
        'quantity_type'         => $p['quantity_type'],
        'product_type'          => $p['product_type'] ?? 'ready_made',
        // Linked raw materials (manufacture products); empty for ready-made.
        'materials'             => $materials,
        'image_url'             => ($p['image_url'] ?? '') !== '' ? $p['image_url'] : null,
        // NULL for manufacture products (reserved for future analytics).
        'current_stock'         => $p['current_stock'] !== null ? (float) $p['current_stock'] : null,
        'total_stock_in'        => $p['total_stock_in'] !== null ? (float) $p['total_stock_in'] : null,
        'total_stock_out'       => (float) $p['total_stock_out'],
        'last_purchase_price'   => $p['last_purchase_price'] !== null ? (float) $p['last_purchase_price'] : null,
        'last_sale_price'       => $p['last_sale_price'] !== null ? (float) $p['last_sale_price'] : null,
        'transaction_count'     => (int) $p['transaction_count'],
        'last_transaction_time' => $p['last_transaction_time'],
    ];
}

function shapeTransaction(array $t): array
{
    return [
        'id'             => $t['id'],
        'product_id'     => $t['product_id'],
        'type'           => $t['type'],
        'quantity'       => (float) $t['quantity'],
        'price_per_unit' => (float) $t['price_per_unit'],
        'total_amount'   => (float) $t['total_amount'],
        // NULL for manufacture sale rows (running stock is unknown).
        'stock_after'    => $t['stock_after'] !== null ? (float) $t['stock_after'] : null,
        'customer_id'    => $t['customer_id'] ?? null,
        'customer_name'  => $t['customer_name'] ?? null,
        // Went onto a tab at all, paid off since or not — the day totals split
        // takings on this, so a settled line must still count as a tab sale.
        'on_tab'         => onTab($t),
        // Only the history query computes this (see UNPAID_FLAG); elsewhere a
        // freshly written row is never on a tab, so false is right.
        'unpaid'         => !empty($t['unpaid']),
        'note'           => $t['note'],
        // Business time: when the goods moved. Preserved across edits, which is
        // what keeps history order and the day grouping honest.
        'timestamp'      => $t['timestamp'],
        'updated_at'     => $t['updated_at'],
    ];
}

/**
 * Either link is enough: customer_item_id survives payment (the row it names is
 * gone, the id stays), and customer_id covers tab sales written before that
 * column existed. Deleting the customer nulls only the latter.
 */
function onTab(array $t): bool
{
    return !empty($t['customer_item_id']) || !empty($t['customer_id']);
}

/**
 * SQL fragment marking a tab sale that is STILL owed. It asks one thing: does
 * the exact outstanding line this sale wrote still exist? Settling in full
 * deletes that line, so the flag clears on payment without the transaction ever
 * being rewritten, and a later sale of the same goods opens a different line —
 * so paying once keeps that sale paid no matter what is bought afterwards.
 */
const UNPAID_FLAG = 'EXISTS (
                SELECT 1 FROM customer_items ci WHERE ci.id = t.customer_item_id
            ) AS unpaid';

function shapeHistory(array $h): array
{
    return [
        'id'            => $h['id'],
        'customer_id'   => $h['customer_id'],
        'amount'        => (float) $h['amount'],
        'type'          => $h['type'],
        'signed_amount' => (float) $h['signed_amount'],
        'balance_after' => (float) $h['balance_after'],
        'reason'        => $h['reason'],
        'expression'    => $h['expression'],
        'timestamp'     => $h['timestamp'],
    ];
}

function shapeCustomerItem(array $i): array
{
    return [
        'id'             => $i['id'],
        'customer_id'    => $i['customer_id'],
        'item_type'      => $i['item_type'],
        'product_id'     => $i['product_id'],
        'material_id'    => $i['material_id'],
        'item_name'      => $i['item_name'],
        'quantity_type'  => $i['quantity_type'],
        'quantity'       => (float) $i['quantity'],
        'price_per_unit' => (float) $i['price_per_unit'],
        'total_amount'   => (float) $i['total_amount'],
        'timestamp'      => $i['timestamp'],
    ];
}

/**
 * History `reason` for an item movement, e.g. "Rice × 2". Language-neutral on
 * purpose: it is stored once and rendered as-is in both languages.
 */
function itemLabel(string $name, float $quantity): string
{
    $qty = rtrim(rtrim(number_format($quantity, 3, '.', ''), '0'), '.');
    return mb_substr($name . ' × ' . $qty, 0, 255);
}

/**
 * The live tab line behind a sale about to be edited or deleted, or null when
 * the sale never went on a tab.
 *
 * A sale taken onto a customer's tab is three rows — the goods, the outstanding
 * line in customer_items, the debt in customer_balance_history — so touching the
 * goods alone would leave the customer owing the old amount.
 *
 * Refuses outright once the customer has paid: that money is banked, and
 * rewriting or removing the goods would move a balance they have cleared.
 */
function tabLineFor(PDO $pdo, array $tx, string $settledMessage): ?array
{
    if (empty($tx['customer_item_id'])) {
        return null;
    }
    $stmt = $pdo->prepare('SELECT * FROM customer_items WHERE id = ?');
    $stmt->execute([$tx['customer_item_id']]);
    if (!$line = $stmt->fetch()) {
        json_error($settledMessage, 422, 'settled');
    }
    return $line;
}

/**
 * Take a deleted tab sale's goods back off the customer's tab: the units leave
 * the outstanding line (which goes with them if nothing is left owing) and the
 * debt entry it booked is removed. Runs inside the caller's transaction.
 */
function untabSale(PDO $pdo, array $tx, array $line): void
{
    $left = round((float) $line['quantity'] - (float) $tx['quantity'], 3);
    if ($left > 0.0000001) {
        // Other sales are merged into this line; only these units come off.
        $pdo->prepare('UPDATE customer_items SET quantity = ?, total_amount = ? WHERE id = ?')
            ->execute([$left, round($left * (float) $line['price_per_unit'], 2), $line['id']]);
    } else {
        $pdo->prepare('DELETE FROM customer_items WHERE id = ?')->execute([$line['id']]);
    }

    if (!empty($tx['customer_history_id'])) {
        $pdo->prepare('DELETE FROM customer_balance_history WHERE id = ?')
            ->execute([$tx['customer_history_id']]);
    }
    recomputeCustomer($pdo, $tx['customer_id']);
}

/**
 * Re-point a tab sale's debt after its goods row is edited: the outstanding
 * line is re-quantified (a changed price moves the units to the line for that
 * price, merging as taking items does) and the customer's debt entry is
 * rewritten. Returns the line the sale now belongs to — a line that has just
 * been emptied is deleted, and the id kept, so the entry reads as paid.
 *
 * Runs inside the caller's transaction.
 */
function retabSale(PDO $pdo, array $old, array $line, string $itemType, string $itemId, string $itemName, string $unit, float $quantity, float $price, float $total): string
{
    $oldQty = (float) $old['quantity'];
    $column = $itemType === 'product' ? 'product_id' : 'material_id';

    if (abs((float) $line['price_per_unit'] - $price) < 0.005) {
        // Same price: adjust in place, so any other sale merged into this line
        // keeps pointing at a line that still exists.
        $next = round((float) $line['quantity'] - $oldQty + $quantity, 3);
        if ($next > 0.0000001) {
            $pdo->prepare('UPDATE customer_items SET quantity = ?, total_amount = ? WHERE id = ?')
                ->execute([$next, round($next * $price, 2), $line['id']]);
        } else {
            // Already paid for at least what the edit leaves owing.
            $pdo->prepare('DELETE FROM customer_items WHERE id = ?')->execute([$line['id']]);
        }
        $itemRowId = $line['id'];
    } else {
        // Priced differently now: take the old units off the old line …
        $left = round((float) $line['quantity'] - $oldQty, 3);
        if ($left > 0.0000001) {
            $pdo->prepare('UPDATE customer_items SET quantity = ?, total_amount = ? WHERE id = ?')
                ->execute([$left, round($left * (float) $line['price_per_unit'], 2), $line['id']]);
        } else {
            $pdo->prepare('DELETE FROM customer_items WHERE id = ?')->execute([$line['id']]);
        }

        // … and put the new ones on the line for the new price.
        $match = $pdo->prepare(
            "SELECT id, quantity FROM customer_items
             WHERE customer_id = ? AND item_type = ? AND $column = ? AND price_per_unit = ?"
        );
        $match->execute([$old['customer_id'], $itemType, $itemId, $price]);
        if ($target = $match->fetch()) {
            $itemRowId = $target['id'];
            $merged    = round((float) $target['quantity'] + $quantity, 3);
            $pdo->prepare('UPDATE customer_items SET quantity = ?, total_amount = ? WHERE id = ?')
                ->execute([$merged, round($merged * $price, 2), $itemRowId]);
        } else {
            $itemRowId = uuid4();
            $pdo->prepare(
                "INSERT INTO customer_items
                    (id, customer_id, book_id, item_type, $column, item_name, quantity_type, quantity, price_per_unit, total_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )->execute([
                $itemRowId, $old['customer_id'], $old['book_id'], $itemType, $itemId,
                $itemName, $unit, $quantity, $price, $total,
            ]);
        }
    }

    // The debt itself. Untouched entries stay as they are, so a sale written
    // before this link existed simply keeps its original amount.
    if (!empty($old['customer_history_id'])) {
        $pdo->prepare(
            'UPDATE customer_balance_history SET amount = ?, signed_amount = ?, reason = ? WHERE id = ?'
        )->execute([$total, -$total, itemLabel($itemName, $quantity), $old['customer_history_id']]);
    }
    recomputeCustomer($pdo, $old['customer_id']);

    return $itemRowId;
}

function shapeMaterial(array $m): array
{
    return [
        'id'                    => $m['id'],
        'book_id'               => $m['book_id'],
        'name'                  => $m['name'],
        'quantity_type'         => $m['quantity_type'],
        'image_url'             => ($m['image_url'] ?? '') !== '' ? $m['image_url'] : null,
        'current_stock'         => (float) $m['current_stock'],
        'total_stock_in'        => (float) $m['total_stock_in'],
        'total_stock_out'       => (float) $m['total_stock_out'],
        'last_purchase_price'   => $m['last_purchase_price'] !== null ? (float) $m['last_purchase_price'] : null,
        'last_sale_price'       => $m['last_sale_price'] !== null ? (float) $m['last_sale_price'] : null,
        'transaction_count'     => (int) $m['transaction_count'],
        'last_transaction_time' => $m['last_transaction_time'],
    ];
}

function shapeMaterialTransaction(array $t): array
{
    return [
        'id'             => $t['id'],
        'material_id'    => $t['material_id'],
        'type'           => $t['type'],
        'quantity'       => (float) $t['quantity'],
        'price_per_unit' => (float) $t['price_per_unit'],
        'total_amount'   => (float) $t['total_amount'],
        'stock_after'    => (float) $t['stock_after'],
        'customer_id'    => $t['customer_id'] ?? null,
        'customer_name'  => $t['customer_name'] ?? null,
        'on_tab'         => onTab($t),
        'unpaid'         => !empty($t['unpaid']),
        'note'           => $t['note'],
        // Business time: when the goods moved. Preserved across edits, which is
        // what keeps history order and the day grouping honest.
        'timestamp'      => $t['timestamp'],
        'updated_at'     => $t['updated_at'],
    ];
}

function shapeOperationCost(array $o): array
{
    return [
        'id'              => $o['id'],
        'book_id'         => $o['book_id'],
        'reason'          => $o['reason'],
        'note'            => $o['note'],
        'amount'          => (float) $o['amount'],
        'entry_count'     => (int) $o['entry_count'],
        'last_entry_time' => $o['last_entry_time'],
    ];
}

function shapeOperationEntry(array $e): array
{
    return [
        'id'                => $e['id'],
        'operation_cost_id' => $e['operation_cost_id'],
        'amount'            => (float) $e['amount'],
        'note'              => $e['note'],
        'timestamp'         => $e['timestamp'],
    ];
}

function shapeCategory(array $c): array
{
    return [
        'id'                => $c['id'],
        'book_id'           => $c['book_id'],
        'name'              => $c['name'],
        'details'           => $c['details'],
        'type'              => $c['type'],
        'transaction_count' => (int) $c['transaction_count'],
    ];
}

function shapePersonalTx(array $t): array
{
    return [
        'id'            => $t['id'],
        'book_id'       => $t['book_id'],
        'category_id'   => $t['category_id'],
        'category_name' => $t['category_name'],
        'type'          => $t['type'],
        'note'          => $t['note'],
        'amount'        => (float) $t['amount'],
        'signed_amount' => (float) $t['signed_amount'],
        'timestamp'     => $t['timestamp'],
    ];
}

// find*() double as the ownership guard for resources addressed by their own id:
// each joins through books so another user's row is simply "not found".
function findCustomer(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare(
        'SELECT c.* FROM customers c JOIN books b ON b.id = c.book_id
         WHERE c.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$id, authUser()['id']]);
    $c = $stmt->fetch();
    if (!$c) {
        json_error('Customer not found.', 404, 'not_found');
    }
    return $c;
}

function findProduct(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare(
        'SELECT p.* FROM products p JOIN books b ON b.id = p.book_id
         WHERE p.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$id, authUser()['id']]);
    $p = $stmt->fetch();
    if (!$p) {
        json_error('Product not found.', 404, 'not_found');
    }
    return $p;
}

function findMaterial(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare(
        'SELECT m.* FROM materials m JOIN books b ON b.id = m.book_id
         WHERE m.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$id, authUser()['id']]);
    $m = $stmt->fetch();
    if (!$m) {
        json_error('Material not found.', 404, 'not_found');
    }
    return $m;
}

function findOperationCost(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare(
        'SELECT o.* FROM operation_costs o JOIN books b ON b.id = o.book_id
         WHERE o.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$id, authUser()['id']]);
    $o = $stmt->fetch();
    if (!$o) {
        json_error('Operation cost not found.', 404, 'not_found');
    }
    return $o;
}

function findCategory(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare(
        'SELECT c.* FROM categories c JOIN books b ON b.id = c.book_id
         WHERE c.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$id, authUser()['id']]);
    $c = $stmt->fetch();
    if (!$c) {
        json_error('Category not found.', 404, 'not_found');
    }
    return $c;
}

function findPersonalTx(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare(
        'SELECT t.* FROM personal_transactions t JOIN books b ON b.id = t.book_id
         WHERE t.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$id, authUser()['id']]);
    $t = $stmt->fetch();
    if (!$t) {
        json_error('Transaction not found.', 404, 'not_found');
    }
    return $t;
}

// ---- Manufacture material-link helpers --------------------------------------

/**
 * The materials a manufacture product is linked to, with just enough denormalised
 * material info for the stock-details card. No image_url — the product list stays
 * lean; the product form fetches full materials (with images) separately.
 */
function loadProductMaterials(PDO $pdo, string $productId): array
{
    $stmt = $pdo->prepare(
        'SELECT m.id, m.name, m.quantity_type, m.current_stock, m.last_purchase_price
         FROM product_materials pm JOIN materials m ON m.id = pm.material_id
         WHERE pm.product_id = ? ORDER BY m.name ASC'
    );
    $stmt->execute([$productId]);
    return array_map(fn($r) => [
        'id'                  => $r['id'],
        'name'                => $r['name'],
        'quantity_type'       => $r['quantity_type'],
        'current_stock'       => (float) $r['current_stock'],
        'last_purchase_price' => $r['last_purchase_price'] !== null ? (float) $r['last_purchase_price'] : null,
    ], $stmt->fetchAll());
}

/**
 * Normalise incoming material ids to a unique, book-scoped, validated list.
 * Ids that don't belong to $bookId are silently dropped (capped at 50).
 */
function parseMaterialIds($raw, PDO $pdo, string $bookId): array
{
    if (!is_array($raw)) {
        return [];
    }
    $ids = [];
    foreach ($raw as $v) {
        if (is_string($v) && $v !== '') {
            $ids[$v] = true;   // dedupe via keys
        }
    }
    $ids = array_slice(array_keys($ids), 0, 50);
    if (!$ids) {
        return [];
    }
    // Keep only ids that are real materials in this book.
    $ph = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT id FROM materials WHERE book_id = ? AND id IN ($ph)");
    $stmt->execute([$bookId, ...$ids]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/** Replace a product's linked-material set with the given ids. */
function syncProductMaterials(PDO $pdo, string $productId, string $bookId, array $ids): void
{
    $pdo->prepare('DELETE FROM product_materials WHERE product_id = ?')->execute([$productId]);
    if (!$ids) {
        return;
    }
    $ins = $pdo->prepare(
        'INSERT INTO product_materials (product_id, material_id, book_id) VALUES (?, ?, ?)'
    );
    foreach ($ids as $materialId) {
        $ins->execute([$productId, $materialId, $bookId]);
    }
}

// ===========================================================================
// Routes
// ===========================================================================

on('GET', '/', fn() => json_response(['name' => 'Tally v3 API', 'status' => 'ok']));

// ---- Auth ----
on('POST', '/auth/google', function () {
    $pdo  = db();
    $body = read_json_body();
    $idToken = is_string($body['id_token'] ?? null) ? trim($body['id_token']) : '';
    if ($idToken === '') {
        json_error('Missing sign-in token.', 422, 'validation');
    }
    $claims  = verifyGoogleIdToken($idToken);
    $sub     = (string) $claims['sub'];
    $email   = is_string($claims['email']   ?? null) ? $claims['email']   : '';
    $name    = is_string($claims['name']    ?? null) ? $claims['name']    : '';
    $picture = is_string($claims['picture'] ?? null) ? $claims['picture'] : '';

    // Upsert the user by their stable Google subject, refreshing the profile.
    $stmt = $pdo->prepare('SELECT id FROM users WHERE google_id = ?');
    $stmt->execute([$sub]);
    $existing = $stmt->fetch();
    if ($existing) {
        $userId = $existing['id'];
        $pdo->prepare('UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?')
            ->execute([$email, $name, $picture, $userId]);
    } else {
        $userId = uuid4();
        $pdo->prepare('INSERT INTO users (id, google_id, email, name, picture) VALUES (?, ?, ?, ?, ?)')
            ->execute([$userId, $sub, $email, $name, $picture]);
    }

    // Mint an opaque, revocable session token.
    $token = bin2hex(random_bytes(32));
    $pdo->prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
        ->execute([$token, $userId, gmdate('Y-m-d H:i:s', time() + SESSION_TTL)]);

    $u = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $u->execute([$userId]);
    json_response(['success' => true, 'token' => $token, 'user' => shapeUser($u->fetch())]);
});

on('GET', '/auth/me', function () {
    json_response(['user' => shapeUser(authUser())]);
});

on('POST', '/auth/logout', function () {
    $token = bearer_token();
    if ($token !== null) {
        db()->prepare('DELETE FROM sessions WHERE token = ?')->execute([$token]);
    }
    json_response(['success' => true]);
});

// ---- Books ----
on('GET', '/books', function () {
    $stmt = db()->prepare('SELECT id, name, type FROM books WHERE user_id = ? ORDER BY seq ASC');
    $stmt->execute([authUser()['id']]);
    $books = array_map('shapeBook', $stmt->fetchAll());
    json_response(['books' => $books]);
});

on('POST', '/books', function () {
    $pdo  = db();
    $body = read_json_body();
    $name = v_string($body['name'] ?? '', 100, true, 'Book name');
    $type = $body['type'] ?? 'store';
    if (!in_array($type, ['store', 'personal'], true)) {
        json_error('Type must be "store" or "personal".', 422, 'validation');
    }

    $id = uuid4();
    $pdo->prepare('INSERT INTO books (id, user_id, name, type) VALUES (?, ?, ?, ?)')
        ->execute([$id, authUser()['id'], $name, $type]);

    // Seed a starter set of categories for a new personal book.
    if ($type === 'personal') {
        $defaults = [
            ['income', 'Salary'], ['income', 'Freelance'],
            ['expense', 'Food'], ['expense', 'Bills'], ['expense', 'Transport'], ['expense', 'Shopping'],
        ];
        $ins = $pdo->prepare('INSERT INTO categories (id, book_id, name, type) VALUES (?, ?, ?, ?)');
        foreach ($defaults as [$catType, $catName]) {
            $ins->execute([uuid4(), $id, $catName, $catType]);
        }
    }

    $stmt = $pdo->prepare('SELECT id, name, type FROM books WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['success' => true, 'book' => shapeBook($stmt->fetch())], 201);
});

on('GET', '/books/{id}', function ($a) {
    json_response(shapeBook(requireOwnedBook(db(), $a['id'])));
});

on('PUT', '/books/{id}', function ($a) {
    $pdo = db();
    $id  = $a['id'];
    requireOwnedBook($pdo, $id);

    $body = read_json_body();
    $name = v_string($body['name'] ?? '', 100, true, 'Book name');
    $type = $body['type'] ?? 'store';
    if (!in_array($type, ['store', 'personal'], true)) {
        json_error('Type must be "store" or "personal".', 422, 'validation');
    }

    $pdo->prepare('UPDATE books SET name = ?, type = ? WHERE id = ?')->execute([$name, $type, $id]);

    $stmt = $pdo->prepare('SELECT id, name, type FROM books WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['success' => true, 'book' => shapeBook($stmt->fetch())]);
});

on('DELETE', '/books/{id}', function ($a) {
    $pdo = db();
    $id  = $a['id'];
    requireOwnedBook($pdo, $id);
    // FK cascades remove the book's products, customers, transactions and history.
    $pdo->prepare('DELETE FROM books WHERE id = ?')->execute([$id]);
    json_response(['success' => true]);
});

// ---- Customers ----
on('GET', '/books/{id}/customers', function ($a) {
    $pdo = db();
    requireOwnedBook($pdo, $a['id']);
    $stmt = $pdo->prepare(
        'SELECT * FROM customers WHERE book_id = ? ORDER BY name ASC, nickname ASC'
    );
    $stmt->execute([$a['id']]);
    $customers = array_map('shapeCustomer', $stmt->fetchAll());

    $paid = 0.0; $unpaid = 0.0;
    foreach ($customers as $c) {
        if ($c['total_balance'] >= 0) $paid += $c['total_balance'];
        else $unpaid += abs($c['total_balance']);
    }
    json_response([
        'customers' => $customers,
        'totals'    => ['total_paid' => round($paid, 2), 'total_unpaid' => round($unpaid, 2)],
    ]);
});

on('POST', '/books/{id}/customers', function ($a) {
    $pdo = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $body = read_json_body();

    $name     = v_string($body['name']     ?? '', 100, true,  'Name');
    $nickname = v_string($body['nickname']  ?? '', 100, false, 'Nickname');
    $phone    = v_phone($body['phone']      ?? '');
    $address  = v_string($body['address']   ?? '', 255, false, 'Address');

    // Same name allowed only with a distinct nickname.
    $sameName = $pdo->prepare('SELECT COUNT(*) FROM customers WHERE book_id = ? AND name = ?');
    $sameName->execute([$bookId, $name]);
    if ((int) $sameName->fetchColumn() > 0 && $nickname === '') {
        json_error('A customer named "' . $name . '" already exists. Add a nickname to tell them apart.', 409, 'nickname_required');
    }

    $exact = $pdo->prepare('SELECT COUNT(*) FROM customers WHERE book_id = ? AND name = ? AND nickname = ?');
    $exact->execute([$bookId, $name, $nickname]);
    if ((int) $exact->fetchColumn() > 0) {
        json_error('A customer with this name and nickname already exists.', 409, 'duplicate');
    }

    $id = uuid4();
    $pdo->prepare(
        'INSERT INTO customers (id, book_id, name, nickname, phone, address) VALUES (?, ?, ?, ?, ?, ?)'
    )->execute([$id, $bookId, $name, $nickname, $phone, $address]);

    json_response(['success' => true, 'customer' => shapeCustomer(findCustomer($pdo, $id))], 201);
});

on('GET', '/customers/{id}', function ($a) {
    json_response(['customer' => shapeCustomer(findCustomer(db(), $a['id']))]);
});

on('PUT', '/customers/{id}', function ($a) {
    $pdo = db();
    $existing = findCustomer($pdo, $a['id']);
    $bookId = $existing['book_id'];
    $body = read_json_body();

    $name     = v_string($body['name']     ?? '', 100, true,  'Name');
    $nickname = v_string($body['nickname']  ?? '', 100, false, 'Nickname');
    $phone    = v_phone($body['phone']      ?? '');
    $address  = v_string($body['address']   ?? '', 255, false, 'Address');

    $sameName = $pdo->prepare('SELECT COUNT(*) FROM customers WHERE book_id = ? AND name = ? AND id <> ?');
    $sameName->execute([$bookId, $name, $existing['id']]);
    if ((int) $sameName->fetchColumn() > 0 && $nickname === '') {
        json_error('Another customer named "' . $name . '" exists. Add a nickname to tell them apart.', 409, 'nickname_required');
    }

    $exact = $pdo->prepare('SELECT COUNT(*) FROM customers WHERE book_id = ? AND name = ? AND nickname = ? AND id <> ?');
    $exact->execute([$bookId, $name, $nickname, $existing['id']]);
    if ((int) $exact->fetchColumn() > 0) {
        json_error('A customer with this name and nickname already exists.', 409, 'duplicate');
    }

    $pdo->prepare(
        'UPDATE customers SET name = ?, nickname = ?, phone = ?, address = ? WHERE id = ?'
    )->execute([$name, $nickname, $phone, $address, $existing['id']]);

    json_response(['success' => true, 'customer' => shapeCustomer(findCustomer($pdo, $existing['id']))]);
});

on('DELETE', '/customers/{id}', function ($a) {
    $pdo = db();
    findCustomer($pdo, $a['id']);
    $pdo->prepare('DELETE FROM customers WHERE id = ?')->execute([$a['id']]);
    json_response(['success' => true]);
});

on('GET', '/customers/{id}/history', function ($a) {
    $pdo = db();
    findCustomer($pdo, $a['id']);
    $stmt = $pdo->prepare(
        'SELECT * FROM customer_balance_history WHERE customer_id = ? ORDER BY seq DESC'
    );
    $stmt->execute([$a['id']]);
    json_response([
        'customer_id' => $a['id'],
        'history'     => array_map('shapeHistory', $stmt->fetchAll()),
    ]);
});

on('POST', '/customers/{id}/balance', function ($a) {
    $pdo = db();
    $customer = findCustomer($pdo, $a['id']);
    $body = read_json_body();

    $type = $body['type'] ?? '';
    if (!in_array($type, ['paid', 'unpaid'], true)) {
        json_error('Type must be "paid" or "unpaid".', 422, 'validation');
    }
    $amount     = v_amount($body['amount'] ?? null, 'Amount');
    $reason     = v_string($body['reason']     ?? '', 255, false, 'Reason');
    $expression = v_string($body['expression'] ?? '', 255, false, 'Expression');
    $signed     = $type === 'paid' ? $amount : -$amount;
    $timestamp  = date('Y-m-d H:i:s');

    $pdo->beginTransaction();
    try {
        $historyId = uuid4();
        $pdo->prepare(
            'INSERT INTO customer_balance_history
                (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, expression, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)'
        )->execute([
            $historyId, $customer['id'], $customer['book_id'], $amount, $type, $signed,
            $reason !== '' ? $reason : null, $expression !== '' ? $expression : null, $timestamp,
        ]);
        $totals = recomputeCustomer($pdo, $customer['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save balance.', 500);
    }

    json_response([
        'success'     => true,
        'history_id'  => $historyId,
        'customer_id' => $customer['id'],
        'new_balance' => $totals['total_balance'],
    ], 201);
});

// Edit one history entry IN PLACE: seq and timestamp are kept, so the entry holds
// its position in the running-balance chain (recomputeCustomer walks seq ASC).
on('PUT', '/balance-history/{id}', function ($a) {
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT h.* FROM customer_balance_history h JOIN books b ON b.id = h.book_id
         WHERE h.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$a['id'], authUser()['id']]);
    $entry = $stmt->fetch();
    if (!$entry) {
        json_error('History entry not found.', 404, 'not_found');
    }

    $body = read_json_body();
    $type = $body['type'] ?? '';
    if (!in_array($type, ['paid', 'unpaid'], true)) {
        json_error('Type must be "paid" or "unpaid".', 422, 'validation');
    }
    $amount     = v_amount($body['amount'] ?? null, 'Amount');
    $reason     = v_string($body['reason']     ?? '', 255, false, 'Reason');
    $expression = v_string($body['expression'] ?? '', 255, false, 'Expression');
    $signed     = $type === 'paid' ? $amount : -$amount;

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'UPDATE customer_balance_history
             SET amount = ?, type = ?, signed_amount = ?, reason = ?, expression = ?
             WHERE id = ?'
        )->execute([
            $amount, $type, $signed,
            $reason !== '' ? $reason : null, $expression !== '' ? $expression : null,
            $entry['id'],
        ]);
        $totals = recomputeCustomer($pdo, $entry['customer_id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to update history entry.', 500);
    }

    json_response([
        'success'     => true,
        'history_id'  => $entry['id'],
        'customer_id' => $entry['customer_id'],
        'new_balance' => $totals['total_balance'],
    ]);
});

on('DELETE', '/balance-history/{id}', function ($a) {
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT h.* FROM customer_balance_history h JOIN books b ON b.id = h.book_id
         WHERE h.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$a['id'], authUser()['id']]);
    $entry = $stmt->fetch();
    if (!$entry) {
        json_error('History entry not found.', 404, 'not_found');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM customer_balance_history WHERE id = ?')->execute([$a['id']]);
        $totals = recomputeCustomer($pdo, $entry['customer_id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to delete history entry.', 500);
    }

    json_response(['success' => true, 'new_balance' => $totals['total_balance']]);
});

// ---- Customer items (goods taken on the tab, not yet paid for) --------------

/** Outstanding items for a customer, newest first. */
on('GET', '/customers/{id}/items', function ($a) {
    $pdo = db();
    findCustomer($pdo, $a['id']);
    // Biggest debt first; newest breaks a tie.
    $stmt = $pdo->prepare(
        'SELECT * FROM customer_items WHERE customer_id = ? ORDER BY total_amount DESC, seq DESC'
    );
    $stmt->execute([$a['id']]);
    $items = array_map('shapeCustomerItem', $stmt->fetchAll());
    json_response([
        'customer_id' => $a['id'],
        'items'       => $items,
        'total'       => round(array_sum(array_column($items, 'total_amount')), 2),
    ]);
});

/**
 * Take one or more items onto a customer's tab. Each line does three things in a
 * single transaction: records the real sale (stock goes down), adds/bumps the
 * outstanding row, and books the debt as an 'unpaid' balance entry.
 */
on('POST', '/customers/{id}/items', function ($a) {
    $pdo      = db();
    $customer = findCustomer($pdo, $a['id']);
    $bookId   = $customer['book_id'];
    $body     = read_json_body();

    $rows = $body['items'] ?? null;
    if (!is_array($rows) || count($rows) === 0) {
        json_error('Pick at least one item.', 422, 'validation');
    }
    if (count($rows) > 50) {
        json_error('Too many items at once (max 50).', 422, 'validation');
    }

    // Resolve and validate every line BEFORE writing anything, so one bad line
    // rejects the whole basket instead of leaving half of it applied. Quantities
    // are tallied per item so two lines of the same product can't jointly
    // oversell the stock in hand.
    $lines   = [];
    $wanted  = [];
    foreach ($rows as $r) {
        $type = $r['item_type'] ?? '';
        if (!in_array($type, ['product', 'material'], true)) {
            json_error('Item type must be "product" or "material".', 422, 'validation');
        }
        $itemId = is_string($r['item_id'] ?? null) ? $r['item_id'] : '';
        if ($itemId === '') {
            json_error('Item is required.', 422, 'validation');
        }
        $qty = v_amount($r['quantity'] ?? null, 'Quantity');
        if (!isset($r['price_per_unit']) || !is_numeric($r['price_per_unit']) || (float) $r['price_per_unit'] < 0) {
            json_error('Price must be 0 or more.', 422, 'validation');
        }
        $price = round((float) $r['price_per_unit'], 2);

        $src = $type === 'product' ? findProduct($pdo, $itemId) : findMaterial($pdo, $itemId);
        if ($src['book_id'] !== $bookId) {
            json_error('That item belongs to another book.', 422, 'validation');
        }

        $key = $type . ':' . $itemId;
        $wanted[$key] = ($wanted[$key] ?? 0) + $qty;

        // Stock guard, mirroring the sale endpoints. Manufacture products carry a
        // NULL stock (unknown until analytics lands), so they are never blocked.
        if ($src['current_stock'] !== null && $wanted[$key] - (float) $src['current_stock'] > 0.0000001) {
            $avail = rtrim(rtrim(number_format((float) $src['current_stock'], 3, '.', ''), '0'), '.');
            json_error(
                'Not enough stock for "' . $src['name'] . '". Only ' . $avail . ' in stock.',
                422,
                'insufficient_stock'
            );
        }

        $lines[] = [
            'type'     => $type,
            'id'       => $itemId,
            'name'     => $src['name'],
            'unit'     => $src['quantity_type'],
            'quantity' => $qty,
            'price'    => $price,
            'total'    => round($qty * $price, 2),
        ];
    }

    $timestamp = date('Y-m-d H:i:s');
    $pdo->beginTransaction();
    try {
        // customer_id / customer_item_id stamp the sale as "went onto a tab", so
        // the product's own history can flag it instead of showing a plain
        // counter sale. The tab line is resolved first — the sale row needs its id.
        $saleProduct  = $pdo->prepare(
            'INSERT INTO product_transactions (id, product_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, customer_id, customer_item_id, customer_history_id, timestamp)
             VALUES (?, ?, ?, \'sale\', ?, ?, ?, 0, ?, ?, ?, ?)'
        );
        $saleMaterial = $pdo->prepare(
            'INSERT INTO material_transactions (id, material_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, customer_id, customer_item_id, customer_history_id, timestamp)
             VALUES (?, ?, ?, \'sale\', ?, ?, ?, 0, ?, ?, ?, ?)'
        );
        $debt = $pdo->prepare(
            'INSERT INTO customer_balance_history
                (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, timestamp)
             VALUES (?, ?, ?, ?, \'unpaid\', ?, 0, ?, ?)'
        );

        foreach ($lines as $l) {
            $isProduct = $l['type'] === 'product';

            // Merge into an existing unpaid line for the same item at the same
            // price; a different agreed price stays its own row. A line settled
            // earlier is gone, so re-taking the goods opens a fresh one — which
            // is what keeps the older, already-paid sale from re-flagging.
            $col   = $isProduct ? 'product_id' : 'material_id';
            $match = $pdo->prepare(
                "SELECT id, quantity FROM customer_items
                 WHERE customer_id = ? AND item_type = ? AND $col = ? AND price_per_unit = ?"
            );
            $match->execute([$customer['id'], $l['type'], $l['id'], $l['price']]);
            if ($existing = $match->fetch()) {
                $itemRowId = $existing['id'];
                $merged    = (float) $existing['quantity'] + $l['quantity'];
                $pdo->prepare('UPDATE customer_items SET quantity = ?, total_amount = ? WHERE id = ?')
                    ->execute([$merged, round($merged * $l['price'], 2), $itemRowId]);
            } else {
                $itemRowId = uuid4();
                $pdo->prepare(
                    "INSERT INTO customer_items
                        (id, customer_id, book_id, item_type, $col, item_name, quantity_type, quantity, price_per_unit, total_amount, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )->execute([
                    $itemRowId, $customer['id'], $bookId, $l['type'], $l['id'],
                    $l['name'], $l['unit'], $l['quantity'], $l['price'], $l['total'], $timestamp,
                ]);
            }

            // The debt entry's id rides along on the sale, so editing the sale
            // later can rewrite that one entry instead of guessing which it was.
            $debtId = uuid4();
            $debt->execute([
                $debtId, $customer['id'], $bookId, $l['total'], -$l['total'],
                itemLabel($l['name'], $l['quantity']), $timestamp,
            ]);

            ($isProduct ? $saleProduct : $saleMaterial)->execute([
                uuid4(), $l['id'], $bookId, $l['quantity'], $l['price'], $l['total'],
                $customer['id'], $itemRowId, $debtId, $timestamp,
            ]);
        }

        // One recompute per distinct item, then the customer's running balance.
        foreach (array_keys($wanted) as $key) {
            [$type, $id] = explode(':', $key, 2);
            $type === 'product' ? recomputeProduct($pdo, $id) : recomputeMaterial($pdo, $id);
        }
        $totals = recomputeCustomer($pdo, $customer['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to add items.', 500);
    }

    // Biggest debt first; newest breaks a tie.
    $stmt = $pdo->prepare(
        'SELECT * FROM customer_items WHERE customer_id = ? ORDER BY total_amount DESC, seq DESC'
    );
    $stmt->execute([$customer['id']]);
    json_response([
        'success'     => true,
        'items'       => array_map('shapeCustomerItem', $stmt->fetchAll()),
        'new_balance' => $totals['total_balance'],
    ], 201);
});

/**
 * Settle units of an outstanding item — the customer pays for what they already
 * took. Stock is untouched (the goods left the shop when the item was added);
 * only the unpaid count drops and a 'paid' entry is booked. The row disappears
 * once nothing is left owing.
 */
on('POST', '/customer-items/{id}/settle', function ($a) {
    $pdo  = db();
    $stmt = $pdo->prepare(
        'SELECT i.* FROM customer_items i JOIN books b ON b.id = i.book_id
         WHERE i.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$a['id'], authUser()['id']]);
    $item = $stmt->fetch();
    if (!$item) {
        json_error('Item not found.', 404, 'not_found');
    }

    $body    = read_json_body();
    $onHand  = (float) $item['quantity'];
    // Default to a single unit — the list's minus button settles one per tap.
    $qty     = isset($body['quantity']) && is_numeric($body['quantity']) ? (float) $body['quantity'] : 1.0;
    if ($qty <= 0) {
        json_error('Quantity must be greater than 0.', 422, 'validation');
    }
    $qty       = min(round($qty, 3), $onHand); // never settle more than is owed
    $price     = (float) $item['price_per_unit'];
    $amount    = round($qty * $price, 2);
    $remaining = round($onHand - $qty, 3);

    $pdo->beginTransaction();
    try {
        if ($remaining > 0) {
            $pdo->prepare('UPDATE customer_items SET quantity = ?, total_amount = ? WHERE id = ?')
                ->execute([$remaining, round($remaining * $price, 2), $item['id']]);
        } else {
            $pdo->prepare('DELETE FROM customer_items WHERE id = ?')->execute([$item['id']]);
        }
        if ($amount > 0) {
            $pdo->prepare(
                'INSERT INTO customer_balance_history
                    (id, customer_id, book_id, amount, type, signed_amount, balance_after, reason, timestamp)
                 VALUES (?, ?, ?, ?, \'paid\', ?, 0, ?, ?)'
            )->execute([
                uuid4(), $item['customer_id'], $item['book_id'], $amount, $amount,
                itemLabel($item['item_name'], $qty), date('Y-m-d H:i:s'),
            ]);
        }
        $totals = recomputeCustomer($pdo, $item['customer_id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to settle item.', 500);
    }

    // Biggest debt first; newest breaks a tie.
    $stmt = $pdo->prepare(
        'SELECT * FROM customer_items WHERE customer_id = ? ORDER BY total_amount DESC, seq DESC'
    );
    $stmt->execute([$item['customer_id']]);
    json_response([
        'success'     => true,
        'items'       => array_map('shapeCustomerItem', $stmt->fetchAll()),
        'new_balance' => $totals['total_balance'],
    ]);
});

// ---- Products ----
on('GET', '/books/{id}/products', function ($a) {
    $pdo    = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $stmt = $pdo->prepare('SELECT * FROM products WHERE book_id = ? ORDER BY name ASC');
    $stmt->execute([$bookId]);
    $products = $stmt->fetchAll();

    // The list intentionally omits each product's linked materials (no JOIN) —
    // they're fetched on demand via GET /products/{id}/materials when needed.
    json_response(['products' => array_map('shapeProduct', $products)]);
});

on('POST', '/books/{id}/products', function ($a) {
    $pdo = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $body = read_json_body();
    $name         = v_string($body['name'] ?? '', 100, true, 'Product name');
    $quantityType = v_string($body['quantity_type'] ?? 'piece', 50, false, 'Quantity type') ?: 'piece';
    $productType  = $body['product_type'] ?? 'ready_made';
    if (!in_array($productType, ['ready_made', 'manufacture'], true)) {
        json_error('Product type must be "ready_made" or "manufacture".', 422, 'validation');
    }
    $materialIds = $productType === 'manufacture' ? parseMaterialIds($body['material_ids'] ?? null, $pdo, $bookId) : [];
    if ($productType === 'manufacture' && count($materialIds) === 0) {
        json_error('Add at least one material.', 422, 'validation');
    }
    $imageUrl     = isset($body['image_url']) && is_string($body['image_url']) && $body['image_url'] !== '' ? $body['image_url'] : null;

    // Product names are unique within a book.
    $dup = $pdo->prepare('SELECT COUNT(*) FROM products WHERE book_id = ? AND name = ?');
    $dup->execute([$bookId, $name]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('A product named "' . $name . '" already exists.', 409, 'duplicate');
    }

    $pdo->beginTransaction();
    try {
        $id = uuid4();
        $pdo->prepare('INSERT INTO products (id, book_id, name, quantity_type, product_type, image_url) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$id, $bookId, $name, $quantityType, $productType, $imageUrl]);
        syncProductMaterials($pdo, $id, $bookId, $materialIds);
        // Set the denormalised stock columns correctly for the type (NULLs for manufacture).
        recomputeProduct($pdo, $id);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save product.', 500);
    }

    json_response(['success' => true, 'product' => shapeProduct(findProduct($pdo, $id), loadProductMaterials($pdo, $id))], 201);
});

on('GET', '/products/{id}', function ($a) {
    $pdo = db();
    $id  = $a['id'];
    json_response(['product' => shapeProduct(findProduct($pdo, $id), loadProductMaterials($pdo, $id))]);
});

// A manufacture product's linked materials (with stock details) — fetched on
// demand so the product list stays lean (no per-product materials JOIN).
on('GET', '/products/{id}/materials', function ($a) {
    $pdo = db();
    $id  = $a['id'];
    findProduct($pdo, $id); // ownership guard
    json_response(['product_id' => $id, 'materials' => loadProductMaterials($pdo, $id)]);
});

on('PUT', '/products/{id}', function ($a) {
    $pdo = db();
    $id  = $a['id'];
    $product = findProduct($pdo, $id);
    $body = read_json_body();
    $name         = v_string($body['name'] ?? '', 100, true, 'Product name');
    $quantityType = v_string($body['quantity_type'] ?? 'piece', 50, false, 'Quantity type') ?: 'piece';
    $productType  = $body['product_type'] ?? 'ready_made';
    if (!in_array($productType, ['ready_made', 'manufacture'], true)) {
        json_error('Product type must be "ready_made" or "manufacture".', 422, 'validation');
    }
    $bookId = $product['book_id'];
    $materialIds = $productType === 'manufacture' ? parseMaterialIds($body['material_ids'] ?? null, $pdo, $bookId) : [];
    if ($productType === 'manufacture' && count($materialIds) === 0) {
        json_error('Add at least one material.', 422, 'validation');
    }
    $imageUrl     = array_key_exists('image_url', $body)
        ? (is_string($body['image_url']) && $body['image_url'] !== '' ? $body['image_url'] : null)
        : $product['image_url'];

    // Product names are unique within a book (excluding this product itself).
    $dup = $pdo->prepare('SELECT COUNT(*) FROM products WHERE book_id = ? AND name = ? AND id <> ?');
    $dup->execute([$bookId, $name, $id]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('Another product named "' . $name . '" already exists.', 409, 'duplicate');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE products SET name = ?, quantity_type = ?, product_type = ?, image_url = ? WHERE id = ?')
            ->execute([$name, $quantityType, $productType, $imageUrl, $id]);
        // Replace the linked-material set (ready-made clears it).
        syncProductMaterials($pdo, $id, $bookId, $materialIds);
        // Re-derive the denormalised stock columns for the (possibly changed) type.
        recomputeProduct($pdo, $id);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save product.', 500);
    }

    json_response(['success' => true, 'product' => shapeProduct(findProduct($pdo, $id), loadProductMaterials($pdo, $id))]);
});

on('DELETE', '/products/{id}', function ($a) {
    $pdo = db();
    findProduct($pdo, $a['id']);
    $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$a['id']]);
    json_response(['success' => true]);
});

on('GET', '/products/{id}/transactions', function ($a) {
    $pdo = db();
    findProduct($pdo, $a['id']);
    // The customer join is for the tab-sale label; it stays NULL for counter sales.
    $stmt = $pdo->prepare(
        'SELECT t.*, c.name AS customer_name, ' . UNPAID_FLAG . '
         FROM product_transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         WHERE t.product_id = ? ORDER BY t.seq DESC'
    );
    $stmt->execute([$a['id']]);
    $txns = $stmt->fetchAll();

    json_response([
        'product_id'   => $a['id'],
        'transactions' => array_map('shapeTransaction', $txns),
    ]);
});

/**
 * Validate a product transaction body against its product. `$old` is the entry
 * being edited, whose effect on stock is reversed to get the true baseline;
 * pass null when creating. Returns [type, quantity, price, total, note].
 */
function validateProductTx(array $body, array $product, ?array $old): array
{
    $type = $body['type'] ?? '';
    if (!in_array($type, ['stock', 'sale'], true)) {
        json_error('Type must be "stock" or "sale".', 422, 'validation');
    }
    $isManufacture = ($product['product_type'] ?? 'ready_made') === 'manufacture';
    // Manufacture products are sale-only: their stock is never a stock-in.
    if ($isManufacture && $type === 'stock') {
        json_error('Manufacture products do not take stock in.', 422, 'validation');
    }
    $quantity = v_amount($body['quantity'] ?? null, 'Quantity');
    $note     = v_string($body['note'] ?? '', 255, false, 'Note');

    // Single price for every case: total = quantity * price_per_unit.
    if (!isset($body['price_per_unit']) || !is_numeric($body['price_per_unit']) || (float) $body['price_per_unit'] < 0) {
        json_error('Price per unit must be 0 or more.', 422, 'validation');
    }
    $price = round((float) $body['price_per_unit'], 2);
    $total = round($quantity * $price, 2);

    // Stock guard (ready-made only): a sale can never exceed the stock in hand.
    // Manufacture stock is unknown, so no guard applies.
    if ($type === 'sale' && !$isManufacture) {
        $available = (float) $product['current_stock'];
        if ($old) {
            $available += $old['type'] === 'sale' ? (float) $old['quantity'] : -(float) $old['quantity'];
        }
        if ($quantity - $available > 0.0000001) {
            $avail = rtrim(rtrim(number_format($available, 3, '.', ''), '0'), '.');
            json_error('Not enough stock. Only ' . $avail . ' in stock.', 422, 'insufficient_stock');
        }
    }

    return [$type, $quantity, $price, $total, $note !== '' ? $note : null];
}

/** One product transaction, guarded by ownership through its book. */
function findProductTx(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare(
        'SELECT t.* FROM product_transactions t JOIN books b ON b.id = t.book_id
         WHERE t.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$id, authUser()['id']]);
    $tx = $stmt->fetch();
    if (!$tx) {
        json_error('Transaction not found.', 404, 'not_found');
    }
    return $tx;
}

on('POST', '/products/{id}/transactions', function ($a) {
    $pdo     = db();
    $product = findProduct($pdo, $a['id']);
    [$type, $quantity, $price, $total, $note] = validateProductTx(read_json_body(), $product, null);

    $txId = uuid4();
    $pdo->beginTransaction();
    try {
        // stock_after is set by recomputeProduct (NULL for manufacture); the
        // timestamp defaults to now — this IS when the goods moved.
        $pdo->prepare(
            'INSERT INTO product_transactions (id, product_id, book_id, type, quantity, price_per_unit, total_amount, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$txId, $product['id'], $product['book_id'], $type, $quantity, $price, $total, $note]);
        recomputeProduct($pdo, $product['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    $stmt = $pdo->prepare('SELECT * FROM product_transactions WHERE id = ?');
    $stmt->execute([$txId]);
    json_response([
        'success'     => true,
        'transaction' => shapeTransaction($stmt->fetch()),
        'product'     => shapeProduct(findProduct($pdo, $product['id']), loadProductMaterials($pdo, $product['id'])),
    ], 201);
});

/**
 * Edit one entry IN PLACE: id, seq and timestamp are kept, so the entry holds
 * its position in history and in the running-stock chain (recomputeProduct
 * walks seq ASC). Only updated_at moves.
 */
on('PUT', '/product-transactions/{id}', function ($a) {
    $pdo     = db();
    $tx      = findProductTx($pdo, $a['id']);
    $product = findProduct($pdo, $tx['product_id']);
    [$type, $quantity, $price, $total, $note] = validateProductTx(read_json_body(), $product, $tx);

    // A tab sale is three rows; the goods cannot change type out from under the debt.
    if (!empty($tx['customer_item_id']) && $type !== 'sale') {
        json_error('A sale on a customer’s tab cannot become a stock entry.', 422, 'validation');
    }
    $line = tabLineFor(
        $pdo,
        $tx,
        'This sale has already been paid for. Edit it from the customer’s tab instead.'
    );

    $pdo->beginTransaction();
    try {
        // The outstanding line and the debt entry move to match the edit.
        $itemRowId = $line
            ? retabSale($pdo, $tx, $line, 'product', $product['id'], $product['name'], $product['quantity_type'], $quantity, $price, $total)
            : $tx['customer_item_id'];

        $pdo->prepare(
            'UPDATE product_transactions
             SET type = ?, quantity = ?, price_per_unit = ?, total_amount = ?, note = ?, customer_item_id = ?
             WHERE id = ?'
        )->execute([$type, $quantity, $price, $total, $note, $itemRowId, $tx['id']]);
        recomputeProduct($pdo, $product['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    $stmt = $pdo->prepare('SELECT * FROM product_transactions WHERE id = ?');
    $stmt->execute([$tx['id']]);
    json_response([
        'success'     => true,
        'transaction' => shapeTransaction($stmt->fetch()),
        'product'     => shapeProduct(findProduct($pdo, $product['id']), loadProductMaterials($pdo, $product['id'])),
    ]);
});

on('DELETE', '/product-transactions/{id}', function ($a) {
    $pdo = db();
    $tx  = findProductTx($pdo, $a['id']);

    // Deleting the goods half of a tab sale has to take the debt with it, or
    // the customer keeps owing for something no longer on record.
    $line = tabLineFor(
        $pdo,
        $tx,
        'This sale has already been paid for. Undo it from the customer’s tab instead.'
    );

    $pdo->beginTransaction();
    try {
        if ($line) {
            untabSale($pdo, $tx, $line);
        }
        $pdo->prepare('DELETE FROM product_transactions WHERE id = ?')->execute([$tx['id']]);
        recomputeProduct($pdo, $tx['product_id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to delete transaction.', 500);
    }

    json_response([
        'success' => true,
        'product' => shapeProduct(findProduct($pdo, $tx['product_id']), loadProductMaterials($pdo, $tx['product_id'])),
    ]);
});

// ---- Materials (store books) ----
on('GET', '/books/{id}/materials', function ($a) {
    $pdo    = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $stmt = $pdo->prepare('SELECT * FROM materials WHERE book_id = ? ORDER BY name ASC');
    $stmt->execute([$bookId]);
    json_response(['materials' => array_map('shapeMaterial', $stmt->fetchAll())]);
});

on('POST', '/books/{id}/materials', function ($a) {
    $pdo    = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $body = read_json_body();
    $name         = v_string($body['name'] ?? '', 100, true, 'Material name');
    $quantityType = v_string($body['quantity_type'] ?? 'piece', 50, false, 'Quantity type') ?: 'piece';
    $imageUrl     = isset($body['image_url']) && is_string($body['image_url']) && $body['image_url'] !== '' ? $body['image_url'] : null;

    // Material names are unique within a book.
    $dup = $pdo->prepare('SELECT COUNT(*) FROM materials WHERE book_id = ? AND name = ?');
    $dup->execute([$bookId, $name]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('A material named "' . $name . '" already exists.', 409, 'duplicate');
    }

    $id = uuid4();
    $pdo->prepare('INSERT INTO materials (id, book_id, name, quantity_type, image_url) VALUES (?, ?, ?, ?, ?)')
        ->execute([$id, $bookId, $name, $quantityType, $imageUrl]);

    json_response(['success' => true, 'material' => shapeMaterial(findMaterial($pdo, $id))], 201);
});

on('PUT', '/materials/{id}', function ($a) {
    $pdo      = db();
    $id       = $a['id'];
    $material = findMaterial($pdo, $id);
    $body     = read_json_body();
    $name         = v_string($body['name'] ?? '', 100, true, 'Material name');
    $quantityType = v_string($body['quantity_type'] ?? 'piece', 50, false, 'Quantity type') ?: 'piece';
    $imageUrl     = array_key_exists('image_url', $body)
        ? (is_string($body['image_url']) && $body['image_url'] !== '' ? $body['image_url'] : null)
        : $material['image_url'];

    $dup = $pdo->prepare('SELECT COUNT(*) FROM materials WHERE book_id = ? AND name = ? AND id <> ?');
    $dup->execute([$material['book_id'], $name, $id]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('Another material named "' . $name . '" already exists.', 409, 'duplicate');
    }

    $pdo->prepare('UPDATE materials SET name = ?, quantity_type = ?, image_url = ? WHERE id = ?')
        ->execute([$name, $quantityType, $imageUrl, $id]);

    json_response(['success' => true, 'material' => shapeMaterial(findMaterial($pdo, $id))]);
});

on('DELETE', '/materials/{id}', function ($a) {
    $pdo = db();
    findMaterial($pdo, $a['id']);
    $pdo->prepare('DELETE FROM materials WHERE id = ?')->execute([$a['id']]);
    json_response(['success' => true]);
});

on('GET', '/materials/{id}/transactions', function ($a) {
    $pdo = db();
    findMaterial($pdo, $a['id']);
    $stmt = $pdo->prepare(
        'SELECT t.*, c.name AS customer_name, ' . UNPAID_FLAG . '
         FROM material_transactions t
         LEFT JOIN customers c ON c.id = t.customer_id
         WHERE t.material_id = ? ORDER BY t.seq DESC'
    );
    $stmt->execute([$a['id']]);
    json_response([
        'material_id'  => $a['id'],
        'transactions' => array_map('shapeMaterialTransaction', $stmt->fetchAll()),
    ]);
});

/**
 * Validate a material transaction body against its material. `$old` is the entry
 * being edited, whose effect on stock is reversed to get the true baseline;
 * pass null when creating. Returns [type, quantity, price, total, note].
 */
function validateMaterialTx(array $body, array $material, ?array $old): array
{
    $type = $body['type'] ?? '';
    if (!in_array($type, ['stock', 'sale', 'used'], true)) {
        json_error('Type must be "stock", "sale" or "used".', 422, 'validation');
    }
    $quantity = v_amount($body['quantity'] ?? null, 'Quantity');
    $note     = v_string($body['note'] ?? '', 255, false, 'Note');

    // Stock-in / sale: the user enters the total price; per-unit cost is derived.
    // Stock-used: consumption only — no price, so total and per-unit are 0.
    if ($type === 'used') {
        $price = 0.0;
        $total = 0.0;
    } else {
        if (!isset($body['total_amount']) || !is_numeric($body['total_amount']) || (float) $body['total_amount'] < 0) {
            json_error('Total price must be 0 or more.', 422, 'validation');
        }
        $total = round((float) $body['total_amount'], 2);
        $price = $quantity > 0 ? round($total / $quantity, 2) : 0.0;
    }

    // Stock guard: a sale or used entry can never exceed the stock in hand.
    if ($type === 'sale' || $type === 'used') {
        $available = (float) $material['current_stock'];
        if ($old) {
            $available += in_array($old['type'], ['sale', 'used'], true) ? (float) $old['quantity'] : -(float) $old['quantity'];
        }
        if ($quantity - $available > 0.0000001) {
            $avail = rtrim(rtrim(number_format($available, 3, '.', ''), '0'), '.');
            json_error('Not enough stock. Only ' . $avail . ' in stock.', 422, 'insufficient_stock');
        }
    }

    return [$type, $quantity, $price, $total, $note !== '' ? $note : null];
}

/** One material transaction, guarded by ownership through its book. */
function findMaterialTx(PDO $pdo, string $id): array
{
    $stmt = $pdo->prepare(
        'SELECT t.* FROM material_transactions t JOIN books b ON b.id = t.book_id
         WHERE t.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$id, authUser()['id']]);
    $tx = $stmt->fetch();
    if (!$tx) {
        json_error('Transaction not found.', 404, 'not_found');
    }
    return $tx;
}

on('POST', '/materials/{id}/transactions', function ($a) {
    $pdo      = db();
    $material = findMaterial($pdo, $a['id']);
    [$type, $quantity, $price, $total, $note] = validateMaterialTx(read_json_body(), $material, null);

    $pdo->beginTransaction();
    try {
        // stock_after is set by recomputeMaterial; the timestamp defaults to now.
        $pdo->prepare(
            'INSERT INTO material_transactions (id, material_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)'
        )->execute([uuid4(), $material['id'], $material['book_id'], $type, $quantity, $price, $total, $note]);
        recomputeMaterial($pdo, $material['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    json_response([
        'success'  => true,
        'material' => shapeMaterial(findMaterial($pdo, $material['id'])),
    ], 201);
});

/**
 * Edit one entry IN PLACE: id, seq and timestamp are kept, so the entry holds
 * its position in history and in the running-stock chain (recomputeMaterial
 * walks seq ASC). Only updated_at moves.
 */
on('PUT', '/material-transactions/{id}', function ($a) {
    $pdo      = db();
    $tx       = findMaterialTx($pdo, $a['id']);
    $material = findMaterial($pdo, $tx['material_id']);
    [$type, $quantity, $price, $total, $note] = validateMaterialTx(read_json_body(), $material, $tx);

    // A tab sale is three rows; the goods cannot change type out from under the debt.
    if (!empty($tx['customer_item_id']) && $type !== 'sale') {
        json_error('A sale on a customer’s tab cannot become a stock entry.', 422, 'validation');
    }
    $line = tabLineFor(
        $pdo,
        $tx,
        'This sale has already been paid for. Edit it from the customer’s tab instead.'
    );

    $pdo->beginTransaction();
    try {
        // The outstanding line and the debt entry move to match the edit.
        $itemRowId = $line
            ? retabSale($pdo, $tx, $line, 'material', $material['id'], $material['name'], $material['quantity_type'], $quantity, $price, $total)
            : $tx['customer_item_id'];

        $pdo->prepare(
            'UPDATE material_transactions
             SET type = ?, quantity = ?, price_per_unit = ?, total_amount = ?, note = ?, customer_item_id = ?
             WHERE id = ?'
        )->execute([$type, $quantity, $price, $total, $note, $itemRowId, $tx['id']]);
        recomputeMaterial($pdo, $material['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    json_response([
        'success'  => true,
        'material' => shapeMaterial(findMaterial($pdo, $material['id'])),
    ]);
});

on('DELETE', '/material-transactions/{id}', function ($a) {
    $pdo = db();
    $tx  = findMaterialTx($pdo, $a['id']);

    // Deleting the goods half of a tab sale has to take the debt with it, or
    // the customer keeps owing for something no longer on record.
    $line = tabLineFor(
        $pdo,
        $tx,
        'This sale has already been paid for. Undo it from the customer’s tab instead.'
    );

    $pdo->beginTransaction();
    try {
        if ($line) {
            untabSale($pdo, $tx, $line);
        }
        $pdo->prepare('DELETE FROM material_transactions WHERE id = ?')->execute([$tx['id']]);
        recomputeMaterial($pdo, $tx['material_id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to delete transaction.', 500);
    }

    json_response([
        'success'  => true,
        'material' => shapeMaterial(findMaterial($pdo, $tx['material_id'])),
    ]);
});

// ---- Operation costs (store books) ----
on('GET', '/books/{id}/operation-costs', function ($a) {
    $pdo    = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $stmt = $pdo->prepare('SELECT * FROM operation_costs WHERE book_id = ? ORDER BY reason ASC');
    $stmt->execute([$bookId]);
    $items = array_map('shapeOperationCost', $stmt->fetchAll());
    json_response([
        'operation_costs' => $items,
        'total'           => round(array_sum(array_column($items, 'amount')), 2),
    ]);
});

on('POST', '/books/{id}/operation-costs', function ($a) {
    $pdo    = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $body   = read_json_body();
    $reason = v_string($body['reason'] ?? '', 100, true, 'Reason');
    $note   = v_string($body['note'] ?? '', 255, false, 'Note');

    // Reasons are unique within a book; amounts are added over time as entries.
    $dup = $pdo->prepare('SELECT COUNT(*) FROM operation_costs WHERE book_id = ? AND reason = ?');
    $dup->execute([$bookId, $reason]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('An operation cost named "' . $reason . '" already exists.', 409, 'duplicate');
    }

    $id = uuid4();
    $pdo->prepare('INSERT INTO operation_costs (id, book_id, reason, note) VALUES (?, ?, ?, ?)')
        ->execute([$id, $bookId, $reason, $note]);

    json_response(['success' => true, 'operation_cost' => shapeOperationCost(findOperationCost($pdo, $id))], 201);
});

on('PUT', '/operation-costs/{id}', function ($a) {
    $pdo  = db();
    $id   = $a['id'];
    $op   = findOperationCost($pdo, $id);
    $body = read_json_body();
    $reason = v_string($body['reason'] ?? '', 100, true, 'Reason');
    $note   = v_string($body['note'] ?? '', 255, false, 'Note');

    $dup = $pdo->prepare('SELECT COUNT(*) FROM operation_costs WHERE book_id = ? AND reason = ? AND id <> ?');
    $dup->execute([$op['book_id'], $reason, $id]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('Another operation cost named "' . $reason . '" already exists.', 409, 'duplicate');
    }

    // Editing only renames/renotes the reason; amount entries are untouched.
    $pdo->prepare('UPDATE operation_costs SET reason = ?, note = ? WHERE id = ?')
        ->execute([$reason, $note, $id]);

    json_response(['success' => true, 'operation_cost' => shapeOperationCost(findOperationCost($pdo, $id))]);
});

on('DELETE', '/operation-costs/{id}', function ($a) {
    $pdo = db();
    findOperationCost($pdo, $a['id']);
    // Entries cascade-delete with the parent.
    $pdo->prepare('DELETE FROM operation_costs WHERE id = ?')->execute([$a['id']]);
    json_response(['success' => true]);
});

// Add one dated amount entry to an operation cost (the recurring "cost over time").
on('POST', '/operation-costs/{id}/entries', function ($a) {
    $pdo    = db();
    $op     = findOperationCost($pdo, $a['id']);
    $body   = read_json_body();
    $amount = v_amount($body['amount'] ?? null, 'Amount');
    $note   = v_string($body['note'] ?? '', 255, false, 'Note');

    $timestamp = date('Y-m-d H:i:s');
    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO operation_cost_entries (id, operation_cost_id, book_id, amount, note, timestamp)
             VALUES (?, ?, ?, ?, ?, ?)'
        )->execute([uuid4(), $op['id'], $op['book_id'], $amount, $note !== '' ? $note : null, $timestamp]);
        recomputeOperationCost($pdo, $op['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to add amount.', 500);
    }

    json_response([
        'success'        => true,
        'operation_cost' => shapeOperationCost(findOperationCost($pdo, $op['id'])),
    ], 201);
});

// Edit one amount entry IN PLACE: seq and timestamp are kept so the entry stays
// where it is in the history; only the parent's totals are recomputed.
on('PUT', '/operation-cost-entries/{id}', function ($a) {
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT e.* FROM operation_cost_entries e JOIN books b ON b.id = e.book_id
         WHERE e.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$a['id'], authUser()['id']]);
    $entry = $stmt->fetch();
    if (!$entry) {
        json_error('Entry not found.', 404, 'not_found');
    }

    $body   = read_json_body();
    $amount = v_amount($body['amount'] ?? null, 'Amount');
    $note   = v_string($body['note'] ?? '', 255, false, 'Note');

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE operation_cost_entries SET amount = ?, note = ? WHERE id = ?')
            ->execute([$amount, $note !== '' ? $note : null, $entry['id']]);
        recomputeOperationCost($pdo, $entry['operation_cost_id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to update entry.', 500);
    }

    json_response([
        'success'        => true,
        'operation_cost' => shapeOperationCost(findOperationCost($pdo, $entry['operation_cost_id'])),
    ]);
});

on('DELETE', '/operation-cost-entries/{id}', function ($a) {
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT e.* FROM operation_cost_entries e JOIN books b ON b.id = e.book_id
         WHERE e.id = ? AND b.user_id = ?'
    );
    $stmt->execute([$a['id'], authUser()['id']]);
    $entry = $stmt->fetch();
    if (!$entry) {
        json_error('Entry not found.', 404, 'not_found');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM operation_cost_entries WHERE id = ?')->execute([$a['id']]);
        recomputeOperationCost($pdo, $entry['operation_cost_id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to delete entry.', 500);
    }

    json_response(['success' => true]);
});

on('GET', '/operation-costs/{id}/history', function ($a) {
    $pdo = db();
    findOperationCost($pdo, $a['id']);
    $stmt = $pdo->prepare(
        'SELECT * FROM operation_cost_entries WHERE operation_cost_id = ? ORDER BY seq DESC'
    );
    $stmt->execute([$a['id']]);
    json_response([
        'operation_cost_id' => $a['id'],
        'history'           => array_map('shapeOperationEntry', $stmt->fetchAll()),
    ]);
});

// ---- Categories (personal books) ----
on('GET', '/books/{id}/categories', function ($a) {
    $pdo = db();
    requireOwnedBook($pdo, $a['id']);
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE book_id = ? ORDER BY type ASC, name ASC');
    $stmt->execute([$a['id']]);
    json_response(['categories' => array_map('shapeCategory', $stmt->fetchAll())]);
});

on('POST', '/books/{id}/categories', function ($a) {
    $pdo    = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $body   = read_json_body();
    $name    = v_string($body['name'] ?? '', 100, true, 'Category name');
    $details = v_string($body['details'] ?? '', 255, false, 'Details');
    $type    = $body['type'] ?? '';
    if (!in_array($type, ['income', 'expense'], true)) {
        json_error('Type must be "income" or "expense".', 422, 'validation');
    }

    // Category names are unique per type within a book.
    $dup = $pdo->prepare('SELECT COUNT(*) FROM categories WHERE book_id = ? AND type = ? AND name = ?');
    $dup->execute([$bookId, $type, $name]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('A ' . $type . ' category named "' . $name . '" already exists.', 409, 'duplicate');
    }

    $id = uuid4();
    $pdo->prepare('INSERT INTO categories (id, book_id, name, details, type) VALUES (?, ?, ?, ?, ?)')
        ->execute([$id, $bookId, $name, $details, $type]);
    json_response(['success' => true, 'category' => shapeCategory(findCategory($pdo, $id))], 201);
});

on('PUT', '/categories/{id}', function ($a) {
    $pdo  = db();
    $cat  = findCategory($pdo, $a['id']);
    $body = read_json_body();
    $name    = v_string($body['name'] ?? '', 100, true, 'Category name');
    $details = v_string($body['details'] ?? '', 255, false, 'Details');
    $type    = $cat['type']; // type is immutable

    $dup = $pdo->prepare('SELECT COUNT(*) FROM categories WHERE book_id = ? AND type = ? AND name = ? AND id <> ?');
    $dup->execute([$cat['book_id'], $type, $name, $cat['id']]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('Another ' . $type . ' category named "' . $name . '" already exists.', 409, 'duplicate');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE categories SET name = ?, details = ? WHERE id = ?')
            ->execute([$name, $details, $cat['id']]);
        // Keep each transaction's denormalised category label in sync.
        $pdo->prepare('UPDATE personal_transactions SET category_name = ? WHERE category_id = ?')
            ->execute([$name, $cat['id']]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save category.', 500);
    }

    json_response(['success' => true, 'category' => shapeCategory(findCategory($pdo, $cat['id']))]);
});

on('DELETE', '/categories/{id}', function ($a) {
    $pdo = db();
    findCategory($pdo, $a['id']);
    // FK ON DELETE SET NULL nulls category_id on its transactions; they keep the label.
    $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$a['id']]);
    json_response(['success' => true]);
});

// ---- Personal transactions (personal books) --------------------------------

/** Validate a required category against the book + type; returns the category row. */
function requireCategory(PDO $pdo, string $bookId, string $type, $rawId): array
{
    if (!is_string($rawId) || $rawId === '') {
        json_error('Please choose a category.', 422, 'validation');
    }
    $stmt = $pdo->prepare('SELECT id, name, type FROM categories WHERE id = ? AND book_id = ?');
    $stmt->execute([$rawId, $bookId]);
    $cat = $stmt->fetch();
    if (!$cat) {
        json_error('Category not found.', 422, 'validation');
    }
    if ($cat['type'] !== $type) {
        json_error('Category type does not match the transaction type.', 422, 'validation');
    }
    return $cat;
}

on('GET', '/books/{id}/transactions', function ($a) {
    $pdo = db();
    requireOwnedBook($pdo, $a['id']);
    $stmt = $pdo->prepare('SELECT * FROM personal_transactions WHERE book_id = ? ORDER BY seq DESC');
    $stmt->execute([$a['id']]);
    $txns = array_map('shapePersonalTx', $stmt->fetchAll());

    $income = 0.0; $expense = 0.0;
    foreach ($txns as $t) {
        if ($t['type'] === 'income') $income += $t['amount'];
        else $expense += $t['amount'];
    }
    json_response([
        'transactions' => $txns,
        'totals'       => [
            'income'  => round($income, 2),
            'expense' => round($expense, 2),
            'balance' => round($income - $expense, 2),
        ],
    ]);
});

on('POST', '/books/{id}/transactions', function ($a) {
    $pdo    = db();
    $bookId = $a['id'];
    requireOwnedBook($pdo, $bookId);
    $body   = read_json_body();

    $type = $body['type'] ?? '';
    if (!in_array($type, ['income', 'expense'], true)) {
        json_error('Type must be "income" or "expense".', 422, 'validation');
    }
    $amount   = v_amount($body['amount'] ?? null, 'Amount');
    $note     = v_string($body['note'] ?? '', 255, false, 'Note');
    $category = requireCategory($pdo, $bookId, $type, $body['category_id'] ?? null);

    $signed    = $type === 'income' ? $amount : -$amount;
    $timestamp = date('Y-m-d H:i:s');
    $txId      = uuid4();

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO personal_transactions
                (id, book_id, category_id, category_name, type, note, amount, signed_amount, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$txId, $bookId, $category['id'], $category['name'], $type, $note, $amount, $signed, $timestamp]);
        recomputeCategory($pdo, $category['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    json_response(['success' => true, 'transaction' => shapePersonalTx(findPersonalTx($pdo, $txId))], 201);
});

on('PUT', '/personal-transactions/{id}', function ($a) {
    $pdo    = db();
    $tx     = findPersonalTx($pdo, $a['id']);
    $bookId = $tx['book_id'];
    $body   = read_json_body();

    $type = $body['type'] ?? '';
    if (!in_array($type, ['income', 'expense'], true)) {
        json_error('Type must be "income" or "expense".', 422, 'validation');
    }
    $amount   = v_amount($body['amount'] ?? null, 'Amount');
    $note     = v_string($body['note'] ?? '', 255, false, 'Note');
    $category = requireCategory($pdo, $bookId, $type, $body['category_id'] ?? null);

    $signed   = $type === 'income' ? $amount : -$amount;
    $oldCatId = $tx['category_id'];
    $newCatId = $category['id'];

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'UPDATE personal_transactions
             SET category_id = ?, category_name = ?, type = ?, note = ?, amount = ?, signed_amount = ?
             WHERE id = ?'
        )->execute([$newCatId, $category['name'], $type, $note, $amount, $signed, $tx['id']]);
        if ($oldCatId !== $newCatId) {
            recomputeCategory($pdo, $oldCatId);
        }
        recomputeCategory($pdo, $newCatId);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    json_response(['success' => true, 'transaction' => shapePersonalTx(findPersonalTx($pdo, $tx['id']))]);
});

on('DELETE', '/personal-transactions/{id}', function ($a) {
    $pdo = db();
    $tx  = findPersonalTx($pdo, $a['id']);
    $oldCatId = $tx['category_id'];

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM personal_transactions WHERE id = ?')->execute([$tx['id']]);
        recomputeCategory($pdo, $oldCatId);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to delete transaction.', 500);
    }

    json_response(['success' => true]);
});

dispatch();

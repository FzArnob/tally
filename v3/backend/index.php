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
function requireOwnedBook(PDO $pdo, int $bookId): array
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

/** Recompute a product's stock/totals/last prices + per-row running stock. */
function recomputeProduct(PDO $pdo, int $productId): array
{
    $rows = $pdo->prepare(
        'SELECT id, type, quantity, price_per_unit, created_at FROM product_transactions
         WHERE product_id = ? ORDER BY id ASC'
    );
    $rows->execute([$productId]);
    $entries = $rows->fetchAll();

    $stock = 0.0; $in = 0.0; $out = 0.0;
    $lastPurchase = null; $lastSale = null; $lastTime = null;
    $update = $pdo->prepare('UPDATE product_transactions SET stock_after = ? WHERE id = ?');
    foreach ($entries as $e) {
        $qty = (float) $e['quantity'];
        if ($e['type'] === 'stock') {
            $stock += $qty; $in += $qty; $lastPurchase = (float) $e['price_per_unit'];
        } else {
            $stock -= $qty; $out += $qty; $lastSale = (float) $e['price_per_unit'];
        }
        $update->execute([$stock, $e['id']]);
        $lastTime = $e['created_at'];
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

/** Recompute a category's denormalised transaction_count. No-op for null id. */
function recomputeCategory(PDO $pdo, ?int $categoryId): void
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
        'id'   => (int) $b['id'],
        'name' => $b['name'],
        'type' => $b['type'],
    ];
}

function shapeCustomer(array $c): array
{
    return [
        'id'                    => $c['id'],
        'book_id'               => (int) $c['book_id'],
        'name'                  => $c['name'],
        'nickname'              => $c['nickname'],
        'phone'                 => $c['phone'],
        'address'               => $c['address'],
        'total_balance'         => (float) $c['total_balance'],
        'transaction_count'     => (int) $c['transaction_count'],
        'last_transaction_time' => $c['last_transaction_time'],
    ];
}

function shapeProduct(array $p, array $costItems = []): array
{
    return [
        'id'                    => (int) $p['id'],
        'book_id'               => (int) $p['book_id'],
        'name'                  => $p['name'],
        'quantity_type'         => $p['quantity_type'],
        'product_type'          => $p['product_type'] ?? 'ready_made',
        'cost_items'            => $costItems,
        'image_url'             => ($p['image_url'] ?? '') !== '' ? $p['image_url'] : null,
        'current_stock'         => (float) $p['current_stock'],
        'total_stock_in'        => (float) $p['total_stock_in'],
        'total_stock_out'       => (float) $p['total_stock_out'],
        'last_purchase_price'   => $p['last_purchase_price'] !== null ? (float) $p['last_purchase_price'] : null,
        'last_sale_price'       => $p['last_sale_price'] !== null ? (float) $p['last_sale_price'] : null,
        'transaction_count'     => (int) $p['transaction_count'],
        'last_transaction_time' => $p['last_transaction_time'],
    ];
}

function shapeTransaction(array $t, array $costs = []): array
{
    return [
        'id'             => (int) $t['id'],
        'product_id'     => (int) $t['product_id'],
        'type'           => $t['type'],
        'quantity'       => (float) $t['quantity'],
        'price_per_unit' => (float) $t['price_per_unit'],
        'total_amount'   => (float) $t['total_amount'],
        'stock_after'    => (float) $t['stock_after'],
        'note'           => $t['note'],
        'costs'          => $costs,
        'created_at'     => $t['created_at'],
    ];
}

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

function shapeCategory(array $c): array
{
    return [
        'id'                => (int) $c['id'],
        'book_id'           => (int) $c['book_id'],
        'name'              => $c['name'],
        'details'           => $c['details'],
        'type'              => $c['type'],
        'transaction_count' => (int) $c['transaction_count'],
    ];
}

function shapePersonalTx(array $t): array
{
    return [
        'id'            => (int) $t['id'],
        'book_id'       => (int) $t['book_id'],
        'category_id'   => $t['category_id'] !== null ? (int) $t['category_id'] : null,
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

function findProduct(PDO $pdo, int $id): array
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

function findCategory(PDO $pdo, int $id): array
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

function findPersonalTx(PDO $pdo, int $id): array
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

// ---- Manufacture cost helpers ----------------------------------------------

/** A manufacture product's cost-item template (labels), ordered for display. */
function loadCostItems(PDO $pdo, int $productId): array
{
    $stmt = $pdo->prepare(
        'SELECT id, name FROM product_cost_items WHERE product_id = ? ORDER BY sort_order ASC, id ASC'
    );
    $stmt->execute([$productId]);
    return array_map(fn($r) => ['id' => (int) $r['id'], 'name' => $r['name']], $stmt->fetchAll());
}

/** The per-line cost breakdown recorded for one stock-in transaction. */
function loadTxCosts(PDO $pdo, int $txId): array
{
    $stmt = $pdo->prepare(
        'SELECT name, amount FROM product_transaction_costs WHERE transaction_id = ? ORDER BY sort_order ASC, id ASC'
    );
    $stmt->execute([$txId]);
    return array_map(fn($r) => ['name' => $r['name'], 'amount' => (float) $r['amount']], $stmt->fetchAll());
}

/** Normalise an incoming cost-item template to a clean list of label strings. */
function parseCostItemNames($raw): array
{
    if (!is_array($raw)) {
        return [];
    }
    $names = [];
    foreach ($raw as $item) {
        $name = is_array($item) ? ($item['name'] ?? '') : $item;
        $name = is_string($name) ? trim($name) : '';
        if ($name === '') {
            continue;
        }
        $names[] = mb_substr($name, 0, 100);
        if (count($names) >= 50) {
            break;
        }
    }
    return $names;
}

/** Replace a product's cost-item template with the given labels (order preserved). */
function saveCostItems(PDO $pdo, int $productId, int $bookId, array $names): void
{
    $pdo->prepare('DELETE FROM product_cost_items WHERE product_id = ?')->execute([$productId]);
    $ins = $pdo->prepare(
        'INSERT INTO product_cost_items (product_id, book_id, name, sort_order) VALUES (?, ?, ?, ?)'
    );
    $order = 0;
    foreach ($names as $name) {
        $ins->execute([$productId, $bookId, $name, $order++]);
    }
}

/** Normalise an incoming stock-in cost breakdown to [['name'=>, 'amount'=>float], ...]. */
function parseCosts($raw): array
{
    $out = [];
    if (!is_array($raw)) {
        return $out;
    }
    foreach ($raw as $item) {
        if (!is_array($item)) {
            continue;
        }
        $amtRaw = $item['amount'] ?? null;
        // A blank line (no amount typed) is simply omitted from the breakdown.
        if ($amtRaw === '' || $amtRaw === null || !is_numeric($amtRaw)) {
            continue;
        }
        $amt = round((float) $amtRaw, 2);
        if ($amt < 0) {
            json_error('Cost amount must be 0 or more.', 422, 'validation');
        }
        $name = is_string($item['name'] ?? null) ? trim($item['name']) : '';
        if ($name === '') {
            $name = 'Cost';
        }
        $out[] = ['name' => mb_substr($name, 0, 100), 'amount' => $amt];
        if (count($out) >= 50) {
            break;
        }
    }
    return $out;
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
    $stmt = db()->prepare('SELECT id, name, type FROM books WHERE user_id = ? ORDER BY id ASC');
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

    $pdo->prepare('INSERT INTO books (user_id, name, type) VALUES (?, ?, ?)')
        ->execute([authUser()['id'], $name, $type]);
    $id = (int) $pdo->lastInsertId();

    // Seed a starter set of categories for a new personal book.
    if ($type === 'personal') {
        $defaults = [
            ['income', 'Salary'], ['income', 'Freelance'],
            ['expense', 'Food'], ['expense', 'Bills'], ['expense', 'Transport'], ['expense', 'Shopping'],
        ];
        $ins = $pdo->prepare('INSERT INTO categories (book_id, name, type) VALUES (?, ?, ?)');
        foreach ($defaults as [$catType, $catName]) {
            $ins->execute([$id, $catName, $catType]);
        }
    }

    $stmt = $pdo->prepare('SELECT id, name, type FROM books WHERE id = ?');
    $stmt->execute([$id]);
    json_response(['success' => true, 'book' => shapeBook($stmt->fetch())], 201);
});

on('GET', '/books/{id}', function ($a) {
    json_response(shapeBook(requireOwnedBook(db(), (int) $a['id'])));
});

on('PUT', '/books/{id}', function ($a) {
    $pdo = db();
    $id  = (int) $a['id'];
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
    $id  = (int) $a['id'];
    requireOwnedBook($pdo, $id);
    // FK cascades remove the book's products, customers, transactions and history.
    $pdo->prepare('DELETE FROM books WHERE id = ?')->execute([$id]);
    json_response(['success' => true]);
});

// ---- Customers ----
on('GET', '/books/{id}/customers', function ($a) {
    $pdo = db();
    requireOwnedBook($pdo, (int) $a['id']);
    $stmt = $pdo->prepare(
        'SELECT * FROM customers WHERE book_id = ? ORDER BY name ASC, nickname ASC'
    );
    $stmt->execute([(int) $a['id']]);
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
    $bookId = (int) $a['id'];
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
    $bookId = (int) $existing['book_id'];
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
            $historyId, $customer['id'], (int) $customer['book_id'], $amount, $type, $signed,
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

// ---- Products ----
on('GET', '/books/{id}/products', function ($a) {
    $pdo    = db();
    $bookId = (int) $a['id'];
    requireOwnedBook($pdo, $bookId);
    $stmt = $pdo->prepare('SELECT * FROM products WHERE book_id = ? ORDER BY name ASC');
    $stmt->execute([$bookId]);
    $products = $stmt->fetchAll();

    // One grouped query for the whole book's cost-item templates (avoids N+1).
    $ci = $pdo->prepare(
        'SELECT id, product_id, name FROM product_cost_items WHERE book_id = ? ORDER BY product_id, sort_order, id'
    );
    $ci->execute([$bookId]);
    $byProduct = [];
    foreach ($ci->fetchAll() as $r) {
        $byProduct[(int) $r['product_id']][] = ['id' => (int) $r['id'], 'name' => $r['name']];
    }

    json_response([
        'products' => array_map(
            fn($p) => shapeProduct($p, $byProduct[(int) $p['id']] ?? []),
            $products
        ),
    ]);
});

on('POST', '/books/{id}/products', function ($a) {
    $pdo = db();
    $bookId = (int) $a['id'];
    requireOwnedBook($pdo, $bookId);
    $body = read_json_body();
    $name         = v_string($body['name'] ?? '', 100, true, 'Product name');
    $quantityType = v_string($body['quantity_type'] ?? 'piece', 50, false, 'Quantity type') ?: 'piece';
    $productType  = $body['product_type'] ?? 'ready_made';
    if (!in_array($productType, ['ready_made', 'manufacture'], true)) {
        json_error('Product type must be "ready_made" or "manufacture".', 422, 'validation');
    }
    $costNames = $productType === 'manufacture' ? parseCostItemNames($body['cost_items'] ?? null) : [];
    if ($productType === 'manufacture' && count($costNames) === 0) {
        json_error('Add at least one raw material or cost line.', 422, 'validation');
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
        $pdo->prepare('INSERT INTO products (book_id, name, quantity_type, product_type, image_url) VALUES (?, ?, ?, ?, ?)')
            ->execute([$bookId, $name, $quantityType, $productType, $imageUrl]);
        $id = (int) $pdo->lastInsertId();
        saveCostItems($pdo, $id, $bookId, $costNames);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save product.', 500);
    }

    json_response(['success' => true, 'product' => shapeProduct(findProduct($pdo, $id), loadCostItems($pdo, $id))], 201);
});

on('GET', '/products/{id}', function ($a) {
    $pdo = db();
    $id  = (int) $a['id'];
    json_response(['product' => shapeProduct(findProduct($pdo, $id), loadCostItems($pdo, $id))]);
});

on('PUT', '/products/{id}', function ($a) {
    $pdo = db();
    $id  = (int) $a['id'];
    $product = findProduct($pdo, $id);
    $body = read_json_body();
    $name         = v_string($body['name'] ?? '', 100, true, 'Product name');
    $quantityType = v_string($body['quantity_type'] ?? 'piece', 50, false, 'Quantity type') ?: 'piece';
    $productType  = $body['product_type'] ?? 'ready_made';
    if (!in_array($productType, ['ready_made', 'manufacture'], true)) {
        json_error('Product type must be "ready_made" or "manufacture".', 422, 'validation');
    }
    $costNames = $productType === 'manufacture' ? parseCostItemNames($body['cost_items'] ?? null) : [];
    if ($productType === 'manufacture' && count($costNames) === 0) {
        json_error('Add at least one raw material or cost line.', 422, 'validation');
    }
    $imageUrl     = array_key_exists('image_url', $body)
        ? (is_string($body['image_url']) && $body['image_url'] !== '' ? $body['image_url'] : null)
        : $product['image_url'];

    // Product names are unique within a book (excluding this product itself).
    $dup = $pdo->prepare('SELECT COUNT(*) FROM products WHERE book_id = ? AND name = ? AND id <> ?');
    $dup->execute([(int) $product['book_id'], $name, $id]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('Another product named "' . $name . '" already exists.', 409, 'duplicate');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE products SET name = ?, quantity_type = ?, product_type = ?, image_url = ? WHERE id = ?')
            ->execute([$name, $quantityType, $productType, $imageUrl, $id]);
        // Replace the template. Past transactions keep their own snapshot in
        // product_transaction_costs, so editing/clearing the template is safe.
        saveCostItems($pdo, $id, (int) $product['book_id'], $costNames);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save product.', 500);
    }

    json_response(['success' => true, 'product' => shapeProduct(findProduct($pdo, $id), loadCostItems($pdo, $id))]);
});

on('DELETE', '/products/{id}', function ($a) {
    $pdo = db();
    findProduct($pdo, (int) $a['id']);
    $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([(int) $a['id']]);
    json_response(['success' => true]);
});

on('GET', '/products/{id}/transactions', function ($a) {
    $pdo = db();
    findProduct($pdo, (int) $a['id']);
    $stmt = $pdo->prepare('SELECT * FROM product_transactions WHERE product_id = ? ORDER BY id DESC');
    $stmt->execute([(int) $a['id']]);
    $txns = $stmt->fetchAll();

    // One grouped query for every transaction's cost breakdown (avoids N+1).
    $costsByTx = [];
    $ids = array_map(fn($t) => (int) $t['id'], $txns);
    if ($ids) {
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $cs = $pdo->prepare(
            "SELECT transaction_id, name, amount FROM product_transaction_costs
             WHERE transaction_id IN ($ph) ORDER BY sort_order, id"
        );
        $cs->execute($ids);
        foreach ($cs->fetchAll() as $r) {
            $costsByTx[(int) $r['transaction_id']][] = ['name' => $r['name'], 'amount' => (float) $r['amount']];
        }
    }

    json_response([
        'product_id'   => (int) $a['id'],
        'transactions' => array_map(
            fn($t) => shapeTransaction($t, $costsByTx[(int) $t['id']] ?? []),
            $txns
        ),
    ]);
});

on('POST', '/products/{id}/transactions', function ($a) {
    $pdo = db();
    $product = findProduct($pdo, (int) $a['id']);
    $body = read_json_body();

    $type = $body['type'] ?? '';
    if (!in_array($type, ['stock', 'sale'], true)) {
        json_error('Type must be "stock" or "sale".', 422, 'validation');
    }
    $quantity = v_amount($body['quantity'] ?? null, 'Quantity');
    $note     = v_string($body['note'] ?? '', 255, false, 'Note');

    // A manufacture stock-in derives its price from a per-line cost breakdown:
    // total_amount = Σ costs, price_per_unit = total / quantity produced. Every
    // other case (ready-made stock, any sale) uses the single price_per_unit.
    $isManufactureStock = $type === 'stock' && ($product['product_type'] ?? 'ready_made') === 'manufacture';
    $costs = [];
    if ($isManufactureStock) {
        $costs = parseCosts($body['costs'] ?? null);
        $total = round(array_sum(array_column($costs, 'amount')), 2);
        if (count($costs) === 0 || $total <= 0) {
            json_error('Enter at least one cost amount for this batch.', 422, 'validation');
        }
        $price = round($total / $quantity, 2);
    } else {
        if (!isset($body['price_per_unit']) || !is_numeric($body['price_per_unit']) || (float) $body['price_per_unit'] < 0) {
            json_error('Price per unit must be 0 or more.', 422, 'validation');
        }
        $price = round((float) $body['price_per_unit'], 2);
        $total = round($quantity * $price, 2);
    }
    // When editing, this entry replaces an existing one (insert + delete happen
    // atomically below), so no update endpoint is needed.
    $replaces = isset($body['replaces']) && is_numeric($body['replaces']) ? (int) $body['replaces'] : 0;

    // Stock guard: a sale can never exceed the stock in hand, so stock stays >= 0.
    // For an edit, reverse the replaced entry's effect to get the true baseline.
    if ($type === 'sale') {
        $available = (float) $product['current_stock'];
        if ($replaces > 0) {
            $r = $pdo->prepare('SELECT type, quantity FROM product_transactions WHERE id = ? AND product_id = ?');
            $r->execute([$replaces, (int) $product['id']]);
            if ($old = $r->fetch()) {
                $available += $old['type'] === 'sale' ? (float) $old['quantity'] : -(float) $old['quantity'];
            }
        }
        if ($quantity - $available > 0.0000001) {
            $avail = rtrim(rtrim(number_format($available, 3, '.', ''), '0'), '.');
            json_error('Not enough stock. Only ' . $avail . ' in stock.', 422, 'insufficient_stock');
        }
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO product_transactions (product_id, book_id, type, quantity, price_per_unit, total_amount, stock_after, note)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
        )->execute([$product['id'], (int) $product['book_id'], $type, $quantity, $price, $total, $note !== '' ? $note : null]);
        $txId = (int) $pdo->lastInsertId();
        // Persist the batch's cost breakdown (manufacture stock-in only).
        if ($costs) {
            $insCost = $pdo->prepare(
                'INSERT INTO product_transaction_costs (transaction_id, name, amount, sort_order) VALUES (?, ?, ?, ?)'
            );
            $order = 0;
            foreach ($costs as $c) {
                $insCost->execute([$txId, $c['name'], $c['amount'], $order++]);
            }
        }
        if ($replaces > 0) {
            // The old row's cost lines cascade-delete with it.
            $pdo->prepare('DELETE FROM product_transactions WHERE id = ? AND product_id = ?')
                ->execute([$replaces, (int) $product['id']]);
        }
        recomputeProduct($pdo, (int) $product['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    $stmt = $pdo->prepare('SELECT * FROM product_transactions WHERE id = ?');
    $stmt->execute([$txId]);
    json_response([
        'success'     => true,
        'transaction' => shapeTransaction($stmt->fetch(), loadTxCosts($pdo, $txId)),
        'product'     => shapeProduct(findProduct($pdo, (int) $product['id']), loadCostItems($pdo, (int) $product['id'])),
    ], 201);
});

on('DELETE', '/product-transactions/{id}', function ($a) {
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT t.* FROM product_transactions t JOIN books b ON b.id = t.book_id
         WHERE t.id = ? AND b.user_id = ?'
    );
    $stmt->execute([(int) $a['id'], authUser()['id']]);
    $tx = $stmt->fetch();
    if (!$tx) {
        json_error('Transaction not found.', 404, 'not_found');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM product_transactions WHERE id = ?')->execute([(int) $a['id']]);
        recomputeProduct($pdo, (int) $tx['product_id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to delete transaction.', 500);
    }

    json_response([
        'success' => true,
        'product' => shapeProduct(findProduct($pdo, (int) $tx['product_id']), loadCostItems($pdo, (int) $tx['product_id'])),
    ]);
});

// ---- Categories (personal books) ----
on('GET', '/books/{id}/categories', function ($a) {
    $pdo = db();
    requireOwnedBook($pdo, (int) $a['id']);
    $stmt = $pdo->prepare('SELECT * FROM categories WHERE book_id = ? ORDER BY type ASC, name ASC');
    $stmt->execute([(int) $a['id']]);
    json_response(['categories' => array_map('shapeCategory', $stmt->fetchAll())]);
});

on('POST', '/books/{id}/categories', function ($a) {
    $pdo    = db();
    $bookId = (int) $a['id'];
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

    $pdo->prepare('INSERT INTO categories (book_id, name, details, type) VALUES (?, ?, ?, ?)')
        ->execute([$bookId, $name, $details, $type]);
    $id = (int) $pdo->lastInsertId();
    json_response(['success' => true, 'category' => shapeCategory(findCategory($pdo, $id))], 201);
});

on('PUT', '/categories/{id}', function ($a) {
    $pdo  = db();
    $cat  = findCategory($pdo, (int) $a['id']);
    $body = read_json_body();
    $name    = v_string($body['name'] ?? '', 100, true, 'Category name');
    $details = v_string($body['details'] ?? '', 255, false, 'Details');
    $type    = $cat['type']; // type is immutable

    $dup = $pdo->prepare('SELECT COUNT(*) FROM categories WHERE book_id = ? AND type = ? AND name = ? AND id <> ?');
    $dup->execute([(int) $cat['book_id'], $type, $name, (int) $cat['id']]);
    if ((int) $dup->fetchColumn() > 0) {
        json_error('Another ' . $type . ' category named "' . $name . '" already exists.', 409, 'duplicate');
    }

    $pdo->beginTransaction();
    try {
        $pdo->prepare('UPDATE categories SET name = ?, details = ? WHERE id = ?')
            ->execute([$name, $details, (int) $cat['id']]);
        // Keep each transaction's denormalised category label in sync.
        $pdo->prepare('UPDATE personal_transactions SET category_name = ? WHERE category_id = ?')
            ->execute([$name, (int) $cat['id']]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save category.', 500);
    }

    json_response(['success' => true, 'category' => shapeCategory(findCategory($pdo, (int) $cat['id']))]);
});

on('DELETE', '/categories/{id}', function ($a) {
    $pdo = db();
    findCategory($pdo, (int) $a['id']);
    // FK ON DELETE SET NULL nulls category_id on its transactions; they keep the label.
    $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([(int) $a['id']]);
    json_response(['success' => true]);
});

// ---- Personal transactions (personal books) --------------------------------

/** Validate a required category against the book + type; returns the category row. */
function requireCategory(PDO $pdo, int $bookId, string $type, $rawId): array
{
    if (!is_numeric($rawId)) {
        json_error('Please choose a category.', 422, 'validation');
    }
    $stmt = $pdo->prepare('SELECT id, name, type FROM categories WHERE id = ? AND book_id = ?');
    $stmt->execute([(int) $rawId, $bookId]);
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
    requireOwnedBook($pdo, (int) $a['id']);
    $stmt = $pdo->prepare('SELECT * FROM personal_transactions WHERE book_id = ? ORDER BY id DESC');
    $stmt->execute([(int) $a['id']]);
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
    $bookId = (int) $a['id'];
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

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'INSERT INTO personal_transactions
                (book_id, category_id, category_name, type, note, amount, signed_amount, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$bookId, (int) $category['id'], $category['name'], $type, $note, $amount, $signed, $timestamp]);
        $txId = (int) $pdo->lastInsertId();
        recomputeCategory($pdo, (int) $category['id']);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    json_response(['success' => true, 'transaction' => shapePersonalTx(findPersonalTx($pdo, $txId))], 201);
});

on('PUT', '/personal-transactions/{id}', function ($a) {
    $pdo    = db();
    $tx     = findPersonalTx($pdo, (int) $a['id']);
    $bookId = (int) $tx['book_id'];
    $body   = read_json_body();

    $type = $body['type'] ?? '';
    if (!in_array($type, ['income', 'expense'], true)) {
        json_error('Type must be "income" or "expense".', 422, 'validation');
    }
    $amount   = v_amount($body['amount'] ?? null, 'Amount');
    $note     = v_string($body['note'] ?? '', 255, false, 'Note');
    $category = requireCategory($pdo, $bookId, $type, $body['category_id'] ?? null);

    $signed   = $type === 'income' ? $amount : -$amount;
    $oldCatId = $tx['category_id'] !== null ? (int) $tx['category_id'] : null;
    $newCatId = (int) $category['id'];

    $pdo->beginTransaction();
    try {
        $pdo->prepare(
            'UPDATE personal_transactions
             SET category_id = ?, category_name = ?, type = ?, note = ?, amount = ?, signed_amount = ?
             WHERE id = ?'
        )->execute([$newCatId, $category['name'], $type, $note, $amount, $signed, (int) $tx['id']]);
        if ($oldCatId !== $newCatId) {
            recomputeCategory($pdo, $oldCatId);
        }
        recomputeCategory($pdo, $newCatId);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to save transaction.', 500);
    }

    json_response(['success' => true, 'transaction' => shapePersonalTx(findPersonalTx($pdo, (int) $tx['id']))]);
});

on('DELETE', '/personal-transactions/{id}', function ($a) {
    $pdo = db();
    $tx  = findPersonalTx($pdo, (int) $a['id']);
    $oldCatId = $tx['category_id'] !== null ? (int) $tx['category_id'] : null;

    $pdo->beginTransaction();
    try {
        $pdo->prepare('DELETE FROM personal_transactions WHERE id = ?')->execute([(int) $tx['id']]);
        recomputeCategory($pdo, $oldCatId);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_error('Failed to delete transaction.', 500);
    }

    json_response(['success' => true]);
});

dispatch();

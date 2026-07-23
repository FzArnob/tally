<?php
// Tally v3 backend — shared config, DB connection and helpers.
// Single-file API lives in index.php; this file only wires up PDO + utilities.

declare(strict_types=1);

// Store every time in UTC. This makes PHP-generated timestamps (date(), etc.)
// UTC; the DB session time zone below keeps MySQL's CURRENT_TIMESTAMP/NOW() and
// TIMESTAMP/DATETIME columns in UTC too. The frontend converts to the viewer's
// local zone on display (see v3/src/lib/format.ts parseServerTime()).
date_default_timezone_set('UTC');

const DB_HOST = '127.0.0.1';
const DB_NAME = 'tally_v3';
const DB_USER = 'root';
const DB_PASS = 'root';
// const DB_HOST = 'sql306.infinityfree.com';
// const DB_NAME = 'if0_42478972_tally';
// const DB_USER = 'if0_42478972';
// const DB_PASS = 'Ovy2hs68U9akx';

/**
 * Lazily-opened shared PDO connection.
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ]
            );
            // Force this connection to UTC so NOW()/CURRENT_TIMESTAMP and every
            // TIMESTAMP/DATETIME read or written is in UTC, regardless of the
            // server's local time zone. '+00:00' needs no MySQL tz tables loaded.
            $pdo->exec("SET time_zone = '+00:00'");
        } catch (PDOException $e) {
            json_response(['error' => 'Database connection failed'], 500);
        }
    }
    return $pdo;
}

/**
 * RFC-4122 v4 UUID.
 */
function uuid4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Emit a JSON response and stop.
 */
function json_response($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Convenience error helper. $code is a machine-readable slug for the client.
 */
function json_error(string $message, int $status = 400, ?string $code = null): void
{
    $body = ['error' => $message];
    if ($code !== null) {
        $body['code'] = $code;
    }
    json_response($body, $status);
}

/**
 * Decode the JSON request body (returns [] when empty/invalid).
 */
function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// ---- Validation helpers ----------------------------------------------------

function v_string($value, int $max, bool $required, string $field): string
{
    $s = is_string($value) ? trim($value) : '';
    if ($required && $s === '') {
        json_error("$field is required.", 422, 'validation');
    }
    if (mb_strlen($s) > $max) {
        json_error("$field must be at most $max characters.", 422, 'validation');
    }
    return $s;
}

function v_phone($value): string
{
    $s = is_string($value) ? trim($value) : '';
    if ($s === '') {
        return '';
    }
    if (mb_strlen($s) > 30) {
        json_error('Phone must be at most 30 characters.', 422, 'validation');
    }
    // Digits, spaces and + - ( ) only.
    if (!preg_match('/^[0-9+\-() ]{3,30}$/', $s)) {
        json_error('Phone number is not valid.', 422, 'validation');
    }
    return $s;
}

function v_amount($value, string $field = 'Amount'): float
{
    if (!is_numeric($value)) {
        json_error("$field must be a number.", 422, 'validation');
    }
    $n = (float) $value;
    if ($n <= 0) {
        json_error("$field must be greater than 0.", 422, 'validation');
    }
    if ($n > 1_000_000_000) {
        json_error("$field is too large.", 422, 'validation');
    }
    return round($n, 3);
}

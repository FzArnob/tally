/// Defensive parsing helpers.
///
/// The PHP API returns numeric fields inconsistently — sometimes as JSON
/// numbers, sometimes as strings (e.g. the nested `transactions` array in
/// `get-products-with-stock.php` are all strings, and `save-product-transaction`
/// returns `id` as a string while `get-product-transactions` returns it as an
/// int). Never cast `as num`; always parse through these helpers.
library;

double doubleFrom(Object? value, {double fallback = 0}) {
  if (value == null) return fallback;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString().trim()) ?? fallback;
}

int intFrom(Object? value, {int fallback = 0}) {
  if (value == null) return fallback;
  if (value is int) return value;
  if (value is num) return value.toInt();
  final s = value.toString().trim();
  return int.tryParse(s) ?? double.tryParse(s)?.toInt() ?? fallback;
}

/// The API sends string ids that may be ints (`"12"`) or generated tokens
/// (customer history `uniqid`). Keep them as trimmed strings.
String stringFrom(Object? value, {String fallback = ''}) {
  if (value == null) return fallback;
  return value.toString().trim();
}

String? nullableStringFrom(Object? value) {
  if (value == null) return null;
  final s = value.toString().trim();
  if (s.isEmpty || s.toLowerCase() == 'null') return null;
  return s;
}

/// Parses MySQL `DATETIME`/`TIMESTAMP` strings like `"2026-07-20 14:11:00"`
/// (space separator, no timezone). Falls back to [DateTime.now].
DateTime parseMySqlDate(Object? value) {
  final s = value?.toString().trim();
  if (s == null || s.isEmpty) return DateTime.now();
  // Convert the MySQL space separator to ISO 8601 so DateTime.parse accepts it.
  final iso = s.contains('T') ? s : s.replaceFirst(' ', 'T');
  return DateTime.tryParse(iso) ?? DateTime.now();
}

/// Formats a [DateTime] back into the MySQL string the API expects.
String toMySqlDate(DateTime dt) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${dt.year}-${two(dt.month)}-${two(dt.day)} '
      '${two(dt.hour)}:${two(dt.minute)}:${two(dt.second)}';
}

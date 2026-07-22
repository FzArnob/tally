import 'package:intl/intl.dart';

/// Currency / number formatting that mirrors the v1 web client:
///
/// * The Taka symbol `৳` is hardcoded (v1 only used `Intl` for digit grouping,
///   not `style: 'currency'`).
/// * Bengali locale renders Bengali numerals (`০–৯`) and grouping.
/// * Negative balances render the minus **before** the symbol: `-৳ 123`.
class Money {
  const Money(this.localeName);

  /// Either `'en'` or `'bn'`.
  final String localeName;

  static const String symbol = '৳';

  bool get _isBengali => localeName.startsWith('bn');

  NumberFormat get _decimal => NumberFormat.decimalPattern(localeName)
    ..minimumFractionDigits = 0
    ..maximumFractionDigits = 10;

  /// Plain grouped number, no symbol (stock counts, quantities, calculator).
  String number(num value) => _decimal.format(value);

  /// `৳ 1,234.5` — no forced sign.
  String currency(num value) => '$symbol ${_decimal.format(value)}';

  /// Signed balance, e.g. `-৳ 250` / `৳ 250` (minus before the symbol).
  String currentBalance(num value) {
    if (value < 0) return '-$symbol ${_decimal.format(value.abs())}';
    return '$symbol ${_decimal.format(value)}';
  }

  /// Explicit `+`/`-` prefix used in list rows and history entries.
  String signed(num value) {
    if (value < 0) return '-$symbol ${_decimal.format(value.abs())}';
    return '+$symbol ${_decimal.format(value)}';
  }

  /// Maps ASCII digits in an arbitrary string (e.g. a calculator expression)
  /// to Bengali numerals when the active locale is Bengali. Math stays ASCII
  /// internally; this is display-only.
  String localizeDigits(String input) {
    if (!_isBengali) return input;
    const map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    final buffer = StringBuffer();
    for (final rune in input.runes) {
      if (rune >= 0x30 && rune <= 0x39) {
        buffer.write(map[rune - 0x30]);
      } else {
        buffer.writeCharCode(rune);
      }
    }
    return buffer.toString();
  }
}

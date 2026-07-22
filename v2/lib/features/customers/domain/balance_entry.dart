import 'package:tally/core/network/parsing.dart';

enum BalanceType {
  paid,
  unpaid;

  static BalanceType parse(Object? raw) =>
      raw?.toString().trim() == 'unpaid' ? BalanceType.unpaid : BalanceType.paid;

  String get apiValue => name; // 'paid' | 'unpaid'
}

/// A single entry in a customer's balance history. [amount] is always stored
/// positive; the sign is derived from [type] (paid = +, unpaid = −).
class BalanceEntry {
  const BalanceEntry({
    required this.id,
    required this.amount,
    required this.type,
    required this.timestamp,
    this.reason,
    this.expression,
  });

  final String id;
  final double amount;
  final BalanceType type;
  final DateTime timestamp;
  final String? reason;
  final String? expression;

  factory BalanceEntry.fromJson(Map<String, dynamic> json) => BalanceEntry(
        id: stringFrom(json['id']),
        amount: doubleFrom(json['amount']),
        type: BalanceType.parse(json['type']),
        timestamp: parseMySqlDate(json['timestamp']),
        reason: nullableStringFrom(json['reason']),
        expression: nullableStringFrom(json['expression']),
      );

  bool get isPaid => type == BalanceType.paid;

  /// Signed amount for display (+paid / −unpaid).
  double get signedAmount => isPaid ? amount : -amount;
}

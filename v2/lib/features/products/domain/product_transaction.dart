import 'package:tally/core/network/parsing.dart';

enum TxType {
  stock,
  sale;

  static TxType parse(Object? raw) =>
      raw?.toString().trim() == 'sale' ? TxType.sale : TxType.stock;

  String get apiValue => name; // 'stock' | 'sale'
}

/// A stock-in or sale entry against a product. Amounts are computed server-side
/// (`total_amount = quantity * price_per_unit`).
class ProductTransaction {
  const ProductTransaction({
    required this.id,
    required this.type,
    required this.quantity,
    required this.pricePerUnit,
    required this.totalAmount,
    required this.createdAt,
  });

  /// Ids arrive as int (`get-product-transactions`) or string
  /// (`save-product-transaction`); kept as a string for uniformity.
  final String id;
  final TxType type;
  final double quantity;
  final double pricePerUnit;
  final double totalAmount;
  final DateTime createdAt;

  factory ProductTransaction.fromJson(Map<String, dynamic> json) {
    final qty = doubleFrom(json['quantity']);
    final price = doubleFrom(json['price_per_unit']);
    return ProductTransaction(
      id: stringFrom(json['id']),
      type: TxType.parse(json['type']),
      quantity: qty,
      pricePerUnit: price,
      // Nested transactions in get-products-with-stock omit/stringify this;
      // fall back to qty*price when absent.
      totalAmount: json['total_amount'] != null
          ? doubleFrom(json['total_amount'])
          : qty * price,
      createdAt: parseMySqlDate(json['created_at']),
    );
  }

  /// Signed quantity contribution to stock: +stock, −sale.
  double get signedQuantity => type == TxType.stock ? quantity : -quantity;
}

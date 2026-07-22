import 'package:tally/core/network/parsing.dart';
import 'package:tally/features/products/domain/product_transaction.dart';

/// A product in the inventory. Stock is never stored — it is derived from
/// transactions (`current_stock = Σ stock − Σ sale`) by the API.
class Product {
  const Product({
    required this.id,
    required this.name,
    required this.quantityType,
    this.imageUrl,
    this.totalStockIn = 0,
    this.totalStockOut = 0,
    this.currentStock = 0,
    this.transactions = const [],
  });

  final int id;
  final String name;

  /// Unit label: piece / packet / cartoon / kg / liter / custom.
  final String quantityType;

  /// A base64 data URL (v1 stores the picked image inline) or null.
  final String? imageUrl;

  final double totalStockIn;
  final double totalStockOut;
  final double currentStock;

  /// Populated only by `get-products-with-stock.php`; empty otherwise.
  final List<ProductTransaction> transactions;

  factory Product.fromJson(Map<String, dynamic> json) {
    final rawTx = json['transactions'];
    return Product(
      id: intFrom(json['id']),
      name: stringFrom(json['name']),
      quantityType: stringFrom(json['quantity_type'], fallback: 'piece'),
      imageUrl: nullableStringFrom(json['image_url']),
      totalStockIn: doubleFrom(json['total_stock_in']),
      totalStockOut: doubleFrom(json['total_stock_out']),
      currentStock: doubleFrom(json['current_stock']),
      transactions: rawTx is List
          ? rawTx
              .whereType<Map>()
              .map((e) => ProductTransaction.fromJson(
                  Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }

  /// True when [imageUrl] is a usable image reference.
  bool get hasImage => imageUrl != null && imageUrl!.isNotEmpty;
}

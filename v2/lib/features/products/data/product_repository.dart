import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/config/app_config.dart';
import 'package:tally/core/network/api_client.dart';
import 'package:tally/features/products/domain/product.dart';
import 'package:tally/features/products/domain/product_transaction.dart';

class ProductRepository {
  ProductRepository(this._api);

  final ApiClient _api;

  Future<List<Product>> fetchProductsWithStock({
    int bookId = AppConfig.bookId,
  }) async {
    final json = await _api
        .get('get-products-with-stock.php', query: {'book_id': bookId});
    final list = (json['products'] as List?) ?? const [];
    return list
        .whereType<Map>()
        .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<Product> fetchProduct(int productId) async {
    final json =
        await _api.get('get-product.php', query: {'product_id': productId});
    return Product.fromJson(json);
  }

  Future<List<ProductTransaction>> fetchTransactions(int productId) async {
    final json = await _api
        .get('get-product-transactions.php', query: {'product_id': productId});
    final list = (json['transactions'] as List?) ?? const [];
    return list
        .whereType<Map>()
        .map((e) => ProductTransaction.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Creates (when [productId] is null) or updates a product.
  Future<Product> saveProduct({
    int? productId,
    required String name,
    required String quantityType,
    String? imageUrl,
    int bookId = AppConfig.bookId,
  }) async {
    final json = await _api.post('save-product.php', {
      'book_id': bookId,
      'product_id': productId,
      'name': name,
      'quantity_type': quantityType,
      'image_url': imageUrl,
    });
    return Product.fromJson(Map<String, dynamic>.from(json['product'] as Map));
  }

  Future<ProductTransaction> addTransaction({
    required int productId,
    required TxType type,
    required double quantity,
    required double pricePerUnit,
  }) async {
    final json = await _api.post('save-product-transaction.php', {
      'product_id': productId,
      'type': type.apiValue,
      'quantity': quantity,
      'price_per_unit': pricePerUnit,
    });
    return ProductTransaction.fromJson(
        Map<String, dynamic>.from(json['transaction'] as Map));
  }

  Future<void> deleteTransaction({
    required int productId,
    required String transactionId,
  }) async {
    await _api.delete('delete-product-transaction.php', {
      'transaction_id': transactionId,
      'product_id': productId,
    });
  }
}

final productRepositoryProvider = Provider<ProductRepository>((ref) {
  return ProductRepository(ref.watch(apiClientProvider));
});

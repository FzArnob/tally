import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/features/products/data/product_repository.dart';
import 'package:tally/features/products/domain/product.dart';
import 'package:tally/features/products/domain/product_transaction.dart';

/// The product grid. Loads all products with derived stock and exposes
/// mutations that refresh the list afterwards.
class ProductsNotifier extends AsyncNotifier<List<Product>> {
  ProductRepository get _repo => ref.read(productRepositoryProvider);

  @override
  Future<List<Product>> build() => _repo.fetchProductsWithStock();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repo.fetchProductsWithStock);
  }

  Future<void> saveProduct({
    int? productId,
    required String name,
    required String quantityType,
    String? imageUrl,
  }) async {
    await _repo.saveProduct(
      productId: productId,
      name: name,
      quantityType: quantityType,
      imageUrl: imageUrl,
    );
    await refresh();
  }

  Future<void> addTransaction({
    required int productId,
    required TxType type,
    required double quantity,
    required double pricePerUnit,
  }) async {
    await _repo.addTransaction(
      productId: productId,
      type: type,
      quantity: quantity,
      pricePerUnit: pricePerUnit,
    );
    _invalidateHistory(productId);
    await refresh();
  }

  /// There is no update endpoint, so an edit is delete-old + create-new.
  Future<void> editTransaction({
    required int productId,
    required String oldTransactionId,
    required TxType type,
    required double quantity,
    required double pricePerUnit,
  }) async {
    await _repo.deleteTransaction(
      productId: productId,
      transactionId: oldTransactionId,
    );
    await _repo.addTransaction(
      productId: productId,
      type: type,
      quantity: quantity,
      pricePerUnit: pricePerUnit,
    );
    _invalidateHistory(productId);
    await refresh();
  }

  Future<void> deleteTransaction({
    required int productId,
    required String transactionId,
  }) async {
    await _repo.deleteTransaction(
      productId: productId,
      transactionId: transactionId,
    );
    _invalidateHistory(productId);
    await refresh();
  }

  void _invalidateHistory(int productId) {
    ref.invalidate(productTransactionsProvider(productId));
    ref.invalidate(productDetailProvider(productId));
  }
}

final productsProvider =
    AsyncNotifierProvider<ProductsNotifier, List<Product>>(ProductsNotifier.new);

/// Single product with fresh derived stock (used by the action modal header).
final productDetailProvider =
    FutureProvider.family<Product, int>((ref, productId) {
  return ref.watch(productRepositoryProvider).fetchProduct(productId);
});

/// A product's transaction history (newest first, as returned by the API).
final productTransactionsProvider =
    FutureProvider.family<List<ProductTransaction>, int>((ref, productId) {
  return ref.watch(productRepositoryProvider).fetchTransactions(productId);
});

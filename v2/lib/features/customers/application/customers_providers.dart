import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/features/customers/data/customer_repository.dart';
import 'package:tally/features/customers/domain/balance_entry.dart';
import 'package:tally/features/customers/domain/customer.dart';

/// The customer balance list + aggregate totals, with mutations that refresh.
class CustomersNotifier extends AsyncNotifier<CustomerList> {
  CustomerRepository get _repo => ref.read(customerRepositoryProvider);

  @override
  Future<CustomerList> build() => _repo.fetchCustomers();

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_repo.fetchCustomers);
  }

  Future<double> addEntry({
    required String customerName,
    required BalanceType type,
    required double amount,
    String? reason,
    String? expression,
  }) async {
    final newBalance = await _repo.addEntry(
      customerName: customerName,
      type: type,
      amount: amount,
      reason: reason,
      expression: expression,
    );
    ref.invalidate(customerHistoryProvider(customerName));
    await refresh();
    return newBalance;
  }

  Future<double> deleteEntry({
    required String customerName,
    required String historyId,
  }) async {
    final newBalance = await _repo.deleteEntry(
      historyId: historyId,
      customerName: customerName,
    );
    ref.invalidate(customerHistoryProvider(customerName));
    await refresh();
    return newBalance;
  }
}

final customersProvider =
    AsyncNotifierProvider<CustomersNotifier, CustomerList>(CustomersNotifier.new);

/// A customer's balance history (newest first).
final customerHistoryProvider =
    FutureProvider.family<List<BalanceEntry>, String>((ref, name) {
  return ref.watch(customerRepositoryProvider).fetchHistory(name);
});

/// Client-side search query for the customer panel.
final customerSearchProvider = StateProvider<String>((ref) => '');

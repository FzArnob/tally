import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/config/app_config.dart';
import 'package:tally/core/network/api_client.dart';
import 'package:tally/core/network/parsing.dart';
import 'package:tally/features/customers/domain/balance_entry.dart';
import 'package:tally/features/customers/domain/customer.dart';

class CustomerRepository {
  CustomerRepository(this._api);

  final ApiClient _api;

  Future<CustomerList> fetchCustomers({int bookId = AppConfig.bookId}) async {
    final json =
        await _api.get('get-book-customers.php', query: {'book_id': bookId});
    final customers = ((json['customers'] as List?) ?? const [])
        .whereType<Map>()
        .map((e) => Customer.fromJson(Map<String, dynamic>.from(e)))
        .toList();
    final totals = json['totals'] is Map
        ? CustomerTotals.fromJson(Map<String, dynamic>.from(json['totals'] as Map))
        : CustomerTotals.zero;
    return CustomerList(customers: customers, totals: totals);
  }

  Future<List<BalanceEntry>> fetchHistory(
    String customerName, {
    int bookId = AppConfig.bookId,
  }) async {
    final json = await _api.get(
      'get-book-customer-balance-history.php',
      query: {'book_id': bookId, 'customer_name': customerName},
    );
    return ((json['history'] as List?) ?? const [])
        .whereType<Map>()
        .map((e) => BalanceEntry.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  /// Records a paid/unpaid entry. Creates the customer lazily server-side.
  /// Returns the customer's new balance.
  Future<double> addEntry({
    required String customerName,
    required BalanceType type,
    required double amount,
    String? reason,
    String? expression,
    int bookId = AppConfig.bookId,
  }) async {
    final json = await _api.post('customer-balance.php', {
      'book_id': bookId,
      'customer_name': customerName,
      'type': type.apiValue,
      'amount': amount,
      'reason': reason,
      'expression': expression,
      'timestamp': toMySqlDate(DateTime.now()),
    });
    return doubleFrom(json['new_balance']);
  }

  /// Deletes a history entry; the server reverses the balance and returns it.
  Future<double> deleteEntry({
    required String historyId,
    required String customerName,
    int bookId = AppConfig.bookId,
  }) async {
    final json = await _api.delete('delete-customer-balance-history.php', {
      'history_id': historyId,
      'book_id': bookId,
      'customer_name': customerName,
    });
    return doubleFrom(json['new_customer_balance']);
  }
}

final customerRepositoryProvider = Provider<CustomerRepository>((ref) {
  return CustomerRepository(ref.watch(apiClientProvider));
});

import 'package:tally/core/network/parsing.dart';

/// A customer, identified by [name] (the API has no numeric customer id —
/// the composite key is book_id + name). A positive [totalBalance] means the
/// customer paid in advance; negative means they owe.
class Customer {
  const Customer({required this.name, required this.totalBalance});

  final String name;
  final double totalBalance;

  factory Customer.fromJson(Map<String, dynamic> json) => Customer(
        name: stringFrom(json['name']),
        totalBalance: doubleFrom(json['total_balance']),
      );

  bool get isPositive => totalBalance >= 0;
}

/// Aggregate totals across all customers.
class CustomerTotals {
  const CustomerTotals({required this.totalPaid, required this.totalUnpaid});

  final double totalPaid;
  final double totalUnpaid;

  factory CustomerTotals.fromJson(Map<String, dynamic> json) => CustomerTotals(
        totalPaid: doubleFrom(json['total_paid']),
        totalUnpaid: doubleFrom(json['total_unpaid']),
      );

  static const zero = CustomerTotals(totalPaid: 0, totalUnpaid: 0);
}

/// The `get-book-customers.php` response: list + totals.
class CustomerList {
  const CustomerList({required this.customers, required this.totals});

  final List<Customer> customers;
  final CustomerTotals totals;
}

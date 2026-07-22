import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/format/money.dart';
import 'package:tally/core/locale/locale_controller.dart';
import 'package:tally/core/theme/tokens.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/shared/widgets/empty_state.dart';
import 'package:tally/features/customers/application/customers_providers.dart';
import 'package:tally/features/customers/domain/customer.dart';
import 'package:tally/features/customers/presentation/customer_form_sheet.dart';
import 'package:tally/features/customers/presentation/customer_history_sheet.dart';

/// The Customer Balances surface. Rendered as an end-drawer on compact/medium
/// screens and docked inline on expanded screens.
class CustomersPanel extends ConsumerWidget {
  const CustomersPanel({super.key, this.onClose});

  /// Shown as a close (drawer) or collapse (docked) affordance.
  final VoidCallback? onClose;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final theme = Theme.of(context);
    final async = ref.watch(customersProvider);
    final query = ref.watch(customerSearchProvider);

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.fromLTRB(20, 0, 8, 0),
          height: 64,
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: theme.dividerColor)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  l10n.customerBalances,
                  style: theme.textTheme.titleLarge
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
              if (onClose != null)
                IconButton(icon: const Icon(Icons.close), onPressed: onClose),
            ],
          ),
        ),
        // Search + Add
        Container(
          color: theme.colorScheme.secondary,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: SizedBox(
                  height: 44,
                  child: TextField(
                    onChanged: (v) =>
                        ref.read(customerSearchProvider.notifier).state = v,
                    decoration: InputDecoration(
                      hintText: l10n.searchCustomers,
                      prefixIcon: const Icon(Icons.search, size: 20),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 44,
                child: FilledButton(
                  onPressed: () => showCustomerForm(context),
                  child: Text(l10n.add),
                ),
              ),
            ],
          ),
        ),
        // Body
        Expanded(
          child: async.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => EmptyState(message: l10n.genericError),
            data: (list) => _List(list: list, query: query),
          ),
        ),
      ],
    );
  }
}

class _List extends ConsumerWidget {
  const _List({required this.list, required this.query});

  final CustomerList list;
  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final money = ref.watch(moneyProvider);
    final tally = context.tally;

    final all = list.customers;
    final filtered = query.trim().isEmpty
        ? all
        : all
            .where((c) => c.name.toLowerCase().contains(query.toLowerCase()))
            .toList();
    filtered.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

    return Column(
      children: [
        if (all.isNotEmpty)
          Container(
            width: double.infinity,
            color: Theme.of(context).colorScheme.secondary,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            child: Row(
              children: [
                Expanded(
                  child: _Total(
                    label: l10n.advancePaid,
                    value: money.currency(list.totals.totalPaid),
                    color: tally.positive,
                  ),
                ),
                Expanded(
                  child: _Total(
                    label: l10n.totalUnpaid,
                    value: money.currency(list.totals.totalUnpaid),
                    color: tally.negative,
                    alignEnd: true,
                  ),
                ),
              ],
            ),
          ),
        Expanded(
          child: filtered.isEmpty
              ? EmptyState(
                  message: all.isEmpty ? l10n.noCustomers : l10n.noMatches)
              : RefreshIndicator(
                  onRefresh: () =>
                      ref.read(customersProvider.notifier).refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, i) =>
                        _CustomerRow(customer: filtered[i], money: money),
                  ),
                ),
        ),
      ],
    );
  }
}

class _Total extends StatelessWidget {
  const _Total({
    required this.label,
    required this.value,
    required this.color,
    this.alignEnd = false,
  });

  final String label;
  final String value;
  final Color color;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          alignEnd ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Text(label,
            style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSecondary)),
        const SizedBox(height: 2),
        Text(value,
            style: TextStyle(fontWeight: FontWeight.w600, color: color)),
      ],
    );
  }
}

class _CustomerRow extends StatelessWidget {
  const _CustomerRow({required this.customer, required this.money});

  final Customer customer;
  final Money money;

  @override
  Widget build(BuildContext context) {
    final tally = context.tally;
    final positive = customer.isPositive;
    final amount = money.signed(customer.totalBalance);

    return Material(
      color: Theme.of(context).colorScheme.surface,
      borderRadius: BorderRadius.circular(TallyTokens.radius),
      child: InkWell(
        borderRadius: BorderRadius.circular(TallyTokens.radius),
        onTap: () => showCustomerForm(context, customer: customer),
        onLongPress: () => showCustomerHistory(context, name: customer.name),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(TallyTokens.radius),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  customer.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
              ),
              Text(
                amount,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: positive ? tally.positive : tally.negative,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

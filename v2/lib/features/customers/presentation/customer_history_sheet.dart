import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/calc/calculator_controller.dart';
import 'package:tally/core/format/date_format.dart';
import 'package:tally/core/locale/locale_controller.dart';
import 'package:tally/core/responsive/breakpoints.dart';
import 'package:tally/core/theme/tokens.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/shared/widgets/confirm_dialog.dart';
import 'package:tally/shared/widgets/empty_state.dart';
import 'package:tally/shared/widgets/error_snackbar.dart';
import 'package:tally/shared/widgets/sheet_header.dart';
import 'package:tally/features/customers/application/customers_providers.dart';
import 'package:tally/features/customers/domain/balance_entry.dart';

/// Opens a customer's balance history with per-entry delete.
Future<void> showCustomerHistory(BuildContext context, {required String name}) {
  return showAdaptiveSheetOrDialog<void>(
    context: context,
    builder: (_) => CustomerHistorySheet(name: name),
  );
}

class CustomerHistorySheet extends ConsumerWidget {
  const CustomerHistorySheet({super.key, required this.name});

  final String name;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final async = ref.watch(customerHistoryProvider(name));

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 8, 0),
          child: SheetHeader(title: '$name — ${l10n.history}'),
        ),
        Flexible(
          child: async.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => EmptyState(message: l10n.genericError),
            data: (entries) {
              if (entries.isEmpty) {
                return EmptyState(message: l10n.noHistory);
              }
              return ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                itemCount: entries.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) =>
                    _EntryRow(name: name, entry: entries[i]),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _EntryRow extends ConsumerWidget {
  const _EntryRow({required this.name, required this.entry});

  final String name;
  final BalanceEntry entry;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final money = ref.watch(moneyProvider);
    final locale = ref.watch(localeControllerProvider).languageCode;
    final tally = context.tally;
    final color = entry.isPaid ? tally.positive : tally.negative;

    final expr = entry.expression;
    final exprLine = (expr != null && expr.isNotEmpty)
        ? '${money.localizeDigits(formatDisplayExpression(expr))} = ${money.currency(entry.amount)}'
        : null;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(TallyTokens.radius),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                money.signed(entry.signedAmount),
                style: TextStyle(fontWeight: FontWeight.w600, color: color),
              ),
              const Spacer(),
              Text(
                formatTimestamp(entry.timestamp, locale),
                style: TextStyle(fontSize: 11, color: tally.mutedForeground),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                iconSize: 18,
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _delete(context, ref),
              ),
            ],
          ),
          if (exprLine != null)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(exprLine,
                  style: TextStyle(fontSize: 12, color: tally.mutedForeground)),
            ),
          if (entry.reason != null && entry.reason!.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(entry.reason!,
                  style: TextStyle(fontSize: 13, color: tally.mutedForeground)),
            ),
        ],
      ),
    );
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final l10n = AppL10n.of(context);
    final ok = await showDeleteConfirm(
      context,
      title: l10n.deleteEntry,
      message: l10n.deleteHistoryConfirm,
    );
    if (!ok) return;
    try {
      await ref.read(customersProvider.notifier).deleteEntry(
            customerName: name,
            historyId: entry.id,
          );
    } catch (e) {
      if (context.mounted) showErrorSnack(context, e);
    }
  }
}

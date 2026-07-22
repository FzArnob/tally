import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/format/date_format.dart';
import 'package:tally/core/locale/locale_controller.dart';
import 'package:tally/core/responsive/breakpoints.dart';
import 'package:tally/core/theme/tokens.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/shared/widgets/confirm_dialog.dart';
import 'package:tally/shared/widgets/empty_state.dart';
import 'package:tally/shared/widgets/error_snackbar.dart';
import 'package:tally/shared/widgets/sheet_header.dart';
import 'package:tally/features/products/application/products_providers.dart';
import 'package:tally/features/products/domain/product.dart';
import 'package:tally/features/products/domain/product_transaction.dart';
import 'package:tally/features/products/presentation/stock_sale_sheet.dart';

/// Opens a product's stock/sale history with edit + delete actions.
Future<void> showProductHistory(BuildContext context, {required Product product}) {
  return showAdaptiveSheetOrDialog<void>(
    context: context,
    builder: (_) => ProductHistorySheet(product: product),
  );
}

class ProductHistorySheet extends ConsumerWidget {
  const ProductHistorySheet({super.key, required this.product});

  final Product product;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final async = ref.watch(productTransactionsProvider(product.id));

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 8, 0),
          child: SheetHeader(title: l10n.productHistoryTitle(product.name)),
        ),
        Flexible(
          child: async.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(40),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => EmptyState(message: l10n.failedToLoadProducts),
            data: (txs) {
              if (txs.isEmpty) {
                return EmptyState(message: l10n.noStockOrSaleEntries);
              }
              return ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
                itemCount: txs.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) => _HistoryRow(
                  product: product,
                  tx: txs[i],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _HistoryRow extends ConsumerWidget {
  const _HistoryRow({required this.product, required this.tx});

  final Product product;
  final ProductTransaction tx;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final money = ref.watch(moneyProvider);
    final locale = ref.watch(localeControllerProvider).languageCode;
    final tally = context.tally;
    final isStock = tx.type == TxType.stock;
    final pillColor = isStock ? tally.stock : tally.sale;

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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: pillColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  isStock ? l10n.stockIn : l10n.sale,
                  style: TextStyle(
                      color: pillColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 12),
                ),
              ),
              const Spacer(),
              IconButton(
                visualDensity: VisualDensity.compact,
                iconSize: 18,
                icon: const Icon(Icons.edit),
                onPressed: () async {
                  Navigator.of(context).pop();
                  await showStockSaleSheet(context, product: product, editing: tx);
                },
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                iconSize: 18,
                icon: const Icon(Icons.delete_outline),
                onPressed: () => _delete(context, ref),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  '${money.number(tx.quantity)} ${product.quantityType} × ${money.currency(tx.pricePerUnit)}',
                  style: TextStyle(color: tally.mutedForeground, fontSize: 13),
                ),
              ),
              Text(
                money.currency(tx.totalAmount),
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: isStock ? tally.negative : tally.positive,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              formatTimestamp(tx.createdAt, locale),
              style: TextStyle(fontSize: 11, color: tally.mutedForeground),
            ),
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
      message: l10n.deleteEntryConfirm,
    );
    if (!ok) return;
    try {
      await ref.read(productsProvider.notifier).deleteTransaction(
            productId: product.id,
            transactionId: tx.id,
          );
    } catch (e) {
      if (context.mounted) showErrorSnack(context, e);
    }
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/responsive/breakpoints.dart';
import 'package:tally/core/theme/tokens.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/core/locale/locale_controller.dart';
import 'package:tally/shared/widgets/error_snackbar.dart';
import 'package:tally/shared/widgets/product_thumb.dart';
import 'package:tally/shared/widgets/sheet_header.dart';
import 'package:tally/features/products/application/products_providers.dart';
import 'package:tally/features/products/domain/product.dart';
import 'package:tally/features/products/domain/product_transaction.dart';
import 'package:tally/features/products/presentation/product_form_sheet.dart';

/// Opens the stock-in / sale entry sheet for [product]. Pass [editing] to edit
/// an existing entry (type locked; saved as delete-old + create-new).
Future<void> showStockSaleSheet(
  BuildContext context, {
  required Product product,
  ProductTransaction? editing,
}) {
  return showAdaptiveSheetOrDialog<void>(
    context: context,
    builder: (_) => StockSaleSheet(product: product, editing: editing),
  );
}

class StockSaleSheet extends ConsumerStatefulWidget {
  const StockSaleSheet({super.key, required this.product, this.editing});

  final Product product;
  final ProductTransaction? editing;

  @override
  ConsumerState<StockSaleSheet> createState() => _StockSaleSheetState();
}

class _StockSaleSheetState extends ConsumerState<StockSaleSheet> {
  final _qtyCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  late TxType _tab;
  bool _saving = false;

  bool get _isEdit => widget.editing != null;

  @override
  void initState() {
    super.initState();
    final tx = widget.editing;
    _tab = tx?.type ?? TxType.stock;
    if (tx != null) {
      _qtyCtrl.text = _trimNum(tx.quantity);
      _priceCtrl.text = _trimNum(tx.pricePerUnit);
    }
  }

  String _trimNum(double v) =>
      v == v.roundToDouble() ? v.toInt().toString() : v.toString();

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _priceCtrl.dispose();
    super.dispose();
  }

  double get _total {
    final q = double.tryParse(_qtyCtrl.text) ?? 0;
    final p = double.tryParse(_priceCtrl.text) ?? 0;
    return q * p;
  }

  Future<void> _save() async {
    final l10n = AppL10n.of(context);
    final qty = double.tryParse(_qtyCtrl.text);
    final price = double.tryParse(_priceCtrl.text);
    if (qty == null || qty <= 0) {
      showMessageSnack(context, l10n.enterValidQuantity);
      return;
    }
    if (price == null || price < 0) {
      showMessageSnack(context, l10n.enterValidPrice);
      return;
    }

    setState(() => _saving = true);
    final notifier = ref.read(productsProvider.notifier);
    try {
      if (_isEdit) {
        await notifier.editTransaction(
          productId: widget.product.id,
          oldTransactionId: widget.editing!.id,
          type: _tab,
          quantity: qty,
          pricePerUnit: price,
        );
      } else {
        await notifier.addTransaction(
          productId: widget.product.id,
          type: _tab,
          quantity: qty,
          pricePerUnit: price,
        );
      }
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        showErrorSnack(context, e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    final money = ref.watch(moneyProvider);
    final tally = context.tally;
    final isStock = _tab == TxType.stock;
    final accent = isStock ? tally.stock : tally.sale;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 8, 0),
          child: Row(
            children: [
              ProductThumb(imageUrl: widget.product.imageUrl, size: 44),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            widget.product.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 18),
                          ),
                        ),
                        IconButton(
                          visualDensity: VisualDensity.compact,
                          icon: const Icon(Icons.edit, size: 18),
                          onPressed: () async {
                            final navigator = Navigator.of(context);
                            final saved = await showProductForm(context,
                                product: widget.product);
                            if (saved == true && mounted) {
                              navigator.pop();
                            }
                          },
                        ),
                      ],
                    ),
                    Text(
                      l10n.stockLabel(
                        money.number(widget.product.currentStock),
                        widget.product.quantityType,
                      ),
                      style: TextStyle(
                          fontSize: 12, color: tally.mutedForeground),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).maybePop(),
              ),
            ],
          ),
        ),
        Flexible(
          child: SheetBody(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (!_isEdit) ...[
                  _TabSwitch(
                    tab: _tab,
                    onChanged: (t) => setState(() => _tab = t),
                  ),
                  const SizedBox(height: 16),
                ],
                _label(l10n.quantity),
                const SizedBox(height: 6),
                TextField(
                  controller: _qtyCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [_decimalFormatter],
                  decoration: const InputDecoration(hintText: '0'),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 16),
                _label(isStock ? l10n.buyingPricePerUnit : l10n.sellingPricePerUnit),
                const SizedBox(height: 6),
                TextField(
                  controller: _priceCtrl,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [_decimalFormatter],
                  decoration: const InputDecoration(hintText: '0.00'),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(l10n.total,
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                    Text(
                      money.currency(_total),
                      style: const TextStyle(
                          fontWeight: FontWeight.w600, fontSize: 16),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                FilledButton(
                  style: FilledButton.styleFrom(
                    backgroundColor: accent,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : Text(_isEdit ? l10n.update : l10n.save),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _label(String text) => Align(
        alignment: Alignment.centerLeft,
        child: Text(text, style: TextStyle(color: context.tally.mutedForeground)),
      );

  static final _decimalFormatter =
      FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'));
}

class _TabSwitch extends StatelessWidget {
  const _TabSwitch({required this.tab, required this.onChanged});

  final TxType tab;
  final ValueChanged<TxType> onChanged;

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    final tally = context.tally;
    return Row(
      children: [
        Expanded(
          child: _TabButton(
            label: l10n.stockIn,
            selected: tab == TxType.stock,
            color: tally.stock,
            onTap: () => onChanged(TxType.stock),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _TabButton(
            label: l10n.sale,
            selected: tab == TxType.sale,
            color: tally.sale,
            onTap: () => onChanged(TxType.sale),
          ),
        ),
      ],
    );
  }
}

class _TabButton extends StatelessWidget {
  const _TabButton({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? color : Theme.of(context).colorScheme.secondary,
      borderRadius: BorderRadius.circular(TallyTokens.radius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(TallyTokens.radius),
        child: Container(
          height: 44,
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: selected
                  ? Colors.white
                  : Theme.of(context).colorScheme.onSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

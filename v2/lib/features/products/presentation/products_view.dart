import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/locale/locale_controller.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/shared/widgets/empty_state.dart';
import 'package:tally/features/products/application/products_providers.dart';
import 'package:tally/features/products/domain/product.dart';
import 'package:tally/features/products/presentation/product_form_sheet.dart';
import 'package:tally/features/products/presentation/product_history_sheet.dart';
import 'package:tally/features/products/presentation/stock_sale_sheet.dart';
import 'package:tally/features/products/presentation/widgets/product_tile.dart';

/// The home body: a responsive grid of product tiles plus an add tile.
/// Columns scale fluidly with width (phone → few, desktop → many).
class ProductsView extends ConsumerWidget {
  const ProductsView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final async = ref.watch(productsProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(productsProvider.notifier).refresh(),
      child: async.when(
        loading: () => const _CenteredScroll(child: CircularProgressIndicator()),
        error: (e, _) => _CenteredScroll(
          child: EmptyState(
            message: l10n.failedToLoadProducts,
            icon: Icons.error_outline,
            action: FilledButton(
              onPressed: () => ref.read(productsProvider.notifier).refresh(),
              child: Text(l10n.update),
            ),
          ),
        ),
        data: (products) => _Grid(products: products),
      ),
    );
  }
}

class _Grid extends ConsumerWidget {
  const _Grid({required this.products});

  final List<Product> products;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final money = ref.watch(moneyProvider);

    if (products.isEmpty) {
      return _CenteredScroll(
        child: EmptyState(
          message: l10n.noProducts,
          icon: Icons.inventory_2_outlined,
          action: FilledButton.icon(
            onPressed: () => showProductForm(context),
            icon: const Icon(Icons.add),
            label: Text(l10n.addProduct),
          ),
        ),
      );
    }

    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 1200),
        child: GridView.builder(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: 120,
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 0.92,
          ),
          itemCount: products.length + 1,
          itemBuilder: (context, i) {
            if (i == products.length) {
              return AddProductTile(onTap: () => showProductForm(context));
            }
            final product = products[i];
            return ProductTile(
              product: product,
              money: money,
              onTap: () => showStockSaleSheet(context, product: product),
              onLongPress: () => showProductHistory(context, product: product),
            );
          },
        ),
      ),
    );
  }
}

/// Wraps content so it fills the viewport and stays pull-to-refreshable even
/// when short.
class _CenteredScroll extends StatelessWidget {
  const _CenteredScroll({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(child: child),
        ),
      ),
    );
  }
}

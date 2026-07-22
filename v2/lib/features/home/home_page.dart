import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'package:tally/core/locale/locale_controller.dart';
import 'package:tally/core/responsive/breakpoints.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/features/book/data/book_repository.dart';
import 'package:tally/features/customers/presentation/customers_panel.dart';
import 'package:tally/features/products/presentation/products_view.dart';

/// The single home screen: the product grid, with the Customer Balances surface
/// as an end-drawer (compact/medium) or a docked side panel (expanded).
class HomePage extends ConsumerStatefulWidget {
  const HomePage({super.key});

  @override
  ConsumerState<HomePage> createState() => _HomePageState();
}

class _HomePageState extends ConsumerState<HomePage> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  bool _panelDocked = true;

  void _toggleCustomers() {
    if (context.isExpanded) {
      setState(() => _panelDocked = !_panelDocked);
    } else {
      _scaffoldKey.currentState?.openEndDrawer();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    final expanded = context.isExpanded;
    final screenWidth = MediaQuery.sizeOf(context).width;

    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        titleSpacing: 16,
        title: const _StoreTitle(),
        actions: [
          _LanguageButton(),
          IconButton(
            tooltip: l10n.customerBalances,
            onPressed: _toggleCustomers,
            icon: const Icon(Icons.groups_outlined),
          ),
          const SizedBox(width: 4),
        ],
      ),
      endDrawer: expanded
          ? null
          : Drawer(
              width: context.isCompact ? screenWidth : 400,
              backgroundColor: Theme.of(context).scaffoldBackgroundColor,
              shape: const RoundedRectangleBorder(),
              child: CustomersPanel(
                onClose: () => Navigator.of(context).maybePop(),
              ),
            ),
      body: Row(
        children: [
          const Expanded(child: SafeArea(child: ProductsView())),
          if (expanded && _panelDocked)
            Container(
              width: 380,
              decoration: BoxDecoration(
                border: Border(
                    left: BorderSide(color: Theme.of(context).dividerColor)),
              ),
              child: SafeArea(
                child: CustomersPanel(
                  onClose: () => setState(() => _panelDocked = false),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StoreTitle extends ConsumerWidget {
  const _StoreTitle();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final name = ref.watch(bookProvider).valueOrNull?.name ?? 'Tally';
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            shape: BoxShape.circle,
          ),
          padding: const EdgeInsets.all(8),
          child: SvgPicture.asset('assets/images/store.svg'),
        ),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 18),
          ),
        ),
      ],
    );
  }
}

class _LanguageButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppL10n.of(context);
    final current = ref.watch(localeControllerProvider).languageCode;
    return PopupMenuButton<String>(
      tooltip: l10n.language,
      icon: const Icon(Icons.translate),
      onSelected: (code) =>
          ref.read(localeControllerProvider.notifier).setLanguage(code),
      itemBuilder: (context) => [
        _langItem('en', '🇺🇸', l10n.english, current),
        _langItem('bn', '🇧🇩', l10n.bangla, current),
      ],
    );
  }

  PopupMenuItem<String> _langItem(
      String code, String flag, String name, String current) {
    return PopupMenuItem<String>(
      value: code,
      child: Row(
        children: [
          Text(flag, style: const TextStyle(fontSize: 18)),
          const SizedBox(width: 12),
          Text(name),
          if (code == current) ...[
            const Spacer(),
            const Icon(Icons.check, size: 18),
          ],
        ],
      ),
    );
  }
}

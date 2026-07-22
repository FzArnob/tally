import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:tally/core/calc/calculator_controller.dart';
import 'package:tally/core/locale/locale_controller.dart';
import 'package:tally/core/responsive/breakpoints.dart';
import 'package:tally/core/theme/tokens.dart';
import 'package:tally/l10n/app_localizations.dart';
import 'package:tally/shared/widgets/error_snackbar.dart';
import 'package:tally/shared/widgets/sheet_header.dart';
import 'package:tally/features/customers/application/customers_providers.dart';
import 'package:tally/features/customers/domain/balance_entry.dart';
import 'package:tally/features/customers/domain/customer.dart';
import 'package:tally/features/customers/presentation/widgets/calculator_keypad.dart';

/// Opens the add/edit customer sheet. Pass [customer] to start in edit mode.
Future<void> showCustomerForm(BuildContext context, {Customer? customer}) {
  return showAdaptiveSheetOrDialog<void>(
    context: context,
    dialogMaxWidth: 460,
    builder: (_) => CustomerFormSheet(customer: customer),
  );
}

class CustomerFormSheet extends ConsumerStatefulWidget {
  const CustomerFormSheet({super.key, this.customer});

  final Customer? customer;

  @override
  ConsumerState<CustomerFormSheet> createState() => _CustomerFormSheetState();
}

class _CustomerFormSheetState extends ConsumerState<CustomerFormSheet> {
  final _nameCtrl = TextEditingController();
  final _reasonCtrl = TextEditingController();
  final _nameFocus = FocusNode();
  final _reasonFocus = FocusNode();
  final _calc = CalculatorController();

  bool _editing = false;
  double? _currentBalance;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    final c = widget.customer;
    if (c != null) {
      _editing = true;
      _nameCtrl.text = c.name;
      _currentBalance = c.totalBalance;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _reasonCtrl.dispose();
    _nameFocus.dispose();
    _reasonFocus.dispose();
    _calc.dispose();
    super.dispose();
  }

  Future<void> _apply(BalanceType type) async {
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) {
      _nameFocus.requestFocus();
      return;
    }
    final amount = _calc.finalizedAmount();
    if (amount == null) return; // ignore zero/invalid like v1

    final l10n = AppL10n.of(context);
    final reason = _reasonCtrl.text.trim();
    final expression = _calc.rawExpression;

    setState(() => _busy = true);
    try {
      final newBalance = await ref.read(customersProvider.notifier).addEntry(
            customerName: name,
            type: type,
            amount: amount,
            reason: reason.isEmpty ? (type == BalanceType.paid ? l10n.paid : l10n.unpaid) : reason,
            expression: expression,
          );
      if (!mounted) return;
      setState(() {
        _busy = false;
        _editing = true;
        _currentBalance = newBalance;
        _reasonCtrl.clear();
      });
      _calc.clear();
    } catch (e) {
      if (mounted) {
        setState(() => _busy = false);
        showErrorSnack(context, e);
      }
    }
  }

  KeyEventResult _onKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    if (_nameFocus.hasFocus || _reasonFocus.hasFocus) {
      return KeyEventResult.ignored;
    }
    final ch = event.character;
    final key = event.logicalKey;

    if (ch != null) {
      if (RegExp(r'^[0-9.]$').hasMatch(ch)) {
        _calc.inputNumber(ch);
        return KeyEventResult.handled;
      }
      if (ch == '+' || ch == '-' || ch == '*' || ch == '/') {
        _calc.inputOperator(ch);
        return KeyEventResult.handled;
      }
      if (ch == '%') {
        _calc.percent();
        return KeyEventResult.handled;
      }
      if (ch.toLowerCase() == 'c') {
        _calc.clear();
        return KeyEventResult.handled;
      }
    }
    if (key == LogicalKeyboardKey.backspace) {
      _calc.backspace();
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.numpadEnter ||
        key == LogicalKeyboardKey.equal) {
      final ctrl = HardwareKeyboard.instance.isControlPressed ||
          HardwareKeyboard.instance.isMetaPressed;
      _apply(ctrl ? BalanceType.unpaid : BalanceType.paid);
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppL10n.of(context);
    final money = ref.watch(moneyProvider);
    final tally = context.tally;

    return Focus(
      autofocus: true,
      onKeyEvent: _onKey,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 8, 0),
            child: SheetHeader(
                title: _editing ? l10n.editCustomer : l10n.addCustomer),
          ),
          Flexible(
            child: SheetBody(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: _nameCtrl,
                    focusNode: _nameFocus,
                    enabled: !_editing,
                    decoration: InputDecoration(hintText: l10n.customerName),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _reasonCtrl,
                    focusNode: _reasonFocus,
                    minLines: 2,
                    maxLines: 3,
                    decoration: InputDecoration(hintText: l10n.orderDetails),
                  ),
                  if (_currentBalance != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Text(l10n.currentBalance,
                            style: TextStyle(color: tally.mutedForeground)),
                        const SizedBox(width: 6),
                        Text(
                          money.currentBalance(_currentBalance!),
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 18,
                            color: _currentBalance! > 0
                                ? tally.positive
                                : _currentBalance! < 0
                                    ? tally.negative
                                    : tally.mutedForeground,
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
                  CustomerCalculator(
                    controller: _calc,
                    money: money,
                    busy: _busy,
                    onPaid: () => _apply(BalanceType.paid),
                    onUnpaid: () => _apply(BalanceType.unpaid),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import 'package:tally/core/calc/calculator_controller.dart';
import 'package:tally/core/format/money.dart';
import 'package:tally/core/theme/tokens.dart';
import 'package:tally/l10n/app_localizations.dart';

/// The embedded customer-balance calculator: a display + a 5-column keypad
/// whose Paid/Unpaid keys submit the entry (mirroring the v1 layout).
class CustomerCalculator extends StatelessWidget {
  const CustomerCalculator({
    super.key,
    required this.controller,
    required this.money,
    required this.onPaid,
    required this.onUnpaid,
    this.busy = false,
  });

  final CalculatorController controller;
  final Money money;
  final VoidCallback onPaid;
  final VoidCallback onUnpaid;
  final bool busy;

  static const double _cell = 52;
  static const double _gap = 8;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) {
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _display(context),
            const SizedBox(height: 12),
            _keypad(context),
          ],
        );
      },
    );
  }

  Widget _display(BuildContext context) {
    final tally = context.tally;
    final shownDisplay = money.localizeDigits(controller.display);
    final shownExpr =
        money.localizeDigits(formatDisplayExpression(controller.expression));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: tally.inputBackground,
        borderRadius: BorderRadius.circular(TallyTokens.radius),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            shownDisplay,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          SizedBox(
            height: 18,
            child: Text(
              shownExpr,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, color: tally.mutedForeground),
            ),
          ),
        ],
      ),
    );
  }

  Widget _keypad(BuildContext context) {
    return Column(
      children: [
        // Row 1: AC, backspace, %, Unpaid (spans two columns).
        _row([
          _num(context, _Key.clear('AC')),
          _num(context, _Key.func(icon: Icons.backspace_outlined)),
          _num(context, _Key.op('%')),
          _num(context, _Key.unpaid(context), flex: 2),
        ]),
        const SizedBox(height: _gap),
        // Row 2: 7 8 9, Paid (spans two columns).
        _row([
          _num(context, _Key.digit('7')),
          _num(context, _Key.digit('8')),
          _num(context, _Key.digit('9')),
          _num(context, _Key.paid(context), flex: 2),
        ]),
        const SizedBox(height: _gap),
        // Row 3: 4 5 6 × ÷
        _row([
          _num(context, _Key.digit('4')),
          _num(context, _Key.digit('5')),
          _num(context, _Key.digit('6')),
          _num(context, _Key.op('×')),
          _num(context, _Key.op('÷')),
        ]),
        const SizedBox(height: _gap),
        // Rows 4-5: 1 2 3 − / . 0 00 = with a tall + on the right.
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              flex: 4,
              child: Column(
                children: [
                  _row([
                    _num(context, _Key.digit('1')),
                    _num(context, _Key.digit('2')),
                    _num(context, _Key.digit('3')),
                    _num(context, _Key.op('−')),
                  ]),
                  const SizedBox(height: _gap),
                  _row([
                    _num(context, _Key.digit('.')),
                    _num(context, _Key.digit('0')),
                    _num(context, _Key.digit('00')),
                    _num(context, _Key.equals()),
                  ]),
                ],
              ),
            ),
            const SizedBox(width: _gap),
            Expanded(
              flex: 1,
              child: _button(
                context,
                _Key.plus(),
                height: _cell * 2 + _gap,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _row(List<Widget> children) {
    final spaced = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) spaced.add(const SizedBox(width: _gap));
      spaced.add(children[i]);
    }
    return Row(children: spaced);
  }

  Widget _num(BuildContext context, _Key key, {int flex = 1}) {
    return Expanded(flex: flex, child: _button(context, key));
  }

  Widget _button(BuildContext context, _Key key, {double height = _cell}) {
    final theme = Theme.of(context);
    final tally = context.tally;
    Color bg;
    Color fg;
    switch (key.style) {
      case _KeyStyle.number:
        bg = theme.colorScheme.surface;
        fg = theme.colorScheme.onSurface;
        break;
      case _KeyStyle.operator:
      case _KeyStyle.func:
      case _KeyStyle.equals:
        bg = theme.colorScheme.surfaceContainerHighest;
        fg = theme.colorScheme.onSurface;
        break;
      case _KeyStyle.clear:
      case _KeyStyle.plus:
        bg = TallyTokens.calcOrange;
        fg = Colors.white;
        break;
      case _KeyStyle.paid:
        bg = tally.positive;
        fg = Colors.white;
        break;
      case _KeyStyle.unpaid:
        bg = tally.negative;
        fg = Colors.white;
        break;
    }

    final disabled = busy && (key.style == _KeyStyle.paid || key.style == _KeyStyle.unpaid);

    return SizedBox(
      height: height,
      child: Material(
        color: bg,
        borderRadius: BorderRadius.circular(11),
        child: InkWell(
          borderRadius: BorderRadius.circular(11),
          onTap: disabled ? null : () => _onTap(key),
          child: Container(
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(11),
              border: key.style == _KeyStyle.number
                  ? Border.all(color: theme.dividerColor)
                  : null,
            ),
            child: key.icon != null
                ? Icon(key.icon, color: fg, size: 22)
                : Text(
                    money.localizeDigits(key.label ?? ''),
                    style: TextStyle(
                      color: fg,
                      fontSize: key.style == _KeyStyle.plus ? 24 : 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  void _onTap(_Key key) {
    switch (key.action) {
      case _Action.digit:
        controller.inputNumber(key.value!);
        break;
      case _Action.operator:
        controller.inputOperator(key.value!);
        break;
      case _Action.percent:
        controller.percent();
        break;
      case _Action.backspace:
        controller.backspace();
        break;
      case _Action.clear:
        controller.clear();
        break;
      case _Action.equals:
        controller.equals();
        break;
      case _Action.paid:
        onPaid();
        break;
      case _Action.unpaid:
        onUnpaid();
        break;
    }
  }
}

enum _KeyStyle { number, operator, func, clear, equals, plus, paid, unpaid }

enum _Action { digit, operator, percent, backspace, clear, equals, paid, unpaid }

class _Key {
  const _Key({
    required this.style,
    required this.action,
    this.label,
    this.value,
    this.icon,
  });

  final _KeyStyle style;
  final _Action action;
  final String? label;
  final String? value;
  final IconData? icon;

  factory _Key.digit(String d) =>
      _Key(style: _KeyStyle.number, action: _Action.digit, label: d, value: d);

  factory _Key.op(String symbol) {
    final value = switch (symbol) {
      '×' => '*',
      '÷' => '/',
      '−' => '-',
      '%' => '%',
      _ => symbol,
    };
    if (symbol == '%') {
      return const _Key(style: _KeyStyle.operator, action: _Action.percent, label: '%');
    }
    return _Key(
        style: _KeyStyle.operator, action: _Action.operator, label: symbol, value: value);
  }

  factory _Key.plus() => const _Key(
      style: _KeyStyle.plus, action: _Action.operator, label: '+', value: '+');

  factory _Key.func({required IconData icon}) =>
      _Key(style: _KeyStyle.func, action: _Action.backspace, icon: icon);

  factory _Key.clear(String label) =>
      _Key(style: _KeyStyle.clear, action: _Action.clear, label: label);

  factory _Key.equals() =>
      const _Key(style: _KeyStyle.equals, action: _Action.equals, label: '=');

  factory _Key.paid(BuildContext context) => _Key(
      style: _KeyStyle.paid, action: _Action.paid, label: AppL10n.of(context).paid);

  factory _Key.unpaid(BuildContext context) => _Key(
      style: _KeyStyle.unpaid,
      action: _Action.unpaid,
      label: AppL10n.of(context).unpaid);
}

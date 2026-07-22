import 'package:flutter/foundation.dart';
import 'package:math_expressions/math_expressions.dart';

/// Evaluates a sanitized arithmetic expression using a real parser
/// (`math_expressions`) instead of the `eval()` the v1 web client relied on.
///
/// Accepts `×`/`÷` (mapped to `*`/`/`), strips a trailing operator, and returns
/// `0` for empty or non-finite results — matching v1's `evaluateExpression`.
double evaluateExpression(String raw) {
  if (raw.isEmpty) return 0;
  var safe = raw.replaceAll('×', '*').replaceAll('÷', '/');
  safe = safe.replaceAll(RegExp(r'[^0-9+\-*/.]'), '');
  safe = safe.replaceFirst(RegExp(r'[+\-*/]$'), '');
  if (safe.isEmpty) return 0;
  try {
    final expression = GrammarParser().parse(safe);
    final result = expression.evaluate(EvaluationType.REAL, ContextModel());
    if (result is double && result.isFinite) return result;
    return 0;
  } catch (_) {
    return 0;
  }
}

/// Converts the raw expression (`*`, `/`) into its display form (`×`, `÷`).
String formatDisplayExpression(String expression) =>
    expression.replaceAll('*', '×').replaceAll('/', '÷');

/// Holds the state of the embedded customer-balance calculator and exposes the
/// same operations as v1: number/operator input with a live provisional result,
/// percent (divide current token by 100), backspace, clear and equals.
class CalculatorController extends ChangeNotifier {
  String _expression = '';
  String _display = '0';

  String get expression => _expression;
  String get display => _display;

  static final _trailingOp = RegExp(r'[+\-*/]$');
  static final _lastToken = RegExp(r'([0-9]*\.?[0-9]*)$');

  String _tokenOrZero() {
    final match = _lastToken.firstMatch(_expression);
    final token = match?.group(0) ?? '';
    return token.isEmpty ? '0' : token;
  }

  void inputNumber(String value) {
    if (value == '.') {
      final token = _lastToken.firstMatch(_expression)?.group(0) ?? '';
      if (token.contains('.')) return; // no double decimal in the current token
    }
    _expression += value;
    _display = _tokenOrZero();
    notifyListeners();
  }

  void inputOperator(String op) {
    if (_expression.isEmpty && _display != '0') {
      _expression = _display;
    }
    if (_trailingOp.hasMatch(_expression)) {
      _expression = _expression.substring(0, _expression.length - 1) + op;
    } else {
      _expression += op;
    }
    _display = _stringify(evaluateExpression(_expression)); // live result
    notifyListeners();
  }

  void percent() {
    final match = _lastToken.firstMatch(_expression);
    final token = match?.group(0) ?? '';
    if (token.isEmpty) return;
    final value = double.tryParse(token);
    if (value == null) return;
    final pct = value / 100;
    _expression = _expression.substring(0, _expression.length - token.length) +
        _stringify(pct);
    _display = _stringify(pct);
    notifyListeners();
  }

  void backspace() {
    if (_expression.isEmpty) return;
    _expression = _expression.substring(0, _expression.length - 1);
    _display = _tokenOrZero();
    notifyListeners();
  }

  void clear() {
    _expression = '';
    _display = '0';
    notifyListeners();
  }

  void equals() {
    if (_trailingOp.hasMatch(_expression)) {
      _expression = _expression.substring(0, _expression.length - 1);
    }
    _display = _stringify(evaluateExpression(_expression));
    notifyListeners();
  }

  /// The finalized numeric amount to submit as a paid/unpaid entry, or `null`
  /// when the value is empty / zero / invalid (v1 ignores those).
  double? finalizedAmount() {
    if (_trailingOp.hasMatch(_expression)) {
      _expression = _expression.substring(0, _expression.length - 1);
    }
    double amount;
    if (_expression.isNotEmpty) {
      amount = evaluateExpression(_expression);
    } else if (_display != '0') {
      amount = double.tryParse(_display) ?? 0;
    } else {
      amount = 0;
    }
    if (amount.isNaN || amount <= 0) return null;
    return amount;
  }

  /// The raw expression string stored alongside the amount for display/audit
  /// (falls back to the display value like v1).
  String get rawExpression => _expression.isNotEmpty ? _expression : _display;

  static String _stringify(double value) {
    if (value == value.roundToDouble() && value.abs() < 1e15) {
      return value.toInt().toString();
    }
    return value.toString();
  }
}

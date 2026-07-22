import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:tally/core/calc/calculator_controller.dart';

void main() {
  test('calculator evaluates a simple expression', () {
    final c = CalculatorController();
    c.inputNumber('1');
    c.inputNumber('2');
    c.inputOperator('+');
    c.inputNumber('3');
    c.equals();
    expect(c.display, '15');
  });

  test('percent divides the current token by 100', () {
    final c = CalculatorController();
    c.inputNumber('5');
    c.inputNumber('0');
    c.percent();
    expect(c.finalizedAmount(), 0.5);
  });

  testWidgets('smoke: MaterialApp builds', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold()));
    expect(find.byType(Scaffold), findsOneWidget);
  });
}

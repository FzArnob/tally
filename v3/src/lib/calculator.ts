// Pure calculator engine used by the customer-balance keypad.
// Ported from the cb* functions in v1 script.js, made side-effect free.

export interface CalcState {
  expression: string; // raw expression using * and /
  display: string; // the current number/result shown large
}

export const INITIAL_CALC: CalcState = { expression: '', display: '0' };

/** Safely evaluates a sanitized arithmetic expression (BODMAS via Function). */
export function evaluateExpression(raw: string): number {
  if (!raw) return 0;
  let safe = raw.replace(/×/g, '*').replace(/÷/g, '/');
  safe = safe.replace(/[^0-9+\-*/.]/g, '');
  if (/([+\-*/])$/.test(safe)) safe = safe.slice(0, -1);
  if (!safe) return 0;
  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${safe});`)();
    return typeof val === 'number' && isFinite(val) ? val : 0;
  } catch {
    return 0;
  }
}

const lastNumber = (expr: string): string => expr.match(/([0-9]*\.?[0-9]*)$/)?.[0] ?? '';

export function inputNumber(state: CalcState, num: string): CalcState {
  const token = lastNumber(state.expression);

  // Decimal point: at most one per number; start "0." when there's no digit yet.
  if (num === '.') {
    if (token.includes('.')) return state;
    const expression = token === '' ? state.expression + '0.' : state.expression + '.';
    return { expression, display: lastNumber(expression) || '0' };
  }

  // Append the digit(s), then strip redundant leading zeros from the current
  // number token so "0010" -> "10" and "00"/"000" -> "0" automatically.
  let expression = state.expression + num;
  expression = expression
    .replace(/(^|[+\-*/])0+(\d)/g, '$1$2') // drop leading zeros before a digit
    .replace(/(^|[+\-*/])0{2,}(?![\d.])/g, '$10'); // collapse "00"/"000" to a single "0"
  return { expression, display: lastNumber(expression) || '0' };
}

export function inputOperator(state: CalcState, op: string): CalcState {
  let expression = state.expression;
  if (!expression && state.display !== '0') expression = state.display;
  if (/([+\-*/])$/.test(expression)) expression = expression.slice(0, -1) + op;
  else expression += op;
  const provisional = evaluateExpression(expression);
  return { expression, display: String(provisional) };
}

export function percent(state: CalcState): CalcState {
  const token = lastNumber(state.expression);
  if (!token) return state;
  const num = parseFloat(token);
  if (isNaN(num)) return state;
  const percentVal = num / 100;
  const expression = state.expression.slice(0, -token.length) + percentVal;
  return { expression, display: String(percentVal) };
}

export function backspace(state: CalcState): CalcState {
  if (!state.expression) return state;
  const expression = state.expression.slice(0, -1);
  const m = lastNumber(expression);
  return { expression, display: m || '0' };
}

export function clear(): CalcState {
  return { ...INITIAL_CALC };
}

export function equals(state: CalcState): CalcState {
  let expression = state.expression;
  if (/([+\-*/])$/.test(expression)) expression = expression.slice(0, -1);
  const val = evaluateExpression(expression);
  return { expression, display: String(val || 0) };
}

/** Resolves the amount a Paid/Unpaid action should apply, mirroring applyCbDelta. */
export function resolveAmount(state: CalcState): number {
  let expression = state.expression;
  if (/([+\-*/])$/.test(expression)) expression = expression.slice(0, -1);
  if (expression) return evaluateExpression(expression);
  if (state.display && state.display !== '0') {
    const n = parseFloat(state.display);
    if (!isNaN(n)) return n;
  }
  return 0;
}

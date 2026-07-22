// Locale-aware formatting helpers, ported from v1 script.js.
// All functions take an explicit locale so they stay pure and testable.

const BENGALI_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

const CURRENCY_SYMBOL = '৳';

function numberFormatter(locale: string): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 10,
  });
}

/** "৳ 1,234.5" — used for amounts. Empty string for empty input. */
export function formatCurrency(value: number | string | null | undefined, locale: string): string {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  return `${CURRENCY_SYMBOL} ${numberFormatter(locale).format(num)}`;
}

/** Like formatCurrency but keeps the minus sign in front of the symbol. */
export function formatSignedCurrency(value: number, locale: string): string {
  if (isNaN(value)) return '';
  const formatted = numberFormatter(locale).format(Math.abs(value));
  return value < 0 ? `-${CURRENCY_SYMBOL} ${formatted}` : `${CURRENCY_SYMBOL} ${formatted}`;
}

/** Plain localized number (no currency symbol). */
export function formatNumber(value: number | string | null | undefined, locale: string): string {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  return numberFormatter(locale).format(num);
}

/** Converts ASCII digits in a string to Bengali numerals when locale is bn-BD. */
export function localizeDigits(text: string, locale: string): string {
  if (!text) return text;
  if (locale === 'bn-BD') {
    return text.replace(/[0-9]/g, (d) => BENGALI_DIGITS[d] || d);
  }
  return text;
}

/** Full date/time label for history rows. */
export function formatTimeFull(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/** Compact date/time label for list rows (e.g. "22 Jul, 4:06 PM"). */
export function formatTimeShort(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Turns raw operators (* /) into pretty display glyphs (× ÷). */
export function formatDisplayExpression(expr: string): string {
  if (!expr) return '';
  return expr.replace(/\*/g, '×').replace(/\//g, '÷');
}

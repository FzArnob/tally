import { dayKey } from './format';

/** The slice of a transaction the day grouping needs — products and materials both fit. */
export interface HistoryEntry {
  type: string;
  quantity: number;
  total_amount: number;
  /** Sold onto a customer's tab (paid off since or not). */
  on_tab: boolean;
  /**
   * How much of this sale the customer has covered. A tab sale can be part paid
   * — cash runs down the tab line it sits on — so this is money, not a flag.
   * A counter sale is its own full amount.
   */
  paid_amount: number;
  /** True while any of a tab sale is still owed. */
  unpaid: boolean;
  /** Business time — when it happened, preserved across edits. */
  timestamp: string;
}

/** A calendar day's worth of entries. Each grouping adds its own totals. */
export interface DayGroup<T> {
  /** Local calendar day, e.g. "2026-07-29" — stable React key. */
  key: string;
  /** Any timestamp from the day; the bar formats its own label from this. */
  date: string;
  entries: T[];
}

/**
 * Bucket an already-sorted list into calendar days, newest-first in, newest-first
 * out. `seed` supplies the totals each caller wants to accumulate.
 */
function groupDays<D extends DayGroup<T>, T extends { timestamp: string }>(
  entries: T[],
  seed: (key: string, date: string) => D,
): D[] {
  const days: D[] = [];
  const byKey = new Map<string, D>();

  for (const entry of entries) {
    const key = dayKey(entry.timestamp);
    let day = byKey.get(key);
    if (!day) {
      day = seed(key, entry.timestamp);
      byKey.set(key, day);
      days.push(day);
    }
    day.entries.push(entry);
  }
  return days;
}

export interface HistoryDay<T> extends DayGroup<T> {
  /** Money in hand: sold over the counter, plus what has been paid off a tab. */
  totalCash: number;
  /** Still owed — the part of the day's tab sales not yet covered. */
  totalDue: number;
}

/**
 * A product or material history, by day. The split is by settlement, not by
 * tab: what has been paid counts as cash and only the rest is due — and a
 * single sale can fall on both sides of that line, because a tab sale is paid
 * off gradually. The two always add back up to the day's sale value. Stock-in
 * and stock-used entries are grouped like any other but count towards neither
 * total — they are not sales.
 */
export function groupByDay<T extends HistoryEntry>(entries: T[]): HistoryDay<T>[] {
  const days = groupDays<HistoryDay<T>, T>(entries, (key, date) => ({
    key,
    date,
    entries: [],
    totalCash: 0,
    totalDue: 0,
  }));

  for (const day of days) {
    for (const entry of day.entries) {
      if (entry.type !== 'sale') continue;
      const total = entry.total_amount;
      const paid = Math.min(Math.max(entry.paid_amount, 0), total);
      day.totalCash += paid;
      day.totalDue += total - paid;
    }
  }
  return days;
}

/** The slice of a one-directional entry the day grouping needs. */
export interface AmountEntry {
  /** Always positive — these lists only run one way. */
  amount: number;
  timestamp: string;
}

export interface AmountDay<T> extends DayGroup<T> {
  /** Everything booked that day. */
  total: number;
}

/**
 * A list that only moves one way, by day — an operation cost's spends, say.
 * There is nothing to set the day's figure against, so the day carries the one
 * total and the bar above it shows no shares.
 */
export function groupAmountByDay<T extends AmountEntry>(entries: T[]): AmountDay<T>[] {
  const days = groupDays<AmountDay<T>, T>(entries, (key, date) => ({
    key,
    date,
    entries: [],
    total: 0,
  }));

  for (const day of days) {
    for (const entry of day.entries) day.total += entry.amount;
  }
  return days;
}

/** The slice of a personal transaction the day grouping needs. */
export interface CashflowEntry {
  type: 'income' | 'expense';
  /** Always positive; the type says which way it went. */
  amount: number;
  timestamp: string;
}

export interface CashflowDay<T> extends DayGroup<T> {
  totalIncome: number;
  totalExpense: number;
}

/**
 * A personal book's transactions, by day: what came in against what went out.
 * The day's own movements — not a running balance, which the summary card at
 * the top of the page already carries for the whole book.
 */
export function groupCashflowByDay<T extends CashflowEntry>(entries: T[]): CashflowDay<T>[] {
  const days = groupDays<CashflowDay<T>, T>(entries, (key, date) => ({
    key,
    date,
    entries: [],
    totalIncome: 0,
    totalExpense: 0,
  }));

  for (const day of days) {
    for (const entry of day.entries) {
      if (entry.type === 'income') day.totalIncome += entry.amount;
      else day.totalExpense += entry.amount;
    }
  }
  return days;
}

/** The slice of a customer's ledger entry the day grouping needs. */
export interface BalanceEntry {
  type: 'paid' | 'unpaid';
  /** Always positive; the type says which way it went. */
  amount: number;
  timestamp: string;
}

export interface BalanceDay<T> extends DayGroup<T> {
  /** Put on the tab that day — cash borrowed plus goods taken. */
  totalUnpaid: number;
  /** Handed back that day, whatever it went towards. */
  totalPaid: number;
}

/**
 * A customer's ledger, by day: what they ran up against what they paid. These
 * are the day's MOVEMENTS, not what is left standing — the running balance on
 * each entry already carries that, and a payment made today may well be
 * settling something from last month.
 */
export function groupBalanceByDay<T extends BalanceEntry>(entries: T[]): BalanceDay<T>[] {
  const days = groupDays<BalanceDay<T>, T>(entries, (key, date) => ({
    key,
    date,
    entries: [],
    totalUnpaid: 0,
    totalPaid: 0,
  }));

  for (const day of days) {
    for (const entry of day.entries) {
      if (entry.type === 'paid') day.totalPaid += entry.amount;
      else day.totalUnpaid += entry.amount;
    }
  }
  return days;
}

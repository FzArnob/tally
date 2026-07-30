import { dayKey } from './format';

/** The slice of a transaction the day grouping needs — products and materials both fit. */
export interface HistoryEntry {
  type: string;
  quantity: number;
  total_amount: number;
  /** Sold onto a customer's tab (paid off since or not). */
  on_tab: boolean;
  /** True while a tab sale is still owed; clears when the customer settles. */
  unpaid: boolean;
  /** Business time — when it happened, preserved across edits. */
  timestamp: string;
}

export interface HistoryDay<T> {
  /** Local calendar day, e.g. "2026-07-29" — stable React key. */
  key: string;
  /** Any entry from the day; the bar formats its own label from this. */
  date: string;
  entries: T[];
  /** Money in hand: sold over the counter, plus tab sales already settled. */
  totalCash: number;
  /** Units behind `totalCash`. */
  totalCashQty: number;
  /** Still owed — tab sales the customer has yet to settle. */
  totalDue: number;
  /** Units behind `totalDue`. */
  totalDueQty: number;
}

/**
 * Splits an already-sorted transaction list into calendar days, summing the two
 * sale figures the day bar shows. The split is by settlement, not by tab: a tab
 * sale counts as cash once it has been paid off, and only what is still owed
 * lands in the due column. Stock-in and stock-used entries are grouped like any
 * other but count towards neither total — they are not sales.
 *
 * The input order is preserved, so a newest-first list yields newest-first days.
 */
export function groupByDay<T extends HistoryEntry>(entries: T[]): HistoryDay<T>[] {
  const days: HistoryDay<T>[] = [];
  const byKey = new Map<string, HistoryDay<T>>();

  for (const entry of entries) {
    const key = dayKey(entry.timestamp);
    let day = byKey.get(key);
    if (!day) {
      day = {
        key,
        date: entry.timestamp,
        entries: [],
        totalCash: 0,
        totalCashQty: 0,
        totalDue: 0,
        totalDueQty: 0,
      };
      byKey.set(key, day);
      days.push(day);
    }
    day.entries.push(entry);
    if (entry.type === 'sale') {
      if (entry.on_tab && entry.unpaid) {
        day.totalDue += entry.total_amount;
        day.totalDueQty += entry.quantity;
      } else {
        day.totalCash += entry.total_amount;
        day.totalCashQty += entry.quantity;
      }
    }
  }

  return days;
}

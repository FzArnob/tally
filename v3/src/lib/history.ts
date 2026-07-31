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

export interface HistoryDay<T> {
  /** Local calendar day, e.g. "2026-07-29" — stable React key. */
  key: string;
  /** Any entry from the day; the bar formats its own label from this. */
  date: string;
  entries: T[];
  /** Money in hand: sold over the counter, plus what has been paid off a tab. */
  totalCash: number;
  /** Still owed — the part of the day's tab sales not yet covered. */
  totalDue: number;
}

/**
 * Splits an already-sorted transaction list into calendar days, summing the two
 * sale figures the day bar shows. The split is by settlement, not by tab: what
 * has been paid counts as cash and only the rest is due — and a single sale can
 * fall on both sides of that line, because a tab sale is paid off gradually. The
 * two always add back up to the day's sale value. Stock-in and stock-used
 * entries are grouped like any other but count towards neither total — they are
 * not sales.
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
        totalDue: 0,
      };
      byKey.set(key, day);
      days.push(day);
    }
    day.entries.push(entry);
    if (entry.type === 'sale') {
      const total = entry.total_amount;
      const paid = Math.min(Math.max(entry.paid_amount, 0), total);
      day.totalCash += paid;
      day.totalDue += total - paid;
    }
  }

  return days;
}

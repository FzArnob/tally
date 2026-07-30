import { dayKey } from './format';

/** The slice of a transaction the day grouping needs — products and materials both fit. */
export interface HistoryEntry {
  type: string;
  quantity: number;
  total_amount: number;
  /** Sold onto a customer's tab (paid off since or not). */
  on_tab: boolean;
  created_at: string;
}

export interface HistoryDay<T> {
  /** Local calendar day, e.g. "2026-07-29" — stable React key. */
  key: string;
  /** Any entry from the day; the bar formats its own label from this. */
  date: string;
  entries: T[];
  /** Takings that never went on a tab — the cash that came in that day. */
  totalSale: number;
  /** Units behind `totalSale`. */
  totalSaleQty: number;
  /** Everything sold onto a tab that day, whether or not it has since been paid. */
  totalTabSale: number;
  /** Units behind `totalTabSale`. */
  totalTabSaleQty: number;
}

/**
 * Splits an already-sorted transaction list into calendar days, summing the two
 * sale figures the day bar shows. Stock-in and stock-used entries are grouped
 * like any other but count towards neither total — they are not sales.
 *
 * The input order is preserved, so a newest-first list yields newest-first days.
 */
export function groupByDay<T extends HistoryEntry>(entries: T[]): HistoryDay<T>[] {
  const days: HistoryDay<T>[] = [];
  const byKey = new Map<string, HistoryDay<T>>();

  for (const entry of entries) {
    const key = dayKey(entry.created_at);
    let day = byKey.get(key);
    if (!day) {
      day = {
        key,
        date: entry.created_at,
        entries: [],
        totalSale: 0,
        totalSaleQty: 0,
        totalTabSale: 0,
        totalTabSaleQty: 0,
      };
      byKey.set(key, day);
      days.push(day);
    }
    day.entries.push(entry);
    if (entry.type === 'sale') {
      if (entry.on_tab) {
        day.totalTabSale += entry.total_amount;
        day.totalTabSaleQty += entry.quantity;
      } else {
        day.totalSale += entry.total_amount;
        day.totalSaleQty += entry.quantity;
      }
    }
  }

  return days;
}

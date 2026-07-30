import { useI18n } from '../i18n/LanguageContext';
import styles from './HistoryDayBar.module.css';

interface HistoryDayBarProps {
  /** Any timestamp from the day; the bar renders it as a date-only label. */
  date: string;
  /** Unit the quantities are counted in (piece, packet, kg …). */
  unit: string;
  /** Sold over the counter, plus tab sales the customer has since settled. */
  totalCash: number;
  totalCashQty: number;
  /** Sold onto a tab that day and still owed. */
  totalDue: number;
  totalDueQty: number;
}

/**
 * Separator between calendar days in a product/material history list, carrying
 * that day's split of takings: money already in hand on one side, what is still
 * owed on the other. The two never overlap, so together they are the day's
 * whole sale value.
 */
export function HistoryDayBar({
  date,
  unit,
  totalCash,
  totalCashQty,
  totalDue,
  totalDueQty,
}: HistoryDayBarProps) {
  const { t, formatCurrency, formatDayLabel, formatNumber, localizeDigits } = useI18n();
  const qty = (value: number) => localizeDigits(`${formatNumber(value)} ${unit}`);

  return (
    <div className={styles.dayBar}>
      <span className={styles.dayDate}>{localizeDigits(formatDayLabel(date))}</span>
      <span className={styles.dayStats}>
        <span className={styles.dayStat}>
          <span className={styles.dayStatLabel}>{t.saleCash}:</span>
          <span className="text-positive">{formatCurrency(totalCash)}</span>
          <span className={styles.dayStatQty}>{qty(totalCashQty)}</span>
        </span>
        <span className={styles.dayStat}>
          <span className={styles.dayStatLabel}>{t.saleDue}:</span>
          {/* Matches the red the unpaid entries below carry — this figure is
              exactly their sum. */}
          <span className="text-negative">{formatCurrency(totalDue)}</span>
          <span className={styles.dayStatQty}>{qty(totalDueQty)}</span>
        </span>
      </span>
    </div>
  );
}

import { useI18n } from '../i18n/LanguageContext';
import styles from './HistoryDayBar.module.css';

interface HistoryDayBarProps {
  /** Any timestamp from the day; the bar renders it as a date-only label. */
  date: string;
  /** Sold over the counter, plus what has been paid off a tab. */
  totalCash: number;
  /** The part of the day's tab sales still owed. */
  totalDue: number;
}

/**
 * Separator between calendar days in a product/material history list, carrying
 * that day's split of takings: money already in hand on one side, what is still
 * owed on the other. The two never overlap, so together they are the day's whole
 * sale value — and each carries its share of it, which says at a glance how much
 * of the day went out on credit.
 *
 * The shares are whole numbers that always add to 100: one is rounded and the
 * other takes the remainder, so they can never read 49% / 52%.
 */
export function HistoryDayBar({ date, totalCash, totalDue }: HistoryDayBarProps) {
  const { t, formatCurrency, formatDayLabel, localizeDigits } = useI18n();

  const total = totalCash + totalDue;
  const cashShare = total > 0 ? Math.round((totalCash / total) * 100) : 0;
  const dueShare = total > 0 ? 100 - cashShare : 0;
  const percent = (value: number) => localizeDigits(`${value}%`);

  return (
    <div className={styles.dayBar}>
      <span className={styles.dayDate}>{localizeDigits(formatDayLabel(date))}</span>
      <span className={styles.dayStats}>
        <span className={styles.dayStat}>
          <span className={styles.dayStatLabel}>{t.saleCash}:</span>
          <span className="text-positive">{formatCurrency(totalCash)}</span>
          <span className={styles.dayStatShare}>{percent(cashShare)}</span>
        </span>
        <span className={styles.dayStat}>
          <span className={styles.dayStatLabel}>{t.saleDue}:</span>
          {/* Matches the red the unpaid entries below carry — this figure is
              exactly their unpaid remainder. */}
          <span className="text-negative">{formatCurrency(totalDue)}</span>
          <span className={styles.dayStatShare}>{percent(dueShare)}</span>
        </span>
      </span>
    </div>
  );
}

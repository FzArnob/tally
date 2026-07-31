import { useI18n } from '../i18n/LanguageContext';
import styles from './HistoryDayBar.module.css';

/** One side of the bar: what it is called, what it came to, and its colour. */
export interface DayFigure {
  label: string;
  amount: number;
  /** Green for money in hand, red for money owed. */
  tone: 'positive' | 'negative';
}

interface HistoryDayBarProps {
  /** Any timestamp from the day; the bar renders it as a date-only label. */
  date: string;
  left: DayFigure;
  right: DayFigure;
}

/**
 * Separator between calendar days in a history list, carrying that day's two
 * figures and each one's share of their total — which says at a glance how the
 * day divided, without anyone doing the arithmetic.
 *
 * The shares are whole numbers that always add to 100: one is rounded and the
 * other takes the remainder, so they can never read 49% / 52%.
 */
export function HistoryDayBar({ date, left, right }: HistoryDayBarProps) {
  const { formatCurrency, formatDayLabel, localizeDigits } = useI18n();

  const total = left.amount + right.amount;
  const leftShare = total > 0 ? Math.round((left.amount / total) * 100) : 0;
  const shares = [leftShare, total > 0 ? 100 - leftShare : 0];

  return (
    <div className={styles.dayBar}>
      <span className={styles.dayDate}>{localizeDigits(formatDayLabel(date))}</span>
      <span className={styles.dayStats}>
        {[left, right].map((figure, i) => (
          <span className={styles.dayStat} key={figure.label}>
            <span className={styles.dayStatLabel}>{figure.label}:</span>
            <span className={`text-${figure.tone}`}>{formatCurrency(figure.amount)}</span>
            <span className={styles.dayStatShare}>{localizeDigits(`${shares[i]}%`)}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

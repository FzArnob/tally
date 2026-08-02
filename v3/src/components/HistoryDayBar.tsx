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
  /** Omit for a list that only runs one way — see below. */
  right?: DayFigure;
  /**
   * `bleed` (the default) spans the full width of its list, as a modal body's
   * edge-to-edge separator. `card` keeps the list's own width and corners, for a
   * page whose entries are free-standing cards — see below.
   */
  variant?: 'bleed' | 'card';
}

/**
 * Separator between calendar days in a history list, carrying that day's two
 * figures and each one's share of their total — which says at a glance how the
 * day divided, without anyone doing the arithmetic.
 *
 * The shares are whole numbers that always add to 100: one is rounded and the
 * other takes the remainder, so they can never read 49% / 52%.
 *
 * A one-directional list (an operation cost's spends, where everything is an
 * outgoing) passes one figure and gets no shares: against nothing, every day is
 * 100% of itself, which tells the reader less than showing nothing at all.
 *
 * Sticks to the top of whatever scrolls it. Inside a modal that is the body, and
 * the defaults are right. A page has bars of its own above it, so it sets
 * --day-bar-top to clear them and --day-bar-pad to its own side padding.
 *
 * A page whose entries are cards on open background — rather than rows filling a
 * modal — passes variant="card", and the bar takes the same width, corner and
 * border as those cards instead of cutting a strip across them.
 */
export function HistoryDayBar({ date, left, right, variant = 'bleed' }: HistoryDayBarProps) {
  const { formatCurrency, formatDayLabel, localizeDigits } = useI18n();

  const figures = right ? [left, right] : [left];
  const total = left.amount + (right?.amount ?? 0);
  const leftShare = total > 0 ? Math.round((left.amount / total) * 100) : 0;
  const shares = [leftShare, total > 0 ? 100 - leftShare : 0];

  return (
    <div className={`${styles.dayBar} ${variant === 'card' ? styles.dayBarCard : ''}`}>
      <span className={styles.dayDate}>{localizeDigits(formatDayLabel(date))}</span>
      <span className={styles.dayStats}>
        {figures.map((figure, i) => (
          <span className={styles.dayStat} key={figure.label}>
            <span className={styles.dayStatLabel}>{figure.label}:</span>
            <span className={`text-${figure.tone}`}>{formatCurrency(figure.amount)}</span>
            {right && (
              <span className={styles.dayStatShare}>{localizeDigits(`${shares[i]}%`)}</span>
            )}
          </span>
        ))}
      </span>
    </div>
  );
}

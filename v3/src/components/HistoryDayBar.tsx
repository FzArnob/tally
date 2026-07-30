import { useI18n } from '../i18n/LanguageContext';
import styles from './HistoryDayBar.module.css';

interface HistoryDayBarProps {
  /** Any timestamp from the day; the bar renders it as a date-only label. */
  date: string;
  /** Unit the quantities are counted in (piece, packet, kg …). */
  unit: string;
  /** Takings that never went on a tab. */
  totalSale: number;
  totalSaleQty: number;
  /** Sold onto a tab that day, paid off since or not. */
  totalTabSale: number;
  totalTabSaleQty: number;
}

/**
 * Separator between calendar days in a product/material history list, carrying
 * that day's split of takings: sold for cash on one side, put on a customer's
 * tab on the other. The two never overlap, so together they are the day's whole
 * sale value.
 */
export function HistoryDayBar({
  date,
  unit,
  totalSale,
  totalSaleQty,
  totalTabSale,
  totalTabSaleQty,
}: HistoryDayBarProps) {
  const { t, formatCurrency, formatDayLabel, formatNumber, localizeDigits } = useI18n();
  const qty = (value: number) => localizeDigits(`${formatNumber(value)} ${unit}`);

  return (
    <div className={styles.dayBar}>
      <span className={styles.dayDate}>{localizeDigits(formatDayLabel(date))}</span>
      <span className={styles.dayStats}>
        <span className={styles.dayStat}>
          <span className={styles.dayStatLabel}>{t.saleCash}:</span>
          <span className="text-positive">{formatCurrency(totalSale)}</span>
          <span className={styles.dayStatQty}>{qty(totalSaleQty)}</span>
        </span>
        <span className={styles.dayStat}>
          <span className={styles.dayStatLabel}>{t.saleCustomer}:</span>
          {/* Blue is the tab colour throughout: this figure, the entries behind
              it and the customer names all match. */}
          <span className="text-customer">{formatCurrency(totalTabSale)}</span>
          <span className={styles.dayStatQty}>{qty(totalTabSaleQty)}</span>
        </span>
      </span>
    </div>
  );
}

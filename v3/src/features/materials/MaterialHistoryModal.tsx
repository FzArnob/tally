import { Fragment } from 'react';
import { HistoryDayBar } from '../../components/HistoryDayBar';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { groupByDay } from '../../lib/history';
import type { Material, MaterialTransaction } from '../../types';
import styles from './materials.module.css';

interface MaterialHistoryModalProps {
  open: boolean;
  material: Material | null;
  transactions: MaterialTransaction[];
  loading: boolean;
  onClose: () => void;
  onEdit: (tx: MaterialTransaction) => void;
  onDelete: (tx: MaterialTransaction) => void;
  /** Opens the tab of the customer a sale went to. */
  onCustomer: (customerId: string) => void;
}

export function MaterialHistoryModal({
  open,
  material,
  transactions,
  loading,
  onClose,
  onEdit,
  onDelete,
  onCustomer,
}: MaterialHistoryModalProps) {
  // Time only — the day bar above each group already carries the date.
  const { t, formatCurrency, formatNumber, formatTimeOfDay, localizeDigits } = useI18n();
  const unit = material?.quantity_type || 'piece';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="materialHistoryTitle"
      flushBody // the day bars stick to the top of the body
      header={
        <ModalHeader
          title={material ? `${material.name} — ${t.history}` : t.history}
          titleId="materialHistoryTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.historyList}>
        {loading && <div className="empty-state">…</div>}
        {!loading && transactions.length === 0 ? (
          <div className="empty-state">{t.noEntries}</div>
        ) : (
          // One bar per calendar day, carrying that day's cash / on-tab split.
          groupByDay(transactions).map((day) => (
            <Fragment key={day.key}>
              <HistoryDayBar
                date={day.date}
                unit={unit}
                totalSale={day.totalSale}
                totalSaleQty={day.totalSaleQty}
                totalTabSale={day.totalTabSale}
                totalTabSaleQty={day.totalTabSaleQty}
              />
              {day.entries.map((tx) => {
                const isStock = tx.type === 'stock';
                const isUsed = tx.type === 'used';
                const pillClass = isStock ? styles.stock : isUsed ? styles.used : styles.sale;
                const label = isStock ? t.stockIn : isUsed ? t.stockUsed : t.sale;
                return (
                  <div key={tx.id} className={styles.entry}>
                    <div className={styles.line}>
                      <span className={styles.pillRow}>
                        <span className={`${styles.typePill} ${pillClass}`}>{label}</span>
                        {/* A tab sale carries its settlement state: Unpaid until
                            the customer clears the line, Paid once they have. */}
                        {tx.on_tab && (
                          <span
                            className={`${styles.typePill} ${
                              tx.unpaid ? styles.unpaid : styles.paidPill
                            }`}
                          >
                            {tx.unpaid ? t.unpaidPill : t.paid}
                          </span>
                        )}
                      </span>
                      {isUsed ? (
                        <span />
                      ) : (
                        <span
                          className={`${styles.entryAmount} ${
                            isStock ? 'text-invest' : tx.on_tab ? 'text-customer' : 'text-positive'
                          }`}
                        >
                          {formatCurrency(tx.total_amount)}
                        </span>
                      )}
                    </div>
                    {/* Note, against whose tab it went on. */}
                    {(tx.note || tx.customer_name) && (
                      <div className={styles.line}>
                        <span className={styles.entryNote} title={tx.note ?? undefined}>
                          {tx.note}
                        </span>
                        {tx.customer_id && tx.customer_name && (
                          <button
                            type="button"
                            className={`${styles.entryCustomer} text-customer`}
                            onClick={() => onCustomer(tx.customer_id as string)}
                          >
                            {tx.customer_name}
                          </button>
                        )}
                      </div>
                    )}
                    <div className={styles.line}>
                      <span className={styles.entryDetail}>
                        {isUsed
                          ? localizeDigits(`${formatNumber(tx.quantity)} ${unit}`)
                          : (
                              <>
                                {localizeDigits(`${formatNumber(tx.quantity)} ${unit} × `)}
                                {formatCurrency(tx.price_per_unit)}
                              </>
                            )}
                      </span>
                      <div className={styles.entryActions}>
                        <button className="ghost-btn" aria-label={t.edit} onClick={() => onEdit(tx)}>
                          <span className="material-symbols-outlined icon-md">edit</span>
                        </button>
                        <button
                          className="ghost-btn"
                          aria-label={t.deleteAction}
                          onClick={() => onDelete(tx)}
                        >
                          <span className="material-symbols-outlined icon-md">delete</span>
                        </button>
                      </div>
                    </div>
                    <div className={`${styles.line} ${styles.entryFoot}`}>
                      <span>
                        {t.stock}: {localizeDigits(formatNumber(tx.stock_after))}
                      </span>
                      <span>{localizeDigits(formatTimeOfDay(tx.timestamp))}</span>
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))
        )}
      </div>
    </Modal>
  );
}

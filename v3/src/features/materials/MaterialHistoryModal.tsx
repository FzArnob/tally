import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
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
}

export function MaterialHistoryModal({
  open,
  material,
  transactions,
  loading,
  onClose,
  onEdit,
  onDelete,
}: MaterialHistoryModalProps) {
  const { t, formatCurrency, formatNumber, formatTimeFull, localizeDigits } = useI18n();
  const unit = material?.quantity_type || 'piece';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="materialHistoryTitle"
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
          transactions.map((tx) => {
            const isStock = tx.type === 'stock';
            const isUsed = tx.type === 'used';
            const pillClass = isStock ? styles.stock : isUsed ? styles.used : styles.sale;
            const label = isStock ? t.stockIn : isUsed ? t.stockUsed : t.sale;
            return (
              <div key={tx.id} className={styles.entry}>
                <div className={styles.entryLine}>
                  <span className={`${styles.typePill} ${pillClass}`}>{label}</span>
                  {!isUsed && (
                    <span
                      className={`${styles.entryAmount} ${isStock ? 'text-negative' : 'text-positive'}`}
                    >
                      {formatCurrency(tx.total_amount)}
                    </span>
                  )}
                </div>
                <div className={styles.entryLine}>
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
                <div className={styles.entryFoot}>
                  <span>
                    {t.stock}: {localizeDigits(formatNumber(tx.stock_after))}
                  </span>
                  <span>{localizeDigits(formatTimeFull(tx.created_at))}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

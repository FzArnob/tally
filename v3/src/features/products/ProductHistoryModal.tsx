import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import type { Product, ProductTransaction } from '../../types';
import styles from './products.module.css';

interface ProductHistoryModalProps {
  open: boolean;
  product: Product | null;
  transactions: ProductTransaction[];
  loading: boolean;
  onClose: () => void;
  onEdit: (tx: ProductTransaction) => void;
  onDelete: (tx: ProductTransaction) => void;
}

export function ProductHistoryModal({
  open,
  product,
  transactions,
  loading,
  onClose,
  onEdit,
  onDelete,
}: ProductHistoryModalProps) {
  const { t, formatCurrency, formatNumber, formatTimeFull, localizeDigits } = useI18n();
  const unit = product?.quantity_type || 'piece';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="historyTitle"
      header={
        <ModalHeader
          title={product ? `${product.name} — ${t.history}` : t.history}
          titleId="historyTitle"
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
            return (
              <div key={tx.id} className={styles.entry}>
                <div className={styles.entryLine}>
                  <span className={`${styles.typePill} ${isStock ? styles.stock : styles.sale}`}>
                    {isStock ? t.stockIn : t.sale}
                  </span>
                  <span
                    className={`${styles.entryAmount} ${isStock ? 'text-negative' : 'text-positive'}`}
                  >
                    {formatCurrency(tx.total_amount)}
                  </span>
                </div>
                <div className={styles.entryLine}>
                  <span className={styles.entryDetail}>
                    {localizeDigits(`${formatNumber(tx.quantity)} ${unit} × `)}
                    {formatCurrency(tx.price_per_unit)}
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
                {tx.costs.length > 0 && (
                  <ul className={styles.costBreakdown}>
                    {tx.costs.map((c, i) => (
                      <li key={i}>
                        <span className={styles.costBreakName}>{c.name}</span>
                        <span>{formatCurrency(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
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

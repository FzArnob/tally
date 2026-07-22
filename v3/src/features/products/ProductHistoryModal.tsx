import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import type { Product, ProductTransaction } from '../../types';
import styles from './products.module.css';

interface ProductHistoryModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onEdit: (tx: ProductTransaction) => void;
  onDelete: (tx: ProductTransaction) => void;
}

export function ProductHistoryModal({
  open,
  product,
  onClose,
  onEdit,
  onDelete,
}: ProductHistoryModalProps) {
  const { t, formatCurrency, formatNumber, formatTimeFull, localizeDigits } = useI18n();

  const transactions = [...(product?.transactions ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const unit = product?.quantity_type || 'piece';

  return (
    <Modal open={open} onClose={onClose} labelledBy="historyTitle">
      <ModalHeader
        title={product ? `${product.name} — ${t.history}` : t.history}
        titleId="historyTitle"
        onClose={onClose}
        closeLabel={t.close}
      />
      <div className={styles.historyList}>
        {transactions.length === 0 ? (
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
                  <div className={styles.entryActions}>
                    <button className="ghost-btn" aria-label={t.edit} onClick={() => onEdit(tx)}>
                      <span className="material-symbols-outlined icon-sm">edit</span>
                    </button>
                    <button
                      className="ghost-btn"
                      aria-label={t.deleteAction}
                      onClick={() => onDelete(tx)}
                    >
                      <span className="material-symbols-outlined icon-sm">delete</span>
                    </button>
                  </div>
                </div>
                <div className={styles.entryLine}>
                  <span className={styles.entryDetail}>
                    {localizeDigits(`${formatNumber(tx.quantity)} ${unit} × `)}
                    {formatCurrency(tx.price_per_unit)}
                  </span>
                  <span
                    className={`${styles.entryAmount} ${isStock ? 'text-negative' : 'text-positive'}`}
                  >
                    {formatCurrency(tx.total_amount)}
                  </span>
                </div>
                <div className={styles.entryTime}>{formatTimeFull(new Date(tx.created_at))}</div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

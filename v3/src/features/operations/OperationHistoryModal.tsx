import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import type { OperationCost, OperationCostEntry } from '../../types';
import styles from './operations.module.css';

interface OperationHistoryModalProps {
  open: boolean;
  operation: OperationCost | null;
  entries: OperationCostEntry[];
  loading: boolean;
  onClose: () => void;
  onDelete: (entry: OperationCostEntry) => void;
}

export function OperationHistoryModal({
  open,
  operation,
  entries,
  loading,
  onClose,
  onDelete,
}: OperationHistoryModalProps) {
  const { t, formatCurrency, formatTimeFull, localizeDigits } = useI18n();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="operationHistoryTitle"
      header={
        <ModalHeader
          title={operation ? `${operation.reason} — ${t.history}` : t.history}
          titleId="operationHistoryTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.historyList}>
        {loading && <div className="empty-state">…</div>}
        {!loading && entries.length === 0 ? (
          <div className="empty-state">{t.noAmountEntries}</div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={styles.entry}>
              <div className={styles.entryLine}>
                <span className={styles.entryAmount}>{formatCurrency(entry.amount)}</span>
                <div className={styles.entryRight}>
                  <span className={styles.entryTime}>
                    {localizeDigits(formatTimeFull(entry.timestamp))}
                  </span>
                  <button
                    className="ghost-btn"
                    aria-label={t.deleteAction}
                    onClick={() => onDelete(entry)}
                  >
                    <span className="material-symbols-outlined icon-md">delete</span>
                  </button>
                </div>
              </div>
              {entry.note && <span className={styles.entryNote}>{entry.note}</span>}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

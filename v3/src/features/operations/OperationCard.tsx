import { useI18n } from '../../i18n/LanguageContext';
import type { OperationCost } from '../../types';
import styles from './operations.module.css';

interface OperationCardProps {
  operation: OperationCost;
  index: number;
  onOpen: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function OperationCard({
  operation,
  index,
  onOpen,
  onHistory,
  onEdit,
  onDelete,
}: OperationCardProps) {
  const { t, formatCurrency, formatTimeShort, localizeDigits } = useI18n();
  const count = operation.entry_count || 0;
  const last = operation.last_entry_time
    ? localizeDigits(formatTimeShort(operation.last_entry_time))
    : t.noActivity;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div
      className={styles.row}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      <div className={styles.lines}>
        <div className={styles.line}>
          <span className={styles.reason} title={operation.reason}>
            {operation.reason}
          </span>
          <span className={styles.amount}>{formatCurrency(operation.amount)}</span>
        </div>

        {operation.note && (
          <div className={styles.line}>
            <span className={styles.note} title={operation.note}>
              {operation.note}
            </span>
          </div>
        )}

        <div className={styles.line}>
          <span className={styles.meta}>
            <span className={styles.metaTime}>{last}</span>
            {count > 0 && (
              <span className={styles.metaCount} title={`${count} ${t.entries}`}>
                <span className="material-symbols-outlined icon-sm">swap_vert</span>
                {localizeDigits(String(count))}
              </span>
            )}
          </span>
          <div className={styles.rowActions} onClick={stop}>
            <button className="ghost-btn" aria-label={t.history} onClick={onHistory}>
              <span className="material-symbols-outlined icon-md">history</span>
            </button>
            <button className="ghost-btn" aria-label={t.editOperation} onClick={onEdit}>
              <span className="material-symbols-outlined icon-md">edit</span>
            </button>
            <button className="ghost-btn" aria-label={t.deleteOperation} onClick={onDelete}>
              <span className="material-symbols-outlined icon-md">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Fragment } from 'react';
import { HistoryDayBar } from '../../components/HistoryDayBar';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { groupAmountByDay } from '../../lib/history';
import type { OperationCost, OperationCostEntry } from '../../types';
import styles from './operations.module.css';

interface OperationHistoryModalProps {
  open: boolean;
  operation: OperationCost | null;
  entries: OperationCostEntry[];
  loading: boolean;
  onClose: () => void;
  onEdit: (entry: OperationCostEntry) => void;
  onDelete: (entry: OperationCostEntry) => void;
}

export function OperationHistoryModal({
  open,
  operation,
  entries,
  loading,
  onClose,
  onEdit,
  onDelete,
}: OperationHistoryModalProps) {
  const { t, formatCurrency, formatTimeOfDay, localizeDigits } = useI18n();

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="operationHistoryTitle"
      flushBody // the day bars stick to the top of the body
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
          /* One bar per calendar day, carrying what the day came to. Everything
             here is an outgoing, so the bar shows the one figure. */
          groupAmountByDay(entries).map((day) => (
            <Fragment key={day.key}>
              <HistoryDayBar
                date={day.date}
                left={{ label: t.total, amount: day.total, tone: 'negative' }}
              />
              {day.entries.map((entry) => (
                <div key={entry.id} className={styles.entry}>
                  <div className={styles.line}>
                    <span className={styles.entryAmount}>{formatCurrency(entry.amount)}</span>
                    <div className={styles.entryActions}>
                      <button
                        className="ghost-btn"
                        aria-label={t.edit}
                        onClick={() => onEdit(entry)}
                      >
                        <span className="material-symbols-outlined icon-md">edit</span>
                      </button>
                      <button
                        className="ghost-btn"
                        aria-label={t.deleteAction}
                        onClick={() => onDelete(entry)}
                      >
                        <span className="material-symbols-outlined icon-md">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className={styles.line}>
                    {entry.note ? (
                      <span className={styles.entryNote} title={entry.note}>
                        {entry.note}
                      </span>
                    ) : (
                      <span />
                    )}
                    {/* Clock only: the day bar above already carries the date. */}
                    <span className={styles.entryTime}>
                      {localizeDigits(formatTimeOfDay(entry.timestamp))}
                    </span>
                  </div>
                </div>
              ))}
            </Fragment>
          ))
        )}
      </div>
    </Modal>
  );
}

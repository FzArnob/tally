import { useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { deleteCustomerBalanceHistory, getCustomerHistory } from '../../lib/api';
import { formatDisplayExpression } from '../../lib/format';
import type { BalanceHistoryEntry } from '../../types';
import styles from './customers.module.css';

interface CustomerHistoryModalProps {
  open: boolean;
  customerName: string | null;
  onClose: () => void;
  onChanged: () => void;
}

export function CustomerHistoryModal({
  open,
  customerName,
  onClose,
  onChanged,
}: CustomerHistoryModalProps) {
  const { t, formatCurrency, formatTimeFull, localizeDigits } = useI18n();
  const [entries, setEntries] = useState<BalanceHistoryEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !customerName) return;
    let active = true;
    setStatus('loading');
    getCustomerHistory(customerName)
      .then((data) => {
        if (!active) return;
        setEntries(data.history);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load customer history:', err);
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [open, customerName]);

  const handleDelete = async (id: string) => {
    if (!customerName || removingId) return;
    try {
      await deleteCustomerBalanceHistory({ historyId: id, customerName });
      setRemovingId(id);
      window.setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setRemovingId(null);
        onChanged();
      }, 280);
    } catch (err) {
      console.error('Failed to delete history entry:', err);
      alert(t.failedDeleteHistory);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="cbhTitle">
      <ModalHeader
        title={customerName ? `${customerName} ${t.historyTitle}` : t.historyTitle}
        titleId="cbhTitle"
        onClose={onClose}
        closeLabel={t.close}
      />
      <div className={styles.historyList}>
        {status === 'error' && <div className="empty-state">{t.failedLoadHistory}</div>}
        {status === 'ready' && entries.length === 0 && (
          <div className="empty-state">{t.noHistory}</div>
        )}
        {entries.map((entry) => {
          const isPaid = entry.type === 'paid' || (!entry.type && entry.amount >= 0);
          const amount = Math.abs(entry.amount);
          return (
            <div
              key={entry.id}
              className={`${styles.entry} ${removingId === entry.id ? styles.removing : ''}`}
            >
              <div className={styles.entryLine}>
                <span className={`${styles.entryAmount} ${isPaid ? 'text-positive' : 'text-negative'}`}>
                  {isPaid ? '+' : '-'}
                  {formatCurrency(amount)}
                </span>
                <span className={styles.entryTime}>{formatTimeFull(new Date(entry.timestamp))}</span>
                <button
                  className="ghost-btn"
                  aria-label={t.deleteAction}
                  onClick={() => handleDelete(entry.id)}
                >
                  <span className="material-symbols-outlined icon-lg">delete</span>
                </button>
              </div>
              {entry.expression && (
                <div className={styles.entryExpr}>
                  {localizeDigits(formatDisplayExpression(entry.expression))} = {formatCurrency(amount)}
                </div>
              )}
              {entry.reason && <div className={styles.entryReason}>{entry.reason}</div>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

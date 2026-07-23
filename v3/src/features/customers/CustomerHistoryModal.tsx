import { useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useI18n } from '../../i18n/LanguageContext';
import { deleteCustomerBalanceHistory, getCustomerHistory } from '../../lib/api';
import { formatDisplayExpression } from '../../lib/format';
import type { BalanceHistoryEntry, Customer } from '../../types';
import styles from './customers.module.css';

interface CustomerHistoryModalProps {
  customer: Customer | null; // non-null => open
  onClose: () => void;
  onChanged: () => void;
}

export function CustomerHistoryModal({ customer, onClose, onChanged }: CustomerHistoryModalProps) {
  const { t, formatCurrency, formatSignedCurrency, formatTimeFull, localizeDigits } = useI18n();
  const [current, setCurrent] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<BalanceHistoryEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BalanceHistoryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const open = !!customer;

  useEffect(() => {
    if (!customer) return;
    setCurrent(customer);
    let active = true;
    setStatus('loading');
    getCustomerHistory(customer.id)
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
  }, [customer]);

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    const id = pendingDelete.id;
    setDeleting(true);
    try {
      await deleteCustomerBalanceHistory(id);
      setPendingDelete(null);
      setRemovingId(id);
      window.setTimeout(() => {
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setRemovingId(null);
        onChanged();
      }, 280);
    } catch (err) {
      console.error('Failed to delete history entry:', err);
      alert(t.failedDeleteHistory);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="cbhTitle"
      header={
        <ModalHeader
          title={current ? `${current.name} — ${t.historyTitle}` : t.historyTitle}
          titleId="cbhTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.historyList}>
        {status === 'error' && <div className="empty-state">{t.failedLoadHistory}</div>}
        {status === 'ready' && entries.length === 0 && (
          <div className="empty-state">{t.noHistory}</div>
        )}
        {entries.map((entry) => {
          const isPaid = entry.type === 'paid';
          // Only show the expression when it involved an actual operation, not a
          // bare number that just equals the amount.
          const showExpr = !!entry.expression && /[+\-*/×÷]/.test(entry.expression);
          return (
            <div
              key={entry.id}
              className={`${styles.entry} ${removingId === entry.id ? styles.removing : ''}`}
            >
              <div className={styles.entryLeft}>
                <span
                  className={`${styles.entryAmount} ${isPaid ? 'text-positive' : 'text-negative'}`}
                >
                  {isPaid ? '+' : '-'}
                  {formatCurrency(entry.amount)}
                </span>
                {showExpr && (
                  <span className={styles.entryExpr}>
                    {localizeDigits(formatDisplayExpression(entry.expression as string))} ={' '}
                    {formatCurrency(entry.amount)}
                  </span>
                )}
                <span className={styles.entryTime}>
                  {localizeDigits(formatTimeFull(entry.timestamp))}
                </span>
              </div>

              <div className={styles.entryRight}>
                <button
                  className="ghost-btn"
                  aria-label={t.deleteAction}
                  onClick={() => setPendingDelete(entry)}
                >
                  <span className="material-symbols-outlined icon-lg">delete</span>
                </button>
                {entry.reason && <span className={styles.entryReason}>{entry.reason}</span>}
                <span className={styles.entryBalance}>
                  {t.balanceLabel} {formatSignedCurrency(entry.balance_after)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>

    <ConfirmDialog
      open={!!pendingDelete}
      title={t.deleteEntry}
      message={t.deleteEntryConfirm}
      confirmLabel={t.deleteAction}
      onConfirm={confirmDelete}
      onCancel={() => setPendingDelete(null)}
      busy={deleting}
    />
    </>
  );
}

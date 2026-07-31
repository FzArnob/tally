import { Fragment, useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HistoryDayBar } from '../../components/HistoryDayBar';
import { useI18n } from '../../i18n/LanguageContext';
import { deleteCustomerBalanceHistory, getCustomerHistory } from '../../lib/api';
import { groupBalanceByDay } from '../../lib/history';
import type { BalanceHistoryEntry, Customer } from '../../types';
import styles from './customers.module.css';

interface CustomerHistoryModalProps {
  customer: Customer | null; // non-null => open
  /** Bumped by the parent when an entry was edited elsewhere; forces a refetch. */
  reloadKey?: number;
  onClose: () => void;
  onEdit: (entry: BalanceHistoryEntry) => void;
  onChanged: () => void;
}

export function CustomerHistoryModal({
  customer,
  reloadKey = 0,
  onClose,
  onEdit,
  onChanged,
}: CustomerHistoryModalProps) {
  const { t, formatCurrency, formatSignedCurrency, formatNumber, formatTimeFull, localizeDigits } =
    useI18n();
  const [current, setCurrent] = useState<Customer | null>(null);
  const [entries, setEntries] = useState<BalanceHistoryEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BalanceHistoryEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Bumped by this modal's own writes (a delete) to re-pull the list.
  const [reloadTick, setReloadTick] = useState(0);
  const open = !!customer;

  // Whose history is on screen. A refetch for the SAME customer is a refresh,
  // not a fresh open, so it must not blank the list back to the spinner.
  const shownFor = useRef<string | null>(null);

  useEffect(() => {
    if (!customer) return;
    setCurrent(customer);
    const isNewSubject = shownFor.current !== customer.id;
    shownFor.current = customer.id;
    let active = true;
    if (isNewSubject) setStatus('loading');
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
  }, [customer, reloadKey, reloadTick]);

  /**
   * Removing an entry re-writes the running balance of every entry below it —
   * and, for goods, the sale and stock behind it. None of that can be worked
   * out here, so the list is re-pulled rather than having the row spliced out.
   */
  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    const id = pendingDelete.id;
    setDeleting(true);
    try {
      await deleteCustomerBalanceHistory(id);
      setPendingDelete(null);
      setRemovingId(id);
      // Let the row finish sliding out before the fresh list replaces it.
      window.setTimeout(() => {
        setRemovingId(null);
        setReloadTick((n) => n + 1);
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
      flushBody // the day bars stick to the top of the body
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
        {/* One bar per calendar day, carrying what went on the tab that day
            against what came off it. */}
        {groupBalanceByDay(entries).map((day) => (
          <Fragment key={day.key}>
            <HistoryDayBar
              date={day.date}
              left={{ label: t.unpaid, amount: day.totalUnpaid, tone: 'negative' }}
              right={{ label: t.paid, amount: day.totalPaid, tone: 'positive' }}
            />
            {day.entries.map((entry) => {
              const isPaid = entry.type === 'paid';
              const isItem = entry.source === 'item';
              // Goods say what they were: "3 packet × ৳180". Cash has only its note.
              const breakdown =
                isItem && entry.quantity !== null
                  ? `${localizeDigits(
                      `${formatNumber(entry.quantity)}${entry.quantity_type ? ` ${entry.quantity_type}` : ''} × `,
                    )}${formatCurrency(entry.price_per_unit ?? 0)}`
                  : null;
              // Goods are paid off gradually, so a taking can be part covered. The
              // figures are the same ones the tab sheet shows for its line.
              const covered = entry.paid_amount ?? 0;
              const partPaid = isItem && !isPaid && covered > 0 && covered < entry.amount;
              return (
                <div
                  key={entry.id}
                  className={`${styles.entry} ${removingId === entry.id ? styles.removing : ''}`}
                >
                  <div className={styles.line}>
                    <span
                      className={`${styles.entryAmount} ${isPaid ? 'text-positive' : 'text-negative'}`}
                    >
                      {isPaid ? '+' : '-'}
                      {formatCurrency(entry.amount)}
                    </span>
                    <span className={styles.entryBalance}>
                      {t.balanceLabel}{' '}
                      <span className={entry.balance_after >= 0 ? 'text-positive' : 'text-negative'}>
                        {formatSignedCurrency(entry.balance_after)}
                      </span>
                    </span>
                  </div>

                  {(breakdown || entry.reason) && (
                    <div className={styles.line}>
                      {breakdown ? <span className={styles.entryExpr}>{breakdown}</span> : <span />}
                      {entry.reason && (
                        <span className={styles.entryReason} title={entry.reason}>
                          {entry.reason}
                        </span>
                      )}
                    </div>
                  )}

                  {partPaid && (
                    <div className={styles.line}>
                      <span className={styles.entryPaid}>
                        {t.paidBack}: {formatCurrency(covered)}
                      </span>
                      <span className={styles.entryDue}>
                        {t.saleDue}: {formatCurrency(entry.amount - covered)}
                      </span>
                    </div>
                  )}

                  <div className={styles.line}>
                    <span className={styles.entryTime}>
                      {localizeDigits(formatTimeFull(entry.timestamp))}
                    </span>
                    <div className={styles.entryActions}>
                      <button className="ghost-btn" aria-label={t.edit} onClick={() => onEdit(entry)}>
                        <span className="material-symbols-outlined icon-md">edit</span>
                      </button>
                      <button
                        className="ghost-btn"
                        aria-label={t.deleteAction}
                        onClick={() => setPendingDelete(entry)}
                      >
                        <span className="material-symbols-outlined icon-md">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </Modal>

    <ConfirmDialog
      open={!!pendingDelete}
      title={t.deleteEntry}
      // Removing a goods entry takes its other half with it, so say which.
      message={
        pendingDelete?.source !== 'item'
          ? t.deleteEntryConfirm
          : pendingDelete.type === 'unpaid'
            ? t.deleteTakingConfirm
            : t.deletePaymentConfirm
      }
      confirmLabel={t.deleteAction}
      onConfirm={confirmDelete}
      onCancel={() => setPendingDelete(null)}
      busy={deleting}
    />
    </>
  );
}

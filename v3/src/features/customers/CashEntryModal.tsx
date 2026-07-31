import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { createCustomerBalance, updateCustomerBalance } from '../../lib/api';
import { ApiError, type BalanceHistoryEntry, type BalanceType, type Customer } from '../../types';
import styles from './customers.module.css';

interface CashEntryModalProps {
  open: boolean;
  customer: Customer | null;
  /** 'unpaid' books cash the customer borrowed, 'paid' cash they handed back. */
  type: BalanceType;
  /** Non-null => correct that entry in place instead of adding a new one. */
  editEntry?: BalanceHistoryEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Plain cash on a customer's tab — borrowed or paid back. The amount is typed,
 * not calculated: one number, the same way an operation cost is entered.
 *
 * Goods never come through here. They are items, and they carry a sale with
 * them; see CustomerItemsModal.
 */
export function CashEntryModal({
  open,
  customer,
  type,
  editEntry = null,
  onClose,
  onSaved,
}: CashEntryModalProps) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const borrowed = type === 'unpaid';

  // Seed only when the modal switches subject (another customer, another entry,
  // or the other direction). Reopening the same one keeps what was typed, so
  // closing is never destructive. Cleared on a save.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !customer) return;
    const subject = `${customer.id}:${type}:${editEntry?.id ?? 'new'}`;
    if (seededFor.current === subject) return;
    seededFor.current = subject;
    setAmount(editEntry ? String(editEntry.amount) : '');
    setNote(editEntry?.reason ?? '');
    setError(null);
  }, [open, customer, type, editEntry]);

  if (!customer) return null;

  const submit = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError(t.enterValidAmount);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const reason = note.trim() || null;
      if (editEntry) {
        await updateCustomerBalance({ historyId: editEntry.id, type, amount: value, reason });
      } else {
        await createCustomerBalance({ customerId: customer.id, type, amount: value, reason });
      }
      seededFor.current = null;
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save cash entry:', err);
        setError(t.failedSaveEntry);
      }
    } finally {
      setSaving(false);
    }
  };

  const title = editEntry
    ? t.editCashEntry
    : borrowed
      ? t.recordBorrowedCash
      : t.recordCashPaid;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="cashEntryTitle"
      header={
        <ModalHeader
          title={title}
          titleId="cashEntryTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
      footer={
        <>
          {error && <div className={`${styles.formError} ${styles.itemsError}`}>{error}</div>}
          <button
            // The button carries the direction's colour, so borrowing money can
            // never be mistaken for taking it in.
            className={`btn btn-block btn-margin ${borrowed ? styles.cashOutBtn : styles.cashInBtn}`}
            onClick={submit}
            disabled={saving}
          >
            {editEntry ? t.update : borrowed ? t.borrowedCash : t.cashPaidBack}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="cashAmount">{t.amount}</label>
        <input
          id="cashAmount"
          className="input"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>

      <div className="field">
        <label htmlFor="cashNote">{t.note}</label>
        <input
          id="cashNote"
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t.notePlaceholder}
          maxLength={255}
        />
      </div>
    </Modal>
  );
}

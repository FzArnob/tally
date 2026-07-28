import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { addOperationCostEntry, updateOperationCostEntry } from '../../lib/api';
import { ApiError, type OperationCost, type OperationCostEntry } from '../../types';
import styles from './operations.module.css';

interface OperationActionModalProps {
  open: boolean;
  operation: OperationCost | null;
  editEntry: OperationCostEntry | null; // non-null => edit that entry instead of adding
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Add one dated amount entry (a cost incurred over time) to an operation cost —
 * or, with `editEntry`, correct an existing one in place.
 */
export function OperationActionModal({
  open,
  operation,
  editEntry,
  onClose,
  onSaved,
}: OperationActionModalProps) {
  const { t, formatCurrency } = useI18n();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed only when the modal switches subject (another operation, or a
  // different entry to edit). Reopening the same one keeps what was typed, so
  // closing is never destructive. Cleared on a save.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !operation) return;
    const subject = `${operation.id}:${editEntry?.id ?? 'new'}`;
    if (seededFor.current === subject) return;
    seededFor.current = subject;
    setAmount(editEntry ? String(editEntry.amount) : '');
    setNote(editEntry?.note ?? '');
    setError(null);
  }, [open, operation, editEntry]);

  if (!operation) return null;

  const submit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError(t.enterValidAmount);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = { amount: amt, note: note.trim() };
      if (editEntry) await updateOperationCostEntry(editEntry.id, body);
      else await addOperationCostEntry(operation.id, body);
      seededFor.current = null;
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save amount:', err);
        setError(editEntry ? t.failedUpdateEntry : t.failedAddAmount);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="operationActionTitle"
      header={
        <div className={styles.actionHeader}>
          <div style={{ minWidth: 0 }}>
            <h3
              id="operationActionTitle"
              className={styles.actionName}
              title={operation.reason}
              style={{ fontSize: 'var(--fs-heading-sm)', fontWeight: 600 }}
            >
              {operation.reason}
            </h3>
            <span className={styles.actionSub}>
              {t.totalOperationCost}: {formatCurrency(operation.amount)}
            </span>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            <span className="material-symbols-outlined icon-lg">close</span>
          </button>
        </div>
      }
      footer={
        <>
          {error && (
            <div className={styles.formError} style={{ marginBottom: '0.75rem' }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-block btn-margin" onClick={submit} disabled={saving}>
            {editEntry ? t.update : t.addAmount}
          </button>
        </>
      }
    >
      <div className={styles.body}>
        <div className="field">
          <label htmlFor="opeAmount">{t.amount}</label>
          <input
            id="opeAmount"
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
          <label htmlFor="opeNote">{t.note}</label>
          <textarea
            id="opeNote"
            className="textarea"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.notePlaceholder}
          />
        </div>

      </div>
    </Modal>
  );
}

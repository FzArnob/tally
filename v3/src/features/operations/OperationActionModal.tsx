import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { addOperationCostEntry } from '../../lib/api';
import { ApiError, type OperationCost } from '../../types';
import styles from './operations.module.css';

interface OperationActionModalProps {
  open: boolean;
  operation: OperationCost | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Add one dated amount entry (a cost incurred over time) to an operation cost. */
export function OperationActionModal({
  open,
  operation,
  onClose,
  onSaved,
}: OperationActionModalProps) {
  const { t, formatCurrency } = useI18n();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setNote('');
    setError(null);
  }, [open, operation]);

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
      await addOperationCostEntry(operation.id, { amount: amt, note: note.trim() });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to add amount:', err);
        setError(t.failedAddAmount);
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

        {error && <div className={styles.formError}>{error}</div>}

        <button className="btn btn-primary btn-block" onClick={submit} disabled={saving}>
          {t.addAmount}
        </button>
      </div>
    </Modal>
  );
}

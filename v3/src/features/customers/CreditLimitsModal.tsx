import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveCreditLimits } from '../../lib/api';
import { ApiError, type CreditLimits } from '../../types';
import styles from './customers.module.css';

interface CreditLimitsModalProps {
  open: boolean;
  bookId: string;
  limits: CreditLimits;
  onClose: () => void;
  onSaved: (limits: CreditLimits) => void;
}

/**
 * The book's rule for how far a customer may run: the most they may owe, and how
 * long a debt may stand. One rule for the whole book — a shop keeps one, not one
 * per name — and neither half is compulsory: an empty box means that half is not
 * policed, which is why both fields save a real null rather than a zero.
 *
 * Nothing here is enforced. Going past a limit raises a warning the user can
 * overrule, so these are numbers to be reminded about, not gates.
 */
export function CreditLimitsModal({
  open,
  bookId,
  limits,
  onClose,
  onSaved,
}: CreditLimitsModalProps) {
  const { t } = useI18n();
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Seed each time the sheet is opened, so it always shows what is in force.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setAmount(limits.credit_limit != null ? String(limits.credit_limit) : '');
      setDays(limits.credit_days != null ? String(limits.credit_days) : '');
      setError(null);
    }
    wasOpen.current = open;
  }, [open, limits]);

  const submit = async () => {
    // An empty box is the setting "no limit", not a missing answer.
    const nextLimit = amount.trim() === '' ? null : parseFloat(amount);
    const nextDays = days.trim() === '' ? null : parseInt(days, 10);

    if (nextLimit !== null && (isNaN(nextLimit) || nextLimit <= 0)) {
      setError(t.enterValidAmount);
      return;
    }
    if (nextDays !== null && (isNaN(nextDays) || nextDays <= 0)) {
      setError(t.enterValidAmount);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const next: CreditLimits = { credit_limit: nextLimit, credit_days: nextDays };
      await saveCreditLimits(bookId, next);
      onSaved(next);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save credit limits:', err);
        setError(t.failedSaveCreditLimits);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="creditLimitsTitle"
      header={
        <ModalHeader
          title={t.creditLimitsTitle}
          titleId="creditLimitsTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
      footer={
        <>
          {error && <div className={`${styles.formError} ${styles.itemsError}`}>{error}</div>}
          <button
            className="btn btn-primary btn-block btn-margin"
            onClick={submit}
            disabled={saving}
          >
            {t.save}
          </button>
        </>
      }
    >
      <div className="form-stack">
        <div className="field">
          <label htmlFor="creditLimitAmount">{t.creditLimitLabel}</label>
          <input
            id="creditLimitAmount"
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
          <label htmlFor="creditLimitDays">{t.creditDaysLabel}</label>
          <input
            id="creditLimitDays"
            className="input"
            type="number"
            inputMode="numeric"
            min="1"
            step="1"
            placeholder="0"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <span className={styles.settleHint}>{t.creditNoLimitHint}</span>
        </div>
      </div>
    </Modal>
  );
}

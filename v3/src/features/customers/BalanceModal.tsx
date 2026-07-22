import { useCallback, useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { createCustomerBalance } from '../../lib/api';
import {
  INITIAL_CALC,
  backspace,
  clear,
  equals,
  inputNumber,
  inputOperator,
  percent,
  resolveAmount,
  type CalcState,
} from '../../lib/calculator';
import type { Customer } from '../../types';
import { Calculator } from './Calculator';
import styles from './customers.module.css';

interface BalanceModalProps {
  customer: Customer | null; // non-null => open
  onClose: () => void;
  onChanged: () => void;
}

export function BalanceModal({ customer, onClose, onChanged }: BalanceModalProps) {
  const { t, formatSignedCurrency } = useI18n();
  const [current, setCurrent] = useState<Customer | null>(null);
  const [balance, setBalance] = useState(0);
  const [note, setNote] = useState('');
  const [calc, setCalc] = useState<CalcState>(INITIAL_CALC);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = !!customer;

  // Capture the customer on open; keep it during the close animation.
  useEffect(() => {
    if (customer) {
      setCurrent(customer);
      setBalance(customer.total_balance);
      setNote('');
      setCalc(INITIAL_CALC);
      setError(null);
    }
  }, [customer]);

  const applyDelta = useCallback(
    async (sign: 1 | -1) => {
      if (!current || busy) return;
      const amount = resolveAmount(calc);
      if (isNaN(amount) || amount <= 0) {
        setError(t.enterAmount);
        return;
      }
      const type = sign > 0 ? 'paid' : 'unpaid';
      const expression = calc.expression || calc.display || '';
      const reason = note.trim() || (sign > 0 ? t.paid : t.unpaid);

      setBusy(true);
      setError(null);
      try {
        const res = await createCustomerBalance({
          customerId: current.id,
          type,
          amount,
          reason,
          expression,
        });
        setBalance(res.new_balance);
        setCalc(INITIAL_CALC);
        setNote('');
        onChanged();
      } catch (err) {
        console.error('Failed to save customer balance:', err);
        setError(t.failedSaveBalance);
      } finally {
        setBusy(false);
      }
    },
    [current, busy, calc, note, t, onChanged],
  );

  // Physical keyboard support while open (ignored while typing in a field).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const k = e.key;
      if ('0123456789'.includes(k)) setCalc((c) => inputNumber(c, k));
      else if (k === '.') setCalc((c) => inputNumber(c, '.'));
      else if (['+', '-', '*', '/'].includes(k)) setCalc((c) => inputOperator(c, k));
      else if (k === '%') setCalc((c) => percent(c));
      else if (k === 'Backspace') setCalc((c) => backspace(c));
      else if (k === 'Enter' || k === '=') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) void applyDelta(-1);
        else void applyDelta(1);
      } else if (k.toLowerCase() === 'c') setCalc(clear());
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, applyDelta]);

  // Any calculator change dismisses a transient validation error.
  useEffect(() => {
    setError(null);
  }, [calc]);

  const positive = balance >= 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="balTitle"
      panelClassName={styles.balancePanel}
      header={
        <ModalHeader
          title={
            <div className={styles.balHeaderInfo}>
              <span className={styles.balName}>
                <span className={styles.cName} title={current?.name}>
                  {current?.name}
                </span>
                {current?.nickname ? <span className={styles.cNick}>{current.nickname}</span> : null}
              </span>
              <span className={`${styles.balHeaderAmount} ${positive ? 'text-positive' : 'text-negative'}`}>
                {formatSignedCurrency(balance)}
              </span>
            </div>
          }
          titleId="balTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
      footer={
        <div className={styles.commit}>
          <button
            className={`${styles.commitBtn} ${styles.keyUnpaid}`}
            onClick={() => void applyDelta(-1)}
            disabled={busy}
          >
            <span className="material-symbols-outlined icon-md">south_west</span>
            {t.unpaid}
          </button>
          <button
            className={`${styles.commitBtn} ${styles.keyPaid}`}
            onClick={() => void applyDelta(1)}
            disabled={busy}
          >
            <span className="material-symbols-outlined icon-md">north_east</span>
            {t.paid}
          </button>
        </div>
      }
    >
      <input
        className="input"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t.notePlaceholder}
        maxLength={255}
      />

      <div className={styles.balCalc}>
        <Calculator
          state={calc}
          disabled={busy}
          error={error}
          onNumber={(n) => setCalc((c) => inputNumber(c, n))}
          onOperator={(op) => setCalc((c) => inputOperator(c, op))}
          onPercent={() => setCalc((c) => percent(c))}
          onBackspace={() => setCalc((c) => backspace(c))}
          onClear={() => setCalc(clear())}
          onEquals={() => setCalc((c) => equals(c))}
        />
      </div>
    </Modal>
  );
}

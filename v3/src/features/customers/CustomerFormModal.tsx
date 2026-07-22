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

interface CustomerFormModalProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onChanged: () => void;
}

export function CustomerFormModal({ open, customer, onClose, onChanged }: CustomerFormModalProps) {
  const { t, formatSignedCurrency } = useI18n();
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [editing, setEditing] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [calc, setCalc] = useState<CalcState>(INITIAL_CALC);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? '');
    setDetails('');
    setEditing(!!customer);
    setBalance(customer ? customer.total_balance : null);
    setCalc(INITIAL_CALC);
  }, [open, customer]);

  const applyDelta = useCallback(
    async (sign: 1 | -1) => {
      const trimmed = name.trim();
      if (!trimmed || busy) return;
      const amount = resolveAmount(calc);
      if (isNaN(amount) || amount <= 0) return;

      const type = sign > 0 ? 'paid' : 'unpaid';
      const expression = calc.expression || calc.display || '';
      const reason = details.trim() || (sign > 0 ? t.paid : t.unpaid);

      setBusy(true);
      try {
        const res = await createCustomerBalance({ customerName: trimmed, type, amount, reason, expression });
        setBalance(res.new_balance);
        setEditing(true);
        setCalc(INITIAL_CALC);
        setDetails('');
        onChanged();
      } catch (err) {
        console.error('Failed to save customer balance:', err);
        alert(t.failedSaveBalance);
      } finally {
        setBusy(false);
      }
    },
    [name, busy, calc, details, t, onChanged],
  );

  // Physical keyboard support while the modal is open.
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

  const balanceColor =
    balance == null || balance === 0 ? 'var(--muted-foreground)' : balance > 0 ? 'var(--green-700)' : 'var(--red-700)';

  return (
    <Modal open={open} onClose={onClose} labelledBy="cbFormTitle">
      <ModalHeader
        title={editing ? t.editCustomer : t.addCustomer}
        titleId="cbFormTitle"
        onClose={onClose}
        closeLabel={t.close}
      />

      <div className="field">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.customerName}
          disabled={editing}
        />
      </div>

      <div className="field" style={{ marginTop: '1rem' }}>
        <textarea
          className="textarea"
          rows={2}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={t.orderDetails}
        />
        {editing && balance != null && (
          <div className={styles.currentBalance}>
            <span>{t.currentBalanceLabel}</span>
            <strong style={{ color: balanceColor }}>{formatSignedCurrency(balance)}</strong>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem' }}>
        <Calculator
          state={calc}
          disabled={busy}
          onNumber={(n) => setCalc((c) => inputNumber(c, n))}
          onOperator={(op) => setCalc((c) => inputOperator(c, op))}
          onPercent={() => setCalc((c) => percent(c))}
          onBackspace={() => setCalc((c) => backspace(c))}
          onClear={() => setCalc(clear())}
          onEquals={() => setCalc((c) => equals(c))}
          onPaid={() => void applyDelta(1)}
          onUnpaid={() => void applyDelta(-1)}
        />
      </div>
    </Modal>
  );
}

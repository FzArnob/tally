import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { savePersonalTransaction } from '../../lib/api';
import { ApiError, type CashflowType, type Category, type PersonalTransaction } from '../../types';
import styles from './transactions.module.css';

interface TransactionFormModalProps {
  open: boolean;
  bookId: number;
  transaction: PersonalTransaction | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionFormModal({
  open,
  bookId,
  transaction,
  categories,
  onClose,
  onSaved,
}: TransactionFormModalProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isEdit = !!transaction;

  const [type, setType] = useState<CashflowType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType(transaction?.type ?? 'expense');
    setCategoryId(transaction?.category_id ? String(transaction.category_id) : '');
    setNote(transaction?.note ?? '');
    setAmount(transaction ? String(transaction.amount) : '');
    setError(null);
    setSaving(false);
  }, [open, transaction]);

  const options = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  const pickType = (next: CashflowType) => {
    setType(next);
    // Reset the category when it no longer belongs to the chosen type.
    setCategoryId((prev) =>
      categories.some((c) => c.id === Number(prev) && c.type === next) ? prev : '',
    );
  };

  const submit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError(t.enterValidAmount);
      return;
    }
    if (!categoryId) {
      setError(t.selectCategory);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await savePersonalTransaction({
        transactionId: transaction?.id ?? null,
        bookId,
        type,
        categoryId: Number(categoryId),
        note: note.trim(),
        amount: amt,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save transaction:', err);
        setError(t.failedSaveTransaction);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="txFormTitle"
      header={
        <ModalHeader
          title={isEdit ? t.editTransaction : t.addTransaction}
          titleId="txFormTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.form}>
        <div className="field">
          <label>{t.typeLabel}</label>
          <div className={styles.typeToggle}>
            <button
              type="button"
              className={`${styles.typeBtn} ${type === 'income' ? styles.typeIncomeActive : ''}`}
              onClick={() => pickType('income')}
              aria-pressed={type === 'income'}
            >
              <span className="material-symbols-outlined icon-md">south_west</span>
              {t.income}
            </button>
            <button
              type="button"
              className={`${styles.typeBtn} ${type === 'expense' ? styles.typeExpenseActive : ''}`}
              onClick={() => pickType('expense')}
              aria-pressed={type === 'expense'}
            >
              <span className="material-symbols-outlined icon-md">north_east</span>
              {t.expense}
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="txCategory">{t.categoryLabel}</label>
          {options.length > 0 ? (
            <select
              id="txCategory"
              className="select"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="" disabled>
                {t.selectCategory}
              </option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              className={styles.categoryEmpty}
              onClick={() => {
                onClose();
                navigate(`/${bookId}/categories`);
              }}
            >
              <span className="material-symbols-outlined icon-md">add</span>
              {t.noCategoriesHint}
            </button>
          )}
        </div>

        <div className="field">
          <label htmlFor="txAmount">{t.amountLabel}</label>
          <input
            id="txAmount"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="field">
          <label htmlFor="txNote">{t.noteLabel}</label>
          <input
            id="txNote"
            className="input"
            value={note}
            maxLength={255}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.notePlaceholder}
          />
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <button
          className="btn btn-primary btn-block"
          onClick={submit}
          disabled={saving || options.length === 0}
        >
          {isEdit ? t.saveChanges : t.addTransaction}
        </button>
      </div>
    </Modal>
  );
}

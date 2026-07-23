import { useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveCategory } from '../../lib/api';
import { ApiError, type CashflowType, type Category } from '../../types';
import styles from './categories.module.css';

interface CategoryFormModalProps {
  open: boolean;
  bookId: number;
  /** null => create; a category => edit. */
  category: Category | null;
  /** The type for a new category (income/expense). Ignored on edit (type is immutable). */
  type: CashflowType;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryFormModal({
  open,
  bookId,
  category,
  type,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const { t } = useI18n();
  const isEdit = !!category;
  const effectiveType = category?.type ?? type;

  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setDetails(category?.details ?? '');
    setError(null);
    setSaving(false);
  }, [open, category]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.enterCategoryName);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveCategory({
        categoryId: category?.id ?? null,
        bookId,
        name: trimmed,
        details: details.trim(),
        type: effectiveType,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'duplicate') {
        setError(t.duplicateCategory);
      } else if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save category:', err);
        setError(t.failedSaveCategory);
      }
    } finally {
      setSaving(false);
    }
  };

  const income = effectiveType === 'income';

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="catFormTitle"
      header={
        <ModalHeader
          title={isEdit ? t.editCategory : t.addCategory}
          titleId="catFormTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.form}>
        <div className="field">
          <label>{t.typeLabel}</label>
          <span
            className={`${styles.typeBadge} ${income ? styles.badgeIncome : styles.badgeExpense}`}
          >
            <span className="material-symbols-outlined icon-sm">
              {income ? 'trending_up' : 'trending_down'}
            </span>
            {income ? t.income : t.expense}
          </span>
        </div>

        <div className="field">
          <label htmlFor="catName">{t.categoryName}</label>
          <input
            id="catName"
            className="input"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.categoryNamePlaceholder}
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="catDetails">
            {t.categoryDetails} <span className={styles.optional}>({t.optional})</span>
          </label>
          <input
            id="catDetails"
            className="input"
            value={details}
            maxLength={255}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t.categoryDetailsPlaceholder}
          />
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <button className="btn btn-primary btn-block" onClick={submit} disabled={saving}>
          {isEdit ? t.saveChanges : t.addCategory}
        </button>
      </div>
    </Modal>
  );
}

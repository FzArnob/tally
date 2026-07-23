import { useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../components/Modal';
import { useI18n } from '../i18n/LanguageContext';
import { createBook } from '../lib/api';
import { bookIcon } from './book';
import type { Book, BookType } from '../types';
import type { Translation } from '../i18n/translations';
import styles from './books.module.css';

interface CreateBookModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (book: Book) => void;
}

const TYPES: { value: BookType; labelKey: keyof Translation; hintKey: keyof Translation }[] = [
  { value: 'store', labelKey: 'typeStore', hintKey: 'typeStoreHint' },
  { value: 'personal', labelKey: 'typePersonal', hintKey: 'typePersonalHint' },
];

export function CreateBookModal({ open, onClose, onCreated }: CreateBookModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [type, setType] = useState<BookType>('store');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setType('store');
    setError(null);
    setSaving(false);
  }, [open]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.enterBookName);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await createBook({ name: trimmed, type });
      onCreated(res.book);
    } catch (err) {
      console.error('Failed to create book:', err);
      setError(t.failedSaveBook);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="createBookTitle"
      header={
        <ModalHeader
          title={t.addBook}
          titleId="createBookTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.form}>
        <div className="field">
          <label htmlFor="bookName">{t.bookName}</label>
          <input
            id="bookName"
            className="input"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.bookNamePlaceholder}
            autoFocus
          />
        </div>

        <div className="field">
          <label>{t.bookType}</label>
          <div className={styles.typeGrid}>
            {TYPES.map((ty) => (
              <button
                key={ty.value}
                type="button"
                className={`${styles.typeCard} ${type === ty.value ? styles.typeActive : ''}`}
                onClick={() => setType(ty.value)}
                aria-pressed={type === ty.value}
              >
                <span className="material-symbols-outlined icon-xl">{bookIcon(ty.value)}</span>
                <span className={styles.typeName}>{t[ty.labelKey]}</span>
                <span className={styles.typeHint}>{t[ty.hintKey]}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <button className="btn btn-primary btn-block" onClick={submit} disabled={saving}>
          {t.createBook}
        </button>
      </div>
    </Modal>
  );
}

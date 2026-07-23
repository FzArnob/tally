import { useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../components/Modal';
import { useI18n } from '../i18n/LanguageContext';
import { createBook, updateBook } from '../lib/api';
import { bookIcon } from './book';
import type { Book, BookType } from '../types';
import type { Translation } from '../i18n/translations';
import styles from './books.module.css';

interface BookFormModalProps {
  open: boolean;
  /** null => create a new book; a book => edit it. */
  book: Book | null;
  onClose: () => void;
  onSaved: (book: Book, created: boolean) => void;
}

const TYPES: { value: BookType; labelKey: keyof Translation; hintKey: keyof Translation }[] = [
  { value: 'store', labelKey: 'typeStore', hintKey: 'typeStoreHint' },
  { value: 'personal', labelKey: 'typePersonal', hintKey: 'typePersonalHint' },
];

export function BookFormModal({ open, book, onClose, onSaved }: BookFormModalProps) {
  const { t } = useI18n();
  const isEdit = !!book;
  const [name, setName] = useState('');
  const [type, setType] = useState<BookType>('store');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(book?.name ?? '');
    setType(book?.type ?? 'store');
    setError(null);
    setSaving(false);
  }, [open, book]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.enterBookName);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = book
        ? await updateBook(book.id, { name: trimmed, type })
        : await createBook({ name: trimmed, type });
      onSaved(res.book, !book);
    } catch (err) {
      console.error('Failed to save book:', err);
      setError(t.failedSaveBook);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="bookFormTitle"
      header={
        <ModalHeader
          title={isEdit ? t.editBook : t.addBook}
          titleId="bookFormTitle"
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
          {isEdit ? t.saveChanges : t.createBook}
        </button>
      </div>
    </Modal>
  );
}

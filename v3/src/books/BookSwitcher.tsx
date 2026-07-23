import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/LanguageContext';
import { useBooks } from './BooksContext';
import { bookHomePath, bookIcon } from './book';
import { CreateBookModal } from './CreateBookModal';
import type { Book } from '../types';
import styles from './books.module.css';

/** Header-left control: shows the current book and switches / adds books. */
export function BookSwitcher({ current }: { current: Book }) {
  const { t } = useI18n();
  const { books, reload } = useBooks();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, [open]);

  const switchTo = (book: Book) => {
    setOpen(false);
    if (book.id !== current.id) navigate(bookHomePath(book));
  };

  const handleCreated = async (book: Book) => {
    setCreateOpen(false);
    await reload();
    navigate(bookHomePath(book));
  };

  return (
    <div className={styles.switcher} ref={ref}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t.switchBook}
      >
        <span className={styles.badge}>
          <span className="material-symbols-outlined">{bookIcon(current.type)}</span>
        </span>
        <span className={styles.currentName} title={current.name}>
          {current.name}
        </span>
        <span className={`material-symbols-outlined icon-md ${styles.chevron} ${open ? styles.chevronUp : ''}`}>
          expand_more
        </span>
      </button>

      <div className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`} role="listbox">
        {books.map((b) => (
          <button
            key={b.id}
            role="option"
            aria-selected={b.id === current.id}
            className={`${styles.option} ${b.id === current.id ? styles.optionActive : ''}`}
            onClick={() => switchTo(b)}
          >
            <span className={styles.optionIcon}>
              <span className="material-symbols-outlined icon-md">{bookIcon(b.type)}</span>
            </span>
            <span className={styles.optionText}>
              <span className={styles.optionName}>{b.name}</span>
              <span className={styles.optionType}>
                {b.type === 'personal' ? t.typePersonal : t.typeStore}
              </span>
            </span>
            {b.id === current.id && (
              <span className={`material-symbols-outlined icon-md ${styles.optionCheck}`}>check</span>
            )}
          </button>
        ))}

        <button
          className={styles.addBtn}
          onClick={() => {
            setOpen(false);
            setCreateOpen(true);
          }}
        >
          <span className="material-symbols-outlined icon-md">add</span>
          {t.addBook}
        </button>
      </div>

      <CreateBookModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}

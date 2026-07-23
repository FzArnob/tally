import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/LanguageContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { deleteBook } from '../lib/api';
import { useBooks } from './BooksContext';
import { bookHomePath, bookIcon } from './book';
import { BookFormModal } from './BookFormModal';
import type { Book } from '../types';
import styles from './books.module.css';

/** Header-left control: shows the current book and switches / adds / edits / deletes books. */
export function BookSwitcher({ current }: { current: Book }) {
  const { t } = useI18n();
  const { books, reload } = useBooks();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Book | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const openCreate = () => {
    setOpen(false);
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (book: Book) => {
    setOpen(false);
    setEditing(book);
    setFormOpen(true);
  };

  const handleSaved = async (book: Book, created: boolean) => {
    setFormOpen(false);
    await reload();
    // Navigate for a new book, or when the current book's type/route changed.
    if (created || book.id === current.id) navigate(bookHomePath(book));
  };

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    const target = pendingDelete;
    setDeleting(true);
    try {
      await deleteBook(target.id);
      const list = await reload();
      setPendingDelete(null);
      if (target.id === current.id) {
        const next = list.find((b) => b.id !== target.id);
        navigate(next ? bookHomePath(next) : '/');
      }
    } catch (err) {
      console.error('Failed to delete book:', err);
      alert(t.failedDeleteBook);
    } finally {
      setDeleting(false);
    }
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
        <span
          className={`material-symbols-outlined icon-md ${styles.chevron} ${open ? styles.chevronUp : ''}`}
        >
          expand_more
        </span>
      </button>

      <div className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`} role="listbox">
        {books.map((b) => (
          <div
            key={b.id}
            className={`${styles.option} ${b.id === current.id ? styles.optionActive : ''}`}
          >
            <button
              className={styles.optionMain}
              role="option"
              aria-selected={b.id === current.id}
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
            </button>
            <div className={styles.optionActions}>
              <button className="ghost-btn" aria-label={t.editBook} onClick={() => openEdit(b)}>
                <span className="material-symbols-outlined icon-md">edit</span>
              </button>
              <button
                className="ghost-btn"
                aria-label={t.deleteBook}
                onClick={() => {
                  setOpen(false);
                  setPendingDelete(b);
                }}
              >
                <span className="material-symbols-outlined icon-md">delete</span>
              </button>
            </div>
          </div>
        ))}

        <button className={styles.addBtn} onClick={openCreate}>
          <span className="material-symbols-outlined icon-md">add</span>
          {t.addBook}
        </button>
      </div>

      <BookFormModal
        open={formOpen}
        book={editing}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t.deleteBook}
        message={t.deleteBookConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </div>
  );
}

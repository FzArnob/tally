import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/LanguageContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useBooks } from './BooksContext';
import { bookHomePath } from './book';
import { BookFormModal } from './BookFormModal';
import type { Book } from '../types';
import styles from './books.module.css';

/** First-run screen shown when no books exist yet. */
export function WelcomeScreen() {
  const { t } = useI18n();
  const { reload } = useBooks();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleCreated = async (book: Book) => {
    setOpen(false);
    await reload();
    navigate(bookHomePath(book));
  };

  return (
    <>
      <div className={styles.topControls}>
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <div className={styles.screen}>
        <div className={styles.screenIcon}>
          <span className="material-symbols-outlined">menu_book</span>
        </div>
        <h1 className={styles.screenTitle}>{t.welcomeTitle}</h1>
        <p className={styles.screenText}>{t.welcomeSubtitle}</p>
        <div className={styles.screenActions}>
          <button className="btn btn-primary btn-block" onClick={() => setOpen(true)}>
            <span className="material-symbols-outlined icon-md">add</span>
            {t.getStarted}
          </button>
        </div>
      </div>

      <BookFormModal open={open} book={null} onClose={() => setOpen(false)} onSaved={handleCreated} />
    </>
  );
}

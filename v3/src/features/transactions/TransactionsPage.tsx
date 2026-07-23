import { Header } from '../../components/Header';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { BookSwitcher } from '../../books/BookSwitcher';
import { useI18n } from '../../i18n/LanguageContext';
import type { Book } from '../../types';
import styles from '../../books/books.module.css';

/** Personal-book home. Placeholder until personal transactions are built. */
export function TransactionsPage({ book }: { book: Book }) {
  const { t } = useI18n();

  return (
    <>
      <Header
        leading={<BookSwitcher current={book} />}
        actions={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
          </>
        }
      />

      <div className={styles.pageState}>
        <div className={styles.screenIcon}>
          <span className="material-symbols-outlined">account_balance_wallet</span>
        </div>
        <h1 className={styles.screenTitle}>{t.comingSoon}</h1>
        <p className={styles.screenText}>{t.comingSoonHint}</p>
      </div>
    </>
  );
}

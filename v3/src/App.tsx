import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Header, CustomersButton } from './components/Header';
import { ProductsSection } from './features/products/ProductsSection';
import { CustomersPage } from './features/customers/CustomersPage';
import { TransactionsPage } from './features/transactions/TransactionsPage';
import { CategoriesPage } from './features/categories/CategoriesPage';
import { useI18n } from './i18n/LanguageContext';
import { useBooks } from './books/BooksContext';
import { UserMenu } from './auth/UserMenu';
import { BookSwitcher } from './books/BookSwitcher';
import { WelcomeScreen } from './books/WelcomeScreen';
import { bookHomePath } from './books/book';
import type { Book } from './types';
import styles from './books/books.module.css';

function FullScreenLoader() {
  return (
    <div className={styles.screen}>
      <span className={styles.spinner} />
    </div>
  );
}

/** `/` — decides between the welcome screen and the default book's home. */
function BooksGate() {
  const { t } = useI18n();
  const { books, status } = useBooks();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'error') {
    return (
      <div className={styles.screen}>
        <p className={styles.screenText}>{t.failedLoadBooks}</p>
      </div>
    );
  }
  if (books.length === 0) return <WelcomeScreen />;
  // First book is the default selection.
  return <Navigate to={bookHomePath(books[0])} replace />;
}

/** Resolves the :bookId route param against the loaded books. */
function useRouteBook(): { book: Book | null; status: 'loading' | 'ready' | 'error' } {
  const { books, status } = useBooks();
  const { bookId } = useParams();
  const id = Number(bookId);
  return { book: books.find((b) => b.id === id) ?? null, status };
}

function StoreProductsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { book, status } = useRouteBook();

  if (status === 'loading') return <FullScreenLoader />;
  if (!book) return <Navigate to="/" replace />;
  if (book.type !== 'store') return <Navigate to={bookHomePath(book)} replace />;

  return (
    <>
      <Header
        leading={<BookSwitcher current={book} />}
        actions={
          <>
            <CustomersButton
              label={t.customerBalances}
              onClick={() => navigate(`/${book.id}/customers`)}
            />
            <UserMenu />
          </>
        }
      />
      <ProductsSection bookId={book.id} />
    </>
  );
}

function PersonalHomePage() {
  const { book, status } = useRouteBook();

  if (status === 'loading') return <FullScreenLoader />;
  if (!book) return <Navigate to="/" replace />;
  if (book.type !== 'personal') return <Navigate to={bookHomePath(book)} replace />;

  return <TransactionsPage book={book} />;
}

function PersonalCategoriesPage() {
  const { book, status } = useRouteBook();

  if (status === 'loading') return <FullScreenLoader />;
  if (!book) return <Navigate to="/" replace />;
  if (book.type !== 'personal') return <Navigate to={bookHomePath(book)} replace />;

  return <CategoriesPage book={book} />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<BooksGate />} />
      <Route path="/:bookId/products" element={<StoreProductsPage />} />
      <Route path="/:bookId/customers" element={<CustomersPage />} />
      <Route path="/:bookId/transactions" element={<PersonalHomePage />} />
      <Route path="/:bookId/categories" element={<PersonalCategoriesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

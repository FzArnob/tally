import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ProductsSection } from './features/products/ProductsSection';
import { CustomersPage } from './features/customers/CustomersPage';
import { useI18n } from './i18n/LanguageContext';
import { getBookDetails, BOOK_ID } from './lib/api';
import type { Book } from './types';

/** Loads the current book once; falls back to a sensible default on error. */
export function useBook(): Book {
  const [book, setBook] = useState<Book>({ id: BOOK_ID, name: '', logo_url: '' });
  useEffect(() => {
    getBookDetails()
      .then(setBook)
      .catch((err) => {
        console.error('Failed to load book details:', err);
        setBook({ id: BOOK_ID, name: "Samad's Store", logo_url: '' });
      });
  }, []);
  return book;
}

function HomePage() {
  const { t } = useI18n();
  const book = useBook();
  const navigate = useNavigate();

  return (
    <>
      <Header
        storeName={book.name || t.appName}
        logoUrl={book.logo_url}
        onOpenCustomers={() => navigate(`/${book.id}/customers`)}
      />
      <ProductsSection />
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:bookId/customers" element={<CustomersPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

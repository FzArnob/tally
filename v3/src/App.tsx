import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { ProductsSection } from './features/products/ProductsSection';
import { CustomersSection } from './features/customers/CustomersSection';
import { useI18n } from './i18n/LanguageContext';
import { getBookDetails, BOOK_ID } from './lib/api';
import type { Book } from './types';

export function App() {
  const { t } = useI18n();
  const [book, setBook] = useState<Book>({ id: BOOK_ID, name: '', logo_url: '' });
  const [customersOpen, setCustomersOpen] = useState(false);

  useEffect(() => {
    getBookDetails()
      .then(setBook)
      .catch((err) => {
        console.error('Failed to load book details:', err);
        setBook({ id: BOOK_ID, name: "Samad's Store", logo_url: '' });
      });
  }, []);

  return (
    <>
      <Header
        storeName={book.name || t.appName}
        logoUrl={book.logo_url}
        onOpenCustomers={() => setCustomersOpen(true)}
      />
      <ProductsSection />
      <CustomersSection open={customersOpen} onClose={() => setCustomersOpen(false)} />
    </>
  );
}

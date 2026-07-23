import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getBooks } from '../lib/api';
import type { Book } from '../types';

interface BooksContextValue {
  books: Book[];
  status: 'loading' | 'ready' | 'error';
  reload: () => Promise<Book[]>;
  getBook: (id: number) => Book | undefined;
}

const BooksContext = createContext<BooksContextValue | null>(null);

/** Loads the list of books once and shares it (for the switcher + routing). */
export function BooksProvider({ children }: { children: ReactNode }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const reload = useCallback(async () => {
    try {
      const data = await getBooks();
      setBooks(data.books);
      setStatus('ready');
      return data.books;
    } catch (err) {
      console.error('Failed to load books:', err);
      setStatus('error');
      return [];
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const getBook = useCallback((id: number) => books.find((b) => b.id === id), [books]);

  const value = useMemo<BooksContextValue>(
    () => ({ books, status, reload, getBook }),
    [books, status, reload, getBook],
  );

  return <BooksContext.Provider value={value}>{children}</BooksContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBooks(): BooksContextValue {
  const ctx = useContext(BooksContext);
  if (!ctx) throw new Error('useBooks must be used within a BooksProvider');
  return ctx;
}

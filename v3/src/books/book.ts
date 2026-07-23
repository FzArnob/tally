import type { Book, BookType } from '../types';

/** Route to a book's home page, chosen by its type. */
export function bookHomePath(book: Pick<Book, 'id' | 'type'>): string {
  return book.type === 'personal' ? `/${book.id}/transactions` : `/${book.id}/products`;
}

/** Material Symbols icon representing a book type. */
export function bookIcon(type: BookType): string {
  return type === 'personal' ? 'account_balance_wallet' : 'storefront';
}

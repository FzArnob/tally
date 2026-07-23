// Typed wrappers around the Tally v3 REST API (single-file PHP front controller
// at /tally/v3/backend/, routed by .htaccess).

import {
  ApiError,
  type AuthResponse,
  type MeResponse,
  type Book,
  type BookType,
  type BooksResponse,
  type SaveBookResponse,
  type CashflowType,
  type CategoriesResponse,
  type SaveCategoryResponse,
  type CreateBalanceResponse,
  type Customer,
  type CustomerHistoryResponse,
  type CustomersResponse,
  type DeleteBalanceResponse,
  type ProductTransactionsResponse,
  type ProductsResponse,
  type SaveCustomerResponse,
  type SaveProductResponse,
  type SaveTransactionResponse,
  type SavePersonalTxResponse,
  type TransactionsResponse,
  type BalanceType,
  type ProductType,
  type TransactionCost,
  type TransactionType,
} from '../types';

// Normalised to always end with a single trailing slash.
const API_BASE = (import.meta.env.VITE_API_BASE || '/tally/v3/backend/').replace(/\/?$/, '/');

export const BOOK_ID = 1; // Default book (Samad's Store)

// ---- Auth token wiring -----------------------------------------------------
// The session token (set by the auth layer after login) is attached to every
// request as a Bearer credential. A 401 anywhere means the session is gone, so
// we notify a registered handler (the AuthProvider) to sign the user out.
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // fall through to status-based error below
  }
  if (!response.ok) {
    const err = (data ?? {}) as { error?: string; code?: string };
    // Session expired/revoked — let the app drop back to the login screen.
    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError(
      err.error || `Request failed with status ${response.status}`,
      response.status,
      err.code,
    );
  }
  return data as T;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ---- Auth ----
/** Exchange a Google ID token (credential) for our own session token + user. */
export function googleLogin(idToken: string): Promise<AuthResponse> {
  return request<AuthResponse>('auth/google', jsonInit('POST', { id_token: idToken }));
}

/** Validate the stored token and fetch the current user. */
export function getMe(): Promise<MeResponse> {
  return request<MeResponse>('auth/me');
}

/** Revoke the current session server-side. */
export function logout(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('auth/logout', { method: 'POST' });
}

// ---- Books ----
export function getBooks(): Promise<BooksResponse> {
  return request<BooksResponse>('books');
}

export function createBook(params: { name: string; type: BookType }): Promise<SaveBookResponse> {
  const { name, type } = params;
  return request<SaveBookResponse>('books', jsonInit('POST', { name, type }));
}

export function updateBook(
  id: number,
  params: { name: string; type: BookType },
): Promise<SaveBookResponse> {
  const { name, type } = params;
  return request<SaveBookResponse>(`books/${id}`, jsonInit('PUT', { name, type }));
}

export function deleteBook(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`books/${id}`, { method: 'DELETE' });
}

export function getBookDetails(bookId = BOOK_ID): Promise<Book> {
  return request<Book>(`books/${bookId}`);
}

// ---- Customers ----
export function getCustomers(bookId = BOOK_ID): Promise<CustomersResponse> {
  return request<CustomersResponse>(`books/${bookId}/customers`);
}

export function createCustomer(params: {
  name: string;
  nickname?: string;
  phone?: string;
  address?: string;
  bookId?: number;
}): Promise<SaveCustomerResponse> {
  const { name, nickname = '', phone = '', address = '', bookId = BOOK_ID } = params;
  return request<SaveCustomerResponse>(
    `books/${bookId}/customers`,
    jsonInit('POST', { name, nickname, phone, address }),
  );
}

export function updateCustomer(
  id: string,
  params: { name: string; nickname?: string; phone?: string; address?: string },
): Promise<SaveCustomerResponse> {
  const { name, nickname = '', phone = '', address = '' } = params;
  return request<SaveCustomerResponse>(
    `customers/${id}`,
    jsonInit('PUT', { name, nickname, phone, address }),
  );
}

export function deleteCustomer(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`customers/${id}`, { method: 'DELETE' });
}

export function getCustomer(id: string): Promise<{ customer: Customer }> {
  return request<{ customer: Customer }>(`customers/${id}`);
}

export function getCustomerHistory(customerId: string): Promise<CustomerHistoryResponse> {
  return request<CustomerHistoryResponse>(`customers/${customerId}/history`);
}

export function createCustomerBalance(params: {
  customerId: string;
  type: BalanceType;
  amount: number;
  reason?: string | null;
  expression?: string | null;
}): Promise<CreateBalanceResponse> {
  const { customerId, type, amount, reason = null, expression = null } = params;
  return request<CreateBalanceResponse>(
    `customers/${customerId}/balance`,
    jsonInit('POST', { type, amount, reason, expression }),
  );
}

export function deleteCustomerBalanceHistory(historyId: string): Promise<DeleteBalanceResponse> {
  return request<DeleteBalanceResponse>(`balance-history/${historyId}`, { method: 'DELETE' });
}

// ---- Products ----
export function getProducts(bookId = BOOK_ID): Promise<ProductsResponse> {
  return request<ProductsResponse>(`books/${bookId}/products`);
}

export function getProductTransactions(productId: number): Promise<ProductTransactionsResponse> {
  return request<ProductTransactionsResponse>(`products/${productId}/transactions`);
}

export function saveProduct(params: {
  productId?: number | null;
  name: string;
  quantityType: string;
  productType?: ProductType;
  /** Cost-line labels for a manufacture product (ignored for ready-made). */
  costItems?: string[];
  imageUrl?: string | null;
  bookId?: number;
}): Promise<SaveProductResponse> {
  const {
    productId = null,
    name,
    quantityType,
    productType = 'ready_made',
    costItems = [],
    imageUrl = null,
    bookId = BOOK_ID,
  } = params;
  const body = {
    name,
    quantity_type: quantityType,
    product_type: productType,
    cost_items: costItems,
    image_url: imageUrl,
  };
  return productId
    ? request<SaveProductResponse>(`products/${productId}`, jsonInit('PUT', body))
    : request<SaveProductResponse>(`books/${bookId}/products`, jsonInit('POST', body));
}

export function deleteProduct(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`products/${id}`, { method: 'DELETE' });
}

export function saveProductTransaction(params: {
  productId: number;
  type: TransactionType;
  quantity: number;
  pricePerUnit: number;
  /** Per-line cost breakdown for a manufacture stock-in (price is derived from it server-side). */
  costs?: TransactionCost[];
  note?: string | null;
  /** When editing, the id of the transaction this one replaces (insert+delete atomically). */
  replaces?: number | null;
}): Promise<SaveTransactionResponse> {
  const { productId, type, quantity, pricePerUnit, costs = [], note = null, replaces = null } = params;
  return request<SaveTransactionResponse>(
    `products/${productId}/transactions`,
    jsonInit('POST', { type, quantity, price_per_unit: pricePerUnit, costs, note, replaces }),
  );
}

export function deleteProductTransaction(transactionId: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`product-transactions/${transactionId}`, {
    method: 'DELETE',
  });
}

// ---- Categories (personal books) ----
export function getCategories(bookId: number): Promise<CategoriesResponse> {
  return request<CategoriesResponse>(`books/${bookId}/categories`);
}

export function saveCategory(params: {
  categoryId?: number | null;
  bookId: number;
  name: string;
  details: string;
  type: CashflowType;
}): Promise<SaveCategoryResponse> {
  const { categoryId = null, bookId, name, details, type } = params;
  const body = { name, details, type };
  return categoryId
    ? request<SaveCategoryResponse>(`categories/${categoryId}`, jsonInit('PUT', body))
    : request<SaveCategoryResponse>(`books/${bookId}/categories`, jsonInit('POST', body));
}

export function deleteCategory(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`categories/${id}`, { method: 'DELETE' });
}

// ---- Personal transactions (personal books) ----
export function getTransactions(bookId: number): Promise<TransactionsResponse> {
  return request<TransactionsResponse>(`books/${bookId}/transactions`);
}

export function savePersonalTransaction(params: {
  transactionId?: number | null;
  bookId: number;
  type: CashflowType;
  categoryId: number;
  note: string;
  amount: number;
}): Promise<SavePersonalTxResponse> {
  const { transactionId = null, bookId, type, categoryId, note, amount } = params;
  const body = { type, category_id: categoryId, note, amount };
  return transactionId
    ? request<SavePersonalTxResponse>(`personal-transactions/${transactionId}`, jsonInit('PUT', body))
    : request<SavePersonalTxResponse>(`books/${bookId}/transactions`, jsonInit('POST', body));
}

export function deletePersonalTransaction(id: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`personal-transactions/${id}`, { method: 'DELETE' });
}

// Typed wrappers around the existing PHP endpoints.
// The API and database are unchanged — this only mirrors the v1 fetch calls.

import type {
  Book,
  CreateBalanceResponse,
  CustomerHistoryResponse,
  CustomersResponse,
  DeleteBalanceResponse,
  Product,
  ProductTransactionsResponse,
  ProductsResponse,
  SaveProductResponse,
  SaveTransactionResponse,
  BalanceType,
  TransactionType,
} from '../types';

// Normalised to always end with a single trailing slash.
const API_BASE = (import.meta.env.VITE_API_BASE || '/tally/api/').replace(/\/?$/, '/');

export const BOOK_ID = 1; // Default book (Samad's Store)

interface ApiError {
  error?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  const data = (await response.json()) as T & ApiError;
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(data.error);
  }
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return data;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ---- Book ----
export function getBookDetails(bookId = BOOK_ID): Promise<Book> {
  return request<Book>(`get-book-details.php?book_id=${bookId}`);
}

// ---- Customers ----
export function getCustomers(bookId = BOOK_ID): Promise<CustomersResponse> {
  return request<CustomersResponse>(`get-book-customers.php?book_id=${bookId}`);
}

export function getCustomerHistory(
  customerName: string,
  bookId = BOOK_ID,
): Promise<CustomerHistoryResponse> {
  const name = encodeURIComponent(customerName);
  return request<CustomerHistoryResponse>(
    `get-book-customer-balance-history.php?book_id=${bookId}&customer_name=${name}`,
  );
}

export function createCustomerBalance(params: {
  customerName: string;
  type: BalanceType;
  amount: number;
  reason?: string | null;
  expression?: string | null;
  bookId?: number;
}): Promise<CreateBalanceResponse> {
  const { customerName, type, amount, reason = null, expression = null, bookId = BOOK_ID } = params;
  return request<CreateBalanceResponse>(
    'customer-balance.php',
    jsonInit('POST', {
      book_id: bookId,
      customer_name: customerName,
      type,
      amount,
      reason,
      expression,
      timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }),
  );
}

export function deleteCustomerBalanceHistory(params: {
  historyId: string;
  customerName: string;
  bookId?: number;
}): Promise<DeleteBalanceResponse> {
  const { historyId, customerName, bookId = BOOK_ID } = params;
  return request<DeleteBalanceResponse>(
    'delete-customer-balance-history.php',
    jsonInit('DELETE', {
      history_id: historyId,
      book_id: bookId,
      customer_name: customerName,
    }),
  );
}

// ---- Products ----
export function getProductsWithStock(bookId = BOOK_ID): Promise<ProductsResponse> {
  return request<ProductsResponse>(`get-products-with-stock.php?book_id=${bookId}`);
}

export function getProduct(productId: number): Promise<Product> {
  return request<Product>(`get-product.php?product_id=${productId}`);
}

export function getProductTransactions(productId: number): Promise<ProductTransactionsResponse> {
  return request<ProductTransactionsResponse>(
    `get-product-transactions.php?product_id=${productId}`,
  );
}

export function saveProduct(params: {
  productId?: number | null;
  name: string;
  quantityType: string;
  imageUrl?: string | null;
  bookId?: number;
}): Promise<SaveProductResponse> {
  const { productId = null, name, quantityType, imageUrl = null, bookId = BOOK_ID } = params;
  return request<SaveProductResponse>(
    'save-product.php',
    jsonInit('POST', {
      book_id: bookId,
      product_id: productId,
      name,
      quantity_type: quantityType,
      image_url: imageUrl,
    }),
  );
}

export function saveProductTransaction(params: {
  productId: number;
  type: TransactionType;
  quantity: number;
  pricePerUnit: number;
}): Promise<SaveTransactionResponse> {
  const { productId, type, quantity, pricePerUnit } = params;
  return request<SaveTransactionResponse>(
    'save-product-transaction.php',
    jsonInit('POST', {
      product_id: productId,
      type,
      quantity,
      price_per_unit: pricePerUnit,
    }),
  );
}

export function deleteProductTransaction(params: {
  transactionId: number;
  productId: number;
}): Promise<{ success: boolean }> {
  const { transactionId, productId } = params;
  return request<{ success: boolean }>(
    'delete-product-transaction.php',
    jsonInit('DELETE', {
      transaction_id: transactionId,
      product_id: productId,
    }),
  );
}

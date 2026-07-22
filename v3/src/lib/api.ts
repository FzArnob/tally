// Typed wrappers around the Tally v3 REST API (single-file PHP front controller
// at /tally/v3/backend/, routed by .htaccess).

import {
  ApiError,
  type Book,
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
  type BalanceType,
  type TransactionType,
} from '../types';

// Normalised to always end with a single trailing slash.
const API_BASE = (import.meta.env.VITE_API_BASE || '/tally/v3/backend/').replace(/\/?$/, '/');

export const BOOK_ID = 1; // Default book (Samad's Store)

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // fall through to status-based error below
  }
  if (!response.ok) {
    const err = (data ?? {}) as { error?: string; code?: string };
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

// ---- Book ----
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
  imageUrl?: string | null;
  bookId?: number;
}): Promise<SaveProductResponse> {
  const { productId = null, name, quantityType, imageUrl = null, bookId = BOOK_ID } = params;
  const body = { name, quantity_type: quantityType, image_url: imageUrl };
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
  note?: string | null;
}): Promise<SaveTransactionResponse> {
  const { productId, type, quantity, pricePerUnit, note = null } = params;
  return request<SaveTransactionResponse>(
    `products/${productId}/transactions`,
    jsonInit('POST', { type, quantity, price_per_unit: pricePerUnit, note }),
  );
}

export function deleteProductTransaction(transactionId: number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`product-transactions/${transactionId}`, {
    method: 'DELETE',
  });
}

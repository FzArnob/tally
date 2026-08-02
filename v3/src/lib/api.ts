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
  type CreditLimits,
  type Customer,
  type CustomerHistoryResponse,
  type CustomerItemDraft,
  type CustomerItemsResponse,
  type CustomersResponse,
  type SaveCustomerItemsResponse,
  type DeleteBalanceResponse,
  type ProductTransactionsResponse,
  type ProductMaterialsResponse,
  type ProductsResponse,
  type MaterialsResponse,
  type MaterialTransactionsResponse,
  type SaveMaterialResponse,
  type SaveMaterialTransactionResponse,
  type MaterialTransactionType,
  type OperationCostsResponse,
  type SaveOperationCostResponse,
  type OperationCostHistoryResponse,
  type SaveCustomerResponse,
  type SaveProductResponse,
  type SaveTransactionResponse,
  type SavePersonalTxResponse,
  type TransactionsResponse,
  type BalanceType,
  type ProductType,
  type TransactionType,
} from '../types';

// Normalised to always end with a single trailing slash.
const API_BASE = (import.meta.env.VITE_API_BASE || '/tally/v3/backend/').replace(/\/?$/, '/');

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
  id: string,
  params: { name: string; type: BookType },
): Promise<SaveBookResponse> {
  const { name, type } = params;
  return request<SaveBookResponse>(`books/${id}`, jsonInit('PUT', { name, type }));
}

export function deleteBook(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`books/${id}`, { method: 'DELETE' });
}

export function getBookDetails(bookId: string): Promise<Book> {
  return request<Book>(`books/${bookId}`);
}

/**
 * The book's credit limits, saved from the customer balances page. Null on
 * either half clears that half, so both are always sent — an omitted key would
 * be indistinguishable from "no limit", and both are meaningful here.
 */
export function saveCreditLimits(
  bookId: string,
  limits: CreditLimits,
): Promise<SaveBookResponse> {
  return request<SaveBookResponse>(
    `books/${bookId}/credit-limits`,
    jsonInit('PUT', {
      credit_limit: limits.credit_limit,
      credit_days: limits.credit_days,
    }),
  );
}

// ---- Customers ----
export function getCustomers(bookId: string): Promise<CustomersResponse> {
  return request<CustomersResponse>(`books/${bookId}/customers`);
}

export function createCustomer(params: {
  name: string;
  nickname?: string;
  phone?: string;
  address?: string;
  bookId: string;
}): Promise<SaveCustomerResponse> {
  const { name, nickname = '', phone = '', address = '', bookId } = params;
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

/** Book plain cash: borrowed ('unpaid') or handed back ('paid'). */
export function createCustomerBalance(params: {
  customerId: string;
  type: BalanceType;
  amount: number;
  reason?: string | null;
}): Promise<CreateBalanceResponse> {
  const { customerId, type, amount, reason = null } = params;
  return request<CreateBalanceResponse>(
    `customers/${customerId}/balance`,
    jsonInit('POST', { type, amount, reason }),
  );
}

/** Edit a cash entry in place (keeps its slot in the history). */
export function updateCustomerBalance(params: {
  historyId: string;
  type: BalanceType;
  amount: number;
  reason?: string | null;
}): Promise<CreateBalanceResponse> {
  const { historyId, type, amount, reason = null } = params;
  return request<CreateBalanceResponse>(
    `balance-history/${historyId}`,
    jsonInit('PUT', { type, amount, reason }),
  );
}

/**
 * Correct a goods TAKING: it is the money half of a sale, so it is edited as
 * goods, and the server rewrites the sale (and the stock) to match.
 */
export function updateCustomerItemEntry(params: {
  historyId: string;
  quantity: number;
  pricePerUnit?: number;
}): Promise<CreateBalanceResponse> {
  const { historyId, quantity, pricePerUnit } = params;
  return request<CreateBalanceResponse>(
    `balance-history/${historyId}`,
    jsonInit('PUT', {
      quantity,
      ...(pricePerUnit === undefined ? {} : { price_per_unit: pricePerUnit }),
    }),
  );
}

/**
 * Correct a payment made against an item. Payments are money — the units they
 * cleared are re-derived from the amount, and only recorded when whole.
 */
export function updateCustomerItemPayment(params: {
  historyId: string;
  amount: number;
}): Promise<CreateBalanceResponse> {
  const { historyId, amount } = params;
  return request<CreateBalanceResponse>(
    `balance-history/${historyId}`,
    jsonInit('PUT', { amount }),
  );
}

export function deleteCustomerBalanceHistory(historyId: string): Promise<DeleteBalanceResponse> {
  return request<DeleteBalanceResponse>(`balance-history/${historyId}`, { method: 'DELETE' });
}

// ---- Customer items (goods taken on the tab, not yet paid for) ----
export function getCustomerItems(customerId: string): Promise<CustomerItemsResponse> {
  return request<CustomerItemsResponse>(`customers/${customerId}/items`);
}

/**
 * Hand a basket of goods to a customer. Each line records the sale (stock drops)
 * and books the debt, all in one server-side transaction.
 */
export function addCustomerItems(
  customerId: string,
  items: CustomerItemDraft[],
): Promise<SaveCustomerItemsResponse> {
  return request<SaveCustomerItemsResponse>(
    `customers/${customerId}/items`,
    jsonInit('POST', { items }),
  );
}

/**
 * Pay for `units` WHOLE units of an outstanding item; omit it to clear whatever
 * the line still owes. The last unit of a part-covered line costs only the
 * remainder, so the server works the money out — never the client.
 */
export function settleCustomerItem(
  itemId: string,
  units?: number,
): Promise<SaveCustomerItemsResponse> {
  return request<SaveCustomerItemsResponse>(
    `customer-items/${itemId}/settle`,
    jsonInit('POST', units === undefined ? {} : { units }),
  );
}

// ---- Products ----
export function getProducts(bookId: string): Promise<ProductsResponse> {
  return request<ProductsResponse>(`books/${bookId}/products`);
}

export function getProductTransactions(productId: string): Promise<ProductTransactionsResponse> {
  return request<ProductTransactionsResponse>(`products/${productId}/transactions`);
}

/** A manufacture product's linked materials with stock details (fetched on demand). */
export function getProductMaterials(productId: string): Promise<ProductMaterialsResponse> {
  return request<ProductMaterialsResponse>(`products/${productId}/materials`);
}

export function saveProduct(params: {
  productId?: string | null;
  name: string;
  quantityType: string;
  productType?: ProductType;
  /** Linked material ids for a manufacture product (ignored for ready-made). */
  materialIds?: string[];
  imageUrl?: string | null;
  bookId?: string;
}): Promise<SaveProductResponse> {
  const {
    productId = null,
    name,
    quantityType,
    productType = 'ready_made',
    materialIds = [],
    imageUrl = null,
    bookId,
  } = params;
  const body = {
    name,
    quantity_type: quantityType,
    product_type: productType,
    material_ids: materialIds,
    image_url: imageUrl,
  };
  return productId
    ? request<SaveProductResponse>(`products/${productId}`, jsonInit('PUT', body))
    : request<SaveProductResponse>(`books/${bookId}/products`, jsonInit('POST', body));
}

export function deleteProduct(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`products/${id}`, { method: 'DELETE' });
}

/**
 * Create a transaction, or edit one in place when `transactionId` is given.
 * An edit is a PUT on the entry itself, so its id, seq and timestamp survive —
 * the entry keeps its position in history and in the running-stock chain.
 */
export function saveProductTransaction(params: {
  productId: string;
  type: TransactionType;
  quantity: number;
  pricePerUnit: number;
  note?: string | null;
  /** Set to edit that entry instead of adding one. */
  transactionId?: string | null;
}): Promise<SaveTransactionResponse> {
  const { productId, type, quantity, pricePerUnit, note = null, transactionId = null } = params;
  const body = { type, quantity, price_per_unit: pricePerUnit, note };
  return transactionId
    ? request<SaveTransactionResponse>(`product-transactions/${transactionId}`, jsonInit('PUT', body))
    : request<SaveTransactionResponse>(`products/${productId}/transactions`, jsonInit('POST', body));
}

export function deleteProductTransaction(transactionId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`product-transactions/${transactionId}`, {
    method: 'DELETE',
  });
}

// ---- Materials (store books) ----
export function getMaterials(bookId: string): Promise<MaterialsResponse> {
  return request<MaterialsResponse>(`books/${bookId}/materials`);
}

export function saveMaterial(params: {
  materialId?: string | null;
  name: string;
  quantityType: string;
  imageUrl?: string | null;
  bookId: string;
}): Promise<SaveMaterialResponse> {
  const { materialId = null, name, quantityType, imageUrl = null, bookId } = params;
  const body = { name, quantity_type: quantityType, image_url: imageUrl };
  return materialId
    ? request<SaveMaterialResponse>(`materials/${materialId}`, jsonInit('PUT', body))
    : request<SaveMaterialResponse>(`books/${bookId}/materials`, jsonInit('POST', body));
}

export function deleteMaterial(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`materials/${id}`, { method: 'DELETE' });
}

export function getMaterialTransactions(materialId: string): Promise<MaterialTransactionsResponse> {
  return request<MaterialTransactionsResponse>(`materials/${materialId}/transactions`);
}

/** Create a material transaction, or edit one in place — see saveProductTransaction(). */
export function saveMaterialTransaction(params: {
  materialId: string;
  type: MaterialTransactionType;
  quantity: number;
  /** Total price for a stock-in / sale (per-unit cost is derived server-side). Ignored for 'used'. */
  totalAmount?: number;
  note?: string | null;
  /** Set to edit that entry instead of adding one. */
  transactionId?: string | null;
}): Promise<SaveMaterialTransactionResponse> {
  const { materialId, type, quantity, totalAmount = 0, note = null, transactionId = null } = params;
  const body = { type, quantity, total_amount: totalAmount, note };
  return transactionId
    ? request<SaveMaterialTransactionResponse>(`material-transactions/${transactionId}`, jsonInit('PUT', body))
    : request<SaveMaterialTransactionResponse>(`materials/${materialId}/transactions`, jsonInit('POST', body));
}

export function deleteMaterialTransaction(transactionId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`material-transactions/${transactionId}`, {
    method: 'DELETE',
  });
}

// ---- Operation costs (store books) ----
export function getOperationCosts(bookId: string): Promise<OperationCostsResponse> {
  return request<OperationCostsResponse>(`books/${bookId}/operation-costs`);
}

export function saveOperationCost(params: {
  operationCostId?: string | null;
  bookId: string;
  reason: string;
  note: string;
}): Promise<SaveOperationCostResponse> {
  const { operationCostId = null, bookId, reason, note } = params;
  const body = { reason, note };
  return operationCostId
    ? request<SaveOperationCostResponse>(`operation-costs/${operationCostId}`, jsonInit('PUT', body))
    : request<SaveOperationCostResponse>(`books/${bookId}/operation-costs`, jsonInit('POST', body));
}

export function deleteOperationCost(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`operation-costs/${id}`, { method: 'DELETE' });
}

export function getOperationCostHistory(id: string): Promise<OperationCostHistoryResponse> {
  return request<OperationCostHistoryResponse>(`operation-costs/${id}/history`);
}

/** Add one dated amount entry (a cost incurred over time) to an operation cost. */
export function addOperationCostEntry(
  operationCostId: string,
  params: { amount: number; note: string },
): Promise<SaveOperationCostResponse> {
  const { amount, note } = params;
  return request<SaveOperationCostResponse>(
    `operation-costs/${operationCostId}/entries`,
    jsonInit('POST', { amount, note }),
  );
}

/** Edit an existing amount entry in place (keeps its slot in the history). */
export function updateOperationCostEntry(
  entryId: string,
  params: { amount: number; note: string },
): Promise<SaveOperationCostResponse> {
  const { amount, note } = params;
  return request<SaveOperationCostResponse>(
    `operation-cost-entries/${entryId}`,
    jsonInit('PUT', { amount, note }),
  );
}

export function deleteOperationCostEntry(entryId: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`operation-cost-entries/${entryId}`, { method: 'DELETE' });
}

// ---- Categories (personal books) ----
export function getCategories(bookId: string): Promise<CategoriesResponse> {
  return request<CategoriesResponse>(`books/${bookId}/categories`);
}

export function saveCategory(params: {
  categoryId?: string | null;
  bookId: string;
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

export function deleteCategory(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`categories/${id}`, { method: 'DELETE' });
}

// ---- Personal transactions (personal books) ----
export function getTransactions(bookId: string): Promise<TransactionsResponse> {
  return request<TransactionsResponse>(`books/${bookId}/transactions`);
}

export function savePersonalTransaction(params: {
  transactionId?: string | null;
  bookId: string;
  type: CashflowType;
  categoryId: string;
  note: string;
  amount: number;
}): Promise<SavePersonalTxResponse> {
  const { transactionId = null, bookId, type, categoryId, note, amount } = params;
  const body = { type, category_id: categoryId, note, amount };
  return transactionId
    ? request<SavePersonalTxResponse>(`personal-transactions/${transactionId}`, jsonInit('PUT', body))
    : request<SavePersonalTxResponse>(`books/${bookId}/transactions`, jsonInit('POST', body));
}

export function deletePersonalTransaction(id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`personal-transactions/${id}`, { method: 'DELETE' });
}

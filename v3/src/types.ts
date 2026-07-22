// Shared domain types mirroring the Tally v3 PHP API responses.

export interface Book {
  id: number;
  name: string;
  logo_url: string;
}

export interface Customer {
  id: string; // UUID
  book_id: number;
  name: string;
  nickname: string;
  phone: string;
  address: string;
  total_balance: number; // + advance paid, - owed
  transaction_count: number;
  last_transaction_time: string | null;
}

export interface CustomerTotals {
  total_paid: number;
  total_unpaid: number;
}

export interface CustomersResponse {
  customers: Customer[];
  totals: CustomerTotals;
}

export type BalanceType = 'paid' | 'unpaid';

export interface BalanceHistoryEntry {
  id: string;
  customer_id: string;
  amount: number; // always positive
  type: BalanceType;
  signed_amount: number;
  balance_after: number;
  reason: string | null;
  expression: string | null;
  timestamp: string;
}

export interface CustomerHistoryResponse {
  customer_id: string;
  history: BalanceHistoryEntry[];
}

export interface SaveCustomerResponse {
  success: boolean;
  customer: Customer;
}

export interface CreateBalanceResponse {
  success: boolean;
  history_id: string;
  customer_id: string;
  new_balance: number;
}

export interface DeleteBalanceResponse {
  success: boolean;
  new_balance: number;
}

export type TransactionType = 'stock' | 'sale';

export interface ProductTransaction {
  id: number;
  product_id: number;
  type: TransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  stock_after: number;
  note: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  book_id: number;
  name: string;
  quantity_type: string;
  image_url: string | null;
  current_stock: number;
  total_stock_in: number;
  total_stock_out: number;
  last_purchase_price: number | null;
  last_sale_price: number | null;
  transaction_count: number;
  last_transaction_time: string | null;
}

export interface ProductsResponse {
  products: Product[];
}

export interface ProductTransactionsResponse {
  product_id: number;
  transactions: ProductTransaction[];
}

export interface SaveProductResponse {
  success: boolean;
  product: Product;
}

export interface SaveTransactionResponse {
  success: boolean;
  transaction: ProductTransaction;
  product: Product;
}

/** Thrown by the API layer; carries the server's machine-readable `code`. */
export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

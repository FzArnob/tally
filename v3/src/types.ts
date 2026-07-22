// Shared domain types mirroring the PHP API responses.

export interface Book {
  id: number;
  name: string;
  logo_url: string;
}

export interface Customer {
  name: string;
  total_balance: number;
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
  amount: number;
  type: BalanceType;
  reason: string | null;
  expression: string | null;
  timestamp: string;
}

export interface CustomerHistoryResponse {
  customer_name: string;
  history: BalanceHistoryEntry[];
}

export interface CreateBalanceResponse {
  success: boolean;
  history_id: string;
  customer_name: string;
  new_balance: number;
}

export interface DeleteBalanceResponse {
  success: boolean;
  new_customer_balance: number;
}

export type TransactionType = 'stock' | 'sale';

export interface ProductTransaction {
  id: number;
  type: TransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  quantity_type: string;
  image_url: string | null;
  total_stock_in: number;
  total_stock_out: number;
  current_stock: number;
  transactions?: ProductTransaction[];
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
  transaction: ProductTransaction & { product_id: number };
}

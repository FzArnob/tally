// Shared domain types mirroring the Tally v3 PHP API responses.

// ---- Auth ----
export interface User {
  id: string; // UUID
  email: string;
  name: string;
  picture: string | null;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export type BookType = 'store' | 'personal';

export interface Book {
  id: number;
  name: string;
  type: BookType;
}

export interface BooksResponse {
  books: Book[];
}

export interface SaveBookResponse {
  success: boolean;
  book: Book;
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

// ---- Personal books: categories + transactions ----
export type CashflowType = 'income' | 'expense';

export interface Category {
  id: number;
  book_id: number;
  name: string;
  details: string;
  type: CashflowType;
  transaction_count: number;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface SaveCategoryResponse {
  success: boolean;
  category: Category;
}

export interface PersonalTransaction {
  id: number;
  book_id: number;
  category_id: number | null;
  category_name: string;
  type: CashflowType;
  note: string;
  amount: number;
  signed_amount: number;
  timestamp: string;
}

export interface TransactionTotals {
  income: number;
  expense: number;
  balance: number;
}

export interface TransactionsResponse {
  transactions: PersonalTransaction[];
  totals: TransactionTotals;
}

export interface SavePersonalTxResponse {
  success: boolean;
  transaction: PersonalTransaction;
}

export type TransactionType = 'stock' | 'sale';

/** One line of a manufacture stock-in's cost breakdown (snapshot at entry time). */
export interface TransactionCost {
  name: string;
  amount: number;
}

export interface ProductTransaction {
  id: number;
  product_id: number;
  type: TransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  stock_after: number;
  note: string | null;
  /** Present (non-empty) only for a manufacture stock-in. */
  costs: TransactionCost[];
  created_at: string;
}

export type ProductType = 'ready_made' | 'manufacture';

/** A reusable cost-line label in a manufacture product's template. */
export interface CostItem {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  book_id: number;
  name: string;
  quantity_type: string;
  product_type: ProductType;
  /** The cost-line template; empty for ready-made products. */
  cost_items: CostItem[];
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

// ---- Materials (store books) — raw stock, not linked to products ----
export interface Material {
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

export interface MaterialsResponse {
  materials: Material[];
}

/** Material moves: stock-in / sale (priced) or used (consumption, no price). */
export type MaterialTransactionType = 'stock' | 'sale' | 'used';

export interface MaterialTransaction {
  id: number;
  material_id: number;
  type: MaterialTransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  stock_after: number;
  note: string | null;
  created_at: string;
}

export interface MaterialTransactionsResponse {
  material_id: number;
  transactions: MaterialTransaction[];
}

export interface SaveMaterialResponse {
  success: boolean;
  material: Material;
}

export interface SaveMaterialTransactionResponse {
  success: boolean;
  material: Material;
}

// ---- Operation costs (store books) — named recurring cost with amount history ----
export interface OperationCost {
  id: number;
  book_id: number;
  reason: string;
  note: string;
  amount: number; // current (latest) amount
  entry_count: number;
  last_entry_time: string | null;
}

export interface OperationCostsResponse {
  operation_costs: OperationCost[];
  total: number;
}

export interface SaveOperationCostResponse {
  success: boolean;
  operation_cost: OperationCost;
}

/** One immutable amount snapshot recorded on an operation cost add/edit. */
export interface OperationCostEntry {
  id: string;
  operation_cost_id: number;
  amount: number;
  note: string | null;
  timestamp: string;
}

export interface OperationCostHistoryResponse {
  operation_cost_id: number;
  history: OperationCostEntry[];
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

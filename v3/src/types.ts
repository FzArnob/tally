// Shared domain types mirroring the Tally v3 PHP API responses.

// ---- Auth ----
export interface User {
  id: string; // UUID
  email: string;
  name: string;
  picture: string | null;
  // Display preferences, stored on the account so they follow the user between
  // devices. Kept as plain strings here to avoid types.ts depending on the
  // theme/i18n modules; both contexts narrow them on adoption.
  theme: 'system' | 'light' | 'dark';
  language: 'en' | 'bn';
}

/** Partial update of the signed-in user's preferences. */
export interface UserSettings {
  theme?: User['theme'];
  language?: User['language'];
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

/**
 * How far a book lets a customer run before it complains: the most they may owe,
 * and how long a debt may stand. Book-wide, because a shop keeps one rule rather
 * than one per name. Null on either half means that half is not policed.
 *
 * Neither is enforced. Going past one raises a warning the user can overrule — a
 * shopkeeper who has decided to let a regular go further should not be stopped
 * by their own reminder.
 */
export interface CreditLimits {
  credit_limit: number | null;
  credit_days: number | null;
}

export interface Book extends CreditLimits {
  id: string;
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
  book_id: string;
  name: string;
  nickname: string;
  phone: string;
  address: string;
  total_balance: number; // + advance paid, - owed
  /** Cash still outstanding: + paid ahead, - still borrowed. */
  cash_balance: number;
  /** Goods taken and not paid for. Never negative. */
  items_due: number;
  /** Lifetime: every debt ever run up, whatever has since been paid. */
  total_unpaid: number;
  /** Lifetime: every payment ever made, cash and goods together. */
  total_paid_back: number;
  transaction_count: number;
  last_transaction_time: string | null;
  /**
   * When the debt standing right now was first run up — the entry that last took
   * the balance negative and never came back. Null whenever they owe nothing.
   * Clearing a debt and running up a new one restarts it, so this is the age of
   * what is owed today, not of the account.
   */
  debt_since: string | null;
}

/**
 * The tab sheet's figures, restated after any write that moves a balance.
 * `cash_balance - items_due === total_balance`; the two lifetime totals stand
 * apart from that sum.
 */
export interface CustomerStats {
  total_balance: number;
  cash_balance: number;
  items_due: number;
  total_unpaid: number;
  total_paid_back: number;
}

export interface CustomerTotals {
  total_paid: number;
  total_unpaid: number;
}

export interface CustomersResponse {
  customers: Customer[];
  totals: CustomerTotals;
  /** The book's rule, sent with the list so it can flag who is past it. */
  limits: CreditLimits;
}

export type BalanceType = 'paid' | 'unpaid';

/**
 * What an entry is, and therefore how it is edited: `cash` is a plain amount
 * (borrowed or handed back), `item` is one half of a goods movement — a taking
 * (unpaid) or a payment for one (paid) — edited by quantity.
 */
export type BalanceSource = 'cash' | 'item';

export interface BalanceHistoryEntry {
  id: string;
  customer_id: string;
  amount: number; // always positive
  type: BalanceType;
  source: BalanceSource;
  signed_amount: number;
  balance_after: number;
  reason: string | null;
  /** Item entries only — null throughout on a cash entry. */
  customer_item_id: string | null;
  item_name: string | null;
  quantity_type: string | null;
  quantity: number | null;
  price_per_unit: number | null;
  /**
   * Goods takings only: how much of this one the customer has covered. Null on
   * cash entries and on payments, which are not something to be paid for.
   */
  paid_amount: number | null;
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
  totals: CustomerStats;
}

export interface DeleteBalanceResponse {
  success: boolean;
  new_balance: number;
  totals: CustomerStats;
}

/** Something a customer took on their tab. `quantity` is the units TAKEN. */
export type CustomerItemType = 'product' | 'material';

export interface CustomerItem {
  id: string;
  customer_id: string;
  item_type: CustomerItemType;
  product_id: string | null; // null once the source product is deleted
  material_id: string | null;
  item_name: string; // snapshot, survives the source being deleted
  quantity_type: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  /**
   * How much of `total_amount` is covered — by this line's own Paid button or
   * by cash that flowed down to it. A line is on the sheet while it is short.
   */
  paid_amount: number;
  remaining: number;
  /** When the goods were taken. */
  timestamp: string;
}

export interface CustomerItemsResponse {
  customer_id: string;
  items: CustomerItem[];
  total: number;
}

/** Returned by both the take and settle endpoints — the full list plus the balance. */
export interface SaveCustomerItemsResponse {
  success: boolean;
  items: CustomerItem[];
  new_balance: number;
  totals: CustomerStats;
}

/** One line of a basket being handed to the customer. */
export interface CustomerItemDraft {
  item_type: CustomerItemType;
  item_id: string;
  quantity: number;
  price_per_unit: number;
}

// ---- Personal books: categories + transactions ----
export type CashflowType = 'income' | 'expense';

export interface Category {
  id: string;
  book_id: string;
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
  id: string;
  book_id: string;
  category_id: string | null;
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

export interface ProductTransaction {
  id: string;
  product_id: string;
  type: TransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  /** Running stock; null for manufacture sale rows (stock unknown). */
  stock_after: number | null;
  /** Set when the sale went onto a customer's tab rather than over the counter. */
  customer_id: string | null;
  customer_name: string | null;
  /** Went onto a tab at all — stays true once the customer has paid. */
  on_tab: boolean;
  /**
   * How much of this sale the customer has covered. A tab sale fills up as the
   * line it sits on is paid, so it can be part covered; a counter sale is its
   * own full amount.
   */
  paid_amount: number;
  /** True while any of that tab sale is still owed. */
  unpaid: boolean;
  note: string | null;
  /** When the goods moved. Survives an edit — history order depends on it. */
  timestamp: string;
  /** Audit stamp: when the row was last changed. */
  updated_at: string;
}

export type ProductType = 'ready_made' | 'manufacture';

/** A material a manufacture product is linked to, with denormalised stock info. */
export interface ProductMaterial {
  id: string;
  name: string;
  quantity_type: string;
  current_stock: number;
  last_purchase_price: number | null;
  stock_value: number;
}

export interface Product {
  id: string;
  book_id: string;
  name: string;
  quantity_type: string;
  product_type: ProductType;
  /**
   * Linked raw materials. The products LIST omits these (empty) to stay lean —
   * fetch them on demand with getProductMaterials(). Populated on the single
   * product/save responses.
   */
  materials: ProductMaterial[];
  image_url: string | null;
  /** null for manufacture products (reserved for future analytics). */
  current_stock: number | null;
  total_stock_in: number | null;
  total_stock_out: number;
  last_purchase_price: number | null;
  last_sale_price: number | null;
  /**
   * What the stock in hand cost, valued FIFO on write (see schema.sql). Null for
   * manufacture products, which hold no stock of their own.
   */
  stock_value: number | null;
  transaction_count: number;
  last_transaction_time: string | null;
}

export interface ProductsResponse {
  products: Product[];
}

export interface ProductMaterialsResponse {
  product_id: string;
  materials: ProductMaterial[];
  /** The linked materials' stock values added up, summed by the API. */
  total_stock_value: number;
}

export interface ProductTransactionsResponse {
  product_id: string;
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
  id: string;
  book_id: string;
  name: string;
  quantity_type: string;
  image_url: string | null;
  current_stock: number;
  total_stock_in: number;
  total_stock_out: number;
  last_purchase_price: number | null;
  last_sale_price: number | null;
  /** What the stock in hand cost, valued FIFO on write (see schema.sql). */
  stock_value: number;
  transaction_count: number;
  last_transaction_time: string | null;
}

export interface MaterialsResponse {
  materials: Material[];
}

/** Material moves: stock-in / sale (priced) or used (consumption, no price). */
export type MaterialTransactionType = 'stock' | 'sale' | 'used';

export interface MaterialTransaction {
  id: string;
  material_id: string;
  type: MaterialTransactionType;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  stock_after: number;
  /** Set when the sale went onto a customer's tab rather than over the counter. */
  customer_id: string | null;
  customer_name: string | null;
  /** Went onto a tab at all — stays true once the customer has paid. */
  on_tab: boolean;
  /**
   * How much of this sale the customer has covered. A tab sale fills up as the
   * line it sits on is paid, so it can be part covered; a counter sale is its
   * own full amount.
   */
  paid_amount: number;
  /** True while any of that tab sale is still owed. */
  unpaid: boolean;
  note: string | null;
  /** When the goods moved. Survives an edit — history order depends on it. */
  timestamp: string;
  /** Audit stamp: when the row was last changed. */
  updated_at: string;
}

export interface MaterialTransactionsResponse {
  material_id: string;
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
  id: string;
  book_id: string;
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
  operation_cost_id: string;
  amount: number;
  note: string | null;
  timestamp: string;
}

export interface OperationCostHistoryResponse {
  operation_cost_id: string;
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

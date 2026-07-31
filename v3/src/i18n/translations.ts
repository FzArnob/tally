// Localization dictionary — extends config/localization.js with every string
// that appears in the UI (many were hard-coded in v1 and are now translatable).

export type LangCode = 'en' | 'bn';

export interface Translation {
  // Meta
  pageTitle: string;
  appName: string;
  numberFormat: string;
  timeFormat: string;

  // Header / language
  customerBalances: string;
  language: string;
  english: string;
  bangla: string;

  // Auth
  signInSubtitle: string;
  signInFailed: string;
  googleNotConfigured: string;
  account: string;
  signOut: string;

  // Theme
  theme: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;

  // Books
  switchBook: string;
  addBook: string;
  editBook: string;
  deleteBook: string;
  deleteBookConfirm: string;
  failedDeleteBook: string;
  createBook: string;
  bookName: string;
  bookNamePlaceholder: string;
  bookType: string;
  typeStore: string;
  typeStoreHint: string;
  typePersonal: string;
  typePersonalHint: string;
  enterBookName: string;
  failedLoadBooks: string;
  failedSaveBook: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  getStarted: string;
  transactionsTitle: string;
  comingSoon: string;
  comingSoonHint: string;

  // Personal — transactions
  income: string;
  expense: string;
  netBalance: string;
  typeLabel: string;
  amountLabel: string;
  noteLabel: string;
  categoryLabel: string;
  selectCategory: string;
  addTransaction: string;
  editTransaction: string;
  deleteTransaction: string;
  deleteTransactionConfirm: string;
  searchTransactions: string;
  noTransactions: string;
  addFirstTransaction: string;
  failedLoadTransactions: string;
  enterValidAmount: string;
  noCategoriesHint: string;
  manageCategories: string;

  // Personal — categories
  categories: string;
  categoriesTitle: string;
  addCategory: string;
  editCategory: string;
  deleteCategory: string;
  deleteCategoryConfirm: string;
  categoryName: string;
  categoryNamePlaceholder: string;
  categoryDetails: string;
  categoryDetailsPlaceholder: string;
  duplicateCategory: string;
  enterCategoryName: string;
  noCategories: string;
  failedLoadCategories: string;
  failedSaveCategory: string;
  failedDeleteCategory: string;

  // Products grid
  noProducts: string;
  addFirstProduct: string;
  failedLoadProducts: string;
  searchProducts: string;
  stock: string;

  // Product form modal
  addProduct: string;
  editProduct: string;
  productImage: string;
  adjustPhoto: string;
  zoom: string;
  usePhoto: string;
  productName: string;
  productNamePlaceholder: string;
  quantityType: string;
  unitPiece: string;
  unitPacket: string;
  unitCartoon: string;
  unitKg: string;
  unitLiter: string;
  unitCustom: string;
  customUnitPlaceholder: string;
  save: string;
  saveChanges: string;
  enterProductName: string;
  enterQuantityType: string;
  failedSaveProduct: string;
  deleteProduct: string;
  deleteProductConfirm: string;
  failedDeleteProduct: string;
  duplicateProduct: string;

  // Product type (ready-made / manufacture) + linked materials
  productType: string;
  typeReadyMade: string;
  typeManufacture: string;
  typeReadyMadeHint: string;
  typeManufactureHint: string;
  rawMaterials: string;
  materialSearchPlaceholder: string;
  addedMaterials: string;
  availableMaterials: string;
  noMaterialsToLink: string;
  unlinkMaterial: string;
  enterAtLeastOneMaterial: string;
  viewMaterials: string;
  viewStock: string;
  relatedMaterials: string;
  noLinkedMaterials: string;

  // Action (stock/sale) modal
  stockIn: string;
  sale: string;
  unpaidPill: string;
  partPaid: string;
  manufactured: string;
  saleCash: string;
  saleDue: string;
  quantity: string;
  buyingPrice: string;
  sellingPrice: string;
  total: string;
  update: string;
  enterValidQuantity: string;
  enterValidPrice: string;
  notEnoughStock: string;
  failedSaveTransaction: string;
  failedLoadProduct: string;

  // History modal (products)
  history: string;
  noEntries: string;
  failedLoadHistory: string;
  edit: string;
  deleteAction: string;

  // Delete confirmation
  deleteEntry: string;
  deleteEntryConfirm: string;
  cancel: string;
  failedDeleteTransaction: string;

  // Customer balances
  customerBalancesTitle: string;
  searchCustomers: string;
  add: string;
  addCustomer: string;
  editCustomer: string;
  customerName: string;
  orderDetails: string;
  currentBalanceLabel: string;
  balanceLabel: string;
  advancePaid: string;
  totalUnpaid: string;
  noCustomers: string;
  noMatches: string;
  paid: string;
  unpaid: string;
  historyTitle: string;
  initialEntry: string;
  noHistory: string;
  failedLoadCustomers: string;
  failedSaveBalance: string;
  failedDeleteHistory: string;

  // Customer items — goods taken on the tab (v3)
  customerTab: string;
  itemsTitle: string;
  addItems: string;
  materialsTab: string;
  searchItems: string;
  unpaidItems: string;
  noUnpaidItems: string;
  addFirstItem: string;
  markPaid: string;
  markPaidConfirm: string;
  outstandingLabel: string;
  addOne: string;
  removeOne: string;
  productsTitle: string;
  failedLoadItems: string;
  failedAddItems: string;
  failedSettleItem: string;

  // Cash on a customer's tab, and editing what the ledger already holds (v3)
  borrowedCash: string;
  cashPaidBack: string;
  recordBorrowedCash: string;
  recordCashPaid: string;
  unpaidCash: string;
  cashAdvance: string;
  paidBack: string;
  tabTotalUnpaid: string;
  tabTotalPaid: string;
  editCashEntry: string;
  editItemEntry: string;
  editPayment: string;
  of: string;
  deleteTakingConfirm: string;
  deletePaymentConfirm: string;
  failedSaveEntry: string;

  // Customer page / form (v3)
  back: string;
  nickname: string;
  nicknamePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  address: string;
  addressPlaceholder: string;
  optional: string;
  nameRequired: string;
  nameTooLong: string;
  invalidPhone: string;
  nicknameRequiredHint: string;
  failedSaveCustomer: string;
  duplicateCustomer: string;
  updateBalance: string;
  notePlaceholder: string;
  enterAmount: string;
  lastActivity: string;
  noActivity: string;
  deleteCustomer: string;
  deleteCustomerConfirm: string;
  failedDeleteCustomer: string;
  saveCustomer: string;

  // Products (v3)
  inStock: string;
  outOfStock: string;
  lastPurchase: string;
  lastSale: string;
  useThisPrice: string;
  transactions: string;

  // Materials (v3) — raw stock, store books
  materialsTitle: string;
  searchMaterials: string;
  failedLoadMaterials: string;
  noMaterials: string;
  addFirstMaterial: string;
  addMaterial: string;
  editMaterial: string;
  materialImage: string;
  materialName: string;
  materialNamePlaceholder: string;
  enterMaterialName: string;
  duplicateMaterial: string;
  failedSaveMaterial: string;
  deleteMaterial: string;
  deleteMaterialConfirm: string;
  failedDeleteMaterial: string;
  stockUsed: string;
  quantityUsed: string;
  price: string;
  totalPrice: string;
  pricePerUnit: string;
  enterValidTotalPrice: string;

  // Operation costs (v3) — store books
  operationsTitle: string;
  searchOperations: string;
  failedLoadOperations: string;
  noOperations: string;
  addFirstOperation: string;
  addOperation: string;
  editOperation: string;
  addAmount: string;
  entries: string;
  noAmountEntries: string;
  failedAddAmount: string;
  failedUpdateEntry: string;
  failedDeleteEntry: string;
  reason: string;
  reasonPlaceholder: string;
  amount: string;
  note: string;
  enterReason: string;
  duplicateOperation: string;
  failedSaveOperation: string;
  deleteOperation: string;
  deleteOperationConfirm: string;
  failedDeleteOperation: string;
  totalOperationCost: string;

  // Common
  close: string;
  allClear: string;
}

const en: Translation = {
  pageTitle: 'Cash Entry - Tally',
  appName: 'Tally',
  numberFormat: 'en-US',
  timeFormat: 'en-US',

  customerBalances: 'Customer Balances',
  language: 'Language',
  english: 'English',
  bangla: 'বাংলা',

  signInSubtitle: 'Sign in to manage your finance books.',
  signInFailed: 'Sign-in failed. Please try again.',
  googleNotConfigured: 'Google sign-in is not configured.',
  account: 'Account',
  signOut: 'Sign out',

  theme: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',

  switchBook: 'Switch finance book',
  addBook: 'Add finance Book',
  editBook: 'Edit finance Book',
  deleteBook: 'Delete finance Book',
  deleteBookConfirm: 'Delete this finance book and everything in it (products, customers, history)? This cannot be undone.',
  failedDeleteBook: 'Failed to delete finance book. Please try again.',
  createBook: 'Create finance Book',
  bookName: 'Finance Book Name',
  bookNamePlaceholder: 'e.g. My Store',
  bookType: 'Finance Book Type',
  typeStore: 'Store',
  typeStoreHint: 'Products, stock & customer balances',
  typePersonal: 'Personal',
  typePersonalHint: 'Personal income & expenses',
  enterBookName: 'Please enter a finance book name.',
  failedLoadBooks: 'Failed to load finance books. Please refresh the page.',
  failedSaveBook: 'Failed to create finance book. Please try again.',
  welcomeTitle: 'Welcome to Tally',
  welcomeSubtitle: 'Create your first finance book to get started.',
  getStarted: 'Create finance book',
  transactionsTitle: 'Transactions',
  comingSoon: 'Coming soon',
  comingSoonHint: 'Personal transactions are on the way.',

  income: 'Income',
  expense: 'Expense',
  netBalance: 'Balance',
  typeLabel: 'Type',
  amountLabel: 'Amount',
  noteLabel: 'Note',
  categoryLabel: 'Category',
  selectCategory: 'Select a category',
  addTransaction: 'Add Transaction',
  editTransaction: 'Edit Transaction',
  deleteTransaction: 'Delete Transaction',
  deleteTransactionConfirm: 'Delete this transaction? This cannot be undone.',
  searchTransactions: 'Search transactions',
  noTransactions: 'No transactions yet',
  addFirstTransaction: 'Tap Add to record your first one.',
  failedLoadTransactions: 'Failed to load transactions. Please refresh the page.',
  enterValidAmount: 'Please enter a valid amount.',
  noCategoriesHint: 'No categories for this type yet. Create one first.',
  manageCategories: 'Manage categories',

  categories: 'Categories',
  categoriesTitle: 'Categories',
  addCategory: 'Add Category',
  editCategory: 'Edit Category',
  deleteCategory: 'Delete Category',
  deleteCategoryConfirm: 'Delete this category? Existing transactions keep their label.',
  categoryName: 'Category Name',
  categoryNamePlaceholder: 'e.g. Food',
  categoryDetails: 'Details',
  categoryDetailsPlaceholder: 'e.g. Groceries & dining',
  duplicateCategory: 'A category with this name already exists for this type.',
  enterCategoryName: 'Please enter a category name.',
  noCategories: 'No categories yet',
  failedLoadCategories: 'Failed to load categories. Please refresh the page.',
  failedSaveCategory: 'Failed to save category. Please try again.',
  failedDeleteCategory: 'Failed to delete category. Please try again.',

  noProducts: 'No products yet',
  addFirstProduct: 'Tap Add to create your first product.',
  failedLoadProducts: 'Failed to load products. Please refresh the page.',
  searchProducts: 'Search products',
  stock: 'Stock',

  addProduct: 'Add Product',
  editProduct: 'Edit Product',
  productImage: 'Product Image',
  adjustPhoto: 'Adjust Photo',
  zoom: 'Zoom',
  usePhoto: 'Use Photo',
  productName: 'Product Name',
  productNamePlaceholder: 'e.g. Rice',
  quantityType: 'Quantity Type',
  unitPiece: 'Piece',
  unitPacket: 'Packet',
  unitCartoon: 'Cartoon',
  unitKg: 'Kg',
  unitLiter: 'Liter',
  unitCustom: 'Custom…',
  customUnitPlaceholder: 'Enter custom unit name',
  save: 'Save',
  saveChanges: 'Save Changes',
  enterProductName: 'Please enter a product name.',
  enterQuantityType: 'Please enter a quantity type.',
  failedSaveProduct: 'Failed to save product. Please try again.',
  deleteProduct: 'Delete Product',
  deleteProductConfirm: 'Delete this product and all its stock/sale history? This cannot be undone.',
  failedDeleteProduct: 'Failed to delete product. Please try again.',
  duplicateProduct: 'A product with this name already exists in this finance book.',

  productType: 'Product Type',
  typeReadyMade: 'Ready Made',
  typeManufacture: 'Manufacture',
  typeReadyMadeHint: 'Bought from a vendor and resold — one buying price per stock-in.',
  typeManufactureHint: 'Made from raw materials — link the materials it uses.',
  rawMaterials: 'Raw materials',
  materialSearchPlaceholder: 'Search materials',
  addedMaterials: 'Added materials',
  availableMaterials: 'Available materials',
  // {link} is replaced with a link to the Material Costs page (see ProductFormModal).
  noMaterialsToLink: 'No materials found — add them in {link} first.',
  unlinkMaterial: 'Remove material',
  enterAtLeastOneMaterial: 'Add at least one material.',
  viewMaterials: 'View materials',
  viewStock: 'Material Stock',
  relatedMaterials: 'Materials',
  noLinkedMaterials: 'No materials linked to this product.',

  stockIn: 'Stock In',
  sale: 'Sale',
  unpaidPill: 'Unpaid',
  // A tab sale the customer has covered some, but not all, of.
  partPaid: 'Part paid',
  // Stands in for the running stock on manufacture rows, which have none.
  manufactured: 'Manufactured',
  // Day-bar split: money already in hand vs what a customer still owes.
  saleCash: 'Cash',
  saleDue: 'Due',
  quantity: 'Quantity',
  buyingPrice: 'Buying Price / unit',
  sellingPrice: 'Selling Price / unit',
  total: 'Total',
  update: 'Update',
  enterValidQuantity: 'Please enter a valid quantity.',
  enterValidPrice: 'Please enter a valid price.',
  notEnoughStock: 'Not enough stock. Available:',
  failedSaveTransaction: 'Failed to save transaction. Please try again.',
  failedLoadProduct: 'Failed to load product. Please try again.',

  history: 'History',
  noEntries: 'No stock or sale entries yet',
  failedLoadHistory: 'Failed to load history. Please try again.',
  edit: 'Edit',
  deleteAction: 'Delete',

  deleteEntry: 'Delete Entry',
  deleteEntryConfirm: 'Are you sure you want to delete this entry? This action cannot be undone.',
  cancel: 'Cancel',
  failedDeleteTransaction: 'Failed to delete transaction. Please try again.',

  customerBalancesTitle: 'Customer Balances',
  searchCustomers: 'Search customers',
  add: 'Add',
  addCustomer: 'Add Customer',
  editCustomer: 'Edit Customer',
  customerName: 'Customer Name',
  orderDetails: 'Order Details',
  currentBalanceLabel: 'Current Balance:',
  balanceLabel: 'Balance:',
  advancePaid: 'Advance Paid:',
  totalUnpaid: 'Total Unpaid:',
  noCustomers: 'No customers yet',
  noMatches: 'No matches',
  paid: 'Paid',
  unpaid: 'Unpaid',
  historyTitle: 'History',
  initialEntry: 'Initial entry',
  noHistory: 'No history',
  failedLoadCustomers: 'Failed to load customers',
  failedSaveBalance: 'Failed to save customer balance. Please try again.',
  failedDeleteHistory: 'Failed to delete history entry. Please try again.',

  customerTab: 'Items on tab',
  itemsTitle: 'Items',
  addItems: 'Add items',
  // The picker sells the material itself, so the tab drops the "Costs" of the page name.
  materialsTab: 'Materials',
  searchItems: 'Search items',
  unpaidItems: 'Unpaid items',
  noUnpaidItems: 'Nothing on the tab.',
  addFirstItem: 'Add items the customer takes without paying.',
  markPaid: 'Mark as paid',
  markPaidConfirm: 'Record this item as paid?',
  outstandingLabel: 'Outstanding:',
  addOne: 'Add one',
  removeOne: 'Remove one',
  productsTitle: 'Products',
  failedLoadItems: 'Failed to load items. Please try again.',
  failedAddItems: 'Failed to add items. Please try again.',
  failedSettleItem: 'Failed to settle item. Please try again.',

  // The two cash buttons on the tab sheet: money lent out, money handed back.
  borrowedCash: 'Borrowed cash',
  cashPaidBack: 'Cash paid',
  recordBorrowedCash: 'Record borrowed cash',
  recordCashPaid: 'Record cash paid back',
  unpaidCash: 'Unpaid cash',
  cashAdvance: 'Cash advance',
  paidBack: 'Paid back',
  // Lifetime totals on the tab sheet, either side of what still stands.
  tabTotalUnpaid: 'Total unpaid',
  tabTotalPaid: 'Total paid',
  editCashEntry: 'Edit cash entry',
  editItemEntry: 'Edit item taken',
  editPayment: 'Edit payment',
  // "৳360 paid — of ৳540" on a part-paid tab line.
  of: 'of',
  deleteTakingConfirm: 'This also removes the sale behind it and returns the goods to stock.',
  deletePaymentConfirm: 'This puts the goods back on the tab as unpaid.',
  failedSaveEntry: 'Failed to save the entry. Please try again.',

  back: 'Back',
  nickname: 'Nickname',
  nicknamePlaceholder: 'e.g. Tailor, Uncle',
  phone: 'Phone',
  phonePlaceholder: 'e.g. 01700-000000',
  address: 'Address',
  addressPlaceholder: 'e.g. House 1, Road 2, Dhaka',
  optional: 'optional',
  nameRequired: 'Please enter a name.',
  nameTooLong: 'Name is too long (max 100 characters).',
  invalidPhone: 'Please enter a valid phone number.',
  nicknameRequiredHint: 'This name already exists. Add a nickname to tell them apart.',
  failedSaveCustomer: 'Failed to save customer. Please try again.',
  duplicateCustomer: 'A customer with this name and nickname already exists.',
  updateBalance: 'Update Balance',
  notePlaceholder: 'Note (optional)',
  enterAmount: 'Enter an amount first.',
  lastActivity: 'Last activity',
  noActivity: 'No activity yet',
  deleteCustomer: 'Delete Customer',
  deleteCustomerConfirm: 'Delete this customer and their entire balance history? This cannot be undone.',
  failedDeleteCustomer: 'Failed to delete customer. Please try again.',
  saveCustomer: 'Save',

  inStock: 'In stock',
  outOfStock: 'Out of stock',
  lastPurchase: 'Last buy',
  lastSale: 'Last sale',
  useThisPrice: 'Tap to use as unit price',
  transactions: 'txns',

  materialsTitle: 'Material Costs',
  searchMaterials: 'Search materials',
  failedLoadMaterials: 'Failed to load materials. Please refresh the page.',
  noMaterials: 'No materials yet.',
  addFirstMaterial: 'Add your first material to get started.',
  addMaterial: 'Add Material',
  editMaterial: 'Edit Material',
  materialImage: 'Material Image',
  materialName: 'Material Name',
  materialNamePlaceholder: 'e.g. Flour',
  enterMaterialName: 'Please enter a material name.',
  duplicateMaterial: 'A material with this name already exists in this finance book.',
  failedSaveMaterial: 'Failed to save material. Please try again.',
  deleteMaterial: 'Delete Material',
  deleteMaterialConfirm: 'Delete this material and all its stock/sale history? This cannot be undone.',
  failedDeleteMaterial: 'Failed to delete material. Please try again.',
  stockUsed: 'Stock Used',
  quantityUsed: 'Quantity Used',
  price: 'Price',
  totalPrice: 'Total',
  pricePerUnit: 'Unit price',
  enterValidTotalPrice: 'Please enter a valid price.',

  operationsTitle: 'Operation Costs',
  searchOperations: 'Search operation costs',
  failedLoadOperations: 'Failed to load operation costs. Please refresh the page.',
  noOperations: 'No operation costs yet.',
  addFirstOperation: 'Add your first operation cost to get started.',
  addOperation: 'Add Operation Cost',
  editOperation: 'Edit Operation Cost',
  addAmount: 'Add Amount',
  entries: 'entries',
  noAmountEntries: 'No amounts added yet.',
  failedAddAmount: 'Failed to add amount. Please try again.',
  failedUpdateEntry: 'Failed to update entry. Please try again.',
  failedDeleteEntry: 'Failed to delete entry. Please try again.',
  reason: 'Reason',
  reasonPlaceholder: 'e.g. Rent, Electricity, Wages',
  amount: 'Amount',
  note: 'Note',
  enterReason: 'Please enter a reason.',
  duplicateOperation: 'An operation cost with this reason already exists in this finance book.',
  failedSaveOperation: 'Failed to save operation cost. Please try again.',
  deleteOperation: 'Delete Operation Cost',
  deleteOperationConfirm: 'Delete this operation cost and its entire amount history? This cannot be undone.',
  failedDeleteOperation: 'Failed to delete operation cost. Please try again.',
  totalOperationCost: 'Total operation cost',

  close: 'Close',
  allClear: 'AC',
};

const bn: Translation = {
  pageTitle: 'নগদ এন্ট্রি - ট্যালি',
  appName: 'ট্যালি',
  numberFormat: 'bn-BD',
  timeFormat: 'bn-BD',

  customerBalances: 'গ্রাহক ব্যালেন্স',
  language: 'ভাষা',
  english: 'English',
  bangla: 'বাংলা',

  signInSubtitle: 'আপনার হিসাব বইগুলো পরিচালনা করতে সাইন ইন করুন।',
  signInFailed: 'সাইন ইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
  googleNotConfigured: 'গুগল সাইন-ইন কনফিগার করা নেই।',
  account: 'অ্যাকাউন্ট',
  signOut: 'সাইন আউট',

  theme: 'থিম',
  themeSystem: 'সিস্টেম',
  themeLight: 'লাইট',
  themeDark: 'ডার্ক',

  switchBook: 'হিসাব বই পরিবর্তন',
  addBook: 'হিসাব বই যোগ করুন',
  editBook: 'হিসাব বই সম্পাদনা',
  deleteBook: 'হিসাব বই মুছুন',
  deleteBookConfirm: 'এই হিসাব বই ও এর সমস্ত কিছু (পণ্য, গ্রাহক, ইতিহাস) মুছে ফেলবেন? এটি ফেরানো যাবে না।',
  failedDeleteBook: 'হিসাব বই মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  createBook: 'হিসাব বই তৈরি করুন',
  bookName: 'হিসাব বইয়ের নাম',
  bookNamePlaceholder: 'যেমন আমার দোকান',
  bookType: 'হিসাব বইয়ের ধরন',
  typeStore: 'দোকান',
  typeStoreHint: 'পণ্য, স্টক ও গ্রাহক ব্যালেন্স',
  typePersonal: 'ব্যক্তিগত',
  typePersonalHint: 'ব্যক্তিগত আয় ও ব্যয়',
  enterBookName: 'অনুগ্রহ করে হিসাব বইয়ের নাম লিখুন।',
  failedLoadBooks: 'হিসাব বই লোড করা যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।',
  failedSaveBook: 'হিসাব বই তৈরি করা যায়নি। আবার চেষ্টা করুন।',
  welcomeTitle: 'ট্যালিতে স্বাগতম',
  welcomeSubtitle: 'শুরু করতে আপনার প্রথম হিসাব বই তৈরি করুন।',
  getStarted: 'হিসাব বই তৈরি করুন',
  transactionsTitle: 'লেনদেন',
  comingSoon: 'শীঘ্রই আসছে',
  comingSoonHint: 'ব্যক্তিগত লেনদেন শীঘ্রই আসছে।',

  income: 'আয়',
  expense: 'ব্যয়',
  netBalance: 'ব্যালেন্স',
  typeLabel: 'ধরন',
  amountLabel: 'পরিমাণ',
  noteLabel: 'নোট',
  categoryLabel: 'ক্যাটাগরি',
  selectCategory: 'একটি ক্যাটাগরি নির্বাচন করুন',
  addTransaction: 'লেনদেন যোগ করুন',
  editTransaction: 'লেনদেন সম্পাদনা',
  deleteTransaction: 'লেনদেন মুছুন',
  deleteTransactionConfirm: 'এই লেনদেনটি মুছে ফেলবেন? এটি ফেরানো যাবে না।',
  searchTransactions: 'লেনদেন খুঁজুন',
  noTransactions: 'এখনো কোন লেনদেন নেই',
  addFirstTransaction: 'প্রথম লেনদেন যোগ করতে যোগ চাপুন।',
  failedLoadTransactions: 'লেনদেন লোড করা যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।',
  enterValidAmount: 'অনুগ্রহ করে সঠিক পরিমাণ লিখুন।',
  noCategoriesHint: 'এই ধরনের কোন ক্যাটাগরি নেই। প্রথমে একটি তৈরি করুন।',
  manageCategories: 'ক্যাটাগরি পরিচালনা',

  categories: 'ক্যাটাগরি',
  categoriesTitle: 'ক্যাটাগরি',
  addCategory: 'ক্যাটাগরি যোগ করুন',
  editCategory: 'ক্যাটাগরি সম্পাদনা',
  deleteCategory: 'ক্যাটাগরি মুছুন',
  deleteCategoryConfirm: 'এই ক্যাটাগরিটি মুছে ফেলবেন? বিদ্যমান লেনদেনগুলো তাদের লেবেল রাখবে।',
  categoryName: 'ক্যাটাগরির নাম',
  categoryNamePlaceholder: 'যেমন খাবার',
  categoryDetails: 'বিবরণ',
  categoryDetailsPlaceholder: 'যেমন বাজার ও খাওয়া',
  duplicateCategory: 'এই ধরনের এই নামের একটি ক্যাটাগরি ইতিমধ্যে আছে।',
  enterCategoryName: 'অনুগ্রহ করে ক্যাটাগরির নাম লিখুন।',
  noCategories: 'এখনো কোন ক্যাটাগরি নেই',
  failedLoadCategories: 'ক্যাটাগরি লোড করা যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।',
  failedSaveCategory: 'ক্যাটাগরি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  failedDeleteCategory: 'ক্যাটাগরি মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',

  noProducts: 'এখনো কোন পণ্য নেই',
  addFirstProduct: 'প্রথম পণ্য তৈরি করতে যোগ চাপুন।',
  failedLoadProducts: 'পণ্য লোড করা যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।',
  searchProducts: 'পণ্য খুঁজুন',
  stock: 'স্টক',

  addProduct: 'পণ্য যোগ করুন',
  editProduct: 'পণ্য সম্পাদনা',
  productImage: 'পণ্যের ছবি',
  adjustPhoto: 'ছবি সমন্বয় করুন',
  zoom: 'জুম',
  usePhoto: 'ছবি ব্যবহার করুন',
  productName: 'পণ্যের নাম',
  productNamePlaceholder: 'যেমন চাল',
  quantityType: 'পরিমাণের ধরন',
  unitPiece: 'পিস',
  unitPacket: 'প্যাকেট',
  unitCartoon: 'কার্টন',
  unitKg: 'কেজি',
  unitLiter: 'লিটার',
  unitCustom: 'কাস্টম…',
  customUnitPlaceholder: 'কাস্টম এককের নাম লিখুন',
  save: 'সংরক্ষণ',
  saveChanges: 'পরিবর্তন সংরক্ষণ',
  enterProductName: 'অনুগ্রহ করে পণ্যের নাম লিখুন।',
  enterQuantityType: 'অনুগ্রহ করে পরিমাণের ধরন লিখুন।',
  failedSaveProduct: 'পণ্য সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  deleteProduct: 'পণ্য মুছুন',
  deleteProductConfirm: 'এই পণ্য ও তার সমস্ত স্টক/বিক্রয় ইতিহাস মুছে ফেলবেন? এটি ফেরানো যাবে না।',
  failedDeleteProduct: 'পণ্য মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  duplicateProduct: 'এই হিসাব বইয়ে এই নামের একটি পণ্য ইতিমধ্যে আছে।',

  productType: 'পণ্যের ধরন',
  typeReadyMade: 'রেডিমেড',
  typeManufacture: 'উৎপাদিত',
  typeReadyMadeHint: 'সরবরাহকারীর কাছ থেকে কিনে পুনরায় বিক্রি — প্রতি স্টকে একটি ক্রয়মূল্য।',
  typeManufactureHint: 'কাঁচামাল দিয়ে তৈরি — যে কাঁচামাল ব্যবহৃত হয় তা যুক্ত করুন।',
  rawMaterials: 'কাঁচামাল',
  materialSearchPlaceholder: 'কাঁচামাল খুঁজুন',
  addedMaterials: 'যুক্ত কাঁচামাল',
  availableMaterials: 'উপলব্ধ কাঁচামাল',
  noMaterialsToLink: 'কোনো কাঁচামাল নেই — প্রথমে {link} পেজে যোগ করুন।',
  unlinkMaterial: 'কাঁচামাল সরান',
  enterAtLeastOneMaterial: 'অন্তত একটি কাঁচামাল যোগ করুন।',
  viewMaterials: 'কাঁচামাল দেখুন',
  viewStock: 'কাঁচামাল স্টক',
  relatedMaterials: 'কাঁচামাল',
  noLinkedMaterials: 'এই পণ্যের সাথে কোনো কাঁচামাল যুক্ত নেই।',

  stockIn: 'স্টক ইন',
  sale: 'বিক্রয়',
  unpaidPill: 'বাকি',
  partPaid: 'আংশিক পরিশোধিত',
  manufactured: 'উৎপাদিত',
  saleCash: 'নগদ',
  saleDue: 'বাকি',
  quantity: 'পরিমাণ',
  buyingPrice: 'ক্রয় মূল্য / একক',
  sellingPrice: 'বিক্রয় মূল্য / একক',
  total: 'মোট',
  update: 'আপডেট',
  enterValidQuantity: 'অনুগ্রহ করে সঠিক পরিমাণ লিখুন।',
  enterValidPrice: 'অনুগ্রহ করে সঠিক মূল্য লিখুন।',
  notEnoughStock: 'পর্যাপ্ত স্টক নেই। উপলব্ধ:',
  failedSaveTransaction: 'লেনদেন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  failedLoadProduct: 'পণ্য লোড করা যায়নি। আবার চেষ্টা করুন।',

  history: 'ইতিহাস',
  noEntries: 'এখনো কোন স্টক বা বিক্রয় এন্ট্রি নেই',
  failedLoadHistory: 'ইতিহাস লোড করা যায়নি। আবার চেষ্টা করুন।',
  edit: 'সম্পাদনা',
  deleteAction: 'মুছুন',

  deleteEntry: 'এন্ট্রি মুছুন',
  deleteEntryConfirm: 'আপনি কি এই এন্ট্রিটি মুছে ফেলার বিষয়ে নিশ্চিত? এই কাজটি ফেরানো যাবে না।',
  cancel: 'বাতিল',
  failedDeleteTransaction: 'লেনদেন মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',

  customerBalancesTitle: 'গ্রাহক ব্যালেন্স',
  searchCustomers: 'গ্রাহক খুঁজুন',
  add: 'যোগ',
  addCustomer: 'গ্রাহক যোগ করুন',
  editCustomer: 'গ্রাহক সম্পাদনা',
  customerName: 'গ্রাহকের নাম',
  orderDetails: 'অর্ডারের বিবরণ',
  currentBalanceLabel: 'বর্তমান ব্যালেন্স:',
  balanceLabel: 'ব্যালেন্স:',
  advancePaid: 'অগ্রিম পরিশোধিত:',
  totalUnpaid: 'মোট বকেয়া:',
  noCustomers: 'এখনো কোন গ্রাহক নেই',
  noMatches: 'কোন মিল নেই',
  paid: 'পরিশোধিত',
  unpaid: 'বকেয়া',
  historyTitle: 'ইতিহাস',
  initialEntry: 'প্রাথমিক এন্ট্রি',
  noHistory: 'কোন ইতিহাস নেই',
  failedLoadCustomers: 'গ্রাহক লোড করা যায়নি',
  failedSaveBalance: 'গ্রাহক ব্যালেন্স সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  failedDeleteHistory: 'ইতিহাস এন্ট্রি মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',

  customerTab: 'বাকির পণ্য',
  itemsTitle: 'পণ্য',
  addItems: 'পণ্য যোগ করুন',
  materialsTab: 'কাঁচামাল',
  searchItems: 'পণ্য খুঁজুন',
  unpaidItems: 'বাকি পণ্য',
  noUnpaidItems: 'কোনো বাকি পণ্য নেই।',
  addFirstItem: 'গ্রাহক বাকিতে যা নেন তা যোগ করুন।',
  markPaid: 'পরিশোধিত হিসেবে চিহ্নিত করুন',
  markPaidConfirm: 'এই পণ্যটি পরিশোধিত হিসেবে রেকর্ড করবেন?',
  outstandingLabel: 'বাকি:',
  addOne: 'একটি যোগ করুন',
  removeOne: 'একটি কমান',
  productsTitle: 'পণ্য',
  failedLoadItems: 'পণ্য লোড করা যায়নি। আবার চেষ্টা করুন।',
  failedAddItems: 'পণ্য যোগ করা যায়নি। আবার চেষ্টা করুন।',
  failedSettleItem: 'পণ্যের দাম পরিশোধ করা যায়নি। আবার চেষ্টা করুন।',

  borrowedCash: 'ধার নেওয়া নগদ',
  cashPaidBack: 'ফেরত নগদ',
  recordBorrowedCash: 'ধার নেওয়া নগদ যোগ করুন',
  recordCashPaid: 'ফেরত দেওয়া নগদ যোগ করুন',
  unpaidCash: 'বাকি নগদ',
  cashAdvance: 'অগ্রিম নগদ',
  paidBack: 'পরিশোধিত',
  tabTotalUnpaid: 'মোট বাকি',
  tabTotalPaid: 'মোট পরিশোধিত',
  editCashEntry: 'নগদ এন্ট্রি সম্পাদনা',
  editItemEntry: 'নেওয়া পণ্য সম্পাদনা',
  editPayment: 'পরিশোধ সম্পাদনা',
  of: 'এর মধ্যে',
  deleteTakingConfirm: 'এটি এর পেছনের বিক্রয়টিও মুছে দেবে এবং পণ্য স্টকে ফেরত যাবে।',
  deletePaymentConfirm: 'এটি পণ্যগুলো আবার বাকি হিসেবে তালিকায় ফিরিয়ে দেবে।',
  failedSaveEntry: 'এন্ট্রি সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',

  back: 'পিছনে',
  nickname: 'ডাকনাম',
  nicknamePlaceholder: 'যেমন দর্জি, চাচা',
  phone: 'ফোন',
  phonePlaceholder: 'যেমন ০১৭০০-০০০০০০',
  address: 'ঠিকানা',
  addressPlaceholder: 'যেমন বাসা ১, রোড ২, ঢাকা',
  optional: 'ঐচ্ছিক',
  nameRequired: 'অনুগ্রহ করে একটি নাম লিখুন।',
  nameTooLong: 'নাম খুব লম্বা (সর্বোচ্চ ১০০ অক্ষর)।',
  invalidPhone: 'অনুগ্রহ করে একটি সঠিক ফোন নম্বর লিখুন।',
  nicknameRequiredHint: 'এই নামটি ইতিমধ্যে আছে। আলাদা করতে একটি ডাকনাম যোগ করুন।',
  failedSaveCustomer: 'গ্রাহক সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  duplicateCustomer: 'এই নাম ও ডাকনামের একজন গ্রাহক ইতিমধ্যে আছে।',
  updateBalance: 'ব্যালেন্স হালনাগাদ',
  notePlaceholder: 'নোট (ঐচ্ছিক)',
  enterAmount: 'প্রথমে একটি পরিমাণ লিখুন।',
  lastActivity: 'সর্বশেষ কার্যকলাপ',
  noActivity: 'এখনো কোন কার্যকলাপ নেই',
  deleteCustomer: 'গ্রাহক মুছুন',
  deleteCustomerConfirm: 'এই গ্রাহক ও তার সম্পূর্ণ ব্যালেন্স ইতিহাস মুছে ফেলবেন? এটি ফেরানো যাবে না।',
  failedDeleteCustomer: 'গ্রাহক মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  saveCustomer: 'সংরক্ষণ',

  inStock: 'স্টকে আছে',
  outOfStock: 'স্টক শেষ',
  lastPurchase: 'সর্বশেষ ক্রয়',
  lastSale: 'সর্বশেষ বিক্রয়',
  useThisPrice: 'একক মূল্য হিসেবে ব্যবহার করতে চাপ দিন',
  transactions: 'লেনদেন',

  materialsTitle: 'কাঁচামাল খরচ',
  searchMaterials: 'কাঁচামাল খুঁজুন',
  failedLoadMaterials: 'কাঁচামাল লোড করা যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।',
  noMaterials: 'এখনো কোন কাঁচামাল নেই।',
  addFirstMaterial: 'শুরু করতে আপনার প্রথম কাঁচামাল যোগ করুন।',
  addMaterial: 'কাঁচামাল যোগ করুন',
  editMaterial: 'কাঁচামাল সম্পাদনা',
  materialImage: 'কাঁচামালের ছবি',
  materialName: 'কাঁচামালের নাম',
  materialNamePlaceholder: 'যেমন ময়দা',
  enterMaterialName: 'অনুগ্রহ করে কাঁচামালের নাম লিখুন।',
  duplicateMaterial: 'এই নামে একটি কাঁচামাল ইতিমধ্যে এই হিসাব বইতে আছে।',
  failedSaveMaterial: 'কাঁচামাল সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  deleteMaterial: 'কাঁচামাল মুছুন',
  deleteMaterialConfirm: 'এই কাঁচামাল ও তার সম্পূর্ণ স্টক/বিক্রয় ইতিহাস মুছে ফেলবেন? এটি ফেরানো যাবে না।',
  failedDeleteMaterial: 'কাঁচামাল মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  stockUsed: 'স্টক ব্যবহৃত',
  quantityUsed: 'ব্যবহৃত পরিমাণ',
  price: 'মূল্য',
  totalPrice: 'মোট',
  pricePerUnit: 'একক মূল্য',
  enterValidTotalPrice: 'অনুগ্রহ করে একটি সঠিক মূল্য লিখুন।',

  operationsTitle: 'পরিচালন খরচ',
  searchOperations: 'পরিচালন খরচ খুঁজুন',
  failedLoadOperations: 'পরিচালন খরচ লোড করা যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।',
  noOperations: 'এখনো কোন পরিচালন খরচ নেই।',
  addFirstOperation: 'শুরু করতে আপনার প্রথম পরিচালন খরচ যোগ করুন।',
  addOperation: 'পরিচালন খরচ যোগ করুন',
  editOperation: 'পরিচালন খরচ সম্পাদনা',
  addAmount: 'পরিমাণ যোগ করুন',
  entries: 'এন্ট্রি',
  noAmountEntries: 'এখনো কোন পরিমাণ যোগ করা হয়নি।',
  failedAddAmount: 'পরিমাণ যোগ করা যায়নি। আবার চেষ্টা করুন।',
  failedUpdateEntry: 'এন্ট্রি আপডেট করা যায়নি। আবার চেষ্টা করুন।',
  failedDeleteEntry: 'এন্ট্রি মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  reason: 'কারণ',
  reasonPlaceholder: 'যেমন ভাড়া, বিদ্যুৎ, মজুরি',
  amount: 'পরিমাণ',
  note: 'নোট',
  enterReason: 'অনুগ্রহ করে একটি কারণ লিখুন।',
  duplicateOperation: 'এই কারণে একটি পরিচালন খরচ ইতিমধ্যে এই হিসাব বইতে আছে।',
  failedSaveOperation: 'পরিচালন খরচ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
  deleteOperation: 'পরিচালন খরচ মুছুন',
  deleteOperationConfirm: 'এই পরিচালন খরচ ও তার সম্পূর্ণ পরিমাণ ইতিহাস মুছে ফেলবেন? এটি ফেরানো যাবে না।',
  failedDeleteOperation: 'পরিচালন খরচ মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  totalOperationCost: 'মোট পরিচালন খরচ',

  close: 'বন্ধ',
  allClear: 'AC',
};

export const translations: Record<LangCode, Translation> = { en, bn };

export const LANGUAGES: { code: LangCode; flag: string; nameKey: keyof Translation }[] = [
  { code: 'en', flag: '🇺🇸', nameKey: 'english' },
  { code: 'bn', flag: '🇧🇩', nameKey: 'bangla' },
];

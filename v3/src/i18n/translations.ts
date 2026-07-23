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

  // Product type (ready-made / manufacture) + cost template
  productType: string;
  typeReadyMade: string;
  typeManufacture: string;
  typeReadyMadeHint: string;
  typeManufactureHint: string;
  rawMaterials: string;
  rawMaterialsHint: string;
  costItemPlaceholder: string;
  addCostLine: string;
  removeLine: string;
  enterCostItem: string;

  // Action (stock/sale) modal
  stockIn: string;
  sale: string;
  quantity: string;
  quantityProduced: string;
  cost: string;
  costPerUnit: string;
  totalCost: string;
  enterCostAmount: string;
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
  transactions: string;

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

  signInSubtitle: 'Sign in to manage your books.',
  signInFailed: 'Sign-in failed. Please try again.',
  googleNotConfigured: 'Google sign-in is not configured.',
  account: 'Account',
  signOut: 'Sign out',

  theme: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',

  switchBook: 'Switch book',
  addBook: 'Add Book',
  editBook: 'Edit Book',
  deleteBook: 'Delete Book',
  deleteBookConfirm: 'Delete this book and everything in it (products, customers, history)? This cannot be undone.',
  failedDeleteBook: 'Failed to delete book. Please try again.',
  createBook: 'Create Book',
  bookName: 'Book Name',
  bookNamePlaceholder: 'e.g. My Store',
  bookType: 'Book Type',
  typeStore: 'Store',
  typeStoreHint: 'Products, stock & customer balances',
  typePersonal: 'Personal',
  typePersonalHint: 'Personal income & expenses',
  enterBookName: 'Please enter a book name.',
  failedLoadBooks: 'Failed to load books. Please refresh the page.',
  failedSaveBook: 'Failed to create book. Please try again.',
  welcomeTitle: 'Welcome to Tally',
  welcomeSubtitle: 'Create your first book to get started.',
  getStarted: 'Create your first book',
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
  duplicateProduct: 'A product with this name already exists in this book.',

  productType: 'Product Type',
  typeReadyMade: 'Ready Made',
  typeManufacture: 'Manufacture',
  typeReadyMadeHint: 'Bought from a vendor and resold — one buying price per stock-in.',
  typeManufactureHint: 'Made from raw materials — enter each cost when stocking in.',
  rawMaterials: 'Raw materials & costs',
  rawMaterialsHint: 'These cost lines appear each time you stock in. Fill their prices then.',
  costItemPlaceholder: 'e.g. Flour, Labour, Packaging',
  addCostLine: 'Add cost line',
  removeLine: 'Remove line',
  enterCostItem: 'Add at least one raw material or cost line.',

  quantityProduced: 'Quantity Produced',
  cost: 'Cost',
  costPerUnit: 'Cost per unit',
  totalCost: 'Total Cost',
  enterCostAmount: 'Enter at least one cost amount for this batch.',

  stockIn: 'Stock In',
  sale: 'Sale',
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
  transactions: 'txns',

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

  signInSubtitle: 'আপনার বইগুলো পরিচালনা করতে সাইন ইন করুন।',
  signInFailed: 'সাইন ইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
  googleNotConfigured: 'গুগল সাইন-ইন কনফিগার করা নেই।',
  account: 'অ্যাকাউন্ট',
  signOut: 'সাইন আউট',

  theme: 'থিম',
  themeSystem: 'সিস্টেম',
  themeLight: 'লাইট',
  themeDark: 'ডার্ক',

  switchBook: 'বই পরিবর্তন',
  addBook: 'বই যোগ করুন',
  editBook: 'বই সম্পাদনা',
  deleteBook: 'বই মুছুন',
  deleteBookConfirm: 'এই বই ও এর সমস্ত কিছু (পণ্য, গ্রাহক, ইতিহাস) মুছে ফেলবেন? এটি ফেরানো যাবে না।',
  failedDeleteBook: 'বই মুছে ফেলা যায়নি। আবার চেষ্টা করুন।',
  createBook: 'বই তৈরি করুন',
  bookName: 'বইয়ের নাম',
  bookNamePlaceholder: 'যেমন আমার দোকান',
  bookType: 'বইয়ের ধরন',
  typeStore: 'দোকান',
  typeStoreHint: 'পণ্য, স্টক ও গ্রাহক ব্যালেন্স',
  typePersonal: 'ব্যক্তিগত',
  typePersonalHint: 'ব্যক্তিগত আয় ও ব্যয়',
  enterBookName: 'অনুগ্রহ করে বইয়ের নাম লিখুন।',
  failedLoadBooks: 'বই লোড করা যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।',
  failedSaveBook: 'বই তৈরি করা যায়নি। আবার চেষ্টা করুন।',
  welcomeTitle: 'ট্যালিতে স্বাগতম',
  welcomeSubtitle: 'শুরু করতে আপনার প্রথম বই তৈরি করুন।',
  getStarted: 'আপনার প্রথম বই তৈরি করুন',
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
  duplicateProduct: 'এই বইয়ে এই নামের একটি পণ্য ইতিমধ্যে আছে।',

  productType: 'পণ্যের ধরন',
  typeReadyMade: 'রেডিমেড',
  typeManufacture: 'উৎপাদিত',
  typeReadyMadeHint: 'সরবরাহকারীর কাছ থেকে কিনে পুনরায় বিক্রি — প্রতি স্টকে একটি ক্রয়মূল্য।',
  typeManufactureHint: 'কাঁচামাল দিয়ে তৈরি — স্টক করার সময় প্রতিটি খরচ লিখুন।',
  rawMaterials: 'কাঁচামাল ও খরচ',
  rawMaterialsHint: 'এই খরচের লাইনগুলো প্রতিবার স্টক করার সময় আসবে। তখন দাম লিখবেন।',
  costItemPlaceholder: 'যেমন ময়দা, মজুরি, প্যাকেজিং',
  addCostLine: 'খরচের লাইন যোগ করুন',
  removeLine: 'লাইন সরান',
  enterCostItem: 'অন্তত একটি কাঁচামাল বা খরচের লাইন যোগ করুন।',

  quantityProduced: 'উৎপাদিত পরিমাণ',
  cost: 'খরচ',
  costPerUnit: 'প্রতি এককের খরচ',
  totalCost: 'মোট খরচ',
  enterCostAmount: 'এই ব্যাচের জন্য অন্তত একটি খরচের পরিমাণ লিখুন।',

  stockIn: 'স্টক ইন',
  sale: 'বিক্রয়',
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
  transactions: 'লেনদেন',

  close: 'বন্ধ',
  allClear: 'AC',
};

export const translations: Record<LangCode, Translation> = { en, bn };

export const LANGUAGES: { code: LangCode; flag: string; nameKey: keyof Translation }[] = [
  { code: 'en', flag: '🇺🇸', nameKey: 'english' },
  { code: 'bn', flag: '🇧🇩', nameKey: 'bangla' },
];

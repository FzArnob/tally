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

  // Products grid
  noProducts: string;
  addFirstProduct: string;
  failedLoadProducts: string;
  stock: string;

  // Product form modal
  addProduct: string;
  editProduct: string;
  productImage: string;
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

  // Action (stock/sale) modal
  stockIn: string;
  sale: string;
  quantity: string;
  buyingPrice: string;
  sellingPrice: string;
  total: string;
  update: string;
  enterValidQuantity: string;
  enterValidPrice: string;
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

  // Common
  close: string;
  allClear: string;
}

const en: Translation = {
  pageTitle: 'Cash Entry - Tally',
  appName: 'Tally Store',
  numberFormat: 'en-US',
  timeFormat: 'en-US',

  customerBalances: 'Customer Balances',
  language: 'Language',
  english: 'English',
  bangla: 'বাংলা',

  noProducts: 'No products yet',
  addFirstProduct: 'Tap + to add your first product.',
  failedLoadProducts: 'Failed to load products. Please refresh the page.',
  stock: 'Stock',

  addProduct: 'Add Product',
  editProduct: 'Edit Product',
  productImage: 'Product Image',
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

  stockIn: 'Stock In',
  sale: 'Sale',
  quantity: 'Quantity',
  buyingPrice: 'Buying Price / unit',
  sellingPrice: 'Selling Price / unit',
  total: 'Total',
  update: 'Update',
  enterValidQuantity: 'Please enter a valid quantity.',
  enterValidPrice: 'Please enter a valid price.',
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

  close: 'Close',
  allClear: 'AC',
};

const bn: Translation = {
  pageTitle: 'নগদ এন্ট্রি - ট্যালি',
  appName: 'ট্যালি স্টোর',
  numberFormat: 'bn-BD',
  timeFormat: 'bn-BD',

  customerBalances: 'গ্রাহক ব্যালেন্স',
  language: 'ভাষা',
  english: 'English',
  bangla: 'বাংলা',

  noProducts: 'এখনো কোন পণ্য নেই',
  addFirstProduct: 'প্রথম পণ্য যোগ করতে + চাপুন।',
  failedLoadProducts: 'পণ্য লোড করা যায়নি। অনুগ্রহ করে পৃষ্ঠাটি রিফ্রেশ করুন।',
  stock: 'স্টক',

  addProduct: 'পণ্য যোগ করুন',
  editProduct: 'পণ্য সম্পাদনা',
  productImage: 'পণ্যের ছবি',
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

  stockIn: 'স্টক ইন',
  sale: 'বিক্রয়',
  quantity: 'পরিমাণ',
  buyingPrice: 'ক্রয় মূল্য / একক',
  sellingPrice: 'বিক্রয় মূল্য / একক',
  total: 'মোট',
  update: 'আপডেট',
  enterValidQuantity: 'অনুগ্রহ করে সঠিক পরিমাণ লিখুন।',
  enterValidPrice: 'অনুগ্রহ করে সঠিক মূল্য লিখুন।',
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

  close: 'বন্ধ',
  allClear: 'AC',
};

export const translations: Record<LangCode, Translation> = { en, bn };

export const LANGUAGES: { code: LangCode; flag: string; nameKey: keyof Translation }[] = [
  { code: 'en', flag: '🇺🇸', nameKey: 'english' },
  { code: 'bn', flag: '🇧🇩', nameKey: 'bangla' },
];

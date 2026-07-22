// Localization Configuration
const translations = {
  en: {
    // Page title and main elements
    pageTitle: "Cash Entry - Tally",
    
    // Header buttons
    customerBalances: "Customer Balances",
    language: "Language",
    
    // Customer Balance section
    customerBalancesTitle: "Customer Balances",
    searchCustomers: "Search customers",
    add: "Add",
    addCustomer: "Add Customer",
    editCustomer: "Edit Customer",
    customerName: "Customer Name",
    orderDetails: "Order Details",
    currentBalanceLabel: "Current Balance:",
    advancePaid: "Advance Paid:",
    totalUnpaid: "Total Unpaid:",
    noCustomers: "No customers yet",
    paid: "Paid",
    unpaid: "Unpaid",
    historyTitle: "History",
    initialEntry: "Initial entry",
    
    // Common buttons and actions
    close: "Close",
    backspace: "Backspace",
    percent: "Percent",
    multiply: "Multiply",
    divide: "Divide",
    minus: "Minus",
    plus: "Plus",
    equals: "Equals",
    
    // Language options
    english: "English",
    bangla: "বাংলা",
    
    // Calculator labels
    allClear: "AC",
    
    // Error messages and confirmations
    deleteHistoryConfirm: "Are you sure you want to delete this entry?",
    
    // Time formatting
    timeFormat: "en-US",
    
    // Number formatting
    numberFormat: "en-US",
    currency: "BDT"
  },
  
  bn: {
    // Page title and main elements (keeping some English for clarity)
    pageTitle: "নগদ এন্ট্রি - ট্যালি",
    
    // Header buttons
    customerBalances: "গ্রাহক ব্যালেন্স",
    language: "ভাষা",
    
    // Customer Balance section
    customerBalancesTitle: "গ্রাহক ব্যালেন্স",
    searchCustomers: "গ্রাহক খুঁজুন",
    add: "যোগ",
    addCustomer: "গ্রাহক যোগ করুন",
    editCustomer: "গ্রাহক সম্পাদনা",
    customerName: "গ্রাহকের নাম",
    orderDetails: "অর্ডারের বিবরণ",
    currentBalanceLabel: "বর্তমান ব্যালেন্স:",
    advancePaid: "অগ্রিম পরিশোধিত:",
    totalUnpaid: "মোট বকেয়া:",
    noCustomers: "এখনো কোন গ্রাহক নেই",
    paid: "পরিশোধিত",
    unpaid: "বকেয়া",
    historyTitle: "ইতিহাস",
    initialEntry: "প্রাথমিক এন্ট্রি",
    
    // Common buttons and actions
    close: "বন্ধ",
    backspace: "মুছুন",
    percent: "শতাংশ",
    multiply: "গুণ",
    divide: "ভাগ",
    minus: "বিয়োগ",
    plus: "যোগ",
    equals: "সমান",
    
    // Language options
    english: "English",
    bangla: "বাংলা",
    
    // Calculator labels
    allClear: "AC",
    
    // Error messages and confirmations
    deleteHistoryConfirm: "আপনি কি এই এন্ট্রিটি মুছে ফেলার বিষয়ে নিশ্চিত?",
    
    // Time formatting
    timeFormat: "bn-BD",
    
    // Number formatting
    numberFormat: "bn-BD",
    currency: "BDT"
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { translations };
} else {
  window.translations = translations;
}
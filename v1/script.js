// Global State
let currentBook = null; // Store current book details
// Customer Balance State
let customerBalances = {}; // { customerName: { total: number, history: [ { id, amount, reason, timestamp } ] } }
let cbEditingCustomer = null; // name when editing existing
let cbHistoryCustomer = null; // name when editing existing
let cbLongPressTimer = null;
let cbSearchQuery = "";

// Localization State
let currentLanguage = 'en';
let currentTranslations = {};

// API Configuration
const API_BASE = "../api/";
const BOOK_ID = 1; // Default book ID (Samad's Store)

// Language Switcher DOM
const languageBtn = document.getElementById("languageBtn");
const languageDropdown = document.getElementById("languageDropdown");
// Customer Balance DOM
const customerBalanceBtn = document.getElementById("customerBalanceBtn");
const cbSidebar = document.getElementById("cbSidebar");
const cbOverlayBg = document.getElementById("cbOverlayBg");
const closeCbSidebar = document.getElementById("closeCbSidebar");
const cbSearch = document.getElementById("cbSearch");
const cbAddBtn = document.getElementById("cbAddBtn");
const cbList = document.getElementById("cbList");
const cbEmptyState = document.getElementById("cbEmptyState");
const cbTotals = document.getElementById("cbTotals");
const cbTotalPaid = document.getElementById("cbTotalPaid");
const cbTotalUnpaid = document.getElementById("cbTotalUnpaid");
// CB Modal
const cbModalOverlay = document.getElementById("cbModalOverlay");
const cbModal = document.getElementById("cbModal");
const cbModalTitle = document.getElementById("cbModalTitle");
const closeCbModal = document.getElementById("closeCbModal");
const cbNameInput = document.getElementById("cbNameInput");
const cbReasonInput = document.getElementById("cbReasonInput");
const cbCurrentBalance = document.getElementById("cbCurrentBalance");
const cbCurrentBalanceValue = document.getElementById("cbCurrentBalanceValue");
// Embedded CB Calculator elements
const cbCalcDisplay = document.getElementById("cbCalcDisplay");
const cbCalcExpression = document.getElementById("cbCalcExpression");
const cbKeypadGrid = document.getElementById("cbKeypadGrid");

// Customer Balance Calculator State (separate from main)
let cbExpression = "";
let cbDisplay = "0";
let cbLastEvaluated = 0;
// CBH Modal
const cbhModalOverlay = document.getElementById("cbhModalOverlay");
const cbhModal = document.getElementById("cbhModal");
const cbhModalTitle = document.getElementById("cbhModalTitle");
const closeCbhModal = document.getElementById("closeCbhModal");
const cbhHistoryList = document.getElementById("cbhHistoryList");

// Utility Functions
function formatCurrency(value) {
  // Accept numbers or numeric strings; always return with two decimals
  if (value === "" || value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return value;
  
  // Use localized number formatting with dynamic decimal places
  const locale = currentTranslations.numberFormat || "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 10 // Allow up to 10 decimal places if needed
  });
  
  return "৳ " + formatter.format(num);
}

function formatNumber(value) {
  // Format numbers for display (calculator, inputs, etc.) using locale
  if (value === "" || value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return value;
  
  // Use localized number formatting
  const locale = currentTranslations.numberFormat || "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 10 // Allow up to 10 decimal places for calculations
  });
  
  return formatter.format(num);
}

function parseLocalizedNumber(value) {
  // Parse a localized number back to standard format for calculations
  if (typeof value === 'number') return value;
  if (!value || value === '') return 0;
  
  // Remove currency symbols and clean up
  let cleanValue = value.toString().replace(/[৳$,\s]/g, '');
  
  // Handle different decimal separators
  const locale = currentTranslations.numberFormat || "en-US";
  if (locale === "bn-BD") {
    // In Bangla locale, comma might be used as thousands separator
    // Convert to standard format
    cleanValue = cleanValue.replace(/,/g, '');
  }
  
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
}

function localizeDigitsInExpression(expression) {
  // Localize digits in mathematical expressions for display
  if (!expression || expression === '') return expression;
  
  const locale = currentTranslations.numberFormat || "en-US";
  
  // For Bengali locale, convert digits to Bengali numerals
  if (locale === "bn-BD") {
    const englishToBengali = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    
    return expression.replace(/[0-9]/g, digit => englishToBengali[digit] || digit);
  }
  
  // For English and other locales, return as-is
  return expression;
}

function localizeDigit(digit) {
  // Localize a single digit for button display
  if (!digit || digit === '') return digit;
  
  const locale = currentTranslations.numberFormat || "en-US";
  
  // For Bengali locale, convert digit to Bengali numeral
  if (locale === "bn-BD") {
    const englishToBengali = {
      '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
      '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
    };
    
    return englishToBengali[digit] || digit;
  }
  
  // For English and other locales, return as-is
  return digit;
}

function updateCalculatorButtons() {
  // Update customer balance calculator digit buttons
  document.querySelectorAll('.cb-kp-btn[data-number]').forEach(button => {
    const number = button.getAttribute('data-number');
    if (number) {
      if (/^[0-9]+$/.test(number)) {
        // Localize each digit in the number (for 00, etc.)
        button.textContent = number.split('').map(localizeDigit).join('');
      } else if (number === '.') {
        // Keep decimal point as is - it's universal
        button.textContent = '.';
      }
    }
  });
}

function formatCurrentBalance(value) {
  // Format current balance with proper minus sign placement
  if (value === "" || value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return value;

  // Use localized number formatting with dynamic decimal places
  const locale = currentTranslations.numberFormat || "en-US";
  const formatter = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 10 // Allow up to 10 decimal places if needed
  });

  if (num >= 0) {
    return "৳ " + formatter.format(num);
  } else {
    return "-৳ " + formatter.format(Math.abs(num));
  }
}

function formatTimeFull(date) {
  const locale = currentTranslations.timeFormat || "en-US";
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Cookie utility functions
function setCookie(name, value, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Localization Functions
function loadLanguage(langCode) {
  if (!window.translations || !window.translations[langCode]) {
    console.error(`Language ${langCode} not found`);
    return false;
  }
  
  currentLanguage = langCode;
  currentTranslations = window.translations[langCode];
  
  // Save to cookie
  setCookie('selectedLanguage', langCode);
  
  // Apply translations
  applyTranslations();
  
  // Update dropdown selection
  updateLanguageDropdownSelection();
  
  return true;
}

function applyTranslations() {
  // Update page title
  document.title = currentTranslations.pageTitle || document.title;
  
  // Update elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (currentTranslations[key]) {
      element.textContent = currentTranslations[key];
    }
  });
  
  // Update placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (currentTranslations[key]) {
      element.placeholder = currentTranslations[key];
    }
  });
  
  // Update aria-label attributes
  document.querySelectorAll('[data-i18n-aria]').forEach(element => {
    const key = element.getAttribute('data-i18n-aria');
    if (currentTranslations[key]) {
      element.setAttribute('aria-label', currentTranslations[key]);
    }
  });
  
  // Update number displays
  updateCbCalcDisplay();
  
  // Update calculator buttons
  updateCalculatorButtons();
}

function updateLanguageDropdownSelection() {
  // Remove existing selected class
  document.querySelectorAll('.language-option').forEach(option => {
    option.classList.remove('selected');
  });
  
  // Add selected class to current language
  const currentOption = document.querySelector(`[data-lang="${currentLanguage}"]`);
  if (currentOption) {
    currentOption.classList.add('selected');
  }
}

function initializeLanguage() {
  // Get saved language from cookie or default to English
  const savedLanguage = getCookie('selectedLanguage') || 'en';
  loadLanguage(savedLanguage);
}

function switchLanguage(langCode) {
  if (loadLanguage(langCode)) {
    closeLanguageDropdown();
    
    // Re-render dynamic content with new language
    renderCustomerBalanceList();
  }
}

// API Functions
async function fetchBookDetails(bookId = BOOK_ID) {
  try {
    const response = await fetch(
      `${API_BASE}get-book-details.php?book_id=${bookId}`
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error("Error fetching book details:", error);
    throw error;
  }
}

async function fetchCustomers(bookId = BOOK_ID) {
  try {
    const response = await fetch(
      `${API_BASE}get-book-customers.php?book_id=${bookId}`
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
}

async function fetchCustomerHistory(customerName, bookId = BOOK_ID) {
  try {
    const response = await fetch(
      `${API_BASE}get-book-customer-balance-history.php?book_id=${bookId}&customer_name=${encodeURIComponent(
        customerName
      )}`
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error("Error fetching customer history:", error);
    throw error;
  }
}

async function createCustomerBalance(
  customerName,
  type,
  amount,
  reason = null,
  expression = null,
  timestamp = null
) {
  try {
    const requestData = {
      book_id: BOOK_ID,
      customer_name: customerName,
      type: type,
      amount: amount,
      reason: reason,
      expression: expression,
      timestamp:
        timestamp || new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    const response = await fetch(`${API_BASE}customer-balance.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error("Error creating customer balance:", error);
    throw error;
  }
}

function evaluateExpression(raw) {
  if (!raw) return 0;
  // sanitize: only digits . and operators
  let safe = raw.replace(/×/g, "*").replace(/÷/g, "/");
  safe = safe.replace(/[^0-9+\-*/.]/g, "");
  // remove trailing operator
  if (/([+\-*/])$/.test(safe)) safe = safe.slice(0, -1);
  if (!safe) return 0;
  // BODMAS handled by JS eval of sanitized arithmetic
  try {
    // eslint-disable-next-line no-eval
    const val = eval(safe);
    if (typeof val === "number" && isFinite(val)) return val;
    else return 0;
  } catch {
    return 0;
  }
}

// Convert raw expression (with * and /) to display form (× and ÷)
function formatDisplayExpression(expr) {
  if (!expr) return "";
  return expr.replace(/\*/g, "×").replace(/\//g, "÷");
}

// Delete Customer Balance History Function
async function handleDeleteCustomerBalanceHistory(historyId, customerName) {
  try {
    const response = await fetch(
      `${API_BASE}delete-customer-balance-history.php`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history_id: historyId,
          book_id: BOOK_ID,
          customer_name: customerName,
        }),
      }
    );

    const result = await response.json();

    if (result.success) {
      // Update local customer balance data
      const data = customerBalances[customerName];
      if (data) {
        data.total = result.new_customer_balance;

        // Remove from local history array
        const idx = data.history.findIndex((h) => h.id === historyId);
        if (idx > -1) {
          const el = cbhHistoryList.querySelector(
            `.cbh-entry[data-cbh-id="${historyId}"]`
          );
          if (el) {
            el.classList.add("removing");
            setTimeout(() => {
              data.history.splice(idx, 1);
              renderCustomerHistory(customerName);

              // Update current balance display in modal
              cbCurrentBalanceValue.textContent = formatCurrentBalance(
                data.total
              );
              if (data.total > 0)
                cbCurrentBalanceValue.style.color = "var(--green-700)";
              else if (data.total < 0)
                cbCurrentBalanceValue.style.color = "var(--red-700)";
              else
                cbCurrentBalanceValue.style.color = "var(--muted-foreground)";

              // Update customer balance list in sidebar
              renderCustomerBalanceList();
            }, 260);
          } else {
            data.history.splice(idx, 1);
            renderCustomerHistory(customerName);

            // Update current balance display in modal
            cbCurrentBalanceValue.textContent = formatCurrentBalance(
              data.total
            );
            if (data.total > 0)
              cbCurrentBalanceValue.style.color = "var(--green-700)";
            else if (data.total < 0)
              cbCurrentBalanceValue.style.color = "var(--red-700)";
            else cbCurrentBalanceValue.style.color = "var(--muted-foreground)";

            // Update customer balance list in sidebar
            renderCustomerBalanceList();
          }
        }
      }
    } else {
      console.error("Failed to delete history entry:", result.error);
      alert("Failed to delete history entry: " + result.error);
    }
  } catch (error) {
    console.error("Error deleting history entry:", error);
    alert("Error deleting history entry. Please try again.");
  }
}

// Initialize the app
async function init() {
  try {
    // Initialize language system first
    initializeLanguage();
    
    // Load book details first
    currentBook = await fetchBookDetails();

    // Update page title and logo (will be overridden by localization)
    document.title = currentBook.name + " - Tally";
    document.querySelector(".logo-section h2").textContent = currentBook.name;

    // Update logo if available
    if (currentBook.logo_url) {
      const logoImg = document.querySelector(".store-logo");
      if (logoImg) {
        logoImg.src = currentBook.logo_url;
      }
    }
  } catch (error) {
    console.error("Failed to load book details:", error);
    // Continue with defaults
    currentBook = {
      id: BOOK_ID,
      name: "Samad's Store",
      logo_url: "",
    };
  }

  renderCustomerBalanceList();

  // Add touch event listeners for better mobile interaction
  if ("ontouchstart" in window) {
    // Prevent zoom on double tap for buttons
    const buttons = document.querySelectorAll("button");
    buttons.forEach((button) => {
      button.addEventListener("touchstart", function (e) {
        e.target.style.transform = "scale(0.95)";
      });
      button.addEventListener("touchend", function (e) {
        setTimeout(() => {
          e.target.style.transform = "";
        }, 100);
      });
    });
  }
}

// Start the application
init();

// ================= Language Switcher Functions =================

function toggleLanguageDropdown() {
  languageDropdown.classList.toggle("active");
}

function closeLanguageDropdown() {
  languageDropdown.classList.remove("active");
}

// Language switcher event listeners
languageBtn.addEventListener("click", toggleLanguageDropdown);

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".language-switcher")) {
    closeLanguageDropdown();
  }
});

// Language option click handler
document.addEventListener("click", (e) => {
  const langOption = e.target.closest(".language-option");
  if (langOption) {
    const selectedLang = langOption.getAttribute('data-lang');
    if (selectedLang) {
      switchLanguage(selectedLang);
    }
  }
});

// ================= Customer Balance Feature =================

async function openCbSidebar() {
  cbSidebar.classList.add("active");
  cbOverlayBg.classList.add("active");
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";

  // Load customers from API
  await loadCustomersFromAPI();
}

function closeCbSidebarHandler() {
  cbSidebar.classList.remove("active");
  cbOverlayBg.classList.remove("active");
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
}

function openCbModal(editCustomerName = null) {
  cbEditingCustomer = editCustomerName;
  // reset CB calc state
  cbExpression = "";
  cbDisplay = "0";
  cbLastEvaluated = 0;
  updateCbCalcDisplay();
  renderCbExpression();
  if (editCustomerName) {
    // EDIT MODE
    cbModalTitle.textContent = currentTranslations.editCustomer || "Edit Customer";
    cbNameInput.value = editCustomerName;
    cbNameInput.disabled = true;
    cbReasonInput.value = "";
    const data = customerBalances[editCustomerName];
    if (data) {
      cbCurrentBalanceValue.textContent = formatCurrentBalance(data.total);
      cbCurrentBalance.style.display = "block";
      // apply color by sign
      if (data.total > 0) {
        cbCurrentBalanceValue.style.color = "var(--green-700)";
      } else if (data.total < 0) {
        cbCurrentBalanceValue.style.color = "var(--red-700)";
      } else {
        cbCurrentBalanceValue.style.color = "var(--muted-foreground)";
      }
    } else {
      cbCurrentBalance.style.display = "none";
    }
  } else {
    // ADD MODE
    cbModalTitle.textContent = currentTranslations.addCustomer || "Add Customer";
    cbNameInput.value = "";
    cbNameInput.disabled = false;
    cbReasonInput.value = "";
    cbCurrentBalance.style.display = "none";
  }
  cbModalOverlay.classList.add("active");
  // slight defer to allow animation
  setTimeout(() => {
    cbNameInput.focus();
  }, 50);
}

function closeCbModalHandler() {
  cbModalOverlay.classList.remove("active");
  cbEditingCustomer = null;
}

async function openCbhModal(customerName) {
  cbhModalTitle.textContent = customerName + " " + (currentTranslations.historyTitle || "History");
  cbHistoryCustomer = customerName;

  // Load customer history from API
  try {
    const historyData = await fetchCustomerHistory(customerName);

    // Update local customer history
    if (customerBalances[customerName]) {
      customerBalances[customerName].history = historyData.history.map((h) => ({
        ...h,
        timestamp: new Date(h.timestamp),
      }));
    }

    renderCustomerHistory(customerName);
  } catch (error) {
    console.error("Failed to load customer history:", error);
    cbhHistoryList.innerHTML =
      '<div class="cb-empty">Failed to load history</div>';
  }

  cbhModalOverlay.classList.add("active");
}

function closeCbhModalHandler() {
  cbhModalOverlay.classList.remove("active");
}

function saveCustomerBalanceEntry() {
  const nameRaw = cbNameInput.value.trim();
  if (!nameRaw) return; // require name
  const name = nameRaw; // keep original case
  const reason = cbReasonInput.value.trim();
  // Only used for ADD MODE now (cbEditingCustomer === null)
  if (cbEditingCustomer) return; // edit mode shouldn't trigger save
  const initialAmount = evaluateCbExpression(cbExpression);
  if (isNaN(initialAmount) || initialAmount === 0) return;
  const entry = {
    id: Date.now().toString(),
    amount: initialAmount,
    reason: reason || (currentTranslations.initialEntry || "Initial entry"),
    timestamp: new Date(),
  };
  if (!customerBalances[name]) {
    customerBalances[name] = { total: initialAmount, history: [entry] };
  } else {
    customerBalances[name].history.unshift(entry);
    customerBalances[name].total += initialAmount;
  }
  closeCbModalHandler();
  renderCustomerBalanceList();
}

async function loadCustomersFromAPI() {
  try {
    const customersData = await fetchCustomers();

    // Update local customerBalances object
    customerBalances = {};
    customersData.customers.forEach((customer) => {
      customerBalances[customer.name] = {
        total: customer.total_balance,
        history: [], // Will be loaded when needed
      };
    });

    renderCustomerBalanceList();

    // Update totals
    const totals = customersData.totals;
    cbTotalPaid.textContent = formatCurrency(totals.total_paid);
    cbTotalUnpaid.textContent = formatCurrency(totals.total_unpaid);
    cbTotals.style.display =
      customersData.customers.length > 0 ? "grid" : "none";
  } catch (error) {
    console.error("Failed to load customers:", error);
    cbList.innerHTML = '<div class="cb-empty">Failed to load customers</div>';
  }
}

function renderCustomerBalanceList() {
  const names = Object.keys(customerBalances);
  let filtered = names;
  if (cbSearchQuery) {
    const q = cbSearchQuery.toLowerCase();
    filtered = names.filter((n) => n.toLowerCase().includes(q));
  }
  // Totals across all customers
  let totalPositive = 0;
  let totalNegative = 0; // stored as negative sums
  names.forEach((n) => {
    const t = customerBalances[n].total;
    if (t >= 0) totalPositive += t;
    else totalNegative += t;
  });
  if (names.length === 0) {
    if (cbTotals) cbTotals.style.display = "none";
  } else {
    if (cbTotals) {
      cbTotals.style.display = "grid";
      if (cbTotalPaid) cbTotalPaid.textContent = formatCurrency(totalPositive);
      if (cbTotalUnpaid)
        cbTotalUnpaid.textContent = formatCurrency(Math.abs(totalNegative));
    }
  }
  if (filtered.length === 0) {
    cbList.innerHTML =
      '<div class="cb-empty">' +
      (names.length === 0 ? "No customers yet" : "No matches") +
      "</div>";
    return;
  }
  filtered.sort((a, b) => a.localeCompare(b));
  cbList.innerHTML = filtered
    .map((name) => {
      const data = customerBalances[name];
      const amount = data.total;
      const cls = amount >= 0 ? "positive" : "negative";
      const displayAmount =
        amount >= 0
          ? "+" + formatCurrency(amount)
          : "-" + formatCurrency(Math.abs(amount));
      return `<div class="cb-row" data-name="${encodeURIComponent(name)}">
            <span class="cb-row-name">${name}</span>
            <span class="cb-row-amount ${cls}">${displayAmount}</span>
        </div>`;
    })
    .join("");
}

function renderCustomerHistory(customerName) {
  const data = customerBalances[customerName];
  if (!data) {
    cbhHistoryList.innerHTML = '<div class="cb-empty">No history</div>';
    return;
  }
  if (data.history.length === 0) {
    cbhHistoryList.innerHTML = '<div class="cb-empty">No history</div>';
    return;
  }
  cbhHistoryList.innerHTML = data.history
    .map((h) => {
      // Use type field to determine display: paid = positive (green), unpaid = negative (red)
      const isPaid = h.type === "paid" || (!h.type && h.amount >= 0); // fallback for old records
      const cls = isPaid ? "positive" : "negative";
      const displayAmount = Math.abs(h.amount); // Always use absolute value for display
      const amt = isPaid
        ? "+" + formatCurrency(displayAmount)
        : "-" + formatCurrency(displayAmount);
      const exprHtml = h.expression
        ? `<div class="transaction-expression">${escapeHtml(
            localizeDigitsInExpression(formatDisplayExpression(h.expression))
          )} = ${formatCurrency(displayAmount)}</div>`
        : "";
      return `<div class="cbh-entry" data-cbh-id="${h.id}">
            <div class="cbh-entry-line">
                <span class="cbh-entry-amount ${cls}">${amt}</span>
                <span class="cbh-entry-time">${formatTimeFull(
                  h.timestamp
                )}</span>
                <button class="tx-delete-btn" aria-label="Delete" data-cbh-del="${
                  h.id
                }"><span class="material-symbols-outlined icon-lg">delete</span></button>
            </div>
            ${exprHtml}
            ${
              h.reason
                ? `<div class="cbh-entry-reason">${escapeHtml(h.reason)}</div>`
                : ""
            }
        </div>`;
    })
    .join("");
}

function escapeHtml(str) {
  return str.replace(
    /[&<>"]|'/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ] || c)
  );
}

// Long press detection on customer rows to open CBH modal
cbList.addEventListener("mousedown", (e) => {
  const row = e.target.closest(".cb-row");
  if (!row) return;
  const name = decodeURIComponent(row.dataset.name);
  cbLongPressTimer = setTimeout(() => {
    openCbhModal(name);
  }, 600);
});
cbList.addEventListener("mouseup", () => {
  clearTimeout(cbLongPressTimer);
});
cbList.addEventListener("mouseleave", () => {
  clearTimeout(cbLongPressTimer);
});
cbList.addEventListener("touchstart", (e) => {
  const row = e.target.closest(".cb-row");
  if (!row) return;
  const name = decodeURIComponent(row.dataset.name);
  cbLongPressTimer = setTimeout(() => {
    openCbhModal(name);
  }, 600);
});
cbList.addEventListener("touchend", () => {
  clearTimeout(cbLongPressTimer);
});
cbList.addEventListener("touchmove", () => {
  clearTimeout(cbLongPressTimer);
});

// Click to edit (short press)
cbList.addEventListener("click", (e) => {
  clearTimeout(cbLongPressTimer);
  const row = e.target.closest(".cb-row");
  if (!row) return;
  const name = decodeURIComponent(row.dataset.name);
  openCbModal(name);
});

// Event listeners for new UI
customerBalanceBtn.addEventListener("click", openCbSidebar);
closeCbSidebar.addEventListener("click", closeCbSidebarHandler);
cbOverlayBg.addEventListener("click", closeCbSidebarHandler);
cbAddBtn.addEventListener("click", () => openCbModal(null));
closeCbModal.addEventListener("click", closeCbModalHandler);
cbModalOverlay.addEventListener("click", (e) => {
  if (e.target === cbModalOverlay) closeCbModalHandler();
});
cbhModalOverlay.addEventListener("click", (e) => {
  if (e.target === cbhModalOverlay) closeCbhModalHandler();
});
closeCbhModal.addEventListener("click", closeCbhModalHandler);
cbSearch.addEventListener("input", () => {
  cbSearchQuery = cbSearch.value;
  renderCustomerBalanceList();
});

async function applyCbDelta(sign) {
  // +1 Paid, -1 Unpaid (self-contained like old input logic)
  const nameRaw = cbNameInput.value.trim();
  if (!nameRaw) return;

  // Finalize expression locally (no need for external performCbCalculation)
  if (/([+\-*/])$/.test(cbExpression)) {
    cbExpression = cbExpression.slice(0, -1); // trim trailing operator
  }

  let entered = 0;
  if (cbExpression) {
    entered = evaluateCbExpression(cbExpression);
  } else if (cbDisplay && cbDisplay !== "0") {
    const rawNum = parseFloat(cbDisplay);
    if (!isNaN(rawNum)) entered = rawNum;
  }

  if (isNaN(entered) || entered <= 0) return; // ignore zero / invalid

  const reason = cbReasonInput.value.trim();
  const type = sign > 0 ? "paid" : "unpaid";
  const expression = cbExpression || cbDisplay || "";

  try {
    // Save to API
    const result = await createCustomerBalance(
      nameRaw,
      type,
      entered,
      reason || (sign > 0 ? "Paid" : "Unpaid"),
      expression
    );

    // Update local state
    if (!customerBalances[nameRaw]) {
      customerBalances[nameRaw] = { total: 0, history: [] };
    }

    // Switch to edit mode if first time
    if (!cbEditingCustomer) {
      cbEditingCustomer = nameRaw;
      cbNameInput.disabled = true;
      cbCurrentBalance.style.display = "block";
    }

    const data = customerBalances[nameRaw];
    data.total = result.new_balance; // Use server balance

    // Add to history
    data.history.unshift({
      id: result.history_id,
      amount: sign * entered,
      reason: reason || (sign > 0 ? "Paid" : "Unpaid"),
      timestamp: new Date(),
      expression: expression,
      type: type,
    });

    // reset cb calculator
    cbExpression = "";
    cbDisplay = "0";
    cbLastEvaluated = 0;
    updateCbCalcDisplay();
    renderCbExpression();
    cbReasonInput.value = "";
    cbCurrentBalanceValue.textContent = formatCurrentBalance(data.total);

    // dynamic color update
    if (data.total > 0) {
      cbCurrentBalanceValue.style.color = "var(--green-700)";
    } else if (data.total < 0) {
      cbCurrentBalanceValue.style.color = "var(--red-700)";
    } else {
      cbCurrentBalanceValue.style.color = "var(--muted-foreground)";
    }

    renderCustomerBalanceList();
  } catch (error) {
    console.error("Failed to save customer balance:", error);
    alert("Failed to save customer balance. Please try again.");
  }
}

// ===== Embedded Customer Balance Calculator Functions =====
function updateCbCalcDisplay() {
  if (cbCalcDisplay) {
    const displayValue = cbDisplay || "0";
    // For calculator display, show localized digits while keeping calculations in English
    if (!isNaN(parseFloat(displayValue)) && displayValue.indexOf('.') === -1 && displayValue.length > 3) {
      cbCalcDisplay.textContent = localizeDigitsInExpression(formatNumber(displayValue));
    } else {
      cbCalcDisplay.textContent = localizeDigitsInExpression(displayValue);
    }
  }
}
function renderCbExpression() {
  if (!cbCalcExpression) return;
  if (!cbExpression) cbCalcExpression.textContent = "";
  else cbCalcExpression.textContent = localizeDigitsInExpression(formatDisplayExpression(cbExpression));
}
function cbInputNumber(num) {
  const endsWithOp = /[+\-*/]$/.test(cbExpression);
  const lastToken = cbExpression.match(/([0-9]*\.?[0-9]*)$/)?.[0] || "";
  if (num === "." && lastToken.includes(".")) return;
  cbExpression += num;
  const m = cbExpression.match(/([0-9]*\.?[0-9]*)$/);
  cbDisplay = m && m[0] ? m[0] : "0";
  updateCbCalcDisplay();
  renderCbExpression();
}
function cbInputOperator(op) {
  if (!cbExpression && cbDisplay !== "0") cbExpression = cbDisplay;
  if (/([+\-*/])$/.test(cbExpression))
    cbExpression = cbExpression.slice(0, -1) + op;
  else cbExpression += op;
  const provisional = evaluateCbExpression(cbExpression);
  cbDisplay = String(provisional);
  renderCbExpression();
  updateCbCalcDisplay();
}
function cbPercent() {
  const match = cbExpression.match(/([0-9]*\.?[0-9]*)$/);
  if (match && match[0]) {
    const numStr = match[0];
    const num = parseFloat(numStr);
    if (!isNaN(num)) {
      const percentVal = num / 100;
      cbExpression = cbExpression.slice(0, -numStr.length) + percentVal;
      cbDisplay = String(percentVal);
      updateCbCalcDisplay();
      renderCbExpression();
    }
  }
}
function cbBackspace() {
  if (!cbExpression) return;
  cbExpression = cbExpression.slice(0, -1);
  const m = cbExpression.match(/([0-9]*\.?[0-9]*)$/);
  cbDisplay = m && m[0] ? m[0] : "0";
  updateCbCalcDisplay();
  renderCbExpression();
}
function cbClear() {
  cbExpression = "";
  cbDisplay = "0";
  cbLastEvaluated = 0;
  updateCbCalcDisplay();
  renderCbExpression();
}
function evaluateCbExpression(raw) {
  return evaluateExpression(raw);
}
function performCbCalculation() {
  if (/([+\-*/])$/.test(cbExpression)) cbExpression = cbExpression.slice(0, -1);
  const val = evaluateCbExpression(cbExpression);
  cbLastEvaluated = val;
  cbDisplay = String(val || 0);
  updateCbCalcDisplay();
}

// CB calculator button click delegation (and CBH delete delegation)
document.addEventListener("click", (e) => {
  const cbBtn = e.target.closest(".cb-kp-btn");
  if (cbBtn) {
    if (cbBtn.dataset.number) cbInputNumber(cbBtn.dataset.number);
    else if (cbBtn.dataset.op) cbInputOperator(cbBtn.dataset.op);
    else if (cbBtn.dataset.action) {
      const a = cbBtn.dataset.action;
      if (a === "allclear") cbClear();
      else if (a === "backspace") cbBackspace();
      else if (a === "percent") cbPercent();
      else if (a === "equals") performCbCalculation();
    }
  }
  // delete customer balance history entry - check for tx-delete-btn with data-cbh-del
  const cbhDelBtn = e.target.closest(".tx-delete-btn[data-cbh-del]");
  if (cbhDelBtn && cbHistoryCustomer) {
    e.preventDefault();
    e.stopPropagation();
    const id = cbhDelBtn.dataset.cbhDel;
    handleDeleteCustomerBalanceHistory(id, cbHistoryCustomer);
  }
});

// Button handlers (new unified buttons)
const cbPaidBtn = document.getElementById("cbPaidBtn");
const cbUnpaidBtn = document.getElementById("cbUnpaidBtn");
cbPaidBtn &&
  cbPaidBtn.addEventListener("click", () => {
    applyCbDelta(+1);
  });
cbUnpaidBtn &&
  cbUnpaidBtn.addEventListener("click", () => {
    applyCbDelta(-1);
  });

// Keyboard for CB calc when modal active (Enter=Paid, Ctrl+Enter=Unpaid)
document.addEventListener("keydown", (e) => {
  if (!cbModalOverlay.classList.contains("active")) return;
  // avoid interfering when typing name or reason
  const active = document.activeElement;
  const inText = active === cbNameInput || active === cbReasonInput;
  if (inText) return;
  const k = e.key;
  if ("0123456789".includes(k)) {
    cbInputNumber(k);
  } else if (k === ".") {
    cbInputNumber(".");
  } else if (["+", "-", "*", "/"].includes(k)) {
    cbInputOperator(k);
  } else if (k === "%") {
    cbPercent();
  } else if (k === "Backspace") {
    cbBackspace();
  } else if (k === "Enter" || k === "=") {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) applyCbDelta(-1);
    else applyCbDelta(+1);
  } else if (k.toLowerCase() === "c") {
    cbClear();
  }
});

// Removed save state logic.

// Escape key handling integration (extend existing listener or add new) - add new listener
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (cbSidebar.classList.contains("active")) closeCbSidebarHandler();
    if (cbModalOverlay.classList.contains("active")) closeCbModalHandler();
    if (cbhModalOverlay.classList.contains("active")) closeCbhModalHandler();
  }
});

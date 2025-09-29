// Global State
let cashAmount = "";
let isCalculatorOpen = false;
let isHistoryOpen = false;
let transactions = [];
let currentBook = null; // Store current book details
// Customer Balance State
let customerBalances = {}; // { customerName: { total: number, history: [ { id, amount, reason, timestamp } ] } }
let cbEditingCustomer = null; // name when editing existing
let cbHistoryCustomer = null; // name when editing existing
let cbLongPressTimer = null;
let cbSearchQuery = "";
// Customer Balance adjustment working state
// (Removed old working delta state variables after refactor)

// API Configuration
const API_BASE = "../api/";
const BOOK_ID = 1; // Default book ID (Samad's Store)

// Calculator State
let display = "0";
// For new expression-first calculator; we keep a raw expression string.
let expression = ""; // full expression user builds (e.g. "5+10*3")
let lastEvaluatedValue = 0; // store last computed numeric value

// DOM Elements
const cashInput = document.getElementById("cashInput");
const calculatorOverlay = document.getElementById("calculatorOverlay");
const calculatorBg = document.getElementById("calculatorBg");
const calculator = document.getElementById("calculator");
const calculatorDisplay = document.getElementById("calculatorDisplay");
const calculatorExpression = document.getElementById("calculatorExpression");
const closeCalculator = document.getElementById("closeCalculator");
const historyBtn = document.getElementById("historyBtn");
const historySidebar = document.getElementById("historySidebar");
const historyOverlayBg = document.getElementById("historyOverlayBg");
const closeHistory = document.getElementById("closeHistory");
const balanceDisplay = document.getElementById("balanceDisplay");
const balanceAmount = document.getElementById("balanceAmount");
const quickBtns = document.querySelectorAll(".quick-btn");
const cashInBtn = document.getElementById("cashInBtn");
const cashOutBtn = document.getElementById("cashOutBtn");
const transactionList = document.getElementById("transactionList");
const emptyState = document.getElementById("emptyState");
const totalCashIn = document.getElementById("totalCashIn");
const totalCashOut = document.getElementById("totalCashOut");
const netAmount = document.getElementById("netAmount");
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
  // Format with two decimals
  return "৳ " + num.toFixed(2);
}

function formatCurrentBalance(value) {
  // Format current balance with proper minus sign placement
  if (value === "" || value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return value;

  if (num >= 0) {
    return "৳ " + num.toFixed(2);
  } else {
    return "-৳ " + Math.abs(num).toFixed(2);
  }
}

function formatTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTimeFull(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

async function fetchTransactionHistory(bookId = BOOK_ID) {
  try {
    const response = await fetch(
      `${API_BASE}get-book-transaction-history.php?book_id=${bookId}`
    );
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) {
    console.error("Error fetching transaction history:", error);
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

async function createTransaction(
  type,
  amount,
  expression = null,
  timestamp = null
) {
  try {
    const requestData = {
      book_id: BOOK_ID,
      type: type,
      amount: amount,
      expression: expression,
      timestamp:
        timestamp || new Date().toISOString().slice(0, 19).replace("T", " "),
    };

    const response = await fetch(`${API_BASE}transaction.php`, {
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
    console.error("Error creating transaction:", error);
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

// Calculator Functions
function inputNumber(num) {
  const endsWithOp = /[+\-*/]$/.test(expression);
  const lastToken = expression.match(/([0-9]*\.?[0-9]*)$/)?.[0] || "";
  if (num === "." && lastToken.includes(".")) return; // prevent double decimal in current operand

  if (endsWithOp) {
    // Start a fresh operand after an operator
    display = num === "." ? "0." : num;
    expression += num;
  } else {
    if (display === "0" && num !== ".") display = num;
    else display += num;
    expression += num;
  }
  updateCalculatorDisplay();
  renderExpression();
}
function inputOperator(op) {
  if (!expression && display !== "0") {
    expression = display;
  }
  // replace trailing operator
  if (/([+\-*/])$/.test(expression)) {
    expression = expression.slice(0, -1) + op;
  } else if (expression) {
    expression += op;
  }
  // Show live evaluated value ignoring the trailing operator
  const provisional = evaluateExpression(expression);
  display = String(provisional);
  renderExpression();
  updateCalculatorDisplay();
}
function percentAction() {
  // Apply percent to last number token
  const match = expression.match(/([0-9]*\.?[0-9]*)$/);
  if (match && match[0]) {
    const num = parseFloat(match[0]);
    const repl = (num / 100).toString();
    expression = expression.slice(0, -match[0].length) + repl;
    display = repl;
    renderExpression();
    updateCalculatorDisplay();
  }
}
function backspace() {
  if (!expression) return;
  expression = expression.slice(0, -1);
  // recompute display: last number token or 0
  const m = expression.match(/([0-9]*\.?[0-9]*)$/);
  display = m && m[0] ? m[0] : "0";
  updateCalculatorDisplay();
  renderExpression();
}
function clearCalculator() {
  expression = "";
  display = "0";
  lastEvaluatedValue = 0;
  updateCalculatorDisplay();
  renderExpression();
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
function performCalculation() {
  // Remove trailing operator if present
  if (/([+\-*/])$/.test(expression)) expression = expression.slice(0, -1);
  const val = evaluateExpression(expression);
  lastEvaluatedValue = val;
  display = String(val);
  updateCalculatorDisplay();
}

function updateCalculatorDisplay() {
  calculatorDisplay.textContent = display || "0";
}

function renderExpression() {
  if (!calculatorExpression) return;
  if (!expression) {
    calculatorExpression.textContent = "";
  } else {
    // Display-friendly expression: show × and ÷ instead of * and /
    calculatorExpression.textContent = formatDisplayExpression(expression);
  }
}

// Convert raw expression (with * and /) to display form (× and ÷)
function formatDisplayExpression(expr) {
  if (!expr) return "";
  return expr.replace(/\*/g, "×").replace(/\//g, "÷");
}

// Transaction Functions
async function addTransaction(type, amount, exprStr) {
  try {
    const result = await createTransaction(type, amount, exprStr);

    // Update local state
    const transaction = {
      id: result.transaction_id,
      type: type,
      amount: amount,
      expression: exprStr || "",
      timestamp: new Date(),
    };
    transactions.unshift(transaction);

    // Update UI with new balance from server
    currentBook.current_balance = result.new_balance;
    updateBalance();

    // Note: We don't call updateTransactionHistory() here because it will be called
    // when the user clicks the history button, avoiding unnecessary API calls

    return result;
  } catch (error) {
    console.error("Failed to add transaction:", error);
    alert("Failed to save transaction. Please try again.");
    throw error;
  }
}

function updateBalance() {
  if (currentBook && currentBook.current_balance !== undefined) {
    balanceAmount.textContent = formatCurrency(currentBook.current_balance);
    balanceDisplay.style.display = "block";
  } else {
    balanceDisplay.style.display = "none";
  }
}

async function updateTransactionHistory() {
  try {
    const historyData = await fetchTransactionHistory();

    // Update local transactions array
    transactions = historyData.transactions.map((t) => ({
      ...t,
      timestamp: new Date(t.timestamp),
    }));

    // Update summary
    const summary = historyData.summary;
    totalCashIn.textContent = formatCurrency(summary.total_cash_in);
    totalCashOut.textContent = formatCurrency(summary.total_cash_out);
    netAmount.textContent = formatCurrency(summary.net_amount);
    netAmount.className =
      "summary-value " + (summary.net_amount >= 0 ? "cash-in" : "cash-out");

    // Update transaction list
    if (transactions.length === 0) {
      emptyState.style.display = "block";
      transactionList.innerHTML =
        '<div class="empty-state">No transactions yet</div>';
    } else {
      emptyState.style.display = "none";
      // Ensure CSS classes match hyphenated style used in styles.css (cash-in / cash-out)
      transactionList.innerHTML = transactions
        .map((transaction) => {
          const hyphenClass = transaction.type.replace("_", "-");
          const label = transaction.type
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());
          const sign = transaction.type === "cash_in" ? "+" : "-";
          return `
                <div class="transaction-item" data-id="${transaction.id}">
                    <div class="transaction-info">
                        <div class="transaction-type">
                            <span class="type-indicator ${hyphenClass}"></span>
                            <span>${label}</span>
                        </div>
                        <div class="transaction-time">${formatTime(
                          transaction.timestamp
                        )}</div>
                        ${
                          transaction.expression
                            ? `<div class="transaction-expression">${escapeHtml(
                                formatDisplayExpression(transaction.expression)
                              )} = ${formatCurrency(transaction.amount)}</div>`
                            : ""
                        }
                    </div>
                    <div class="transaction-right">
                        <div class="transaction-amount ${hyphenClass}">${sign}${formatCurrency(
            transaction.amount
          )}</div>
                        <button class="tx-delete-btn" aria-label="Delete" data-del="${
                          transaction.id
                        }"><span class="material-symbols-outlined icon-lg">delete</span></button>
                    </div>
                </div>`;
        })
        .join("");
    }
  } catch (error) {
    console.error("Failed to update transaction history:", error);
    // Show local data if available
    transactionList.innerHTML =
      '<div class="empty-state">Failed to load transaction history</div>';
  }
}

// clearHistory removed per request — history can still be cleared programmatically if needed

// UI Control Functions
function openCalculator() {
  isCalculatorOpen = true;
  calculatorOverlay.classList.add("active");

  // Prevent scrolling on mobile
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";

  // Set initial value if cashAmount exists
  if (cashAmount) {
    display = cashAmount;
    updateCalculatorDisplay();
  }

  // Small delay to ensure smooth animation
  setTimeout(() => {
    // Ensure calculator is visible
    const calculatorElement = document.getElementById("calculator");
    if (calculatorElement) {
      calculatorElement.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, 100);
}

function closeCalculatorHandler() {
  isCalculatorOpen = false;
  calculatorOverlay.classList.remove("active");

  // Restore body scrolling
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";

  // When closing the calculator without performing Cash In/Out, store the current
  // calculation into the cash input so user can see what they entered.
  // If the display holds a numeric value, keep it in the cashInput; otherwise reset placeholder.
  if (!isNaN(parseFloat(display)) && display !== "0") {
    cashAmount = display;
    cashInput.value = formatCurrency(display);
  } else {
    // Reset to placeholder
    cashAmount = "";
    cashInput.value = "";
    cashInput.placeholder = "Enter cash amount";
  }

  // Do not clear calculator state on close so calculations are preserved if reopened
}

async function openHistory() {
  isHistoryOpen = true;
  historySidebar.classList.add("active");
  historyOverlayBg.classList.add("active");

  // Prevent scrolling on mobile
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";

  // Load transaction history from API
  await updateTransactionHistory();
}

function closeHistoryHandler() {
  isHistoryOpen = false;
  historySidebar.classList.remove("active");
  historyOverlayBg.classList.remove("active");

  // Restore body scrolling
  document.body.style.overflow = "";
  document.body.style.position = "";
  document.body.style.width = "";
}

async function handleCashIn() {
  // Evaluate full expression first
  performCalculation();
  const amount = evaluateExpression(expression);
  if (!isNaN(amount) && amount > 0) {
    try {
      await addTransaction("cash_in", amount, expression);
      cashAmount = amount.toString();
      clearCalculator();
      cashInput.value = "";
      cashInput.placeholder = "Enter cash amount";
      closeCalculatorHandler();
    } catch (error) {
      // Error is already handled in addTransaction
    }
  }
}

async function handleCashOut() {
  performCalculation();
  const amount = evaluateExpression(expression);
  if (!isNaN(amount) && amount > 0) {
    try {
      await addTransaction("cash_out", amount, expression);
      cashAmount = amount.toString();
      clearCalculator();
      cashInput.value = "";
      cashInput.placeholder = "Enter cash amount";
      closeCalculatorHandler();
    } catch (error) {
      // Error is already handled in addTransaction
    }
  }
}

// Event Listeners
cashInput.addEventListener("click", openCalculator);

closeCalculator.addEventListener("click", closeCalculatorHandler);
calculatorBg.addEventListener("click", closeCalculatorHandler);

historyBtn.addEventListener("click", openHistory);
closeHistory.addEventListener("click", closeHistoryHandler);
historyOverlayBg.addEventListener("click", closeHistoryHandler);

// clear history button removed; no event listener necessary

cashInBtn.addEventListener("click", handleCashIn);
cashOutBtn.addEventListener("click", handleCashOut);

// Quick amount buttons
quickBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const amount = btn.dataset.amount;
    // Set calculator display to the quick amount so user can immediately Cash In/Out
    display = String(amount);
    // Initialize expression to this amount so operators will append to it
    expression = String(amount);
    updateCalculatorDisplay();
    renderExpression();
    // Also update the cash input preview
    cashAmount = amount;
    cashInput.value = formatCurrency(amount);
    openCalculator();
  });
});

// Calculator button event listeners
// Handle clicks on calculator buttons. Use closest to allow clicking on inner icons/spans.
document.addEventListener("click", (e) => {
  // MAIN calculator buttons (use original classes)
  const mainBtn = e.target.closest(".kp-btn");
  if (mainBtn && !e.target.closest(".cb-keypad-grid")) {
    if (mainBtn.dataset.number) inputNumber(mainBtn.dataset.number);
    else if (mainBtn.dataset.op) inputOperator(mainBtn.dataset.op);
    else if (mainBtn.dataset.action) {
      const a = mainBtn.dataset.action;
      if (a === "allclear") clearCalculator();
      else if (a === "backspace") backspace();
      else if (a === "percent") percentAction();
      else if (a === "equals") performCalculation();
      else if (a === "downclose") closeCalculatorHandler();
    }
  }
  // CB calculator dedicated buttons
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
  // delete transaction
  const delBtn = e.target.closest("[data-del]");
  if (delBtn) {
    const id = delBtn.dataset.del;
    handleDeleteTransaction(id);
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

// Keyboard event listeners
document.addEventListener("keydown", (e) => {
  if (!isCalculatorOpen) return;
  const k = e.key;
  if ("0123456789".includes(k)) inputNumber(k);
  else if (k === ".") inputNumber(".");
  else if (["+", "-", "*", "/"].includes(k)) inputOperator(k);
  else if (k === "%") percentAction();
  else if (k === "Backspace") {
    backspace();
  } else if (k === "Enter" || k === "=") {
    performCalculation();
  } else if (k === "Escape") {
    closeCalculatorHandler();
  } else if (k.toLowerCase() === "c") {
    clearCalculator();
  }
});

// Prevent body scroll when overlays are open
document.addEventListener("keydown", (e) => {
  if ((isCalculatorOpen || isHistoryOpen) && e.key === "Escape") {
    if (isCalculatorOpen) closeCalculatorHandler();
    if (isHistoryOpen) closeHistoryHandler();
  }
});

// Delete Transaction Function
async function handleDeleteTransaction(transactionId) {
  try {
    const response = await fetch(`${API_BASE}delete-transaction.php`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction_id: transactionId,
        book_id: BOOK_ID,
      }),
    });

    const result = await response.json();

    if (result.success) {
      // Update current book balance
      if (currentBook) {
        currentBook.current_balance = result.new_balance;
      }

      // Remove from local transactions array
      const idx = transactions.findIndex((t) => t.id === transactionId);
      if (idx > -1) {
        const el = transactionList.querySelector(
          `.transaction-item[data-id="${transactionId}"]`
        );
        if (el) {
          el.classList.add("removing");
          setTimeout(() => {
            transactions.splice(idx, 1);
            updateTransactionHistory();
            updateBalance();
          }, 260);
        } else {
          transactions.splice(idx, 1);
          updateTransactionHistory();
          updateBalance();
        }
      }
    } else {
      console.error("Failed to delete transaction:", result.error);
      alert("Failed to delete transaction: " + result.error);
    }
  } catch (error) {
    console.error("Error deleting transaction:", error);
    alert("Error deleting transaction. Please try again.");
  }
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
    // Load book details first
    currentBook = await fetchBookDetails();

    // Update page title and logo
    document.title = currentBook.name + " - Tally";
    document.querySelector(".logo-section h2").textContent = currentBook.name;

    // Update logo if available
    if (currentBook.logo_url) {
      const logoImg = document.querySelector(".store-logo");
      if (logoImg) {
        logoImg.src = currentBook.logo_url;
      }
    }

    // Update balance
    updateBalance();
  } catch (error) {
    console.error("Failed to load book details:", error);
    // Continue with defaults
    currentBook = {
      id: BOOK_ID,
      name: "Samad's Store",
      current_balance: 0,
      logo_url: "",
    };
  }

  updateCalculatorDisplay();
  renderCustomerBalanceList();

  // Add touch event listeners for better mobile interaction
  if ("ontouchstart" in window) {
    // Prevent zoom on double tap for buttons
    const buttons = document.querySelectorAll(
      "button, .calc-btn, .quick-btn, .cash-btn"
    );
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

    // Prevent viewport resize issues
    let lastHeight = window.innerHeight;
    window.addEventListener("resize", () => {
      // Only handle height changes that might be keyboard related
      if (Math.abs(window.innerHeight - lastHeight) > 150) {
        if (isCalculatorOpen) {
          const calculator = document.getElementById("calculator");
          if (calculator) {
            calculator.style.height = window.innerHeight * 0.9 + "px";
          }
        }
      }
      lastHeight = window.innerHeight;
    });
  }
}

// Start the application
init();

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
    cbModalTitle.textContent = "Edit Customer";
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
    cbModalTitle.textContent = "Add Customer";
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
  cbhModalTitle.textContent = customerName + " History";
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
    reason: reason || "Initial entry",
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
            formatDisplayExpression(h.expression)
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
  if (cbCalcDisplay) cbCalcDisplay.textContent = cbDisplay || "0";
}
function renderCbExpression() {
  if (!cbCalcExpression) return;
  if (!cbExpression) cbCalcExpression.textContent = "";
  else cbCalcExpression.textContent = formatDisplayExpression(cbExpression);
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

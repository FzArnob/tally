// Global State
let cashAmount = '';
let isCalculatorOpen = false;
let isHistoryOpen = false;
let transactions = [];
// Customer Balance State
let customerBalances = {}; // { customerName: { total: number, history: [ { id, amount, reason, timestamp } ] } }
let cbEditingCustomer = null; // name when editing existing
let cbLongPressTimer = null;
let cbSearchQuery = '';
// Customer Balance adjustment working state
// (Removed old working delta state variables after refactor)

// Calculator State
let display = '0';
// For new expression-first calculator; we keep a raw expression string.
let expression = ''; // full expression user builds (e.g. "5+10*3")
let lastEvaluatedValue = 0; // store last computed numeric value

// DOM Elements
const cashInput = document.getElementById('cashInput');
const calculatorOverlay = document.getElementById('calculatorOverlay');
const calculatorBg = document.getElementById('calculatorBg');
const calculator = document.getElementById('calculator');
const calculatorDisplay = document.getElementById('calculatorDisplay');
const calculatorExpression = document.getElementById('calculatorExpression');
const closeCalculator = document.getElementById('closeCalculator');
const historyBtn = document.getElementById('historyBtn');
const historySidebar = document.getElementById('historySidebar');
const historyOverlayBg = document.getElementById('historyOverlayBg');
const closeHistory = document.getElementById('closeHistory');
const balanceDisplay = document.getElementById('balanceDisplay');
const balanceAmount = document.getElementById('balanceAmount');
const quickBtns = document.querySelectorAll('.quick-btn');
const cashInBtn = document.getElementById('cashInBtn');
const cashOutBtn = document.getElementById('cashOutBtn');
const transactionList = document.getElementById('transactionList');
const emptyState = document.getElementById('emptyState');
const totalCashIn = document.getElementById('totalCashIn');
const totalCashOut = document.getElementById('totalCashOut');
const netAmount = document.getElementById('netAmount');
// Customer Balance DOM
const customerBalanceBtn = document.getElementById('customerBalanceBtn');
const cbSidebar = document.getElementById('cbSidebar');
const cbOverlayBg = document.getElementById('cbOverlayBg');
const closeCbSidebar = document.getElementById('closeCbSidebar');
const cbSearch = document.getElementById('cbSearch');
const cbAddBtn = document.getElementById('cbAddBtn');
const cbList = document.getElementById('cbList');
const cbEmptyState = document.getElementById('cbEmptyState');
const cbTotals = document.getElementById('cbTotals');
const cbTotalPaid = document.getElementById('cbTotalPaid');
const cbTotalUnpaid = document.getElementById('cbTotalUnpaid');
// CB Modal
const cbModalOverlay = document.getElementById('cbModalOverlay');
const cbModal = document.getElementById('cbModal');
const cbModalTitle = document.getElementById('cbModalTitle');
const closeCbModal = document.getElementById('closeCbModal');
const cbNameInput = document.getElementById('cbNameInput');
const cbAmountInput = document.getElementById('cbAmountInput');
const cbReasonInput = document.getElementById('cbReasonInput');
const cbCurrentBalance = document.getElementById('cbCurrentBalance');
const cbCurrentBalanceValue = document.getElementById('cbCurrentBalanceValue');
// CBH Modal
const cbhModalOverlay = document.getElementById('cbhModalOverlay');
const cbhModal = document.getElementById('cbhModal');
const cbhModalTitle = document.getElementById('cbhModalTitle');
const closeCbhModal = document.getElementById('closeCbhModal');
const cbhHistoryList = document.getElementById('cbhHistoryList');

// Utility Functions
function formatCurrency(value) {
    // Accept numbers or numeric strings; always return with two decimals
    if (value === '' || value === null || value === undefined) return '';
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) return value;
    // Format with two decimals
    return '৳ ' + num.toFixed(2);
}

function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
    }).format(date);
}

function formatTimeFull(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        month: 'short', day: 'numeric', year: 'numeric'
    }).format(date);
}

// Calculator Functions
function inputNumber(num) {
    const endsWithOp = /[+\-*/]$/.test(expression);
    const lastToken = expression.match(/([0-9]*\.?[0-9]*)$/)?.[0] || '';
    if (num === '.' && lastToken.includes('.')) return; // prevent double decimal in current operand

    if (endsWithOp) {
        // Start a fresh operand after an operator
        display = (num === '.' ? '0.' : num);
        expression += num;
    } else {
        if (display === '0' && num !== '.') display = num; else display += num;
        expression += num;
    }
    updateCalculatorDisplay();
    renderExpression();
}
function inputOperator(op) {
    if (!expression && display !== '0') { expression = display; }
    // replace trailing operator
    if (/([+\-*/])$/.test(expression)) { expression = expression.slice(0, -1) + op; }
    else if (expression) { expression += op; }
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
    display = m && m[0] ? m[0] : '0';
    updateCalculatorDisplay();
    renderExpression();
}
function clearCalculator() {
    expression = ''; display = '0'; lastEvaluatedValue = 0; updateCalculatorDisplay(); renderExpression();
}
function evaluateExpression(raw) {
    if (!raw) return 0;
    // sanitize: only digits . and operators
    let safe = raw.replace(/×/g, '*').replace(/÷/g, '/');
    safe = safe.replace(/[^0-9+\-*/.]/g, '');
    // remove trailing operator
    if (/([+\-*/])$/.test(safe)) safe = safe.slice(0, -1);
    if (!safe) return 0;
    // BODMAS handled by JS eval of sanitized arithmetic
    try {
        // eslint-disable-next-line no-eval
        const val = eval(safe);
        if (typeof val === 'number' && isFinite(val)) return val; else return 0;
    } catch { return 0; }
}
function performCalculation() {
    // Remove trailing operator if present
    if (/([+\-*/])$/.test(expression)) expression = expression.slice(0, -1);
    const val = evaluateExpression(expression);
    lastEvaluatedValue = val;
    display = String(val);
    updateCalculatorDisplay();
}

function updateCalculatorDisplay() { calculatorDisplay.textContent = display || '0'; }

function renderExpression() {
    if (!calculatorExpression) return;
    if (!expression) {
        calculatorExpression.textContent = '';
    } else {
        // Display-friendly expression: show × and ÷ instead of * and /
        calculatorExpression.textContent = formatDisplayExpression(expression);
    }
}

// Convert raw expression (with * and /) to display form (× and ÷)
function formatDisplayExpression(expr) {
    if (!expr) return '';
    return expr.replace(/\*/g, '×').replace(/\//g, '÷');
}

// Transaction Functions
function addTransaction(type, amount, exprStr) {
    const transaction = {
        id: Date.now().toString(),
        type: type,
        amount: amount,
        expression: exprStr || '',
        timestamp: new Date()
    };
    transactions.unshift(transaction);
    updateTransactionHistory();
    updateBalance();
}

function updateBalance() {
    if (transactions.length > 0) {
        const totalIn = transactions
            .filter(t => t.type === 'cash_in')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalOut = transactions
            .filter(t => t.type === 'cash_out')
            .reduce((sum, t) => sum + t.amount, 0);
        const balance = totalIn - totalOut;

        balanceAmount.textContent = formatCurrency(balance.toString());
        balanceDisplay.style.display = 'block';
    } else {
        balanceDisplay.style.display = 'none';
    }
}

function updateTransactionHistory() {
    // Update summary
    const totalIn = transactions
        .filter(t => t.type === 'cash_in')
        .reduce((sum, t) => sum + t.amount, 0);
    const totalOut = transactions
        .filter(t => t.type === 'cash_out')
        .reduce((sum, t) => sum + t.amount, 0);
    const net = totalIn - totalOut;

    totalCashIn.textContent = formatCurrency(totalIn);
    totalCashOut.textContent = formatCurrency(totalOut);
    netAmount.textContent = formatCurrency(net);
    netAmount.className = 'summary-value ' + (net >= 0 ? 'cash-in' : 'cash-out');

    // Update transaction list
    if (transactions.length === 0) {
        emptyState.style.display = 'block';
        transactionList.innerHTML = '<div class="empty-state">No transactions yet</div>';
    } else {
        emptyState.style.display = 'none';
        // Ensure CSS classes match hyphenated style used in styles.css (cash-in / cash-out)
        transactionList.innerHTML = transactions.map(transaction => {
            const hyphenClass = transaction.type.replace('_', '-');
            const label = transaction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const sign = transaction.type === 'cash_in' ? '+' : '-';
            return `
            <div class="transaction-item" data-id="${transaction.id}">
                <div class="transaction-info">
                    <div class="transaction-type">
                        <span class="type-indicator ${hyphenClass}"></span>
                        <span>${label}</span>
                    </div>
                    <div class="transaction-time">${formatTime(transaction.timestamp)}</div>
                    ${transaction.expression ? `<div class="transaction-expression">${escapeHtml(formatDisplayExpression(transaction.expression))} = ${formatCurrency(transaction.amount)}</div>` : ''}
                </div>
                <div class="transaction-right">
                    <div class="transaction-amount ${hyphenClass}">${sign}${formatCurrency(transaction.amount)}</div>
                    <button class="tx-delete-btn" aria-label="Delete" data-del="${transaction.id}"><span class="material-symbols-outlined icon-lg">delete</span></button>
                </div>
            </div>`;
        }).join('');
    }
}

// clearHistory removed per request — history can still be cleared programmatically if needed

// UI Control Functions
function openCalculator() {
    isCalculatorOpen = true;
    calculatorOverlay.classList.add('active');

    // Prevent scrolling on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';

    // Set initial value if cashAmount exists
    if (cashAmount) {
        display = cashAmount;
        updateCalculatorDisplay();
    }

    // Small delay to ensure smooth animation
    setTimeout(() => {
        // Ensure calculator is visible
        const calculatorElement = document.getElementById('calculator');
        if (calculatorElement) {
            calculatorElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, 100);
}

function closeCalculatorHandler() {
    isCalculatorOpen = false;
    calculatorOverlay.classList.remove('active');

    // Restore body scrolling
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';

    // When closing the calculator without performing Cash In/Out, store the current
    // calculation into the cash input so user can see what they entered.
    // If the display holds a numeric value, keep it in the cashInput; otherwise reset placeholder.
    if (!isNaN(parseFloat(display)) && display !== '0') {
        cashAmount = display;
        cashInput.value = formatCurrency(display);
    } else {
        // Reset to placeholder
        cashAmount = '';
        cashInput.value = '';
        cashInput.placeholder = 'Enter cash amount';
    }

    // Do not clear calculator state on close so calculations are preserved if reopened
}

function openHistory() {
    isHistoryOpen = true;
    historySidebar.classList.add('active');
    historyOverlayBg.classList.add('active');

    // Prevent scrolling on mobile
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
}

function closeHistoryHandler() {
    isHistoryOpen = false;
    historySidebar.classList.remove('active');
    historyOverlayBg.classList.remove('active');

    // Restore body scrolling
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
}

function handleCashIn() {
    // Evaluate full expression first
    performCalculation();
    const amount = evaluateExpression(expression);
    if (!isNaN(amount) && amount > 0) {
        addTransaction('cash_in', amount, expression);
        cashAmount = amount.toString();
        clearCalculator();
        cashInput.value = '';
        cashInput.placeholder = 'Enter cash amount';
        closeCalculatorHandler();
    }
}

function handleCashOut() {
    performCalculation();
    const amount = evaluateExpression(expression);
    if (!isNaN(amount) && amount > 0) {
        addTransaction('cash_out', amount, expression);
        cashAmount = amount.toString();
        clearCalculator();
        cashInput.value = '';
        cashInput.placeholder = 'Enter cash amount';
        closeCalculatorHandler();
    }
}

// Event Listeners
cashInput.addEventListener('click', openCalculator);

closeCalculator.addEventListener('click', closeCalculatorHandler);
calculatorBg.addEventListener('click', closeCalculatorHandler);

historyBtn.addEventListener('click', openHistory);
closeHistory.addEventListener('click', closeHistoryHandler);
historyOverlayBg.addEventListener('click', closeHistoryHandler);

// clear history button removed; no event listener necessary

cashInBtn.addEventListener('click', handleCashIn);
cashOutBtn.addEventListener('click', handleCashOut);

// Quick amount buttons
quickBtns.forEach(btn => {
    btn.addEventListener('click', () => {
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
document.addEventListener('click', (e) => {
    // keypad buttons
    const k = e.target.closest('.kp-btn');
    if (k) {
        if (k.dataset.number) {
            inputNumber(k.dataset.number);
        } else if (k.dataset.op) {
            inputOperator(k.dataset.op);
        } else if (k.dataset.action) {
            const a = k.dataset.action;
            if (a === 'allclear') clearCalculator();
            else if (a === 'backspace') backspace();
            else if (a === 'percent') percentAction();
            else if (a === 'equals') performCalculation();
            else if (a === 'downclose') closeCalculatorHandler();
        }
    }
    // delete transaction
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
        const id = delBtn.dataset.del;
        const idx = transactions.findIndex(t => t.id === id);
        if (idx > -1) {
            const el = transactionList.querySelector(`.transaction-item[data-id="${id}"]`);
            if (el) {
                el.classList.add('removing');
                setTimeout(() => {
                    transactions.splice(idx, 1);
                    updateTransactionHistory();
                    updateBalance();
                }, 260);
            } else {
                transactions.splice(idx, 1); updateTransactionHistory(); updateBalance();
            }
        }
    }
});

// Keyboard event listeners
document.addEventListener('keydown', (e) => {
    if (!isCalculatorOpen) return;
    const k = e.key;
    if ('0123456789'.includes(k)) inputNumber(k);
    else if (k === '.') inputNumber('.');
    else if (['+', '-', '*', '/'].includes(k)) inputOperator(k);
    else if (k === '%') percentAction();
    else if (k === 'Backspace') { backspace(); }
    else if (k === 'Enter' || k === '=') { performCalculation(); }
    else if (k === 'Escape') { closeCalculatorHandler(); }
    else if (k.toLowerCase() === 'c') { clearCalculator(); }
});

// Prevent body scroll when overlays are open
document.addEventListener('keydown', (e) => {
    if ((isCalculatorOpen || isHistoryOpen) && e.key === 'Escape') {
        if (isCalculatorOpen) closeCalculatorHandler();
        if (isHistoryOpen) closeHistoryHandler();
    }
});

// Initialize the app
function init() {
    updateTransactionHistory();
    updateBalance();
    updateCalculatorDisplay();
    renderCustomerBalanceList();

    // Add touch event listeners for better mobile interaction
    if ('ontouchstart' in window) {
        // Prevent zoom on double tap for buttons
        const buttons = document.querySelectorAll('button, .calc-btn, .quick-btn, .cash-btn');
        buttons.forEach(button => {
            button.addEventListener('touchstart', function (e) {
                e.target.style.transform = 'scale(0.95)';
            });
            button.addEventListener('touchend', function (e) {
                setTimeout(() => {
                    e.target.style.transform = '';
                }, 100);
            });
        });

        // Prevent viewport resize issues
        let lastHeight = window.innerHeight;
        window.addEventListener('resize', () => {
            // Only handle height changes that might be keyboard related
            if (Math.abs(window.innerHeight - lastHeight) > 150) {
                if (isCalculatorOpen) {
                    const calculator = document.getElementById('calculator');
                    if (calculator) {
                        calculator.style.height = window.innerHeight * 0.9 + 'px';
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

function openCbSidebar() {
    cbSidebar.classList.add('active');
    cbOverlayBg.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
}

function closeCbSidebarHandler() {
    cbSidebar.classList.remove('active');
    cbOverlayBg.classList.remove('active');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
}

function openCbModal(editCustomerName = null) {
    cbEditingCustomer = editCustomerName;
    if (editCustomerName) {
        // EDIT MODE
        cbModalTitle.textContent = 'Edit Customer';
        cbNameInput.value = editCustomerName;
        cbNameInput.disabled = true;
        cbAmountInput.value = '';
        cbReasonInput.value = '';
        const data = customerBalances[editCustomerName];
        if (data) {
            cbCurrentBalanceValue.textContent = formatCurrency(data.total);
            cbCurrentBalance.style.display = 'block';
            // apply color by sign
            if (data.total > 0) {
                cbCurrentBalanceValue.style.color = 'var(--green-700)';
            } else if (data.total < 0) {
                cbCurrentBalanceValue.style.color = 'var(--red-700)';
            } else {
                cbCurrentBalanceValue.style.color = 'var(--muted-foreground)';
            }
        } else {
            cbCurrentBalance.style.display = 'none';
        }
    } else {
        // ADD MODE
        cbModalTitle.textContent = 'Add Customer';
        cbNameInput.value = '';
        cbNameInput.disabled = false;
        cbAmountInput.value = '';
        cbReasonInput.value = '';
        cbCurrentBalance.style.display = 'none';
    }
    cbModalOverlay.classList.add('active');
    // slight defer to allow animation
    setTimeout(() => { cbNameInput.focus(); }, 50);
}

function closeCbModalHandler() {
    cbModalOverlay.classList.remove('active');
    cbEditingCustomer = null;
}

function openCbhModal(customerName) {
    cbhModalTitle.textContent = customerName + ' History';
    renderCustomerHistory(customerName);
    cbhModalOverlay.classList.add('active');
}

function closeCbhModalHandler() {
    cbhModalOverlay.classList.remove('active');
}

function saveCustomerBalanceEntry() {
    const nameRaw = cbNameInput.value.trim();
    if (!nameRaw) return; // require name
    const name = nameRaw; // keep original case
    const reason = cbReasonInput.value.trim();
    // Only used for ADD MODE now (cbEditingCustomer === null)
    if (cbEditingCustomer) return; // edit mode shouldn't trigger save
    const initialAmount = parseFloat(cbAmountInput.value || '0');
    if (isNaN(initialAmount) || initialAmount === 0) return;
    const entry = { id: Date.now().toString(), amount: initialAmount, reason: reason || 'Initial entry', timestamp: new Date() };
    if (!customerBalances[name]) {
        customerBalances[name] = { total: initialAmount, history: [entry] };
    } else {
        customerBalances[name].history.unshift(entry);
        customerBalances[name].total += initialAmount;
    }
    closeCbModalHandler();
    renderCustomerBalanceList();
}

function renderCustomerBalanceList() {
    const names = Object.keys(customerBalances);
    let filtered = names;
    if (cbSearchQuery) {
        const q = cbSearchQuery.toLowerCase();
        filtered = names.filter(n => n.toLowerCase().includes(q));
    }
    // Totals across all customers
    let totalPositive = 0;
    let totalNegative = 0; // stored as negative sums
    names.forEach(n => {
        const t = customerBalances[n].total;
        if (t >= 0) totalPositive += t; else totalNegative += t;
    });
    if (names.length === 0) {
        if (cbTotals) cbTotals.style.display = 'none';
    } else {
        if (cbTotals) {
            cbTotals.style.display = 'grid';
            if (cbTotalPaid) cbTotalPaid.textContent = formatCurrency(totalPositive);
            if (cbTotalUnpaid) cbTotalUnpaid.textContent = formatCurrency(Math.abs(totalNegative));
        }
    }
    if (filtered.length === 0) {
        cbList.innerHTML = '<div class="cb-empty">' + (names.length === 0 ? 'No customers yet' : 'No matches') + '</div>';
        return;
    }
    filtered.sort((a, b) => a.localeCompare(b));
    cbList.innerHTML = filtered.map(name => {
        const data = customerBalances[name];
        const amount = data.total;
        const cls = amount >= 0 ? 'positive' : 'negative';
        return `<div class="cb-row" data-name="${encodeURIComponent(name)}">
            <span class="cb-row-name">${name}</span>
            <span class="cb-row-amount ${cls}">${amount >= 0 ? '+' : ''}${formatCurrency(amount)}</span>
        </div>`;
    }).join('');
}

function renderCustomerHistory(customerName) {
    const data = customerBalances[customerName];
    if (!data) { cbhHistoryList.innerHTML = '<div class="cb-empty">No history</div>'; return; }
    if (data.history.length === 0) { cbhHistoryList.innerHTML = '<div class="cb-empty">No history</div>'; return; }
    cbhHistoryList.innerHTML = data.history.map(h => {
        const cls = h.amount >= 0 ? 'positive' : 'negative';
        const amt = (h.amount >= 0 ? '+' : '') + formatCurrency(h.amount);
        return `<div class="cbh-entry">
            <div class="cbh-entry-line">
                <span class="cbh-entry-amount ${cls}">${amt}</span>
                <span class="cbh-entry-time">${formatTimeFull(h.timestamp)}</span>
            </div>
            ${h.reason ? `<div class="cbh-entry-reason">${escapeHtml(h.reason)}</div>` : ''}
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    return str.replace(/[&<>"]|'/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c] || c));
}

// Long press detection on customer rows to open CBH modal
cbList.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.cb-row');
    if (!row) return;
    const name = decodeURIComponent(row.dataset.name);
    cbLongPressTimer = setTimeout(() => { openCbhModal(name); }, 600);
});
cbList.addEventListener('mouseup', () => { clearTimeout(cbLongPressTimer); });
cbList.addEventListener('mouseleave', () => { clearTimeout(cbLongPressTimer); });
cbList.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.cb-row');
    if (!row) return;
    const name = decodeURIComponent(row.dataset.name);
    cbLongPressTimer = setTimeout(() => { openCbhModal(name); }, 600);
});
cbList.addEventListener('touchend', () => { clearTimeout(cbLongPressTimer); });
cbList.addEventListener('touchmove', () => { clearTimeout(cbLongPressTimer); });

// Click to edit (short press)
cbList.addEventListener('click', (e) => {
    clearTimeout(cbLongPressTimer);
    const row = e.target.closest('.cb-row');
    if (!row) return;
    const name = decodeURIComponent(row.dataset.name);
    openCbModal(name);
});

// Event listeners for new UI
customerBalanceBtn.addEventListener('click', openCbSidebar);
closeCbSidebar.addEventListener('click', closeCbSidebarHandler);
cbOverlayBg.addEventListener('click', closeCbSidebarHandler);
cbAddBtn.addEventListener('click', () => openCbModal(null));
closeCbModal.addEventListener('click', closeCbModalHandler);
cbModalOverlay.addEventListener('click', (e) => { if (e.target === cbModalOverlay) closeCbModalHandler(); });
cbhModalOverlay.addEventListener('click', (e) => { if (e.target === cbhModalOverlay) closeCbhModalHandler(); });
closeCbhModal.addEventListener('click', closeCbhModalHandler);
cbSearch.addEventListener('input', () => { cbSearchQuery = cbSearch.value; renderCustomerBalanceList(); });

function applyCbDelta(sign) { // +1 Paid, -1 Unpaid
    const nameRaw = cbNameInput.value.trim();
    if (!nameRaw) return;
    const entered = parseFloat(cbAmountInput.value || '0');
    if (isNaN(entered) || entered === 0) return;
    const reason = cbReasonInput.value.trim();
    if (!customerBalances[nameRaw]) {
        customerBalances[nameRaw] = { total: 0, history: [] };
    }
    // Switch to edit mode if first time
    if (!cbEditingCustomer) {
        cbEditingCustomer = nameRaw;
        cbNameInput.disabled = true;
        cbCurrentBalance.style.display = 'block';
    }
    const data = customerBalances[nameRaw];
    const delta = sign * entered;
    data.total += delta;
    data.history.unshift({
        id: Date.now().toString(),
        amount: delta,
        reason: reason || (sign > 0 ? 'Paid' : 'Unpaid'),
        timestamp: new Date()
    });
    cbAmountInput.value = '';
    cbReasonInput.value = '';
    cbCurrentBalanceValue.textContent = formatCurrency(data.total);
    // dynamic color update
    if (data.total > 0) {
        cbCurrentBalanceValue.style.color = 'var(--green-700)';
    } else if (data.total < 0) {
        cbCurrentBalanceValue.style.color = 'var(--red-700)';
    } else {
        cbCurrentBalanceValue.style.color = 'var(--muted-foreground)';
    }
    renderCustomerBalanceList();
}

// Button handlers (new unified buttons)
const cbPaidBtn = document.getElementById('cbPaidBtn');
const cbUnpaidBtn = document.getElementById('cbUnpaidBtn');
cbPaidBtn && cbPaidBtn.addEventListener('click', () => applyCbDelta(+1));
cbUnpaidBtn && cbUnpaidBtn.addEventListener('click', () => applyCbDelta(-1));

// Keyboard: Enter = Paid, Ctrl/Meta+Enter = Unpaid
cbAmountInput && cbAmountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.ctrlKey || e.metaKey) applyCbDelta(-1); else applyCbDelta(+1);
    }
});

// Removed save state logic.

// Escape key handling integration (extend existing listener or add new) - add new listener
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (cbSidebar.classList.contains('active')) closeCbSidebarHandler();
        if (cbModalOverlay.classList.contains('active')) closeCbModalHandler();
        if (cbhModalOverlay.classList.contains('active')) closeCbhModalHandler();
    }
});

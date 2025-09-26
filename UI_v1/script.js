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
let previousValue = '';
let operation = '';
let waitingForNewValue = false;
let expression = ''; // track chained expression for display (e.g., "5+10+13+30")

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
    // prevent multiple decimals in the same number
    if (num === '.' && display.includes('.')) return;

    if (waitingForNewValue) {
        // starting a new operand after an operator
        display = num;
        waitingForNewValue = false;

        // If expression is empty or the previous calculation was completed, start fresh
        const endsWithOp = /[+\-×÷]$/.test(expression);
        if (!expression || (!endsWithOp && previousValue === '' && operation === '')) {
            expression = num;
        } else {
            // append new operand's first digit
            expression = expression + num;
        }
    } else {
        display = display === '0' && num !== '.' ? num : display + num;
        // Append digit to the current operand in the expression
        expression = expression + num;
    }

    updateCalculatorDisplay();
    renderExpression();
}

function inputOperation(nextOperation) {
    const inputValue = parseFloat(display);

    if (previousValue === '') {
        previousValue = display;
    } else if (operation && !waitingForNewValue) {
        // perform pending calculation if there's an operation and we have a second operand
        const currentValue = parseFloat(previousValue);
        const newValue = calculate(currentValue, inputValue, operation);

        display = String(newValue);
        previousValue = String(newValue);
    }

    waitingForNewValue = true;
    operation = nextOperation;

    // Append or replace operator in expression. Map operation names to symbols
    const opSymbol = ({ add: '+', subtract: '-', multiply: '×', divide: '÷' }[nextOperation] || nextOperation);
    if (!expression) {
        // start expression with the current display value
        expression = display + opSymbol;
    } else if (/[+\-×÷]$/.test(expression)) {
        // replace the trailing operator with the new one (prevents '++' or '+-')
        expression = expression.slice(0, -1) + opSymbol;
    } else {
        expression = expression + opSymbol;
    }

    renderExpression();
    updateCalculatorDisplay();
}

function calculate(firstValue, secondValue, operation) {
    switch (operation) {
        case 'add':
            return firstValue + secondValue;
        case 'subtract':
            return firstValue - secondValue;
        case 'multiply':
            return firstValue * secondValue;
        case 'divide':
            return firstValue / secondValue;
        default:
            return secondValue;
    }
}

function performCalculation() {
    const inputValue = parseFloat(display);

    if (previousValue !== '' && operation) {
        // If equals pressed immediately after an operator and no new number entered,
        // treat it as 'remove the trailing operator' and show the original number.
        if (waitingForNewValue || /[+\-×÷]$/.test(expression) && String(inputValue) === '') {
            // remove trailing operator from expression
            if (/[+\-×÷]$/.test(expression)) {
                expression = expression.slice(0, -1);
            }

            // Reset pending operation state but keep the original display value
            display = String(previousValue || display);
            previousValue = '';
            operation = '';
            waitingForNewValue = false;

            renderExpression();
            updateCalculatorDisplay();
            return;
        }

        // Normal calculation flow when we have both operands
        const currentValue = parseFloat(previousValue);
        const newValue = calculate(currentValue, inputValue, operation);

        display = String(newValue);
        previousValue = '';
        operation = '';
        waitingForNewValue = true;

        // If the expression ended with an operator (user pressed operator then equals),
        // we'll not append a repeated operand here; digits should already be present
        // from user input, so simply render the current expression.
        if (/[+\-×÷]$/.test(expression)) {
            // Remove trailing operator if somehow left
            expression = expression.slice(0, -1);
        }

        renderExpression();
        updateCalculatorDisplay();
    }
}

function clearCalculator() {
    display = '0';
    previousValue = '';
    operation = '';
    waitingForNewValue = false;
    expression = '';
    updateCalculatorDisplay();
    renderExpression();
}

function updateCalculatorDisplay() {
    calculatorDisplay.textContent = display;
}

function renderExpression() {
    if (!calculatorExpression) return;
    if (!expression) {
        calculatorExpression.textContent = '';
    } else {
        // Show expression with normal plus/minus and dots for multiply/divide symbols if needed
        // Use simple replacement for readability (×/÷ kept as-is)
        calculatorExpression.textContent = expression;
    }
}

// Transaction Functions
function addTransaction(type, amount) {
    const transaction = {
        id: Date.now().toString(),
        type: type,
        amount: amount,
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
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-type">
                        <span class="type-indicator ${hyphenClass}"></span>
                        <span>${label}</span>
                    </div>
                    <div class="transaction-time">${formatTime(transaction.timestamp)}</div>
                </div>
                <div class="transaction-amount ${hyphenClass}">
                    ${sign}${formatCurrency(transaction.amount)}
                </div>
            </div>
            `;
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
    const amount = parseFloat(display);
    if (!isNaN(amount) && amount > 0) {
        addTransaction('cash_in', amount);
        cashAmount = amount.toString();
        // Clear calculator state and close. Reset cash input to placeholder.
        clearCalculator();
        cashInput.value = '';
        cashInput.placeholder = 'Enter cash amount';
        closeCalculatorHandler();
    }
}

function handleCashOut() {
    const amount = parseFloat(display);
    if (!isNaN(amount) && amount > 0) {
        addTransaction('cash_out', amount);
        cashAmount = amount.toString();
        // Clear calculator state and close. Reset cash input to placeholder.
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
    const btn = e.target.closest && e.target.closest('.calc-btn');
    if (!btn) return;

    // Read dataset from the resolved button element
    if (btn.dataset.number) {
        inputNumber(btn.dataset.number);
    } else if (btn.dataset.action) {
        const action = btn.dataset.action;

        switch (action) {
            case 'clear':
                clearCalculator();
                break;
            case 'plusminus':
                if (display !== '0') {
                    display = display.startsWith('-') 
                        ? display.slice(1) 
                        : '-' + display;
                    updateCalculatorDisplay();
                }
                break;
            case 'percent':
                display = String(parseFloat(display) / 100);
                updateCalculatorDisplay();
                break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
                inputOperation(action);
                break;
            case 'equals':
                performCalculation();
                break;
        }
    }
});

// Keyboard event listeners
document.addEventListener('keydown', (e) => {
    if (!isCalculatorOpen) return;
    
    const key = e.key;
    
    if ('0123456789.'.includes(key)) {
        inputNumber(key);
    } else if (key === '+') {
        inputOperation('add');
    } else if (key === '-') {
        inputOperation('subtract');
    } else if (key === '*') {
        inputOperation('multiply');
    } else if (key === '/') {
        e.preventDefault();
        inputOperation('divide');
    } else if (key === 'Enter' || key === '=') {
        performCalculation();
    } else if (key === 'Escape') {
        closeCalculatorHandler();
    } else if (key === 'Backspace') {
        if (display.length > 1) {
            display = display.slice(0, -1);
        } else {
            display = '0';
        }
        updateCalculatorDisplay();
    } else if (key === 'c' || key === 'C') {
        clearCalculator();
    }
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
            button.addEventListener('touchstart', function(e) {
                e.target.style.transform = 'scale(0.95)';
            });
            button.addEventListener('touchend', function(e) {
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
    setTimeout(()=>{ cbNameInput.focus(); }, 50);
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
    if (filtered.length === 0) {
        cbList.innerHTML = '<div class="cb-empty">' + (names.length === 0 ? 'No customers yet' : 'No matches') + '</div>';
        return;
    }
    filtered.sort((a,b)=> a.localeCompare(b));
    cbList.innerHTML = filtered.map(name => {
        const data = customerBalances[name];
        const amount = data.total;
        const cls = amount >=0 ? 'positive' : 'negative';
        return `<div class="cb-row" data-name="${encodeURIComponent(name)}">
            <span class="cb-row-name">${name}</span>
            <span class="cb-row-amount ${cls}">${amount>=0?'+':''}${formatCurrency(amount)}</span>
        </div>`;
    }).join('');
}

function renderCustomerHistory(customerName) {
    const data = customerBalances[customerName];
    if (!data) { cbhHistoryList.innerHTML = '<div class="cb-empty">No history</div>'; return; }
    if (data.history.length === 0) { cbhHistoryList.innerHTML = '<div class="cb-empty">No history</div>'; return; }
    cbhHistoryList.innerHTML = data.history.map(h => {
        const cls = h.amount >=0 ? 'positive' : 'negative';
        const amt = (h.amount>=0?'+':'') + formatCurrency(h.amount);
        return `<div class="cbh-entry">
            <div class="cbh-entry-line">
                <span class="cbh-entry-amount ${cls}">${amt}</span>
                <span class="cbh-entry-time">${formatTimeFull(h.timestamp)}</span>
            </div>
            ${h.reason?`<div class="cbh-entry-reason">${escapeHtml(h.reason)}</div>`:''}
        </div>`;
    }).join('');
}

function escapeHtml(str) {
    return str.replace(/[&<>"]|'/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]||c));
}

// Long press detection on customer rows to open CBH modal
cbList.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.cb-row');
    if (!row) return;
    const name = decodeURIComponent(row.dataset.name);
    cbLongPressTimer = setTimeout(()=>{ openCbhModal(name); }, 600);
});
cbList.addEventListener('mouseup', () => { clearTimeout(cbLongPressTimer); });
cbList.addEventListener('mouseleave', () => { clearTimeout(cbLongPressTimer); });
cbList.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.cb-row');
    if (!row) return;
    const name = decodeURIComponent(row.dataset.name);
    cbLongPressTimer = setTimeout(()=>{ openCbhModal(name); }, 600);
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
cbModalOverlay.addEventListener('click', (e)=> { if (e.target === cbModalOverlay) closeCbModalHandler(); });
cbhModalOverlay.addEventListener('click', (e)=> { if (e.target === cbhModalOverlay) closeCbhModalHandler(); });
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

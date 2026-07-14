// Sidebar Hub - Calculator
// Copyright 2boom, 2026
// math.js - Copyright (C) 2013-2026 Jos de Jong <wjosdejong@gmail.com>

const display = document.getElementById("display");
const historyContainer = document.getElementById("historyContainer");
const copyBtn = document.getElementById("copyBtn");
const toast = document.getElementById("toast");

let expression = "0";
let historyLines = [];
let memory = 0;
let memoryIndicator = false;
let justEvaluated = false;
let intermediateHistoryIndex = -1;
let hasError = false;

let fixMode = true;

// Storage keys
const STORAGE_CALC_HISTORY = "calcHistory";
const STORAGE_MEMORY = "calcMemory";
const MAX_HISTORY = 5;

let longPressTimer = null;
let isLongPress = false;
let copyLongPressTimer = null;
let isCopyLongPress = false;
let historyLongPressTimer = null;
let isHistoryLongPress = false;

let buttonsLocked = false;

function lockButtons() {
    buttonsLocked = true;
    setTimeout(() => {
        buttonsLocked = false;
    }, 1000);
}

function handlePower() {
    if (justEvaluated) {
        expression = expression + "^";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    expression += "^";
    hasError = false;
    updateDisplay();
}

function handleCbrt() {
    if (justEvaluated) {
        expression = "³√(" + expression + ")";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    const match = expression.match(/([\d.]+)$/);
    if (match) {
        const num = match[1];
        const before = expression.slice(0, -num.length);
        expression = before + "³√(" + num + ")";
    } else {
        expression += "³√(";
    }
    hasError = false;
    updateDisplay();
}

function handleLog() {
    if (justEvaluated) {
        expression = "log(" + expression + ")";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    const match = expression.match(/([\d.]+)$/);
    if (match) {
        const num = match[1];
        const before = expression.slice(0, -num.length);
        expression = before + "log(" + num + ")";
    } else {
        expression += "log(";
    }
    hasError = false;
    updateDisplay();
}

function handleLn() {
    if (justEvaluated) {
        expression = "ln(" + expression + ")";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    const match = expression.match(/([\d.]+)$/);
    if (match) {
        const num = match[1];
        const before = expression.slice(0, -num.length);
        expression = before + "ln(" + num + ")";
    } else {
        expression += "ln(";
    }
    hasError = false;
    updateDisplay();
}

function toggleFixMode() {
    fixMode = !fixMode;
    chrome.storage.local.set({ fixMode: fixMode });
    updateFixIndicator();
    updateFixButton();
    updateDisplay();
}

function updateFixButton() {
    const btn = document.getElementById("btnFixOnOff");
    if (!btn) return;
    
    if (fixMode) {
        btn.innerHTML = '0.00<span class="dot active">●</span>';
        btn.classList.add("active");
    } else {
        btn.innerHTML = '0.00<span class="dot inactive">●</span>';
        btn.classList.remove("active");
    }
}

function updateFixIndicator() {
    const indicator = document.getElementById("fixIndicator");
    if (!indicator) return;
    if (fixMode) {
        indicator.textContent = "0.00";
        indicator.className = "fix-indicator active";
    } else {
        indicator.textContent = "";
        indicator.className = "fix-indicator";
    }
}

// ========== TOAST ==========
let toastTimeout = null;
function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 1500);
}

// ========== COPY ==========
function copyResult(useComma) {
    const value = display.value;
    if (value === "Error" || value === "Infinity" || value === "0") {
        showToast("Nothing to copy");
        return;
    }
    let text = value.replace(/\s/g, "");
    let message = "Copied!";
    if (useComma && text.includes(".")) {
        text = text.replace(/\./g, ",");
        message = "Copied in comma format";
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast(message);
    }).catch(() => {
        showToast("Copy failed");
    });
}

// ========== PASTE ==========
function pasteFromClipboard(text) {
    // Replace commas with dots
    let cleaned = text.replace(/,/g, ".");
    // Remove all spaces
    cleaned = cleaned.replace(/\s/g, "");
    // Remove everything after = (including =)
    const equalIndex = cleaned.indexOf("=");
    if (equalIndex !== -1) {
        cleaned = cleaned.substring(0, equalIndex);
    }
    // Protect log and ln from being removed
    cleaned = cleaned.replace(/log/g, 'ℒ');
    cleaned = cleaned.replace(/ln/g, 'ℕ');
    // Remove any characters that are not allowed
    cleaned = cleaned.replace(/[^0-9+\-×÷*/().%√\s^³logln]/g, "");
    // Restore log and ln
    cleaned = cleaned.replace(/ℒ/g, 'log');
    cleaned = cleaned.replace(/ℕ/g, 'ln');
    if (cleaned === "") return false;
    
    // Replace * with × for consistency
    cleaned = cleaned.replace(/\*/g, "×");
    // Replace / with ÷ for consistency
    cleaned = cleaned.replace(/\//g, "÷");
    
    expression = cleaned;
    justEvaluated = false;
    hasError = false;
    updateDisplay();
    return true;
}

function handleMod() {
    if (justEvaluated) {
        expression = expression + " mod ";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    expression = expression.replace(/\s*[+\-×÷]\s*$/, "") + " mod ";
    hasError = false;
    updateDisplay();
}

// ========== EVALUATE ==========
function evaluateExpression(expr) {
    try {
        let sanitized = expr.replace(/³√\(/g, '(');
        sanitized = expr.replace(/³√\(([^)]+)\)/g, '($1)^(1/3)');
        sanitized = sanitized.replace(/×/g, '*')
                           .replace(/÷/g, '/')
                           .replace(/−/g, '-')
                           .replace(/⁻¹/g, '^-1')
                           .replace(/√\(/g, 'sqrt(')
                           .replace(/log\(/g, 'log10(')
                           .replace(/ln\(/g, 'log(')
                           .replace(/mod/g, '%');
        const result = math.evaluate(sanitized);
        if (!isFinite(result)) return "Error";
        return result;
    } catch (e) {
        return "Error";
    }
}


// ========== PAREN INDICATOR ==========
function updateParenIndicator() {
    const indicator = document.getElementById("parenIndicator");
    if (!indicator) return;
    
    const openCount = (expression.match(/\(/g) || []).length;
    const closeCount = (expression.match(/\)/g) || []).length;
    const balance = openCount - closeCount;
    
    if (balance > 0) {
        indicator.textContent = `(${balance}`;
    } else {
        indicator.textContent = "";
    }
}

// ========== DISPLAY ==========
function updateDisplay() {
    if (expression === "") expression = "0";
    
    display.value = expression;
    display.scrollLeft = display.scrollWidth;

    const len = display.value.length;
    const fontSteps = [
        { max: 8, size: 31 },
        { max: 12, size: 30 },
        { max: 16, size: 29 },
        { max: 20, size: 28 },
        { max: 24, size: 27 },
        { max: 28, size: 26 },
        { max: Infinity, size: 25 }
    ];

    const fontSize = fontSteps.find(step => len <= step.max).size;
    display.style.fontSize = `${fontSize}px`;

    saveHistory();
    updateParenIndicator();
    updateStatusIndicator();
    updateFixIndicator();
    updateFixButton();
}

function updateMemoryIndicator() {
    const indicator = document.getElementById("memoryIndicator");
    if (!indicator) return;
    
    if (memoryIndicator && memory !== 0) {
        indicator.textContent = "M " + formatNumber(memory);
    } else {
        indicator.textContent = "";
    }
    saveMemory();
}

// ========== STORAGE ==========
function saveHistory() {
    chrome.storage.local.set({
        [STORAGE_CALC_HISTORY]: {
            expression: expression,
            historyLines: historyLines.slice(-MAX_HISTORY)
        }
    });
}

function saveMemory() {
    chrome.storage.local.set({
        [STORAGE_MEMORY]: {
            memory: memory,
            memoryIndicator: memoryIndicator
        }
    });
}

function loadHistory() {
    chrome.storage.local.get([STORAGE_CALC_HISTORY, STORAGE_MEMORY, "fixMode"], (result) => {
        if (result[STORAGE_CALC_HISTORY]) {
            const data = result[STORAGE_CALC_HISTORY];
            if (data.expression) {
                if (/^[\d.\s-]+$/.test(data.expression) && !/[+\-×÷()]/.test(data.expression)) {
                    expression = "0";
                    justEvaluated = false;
                } else {
                    expression = data.expression;
                }
            }
            if (data.historyLines) {
                historyLines = data.historyLines.slice(-MAX_HISTORY);
                renderHistory();
            }
        }
if (result[STORAGE_MEMORY]) {
    const memData = result[STORAGE_MEMORY];
    if (memData.memory !== undefined && memData.memory !== 0) {
        memory = memData.memory;
        memoryIndicator = true;
    } else {
        memory = 0;
        memoryIndicator = false;
    }
}
        if (result.fixMode !== undefined) {
            fixMode = result.fixMode;
        }
        updateDisplay();
        updateMemoryIndicator();
        updateFixIndicator();
        updateFixButton();
    });
}

// ========== HISTORY ==========
function renderHistory() {
    historyContainer.innerHTML = "";
    const lines = historyLines.slice(-MAX_HISTORY);
    lines.forEach((line, index) => {
        const div = document.createElement("div");
        div.className = "history-line";
        div.textContent = line;
        if (index === lines.length - 1) {
            div.style.fontSize = "16px";
            div.style.color = "var(--text-primary)";
        }
        historyContainer.appendChild(div);
    });
}

function addHistoryLine(text) {
    historyLines.push(text);
    if (historyLines.length > MAX_HISTORY * 2) {
        historyLines = historyLines.slice(-MAX_HISTORY);
    }
    renderHistory();
    saveHistory();
}

// ========== EXTRACT LAST NUMBER ==========
function extractLastNumber(expr) {
    const match = expr.match(/([\d.]+)$/);
    if (match) return parseFloat(match[1]);
    return null;
}

function extractLastOperator(expr) {
    const match = expr.match(/([+\-×÷])\s*[\d.]+$/);
    if (match) return match[1];
    return null;
}

// ========== FACTORIAL ==========
function factorial(n) {
    if (n < 0) return "Error";
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// ========== INPUT FUNCTIONS ==========
function inputDigit(digit) {
    if (justEvaluated) {
        expression = digit;
        justEvaluated = false;
    } else if (expression === "0" && digit !== ".") {
        expression = digit;
    } else {
        expression += digit;
    }
    hasError = false;
    updateDisplay();
}

function inputDecimal() {
    if (justEvaluated) {
        expression = "0.";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    if (expression.match(/[\s+\-×÷(]$/)) {
        expression += "0.";
        hasError = false;
        updateDisplay();
        return;
    }
    if (expression === "" || expression === "0") {
        expression = "0.";
        hasError = false;
        updateDisplay();
        return;
    }
    if (!expression.match(/\d\.\d*$/)) {
        expression += ".";
    }
    hasError = false;
    updateDisplay();
}

function handleOperator(op) {
    // Case 1: Empty expression - allow only "-" for negative numbers
    if (expression === "") {
        if (op === "-") {
            expression = "-";
            updateDisplay();
        }
        return;
    }
    
    // Case 2: After "=" - just add operator to result
    if (justEvaluated) {
        expression += " " + op + " ";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    
    // Case 3: Expression ends with operator - replace it
    if (expression.match(/\s*[+\-×÷]\s*$/)) {
        expression = expression.replace(/\s*[+\-×÷]\s*$/, "");
        expression += " " + op + " ";
        hasError = false;
        updateDisplay();
        return;
    }
    
    // Case 4: Expression ends with "(" or empty function - ignore
    if (expression.match(/\($/) || expression.match(/(log|ln|√|³√)\($/)) {
        return;
    }
    
    // Case 5: Unclosed function with argument - auto-close, then continue
    const funcMatch = expression.match(/(log|ln|√|³√)\([^)]*$/);
    if (funcMatch) {
        const openCount = (expression.match(/\(/g) || []).length;
        const closeCount = (expression.match(/\)/g) || []).length;
        const balance = openCount - closeCount;
        if (balance > 0) {
            expression = expression + ")".repeat(balance);
        }
    }
    
    // Case 6: Check if expression is valid and complete before evaluating
    const tempExpr = expression.replace(/\s*[+\-×÷]\s*$/, "");
    const expr = tempExpr.trim();
    
    // Check if expression is complete:
    // - not ending with operator
    // - not ending with "("
    // - balanced parentheses
    const openCount = (expr.match(/\(/g) || []).length;
    const closeCount = (expr.match(/\)/g) || []).length;
    const isComplete = !/\s*[+\-×÷(]\s*$/.test(expr) && (openCount === closeCount);
    
    // Check if expression is just a simple number
    const isSimpleNumber = /^-?\d+(\.\d+)?$/.test(expr);
    
    if (expr && isComplete && !isSimpleNumber) {
        const result = evaluateExpression(expr);
        if (result !== "Error" && isFinite(result)) {
            const formatted = formatNumber(result);
            if (intermediateHistoryIndex !== -1) {
                historyLines.splice(intermediateHistoryIndex, 1);
                intermediateHistoryIndex = -1;
            }
            historyLines.push(expr + " = " + formatted);
            intermediateHistoryIndex = historyLines.length - 1;
            renderHistory();
            saveHistory();
        }
    }
    
    // Add operator
    expression = expression.replace(/\s*[+\-×÷]\s*$/, "");
    expression += " " + op + " ";
    hasError = false;
    updateDisplay();
}

function handleParenOpen() {
    if (justEvaluated) {
        expression = "(";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    
    if (expression === "0") {
        expression = "(";
        hasError = false;
        updateDisplay();
        return;
    }
    
    if (expression.match(/[\d.)]$/)) {
        return;
    }
    
    expression += "(";
    hasError = false;
    updateDisplay();
}

function handleParenClose() {
    // Check if closing paren would create division by zero
    const testExpr = expression + ")";
    if (hasDivisionByZero(testExpr)) {
        hasError = true;
        updateDisplay();
        return;
    }
    
    if (justEvaluated) {
        expression += ")";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    expression += ")";
    hasError = false;
    updateDisplay();
}

function handlePercent() {
    const lastNum = extractLastNumber(expression);
    const lastOp = extractLastOperator(expression);
    
    if (lastNum !== null && lastOp) {
        const fullExpr = expression.replace(/\s*[+\-×÷]\s*[\d.]+$/, "");
        const prevMatch = fullExpr.match(/([\d.]+)$/);
        if (prevMatch) {
            const prevNum = parseFloat(prevMatch[1]);
            const percentValue = prevNum * (lastNum / 100);
            let rounded = percentValue.toFixed(2);
            if (rounded.endsWith('.00')) {
                rounded = rounded.slice(0, -3);
            }
            
            window._percentData = {
                prevNum: prevNum,
                op: lastOp,
                percentNum: lastNum,
                percentValue: parseFloat(rounded)
            };
            
            expression = expression.replace(/[\d.]+$/, rounded);
            justEvaluated = true;
            hasError = false;
            updateDisplay();
            return;
        }
    }
    
    if (justEvaluated) {
        const val = parseFloat(expression);
        if (!isNaN(val) && isFinite(val)) {
            let result = (val / 100).toFixed(2);
            if (result.endsWith('.00')) {
                result = result.slice(0, -3);
            }
            expression = result;
            justEvaluated = false;
            hasError = false;
            updateDisplay();
            return;
        }
    }
    expression += "%";
    hasError = false;
    updateDisplay();
}

function formatNumber(num) {
    if (num === "Error") return "Error";
    if (num === "Infinity") return "Infinity";
    if (isNaN(num)) return "0";
    
    // Apply fix mode
    if (fixMode) {
        const fixed = parseFloat(num.toFixed(2));
        if (Number.isInteger(fixed)) {
            return String(fixed);
        }
        const str = fixed.toFixed(2);
        return str.replace(/\.?0+$/, '');
    }
    
    let str = String(num);
    if (str.includes("e")) return str;
    
    let isNegative = str.startsWith("-");
    let absStr = isNegative ? str.slice(1) : str;
    let parts = absStr.split(".");
    let integerPart = parts[0];
    let decimalPart = parts[1] || "";
    
    let formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    let result = isNegative ? "-" + formattedInteger : formattedInteger;
    if (decimalPart) {
        result += "." + decimalPart;
    }
    return result;
}

function handleBackspace() {
    if (justEvaluated) {
        if (expression.length > 1) {
            expression = expression.slice(0, -1);
        } else {
            expression = "0";
            justEvaluated = false;
        }
        hasError = false;
        updateDisplay();
        return;
    }
    if (expression.length > 1) {
        expression = expression.slice(0, -1);
    } else {
        expression = "0";
        if (intermediateHistoryIndex !== -1) {
            historyLines.splice(intermediateHistoryIndex, 1);
            intermediateHistoryIndex = -1;
            renderHistory();
            saveHistory();
        }
    }
    hasError = false;
    updateDisplay();
}

function handleClearEntry() {
    expression = "0";
    justEvaluated = false;
    hasError = false;
    if (intermediateHistoryIndex !== -1) {
        historyLines.splice(intermediateHistoryIndex, 1);
        intermediateHistoryIndex = -1;
        renderHistory();
        saveHistory();
    }
    updateDisplay();
}

function handleClearAll() {
    expression = "0";
    justEvaluated = false;
    hasError = false;
    historyLines = [];
    intermediateHistoryIndex = -1;
    renderHistory();
    updateDisplay();
}

function handleToggleSign() {
    if (expression === "Error" || justEvaluated) {
        const val = parseFloat(expression);
        if (!isNaN(val)) {
            expression = String(-val);
            justEvaluated = false;
            hasError = false;
            updateDisplay();
        }
        return;
    }
    
    if (expression === "" || expression.match(/[\s+\-×÷]$/)) {
        return;
    }
    
    const match = expression.match(/([+\-]?[\d.]+)$/);
    if (match) {
        let num = match[1];
        const before = expression.slice(0, -num.length);
        if (num.startsWith("-")) {
            expression = before + num.slice(1);
        } else {
            expression = before + "-" + num;
        }
        hasError = false;
        updateDisplay();
    }
}

function handleSqrt() {
    if (justEvaluated) {
        expression = "√(" + expression + ")";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    const match = expression.match(/([\d.]+)$/);
    if (match) {
        const num = match[1];
        const before = expression.slice(0, -num.length);
        expression = before + "√(" + num + ")";
    } else {
        expression += "√(";
    }
    hasError = false;
    updateDisplay();
}

function handleInverse() {
    if (justEvaluated) {
        expression = "1/(" + expression + ")";
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        return;
    }
    expression += "⁻¹";
    hasError = false;
    updateDisplay();
}

function handleFactorial() {
    if (justEvaluated) {
        const val = parseFloat(expression);
        if (!isNaN(val) && Number.isInteger(val) && val >= 0 && val <= 170) {
            const result = factorial(val);
            expression = String(result);
            justEvaluated = false;
            hasError = false;
            updateDisplay();
        } else {
            showToast("Error");
        }
        return;
    }
    
    const match = expression.match(/([\d.]+)$/);
    if (match) {
        const num = parseFloat(match[1]);
        if (Number.isInteger(num) && num >= 0 && num <= 170) {
            const result = factorial(num);
            const before = expression.slice(0, -match[1].length);
            expression = before + String(result);
            hasError = false;
            updateDisplay();
        } else {
            showToast("Error");
        }
    }
}

function hasDivisionByZero(expr) {
    // Check for division by zero pattern: ÷ 0, ÷0, /0, / 0
    const pattern = /[÷/]\s*0(?!\.\d+)/;
    return pattern.test(expr);
}

function handleEquals() {
    lockButtons();
    
    // If expression is just a number, ignore
    if (/^[\d.\s-]+$/.test(expression) && !/[+\-×÷()]/.test(expression)) {
        return;
    }
    
    // If expression ends with operator, ignore
    if (expression.match(/[\s+\-×÷]$/)) {
        return;
    }
    
    // Remove intermediate history line if exists
    if (intermediateHistoryIndex !== -1) {
        historyLines.splice(intermediateHistoryIndex, 1);
        intermediateHistoryIndex = -1;
    }
    
    // Auto-close parentheses
    let exprToEvaluate = expression;
    const openCount = (expression.match(/\(/g) || []).length;
    const closeCount = (expression.match(/\)/g) || []).length;
    const balance = openCount - closeCount;
    if (balance > 0) {
        exprToEvaluate = expression + ")".repeat(balance);
    }
    
    // Check for division by zero
    if (hasDivisionByZero(exprToEvaluate)) {
        hasError = true;
        updateDisplay();
        return;
    }
    
    // Check if percent data exists
    if (window._percentData) {
        const data = window._percentData;
        const result = evaluateExpression(exprToEvaluate);
        if (result !== "Error") {
            const roundedResult = parseFloat(result.toFixed(12));
            const formattedResult = formatNumber(roundedResult);
            const formattedPrev = formatNumber(data.prevNum);
            const formattedPercent = formatNumber(data.percentValue);
            addHistoryLine(`${formattedPrev} ${data.op} ${data.percentNum}% (${formattedPercent}) = ${formattedResult}`);
            window._percentData = null;
            expression = formattedResult;
            justEvaluated = true;
            hasError = false;
            updateDisplay();
            return;
        }
        window._percentData = null;
    }
    
    // Normal evaluation
    const result = evaluateExpression(exprToEvaluate);
    if (result === "Error") {
        hasError = true;
        updateDisplay();
        return;
    }
    const rounded = parseFloat(result.toFixed(12));
    const formattedResult = formatNumber(rounded);
    addHistoryLine(`${exprToEvaluate} = ${formattedResult}`);
    expression = formattedResult;
    justEvaluated = true;
    hasError = false;
    updateDisplay();
}

function updateStatusIndicator() {
    const indicator = document.getElementById("statusIndicator");
    if (!indicator) return;
    
    if (hasError) {
        indicator.textContent = "ERR";
        indicator.className = "status-indicator error";
        return;
    }
    
    indicator.className = "status-indicator";
    
    const trimmed = expression.trim();
    if (trimmed === "" || trimmed === "0") {
        indicator.textContent = "";
        return;
    }
    
    if (expression.match(/[\s+\-×÷(.,]$/)) {
        indicator.textContent = "…";
    } else {
        indicator.textContent = "";
    }
}

// ========== MEMORY FUNCTIONS ==========
function memoryAdd() {
    const val = parseFloat(expression);
    if (!isNaN(val) && isFinite(val) && val !== 0) {
        memory += val;
        memory = parseFloat(memory.toFixed(2));
        memoryIndicator = true;
        updateMemoryIndicator();
        showToast("M+");
    }
}

function memorySubtract() {
    const val = parseFloat(expression);
    if (!isNaN(val) && isFinite(val) && val !== 0) {
        memory -= val;
        memory = parseFloat(memory.toFixed(2));
        memoryIndicator = true;
        updateMemoryIndicator();
        showToast("M-");
    }
}

function memoryRecall() {
    if (memoryIndicator) {
        expression = String(memory);
        justEvaluated = false;
        hasError = false;
        updateDisplay();
        showToast("MR");
    }
}

function memoryClear() {
    memory = 0;
    memoryIndicator = false;
    updateMemoryIndicator();
    showToast("MC");
}

// ========== DISPLAY INPUT FILTER ==========
display.addEventListener("keydown", (e) => {
    const key = e.key;
    const allowed = /^[0-9]$/.test(key) || key === "." || key === "," || key === "-";
    
    if (e.ctrlKey || e.metaKey) return;
    if (key === "Backspace" || key === "Delete" || key === "ArrowLeft" || key === "ArrowRight" || key === "Tab") return;
    if (!allowed) e.preventDefault();
});

// ========== HISTORY LONG PRESS / CLICK ==========
historyContainer.addEventListener("mousedown", (e) => {
    const line = e.target.closest(".history-line");
    if (!line) return;
    
    isHistoryLongPress = false;
    historyLongPressTimer = setTimeout(() => {
        isHistoryLongPress = true;
        const text = line.textContent;
        navigator.clipboard.writeText(text).then(() => {
            showToast("History row copied!");
        }).catch(() => {
            showToast("Copy failed");
        });
    }, 500);
});

historyContainer.addEventListener("mouseup", (e) => {
    clearTimeout(historyLongPressTimer);
    if (!isHistoryLongPress) {
        const line = e.target.closest(".history-line");
        if (!line) return;
        const text = line.textContent;
        
        // Extract result part after =
        const parts = text.split('=');
        if (parts.length < 2) return;
        const resultPart = parts[1].trim();
        if (!resultPart) return;
        
        // Try to parse as number
        const num = parseFloat(resultPart.replace(/\s/g, "").replace(",", "."));
        if (!isNaN(num) && isFinite(num)) {
            // It's a number result
            if (expression.match(/[\s+\-×÷(]$/)) {
                expression = expression + String(num);
            } else {
                expression = String(num);
                justEvaluated = false;
            }
        } else {
            // If result is not a number, use the whole expression
            const exprPart = parts[0].trim();
            if (exprPart) {
                expression = exprPart;
                justEvaluated = false;
            }
        }
        hasError = false;
        updateDisplay();
    }
});

historyContainer.addEventListener("mouseleave", () => {
    clearTimeout(historyLongPressTimer);
});

// ========== EVENT LISTENERS ==========
document.getElementById("btn0").addEventListener("click", () => inputDigit("0"));
document.getElementById("btn1").addEventListener("click", () => inputDigit("1"));
document.getElementById("btn2").addEventListener("click", () => inputDigit("2"));
document.getElementById("btn3").addEventListener("click", () => inputDigit("3"));
document.getElementById("btn4").addEventListener("click", () => inputDigit("4"));
document.getElementById("btn5").addEventListener("click", () => inputDigit("5"));
document.getElementById("btn6").addEventListener("click", () => inputDigit("6"));
document.getElementById("btn7").addEventListener("click", () => inputDigit("7"));
document.getElementById("btn8").addEventListener("click", () => inputDigit("8"));
document.getElementById("btn9").addEventListener("click", () => inputDigit("9"));

document.getElementById("btnDecimal").addEventListener("click", inputDecimal);
document.getElementById("btnClear").addEventListener("click", handleClearAll);
document.getElementById("btnClearEntry").addEventListener("click", handleClearEntry);
document.getElementById("btnPercent").addEventListener("click", handlePercent);
document.getElementById("btnSign").addEventListener("click", handleToggleSign);

document.getElementById("btnSqrt").addEventListener("click", handleSqrt);
document.getElementById("btnInverse").addEventListener("click", handleInverse);
document.getElementById("btnFactorial").addEventListener("click", handleFactorial);

document.getElementById("btnPower").addEventListener("click", handlePower);
document.getElementById("btnCbrt").addEventListener("click", handleCbrt);
document.getElementById("btnLog").addEventListener("click", handleLog);
document.getElementById("btnLn").addEventListener("click", handleLn);

document.getElementById("btnAdd").addEventListener("click", () => handleOperator("+"));
document.getElementById("btnSubtract").addEventListener("click", () => handleOperator("-"));
document.getElementById("btnMultiply").addEventListener("click", () => handleOperator("×"));
document.getElementById("btnDivide").addEventListener("click", () => handleOperator("÷"));

document.getElementById("btnParenOpen").addEventListener("click", handleParenOpen);
document.getElementById("btnParenClose").addEventListener("click", handleParenClose);

document.getElementById("btnEquals").addEventListener("click", handleEquals);

document.getElementById("btnMPlus").addEventListener("click", memoryAdd);
document.getElementById("btnMMinus").addEventListener("click", memorySubtract);
document.getElementById("btnMR").addEventListener("click", memoryRecall);
document.getElementById("btnMC").addEventListener("click", memoryClear);

document.getElementById("btnFixOnOff").addEventListener("click", toggleFixMode);

document.getElementById("btnMod").addEventListener("click", handleMod);

const btnBackspace = document.getElementById("btnBackspace");
btnBackspace.addEventListener("mousedown", (e) => {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
        isLongPress = true;
        handleClearEntry();
        e.preventDefault();
    }, 500);
});
btnBackspace.addEventListener("mouseup", () => {
    clearTimeout(longPressTimer);
    if (!isLongPress) handleBackspace();
});
btnBackspace.addEventListener("mouseleave", () => {
    clearTimeout(longPressTimer);
});

copyBtn.addEventListener("mousedown", (e) => {
    isCopyLongPress = false;
    copyLongPressTimer = setTimeout(() => {
        isCopyLongPress = true;
        copyResult(true);
        e.preventDefault();
    }, 500);
});
copyBtn.addEventListener("mouseup", () => {
    clearTimeout(copyLongPressTimer);
    if (!isCopyLongPress) copyResult(false);
});
copyBtn.addEventListener("mouseleave", () => {
    clearTimeout(copyLongPressTimer);
});

display.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    pasteFromClipboard(text);
});

document.addEventListener("keydown", (e) => {
    if (e.key >= "0" && e.key <= "9") inputDigit(e.key);
    else if (e.key === "." || e.key === ",") { e.preventDefault(); inputDecimal(); }
    else if (e.key === "+") handleOperator("+");
    else if (e.key === "-") handleOperator("-");
    else if (e.key === "*") handleOperator("×");
    else if (e.key === "/") { e.preventDefault(); handleOperator("÷"); }
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); handleEquals(); }
    else if (e.key === "Escape" || e.key === "c" || e.key === "C") handleClearAll();
    else if (e.key === "%") handlePercent();
    else if (e.key === "Backspace") { e.preventDefault(); handleBackspace(); }
    else if (e.key === "(") handleParenOpen();
    else if (e.key === ")") handleParenClose();
    else if (e.key === "^") { e.preventDefault(); handlePower(); }
    else if (e.key === "l") { e.preventDefault(); handleLog(); }

});

// ========== INIT ==========
loadHistory();
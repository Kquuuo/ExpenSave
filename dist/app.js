"use strict";
// Application State
class ExpenseTracker {
    constructor() {
        this.transactions = [];
        this.currentMonth = new Date();
        this.nextId = 1;
        this.loadFromStorage();
        this.init();
    }
    init() {
        this.setupEventListeners();
        this.updateMonthDisplay();
        this.updateSummary();
        this.renderTransactions();
        this.populateCategoryFilter();
        this.setTodayDate();
    }
    // Event Listeners
    setupEventListeners() {
        const form = document.getElementById('transactionForm');
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');
        const filterType = document.getElementById('filterType');
        const filterCategory = document.getElementById('filterCategory');
        form.addEventListener('submit', (e) => this.handleSubmit(e));
        prevMonth.addEventListener('click', () => this.changeMonth(-1));
        nextMonth.addEventListener('click', () => this.changeMonth(1));
        filterType.addEventListener('change', () => this.renderTransactions());
        filterCategory.addEventListener('change', () => this.renderTransactions());
    }
    // Form Submission
    handleSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const note = document.getElementById('note').value;
        const transaction = {
            id: this.nextId++,
            amount,
            type,
            category,
            date,
            note: note || undefined
        };
        this.addTransaction(transaction);
        form.reset();
        this.setTodayDate();
    }
    // Transaction Management
    addTransaction(transaction) {
        this.transactions.unshift(transaction);
        this.saveToStorage();
        this.updateSummary();
        this.renderTransactions();
        this.populateCategoryFilter();
    }
    deleteTransaction(id) {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToStorage();
        this.updateSummary();
        this.renderTransactions();
        this.populateCategoryFilter();
    }
    // Calculations
    calculateTotals() {
        const filtered = this.getFilteredTransactions();
        const income = filtered
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = filtered
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        return {
            income,
            expenses,
            balance: income - expenses
        };
    }
    // Filtering
    getFilteredTransactions() {
        const filterType = document.getElementById('filterType').value;
        const filterCategory = document.getElementById('filterCategory').value;
        const monthStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const monthEnd = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
        return this.transactions.filter(t => {
            const transactionDate = new Date(t.date);
            const inDateRange = transactionDate >= monthStart && transactionDate <= monthEnd;
            const matchesType = filterType === 'all' || t.type === filterType;
            const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
            return inDateRange && matchesType && matchesCategory;
        });
    }
    // UI Updates
    updateSummary() {
        const totals = this.calculateTotals();
        const incomeEl = document.getElementById('totalIncome');
        const expensesEl = document.getElementById('totalExpenses');
        const balanceEl = document.getElementById('currentBalance');
        incomeEl.textContent = this.formatCurrency(totals.income);
        expensesEl.textContent = this.formatCurrency(totals.expenses);
        balanceEl.textContent = this.formatCurrency(totals.balance);
        // Update balance color
        balanceEl.style.color = totals.balance >= 0
            ? 'var(--color-income)'
            : 'var(--color-expense)';
    }
    renderTransactions() {
        const container = document.getElementById('transactionList');
        const filtered = this.getFilteredTransactions();
        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>No transactions found</p>
                    <span>Try adjusting your filters or add a new transaction</span>
                </div>
            `;
            return;
        }
        container.innerHTML = filtered.map(t => this.createTransactionHTML(t)).join('');
        // Add delete listeners
        filtered.forEach(t => {
            const deleteBtn = document.getElementById(`delete-${t.id}`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteTransaction(t.id));
            }
        });
    }
    createTransactionHTML(transaction) {
        const icon = this.getCategoryIcon(transaction.category);
        const formattedDate = this.formatDate(transaction.date);
        const sign = transaction.type === 'income' ? '+' : '-';
        return `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-info">
                    <div class="transaction-icon">${icon}</div>
                    <div class="transaction-details">
                        <div class="transaction-category">${transaction.category}</div>
                        ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
                        <div class="transaction-date">${formattedDate}</div>
                    </div>
                </div>
                <span class="transaction-amount">${sign}${this.formatCurrency(transaction.amount)}</span>
                <button class="btn-delete" id="delete-${transaction.id}" title="Delete transaction">×</button>
            </div>
        `;
    }
    // Month Navigation
    changeMonth(delta) {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
        this.updateMonthDisplay();
        this.updateSummary();
        this.renderTransactions();
    }
    updateMonthDisplay() {
        const monthEl = document.getElementById('currentMonth');
        const options = { month: 'long', year: 'numeric' };
        monthEl.textContent = this.currentMonth.toLocaleDateString('en-US', options);
    }
    // Category Filter Population
    populateCategoryFilter() {
        const filterCategory = document.getElementById('filterCategory');
        const categories = new Set(this.transactions.map(t => t.category));
        const currentValue = filterCategory.value;
        filterCategory.innerHTML = '<option value="all">All Categories</option>';
        Array.from(categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterCategory.appendChild(option);
        });
        if (categories.has(currentValue)) {
            filterCategory.value = currentValue;
        }
    }
    // Utility Functions
    getCategoryIcon(category) {
        const icons = {
            'Food': '🍽️',
            'Transport': '🚗',
            'Rent': '🏠',
            'Utilities': '💡',
            'Entertainment': '🎮',
            'Shopping': '🛍️',
            'Health': '🏥',
            'Education': '📚',
            'Salary': '💼',
            'Freelance': '💻',
            'Investment': '📈',
            'Gift': '🎁',
            'Others': '📦'
        };
        return icons[category] || '📦';
    }
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount);
    }
    formatDate(dateString) {
        const date = new Date(dateString);
        const options = {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    }
    setTodayDate() {
        const dateInput = document.getElementById('date');
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        dateInput.value = formattedDate;
    }
    // Local Storage
    saveToStorage() {
        try {
            localStorage.setItem('expense-tracker-transactions', JSON.stringify(this.transactions));
            localStorage.setItem('expense-tracker-next-id', this.nextId.toString());
        }
        catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('expense-tracker-transactions');
            const storedId = localStorage.getItem('expense-tracker-next-id');
            if (stored) {
                this.transactions = JSON.parse(stored);
            }
            if (storedId) {
                this.nextId = parseInt(storedId, 10);
            }
        }
        catch (error) {
            console.error('Error loading from localStorage:', error);
            this.transactions = [];
            this.nextId = 1;
        }
    }
}
// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new ExpenseTracker();
});

// Type definitions
type TransactionType = "income" | "expense";

interface Transaction {
    id: number;
    amount: number;
    type: TransactionType;
    category: string;
    date: string;
    note?: string;
}

// Application State
class ExpenseTracker {
    private transactions: Transaction[] = [];
    private currentMonth: Date = new Date();
    private nextId: number = 1;

    constructor() {
        this.loadFromStorage();
        this.init();
    }

    private init(): void {
        this.setupEventListeners();
        this.updateMonthDisplay();
        this.updateSummary();
        this.renderTransactions();
        this.populateCategoryFilter();
        this.setTodayDate();
    }

    // Event Listeners
    private setupEventListeners(): void {
        const form = document.getElementById('transactionForm') as HTMLFormElement;
        const prevMonth = document.getElementById('prevMonth') as HTMLButtonElement;
        const nextMonth = document.getElementById('nextMonth') as HTMLButtonElement;
        const filterType = document.getElementById('filterType') as HTMLSelectElement;
        const filterCategory = document.getElementById('filterCategory') as HTMLSelectElement;

        form.addEventListener('submit', (e) => this.handleSubmit(e));
        prevMonth.addEventListener('click', () => this.changeMonth(-1));
        nextMonth.addEventListener('click', () => this.changeMonth(1));
        filterType.addEventListener('change', () => this.renderTransactions());
        filterCategory.addEventListener('change', () => this.renderTransactions());
    }

    // Form Submission
    private handleSubmit(e: Event): void {
        e.preventDefault();
        
        const form = e.target as HTMLFormElement;
        const amount = parseFloat((document.getElementById('amount') as HTMLInputElement).value);
        const type = (document.getElementById('type') as HTMLSelectElement).value as TransactionType;
        const category = (document.getElementById('category') as HTMLSelectElement).value;
        const date = (document.getElementById('date') as HTMLInputElement).value;
        const note = (document.getElementById('note') as HTMLInputElement).value;

        const transaction: Transaction = {
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
    private addTransaction(transaction: Transaction): void {
        this.transactions.unshift(transaction);
        this.saveToStorage();
        this.updateSummary();
        this.renderTransactions();
        this.populateCategoryFilter();
    }

    public deleteTransaction(id: number): void {
        this.transactions = this.transactions.filter(t => t.id !== id);
        this.saveToStorage();
        this.updateSummary();
        this.renderTransactions();
        this.populateCategoryFilter();
    }

    // Calculations
    private calculateTotals(): { income: number; expenses: number; balance: number } {
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
    private getFilteredTransactions(): Transaction[] {
        const filterType = (document.getElementById('filterType') as HTMLSelectElement).value;
        const filterCategory = (document.getElementById('filterCategory') as HTMLSelectElement).value;
        
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
    private updateSummary(): void {
        const totals = this.calculateTotals();
        
        const incomeEl = document.getElementById('totalIncome') as HTMLElement;
        const expensesEl = document.getElementById('totalExpenses') as HTMLElement;
        const balanceEl = document.getElementById('currentBalance') as HTMLElement;

        incomeEl.textContent = this.formatCurrency(totals.income);
        expensesEl.textContent = this.formatCurrency(totals.expenses);
        balanceEl.textContent = this.formatCurrency(totals.balance);

        // Update balance color
        balanceEl.style.color = totals.balance >= 0 
            ? 'var(--color-income)' 
            : 'var(--color-expense)';
    }

    private renderTransactions(): void {
        const container = document.getElementById('transactionList') as HTMLElement;
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

    private createTransactionHTML(transaction: Transaction): string {
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
    private changeMonth(delta: number): void {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + delta);
        this.updateMonthDisplay();
        this.updateSummary();
        this.renderTransactions();
    }

    private updateMonthDisplay(): void {
        const monthEl = document.getElementById('currentMonth') as HTMLElement;
        const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
        monthEl.textContent = this.currentMonth.toLocaleDateString('en-US', options);
    }

    // Category Filter Population
    private populateCategoryFilter(): void {
        const filterCategory = document.getElementById('filterCategory') as HTMLSelectElement;
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
    private getCategoryIcon(category: string): string {
        const icons: { [key: string]: string } = {
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

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(amount);
    }

    private formatDate(dateString: string): string {
        const date = new Date(dateString);
        const options: Intl.DateTimeFormatOptions = { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    private setTodayDate(): void {
        const dateInput = document.getElementById('date') as HTMLInputElement;
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        dateInput.value = formattedDate;
    }

    // Local Storage
    private saveToStorage(): void {
        try {
            localStorage.setItem('expense-tracker-transactions', JSON.stringify(this.transactions));
            localStorage.setItem('expense-tracker-next-id', this.nextId.toString());
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem('expense-tracker-transactions');
            const storedId = localStorage.getItem('expense-tracker-next-id');
            
            if (stored) {
                this.transactions = JSON.parse(stored);
            }
            
            if (storedId) {
                this.nextId = parseInt(storedId, 10);
            }
        } catch (error) {
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
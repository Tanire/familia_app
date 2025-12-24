document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const titleInput = document.getElementById('expense-title');
    const categoryInput = document.getElementById('expense-category');
    const amountInput = document.getElementById('expense-amount');

    // Recurring Inputs
    const isRecurringCheck = document.getElementById('is-recurring');
    const recurringOptions = document.getElementById('recurring-options');
    const recurringDayInput = document.getElementById('recurring-day');

    const addBtn = document.getElementById('add-expense-btn');

    // Lists & Views
    const expensesList = document.getElementById('expenses-list');
    const recurringList = document.getElementById('recurring-list');
    const totalAmountEl = document.getElementById('total-amount');

    const viewExpensesBtn = document.getElementById('view-expenses-btn');
    const viewRecurringBtn = document.getElementById('view-recurring-btn');

    // Constants
    const CATEGORY_ICONS = {
        'supermarket': '🛒', 'home': '🏠', 'transport': '🚗',
        'leisure': '🎉', 'health': '💊', 'clothing': '👕', 'other': '📦'
    };
    const CATEGORY_NAMES = {
        'supermarket': 'Supermercado', 'home': 'Casa', 'transport': 'Transporte',
        'leisure': 'Ocio', 'health': 'Salud', 'clothing': 'Ropa', 'other': 'Otros'
    };

    // --- UI Toggles ---

    isRecurringCheck.addEventListener('change', () => {
        if (isRecurringCheck.checked) {
            recurringOptions.classList.remove('hidden');
        } else {
            recurringOptions.classList.add('hidden');
        }
    });

    viewExpensesBtn.addEventListener('click', () => {
        expensesList.classList.remove('hidden');
        recurringList.classList.add('hidden');
        viewExpensesBtn.className = 'btn btn-sm btn-primary';
        viewRecurringBtn.className = 'btn btn-sm btn-secondary';
        renderExpenses();
    });

    viewRecurringBtn.addEventListener('click', () => {
        expensesList.classList.add('hidden');
        recurringList.classList.remove('hidden');
        viewExpensesBtn.className = 'btn btn-sm btn-secondary';
        viewRecurringBtn.className = 'btn btn-sm btn-primary';
        renderRecurring();
    });


    // --- Logic ---

    function addExpense() {
        const title = titleInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;
        const isRecurring = isRecurringCheck.checked;

        if (!title || isNaN(amount)) {
            alert('Por favor, introduce concepto y cantidad.');
            return;
        }

        if (isRecurring) {
            // Add Recurring Bill
            const day = parseInt(recurringDayInput.value);
            if (!day || day < 1 || day > 31) {
                alert('Por favor, introduce un día válido (1-31).');
                return;
            }

            const bills = StorageService.getRecurringBills();
            bills.push({
                id: Date.now().toString(),
                title,
                amount,
                category,
                day
            });
            StorageService.saveRecurringBills(bills);

            alert('Gasto Fijo añadido. Se repetirá cada mes.');
            // Switch to list view
            viewRecurringBtn.click();
        } else {
            // Add Normal Expense
            const newExpense = {
                id: Date.now().toString(),
                title,
                amount,
                category,
                date: new Date().toISOString()
            };

            const expenses = StorageService.getExpenses();
            expenses.push(newExpense);
            StorageService.saveExpenses(expenses);

            // Stay in history view
            if (expensesList.classList.contains('hidden')) {
                viewExpensesBtn.click();
            } else {
                renderExpenses();
            }
        }

        // Reset Form
        titleInput.value = '';
        amountInput.value = '';
        isRecurringCheck.checked = false;
        recurringOptions.classList.add('hidden');
        recurringDayInput.value = '';
    }

    // --- Renders ---

    function renderExpenses() {
        // Only show expenses for CURRENT MONTH logic? 
        // For simplicity V1 showed all history. user didn't ask for filtering yet but "Historial Mes" implies filter.
        // Let's filter for current month to be cleaner.
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let expenses = StorageService.getExpenses();

        // Filter
        expenses = expenses.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        // Sort descending
        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        let total = 0;
        expensesList.innerHTML = '';

        if (expenses.length === 0) {
            expensesList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay gastos este mes.</div>';
        }

        expenses.forEach((expense) => {
            total += parseFloat(expense.amount);

            const item = document.createElement('div');
            item.className = 'expense-item';

            const dateOpts = { day: 'numeric', month: 'short' };
            const dateStr = new Date(expense.date).toLocaleDateString('es-ES', dateOpts);

            const categoryIcon = CATEGORY_ICONS[expense.category] || '📦';
            const categoryName = CATEGORY_NAMES[expense.category] || 'Otros';

            item.innerHTML = `
                <div style="font-size: 1.5rem; margin-right: 1rem;">${categoryIcon}</div>
                <div style="flex-grow: 1;">
                <div style="font-weight: 600;">${expense.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    <span style="background: #F3F4F6; padding: 2px 6px; border-radius: 4px; border: 1px solid #E5E7EB;">${categoryName}</span>
                    • ${dateStr}
                </div>
                </div>
                <div class="amount" style="margin-right: 1rem; font-weight: 600; font-size: 1.1rem;">
                ${parseFloat(expense.amount).toFixed(2)} €
                </div>
                <button class="btn-delete" data-id="${expense.id}" data-type="normal">✕</button>
            `;
            expensesList.appendChild(item);
        });

        totalAmountEl.textContent = `${total.toFixed(2)} €`;
        setupDeleteListeners();
    }

    function renderRecurring() {
        let bills = StorageService.getRecurringBills();
        recurringList.innerHTML = '';

        if (bills.length === 0) {
            recurringList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted); line-height: 1.6;">No tienes gastos fijos configurados.<br>Añade la luz, agua, internet...</div>';
            return;
        }

        bills.sort((a, b) => a.day - b.day);

        bills.forEach(bill => {
            const item = document.createElement('div');
            item.className = 'expense-item';
            // Different border or style for recurring?
            item.style.borderLeft = '4px solid #F59E0B'; // Orange for recurring

            const categoryIcon = CATEGORY_ICONS[bill.category] || '📦';

            item.innerHTML = `
                <div style="font-size: 1.5rem; margin-right: 1rem;">${categoryIcon}</div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600;">${bill.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        🔄 Día ${bill.day} de cada mes
                    </div>
                </div>
                <div class="amount" style="margin-right: 1rem; font-weight: 600; font-size: 1.1rem;">
                    ${parseFloat(bill.amount).toFixed(2)} €
                </div>
                <button class="btn-delete" data-id="${bill.id}" data-type="recurring">✕</button>
            `;
            recurringList.appendChild(item);
        });

        setupDeleteListeners();
    }

    function setupDeleteListeners() {
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.target.dataset.id;
                const type = e.target.dataset.type;
                if (type === 'normal') deleteExpense(id);
                else deleteRecurring(id);
            };
        });
    }

    function deleteExpense(id) {
        if (confirm('¿Eliminar este gasto del historial?')) {
            let expenses = StorageService.getExpenses();
            expenses = expenses.filter(e => e.id !== id);
            StorageService.saveExpenses(expenses);
            renderExpenses();
        }
    }

    function deleteRecurring(id) {
        if (confirm('¿Eliminar este gasto fijo? Dejará de avisarte.')) {
            let bills = StorageService.getRecurringBills();
            bills = bills.filter(b => b.id !== id);
            StorageService.saveRecurringBills(bills);
            renderRecurring();
        }
    }


    addBtn.addEventListener('click', addExpense);
    amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addExpense();
    });

    // Init
    renderExpenses();
});

// Auto-refresh logic (Generic reload is simplest for now)
window.addEventListener('storage-updated', () => {
    location.reload();
});

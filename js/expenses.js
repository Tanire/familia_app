document.addEventListener('DOMContentLoaded', () => {
    const titleInput = document.getElementById('expense-title');
    const categoryInput = document.getElementById('expense-category');
    const amountInput = document.getElementById('expense-amount');
    const addBtn = document.getElementById('add-expense-btn');
    const expensesList = document.getElementById('expenses-list');
    const totalAmountEl = document.getElementById('total-amount');

    const CATEGORY_ICONS = {
        'supermarket': '🛒',
        'home': '🏠',
        'transport': '🚗',
        'leisure': '🎉',
        'health': '💊',
        'clothing': '👕',
        'other': '📦'
    };

    const CATEGORY_NAMES = {
        'supermarket': 'Supermercado',
        'home': 'Casa',
        'transport': 'Transporte',
        'leisure': 'Ocio',
        'health': 'Salud',
        'clothing': 'Ropa',
        'other': 'Otros'
    };

    function renderExpenses() {
        let expenses = StorageService.getExpenses();
        let total = 0;
        expensesList.innerHTML = '';

        expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (expenses.length === 0) {
            expensesList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay gastos registrados.</div>';
        }

        expenses.forEach((expense) => {
            total += parseFloat(expense.amount);

            const item = document.createElement('div');
            item.className = 'expense-item';

            const dateOpts = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
            const dateStr = new Date(expense.date).toLocaleDateString('es-ES', dateOpts);

            const categoryIcon = CATEGORY_ICONS[expense.category] || '📦';
            const categoryName = CATEGORY_NAMES[expense.category] || 'Otros';

            // Backward compatibility
            const displayCategory = expense.category ? categoryName : '';

            item.innerHTML = `
        <div style="font-size: 1.5rem; margin-right: 1rem;">${categoryIcon}</div>
        <div style="flex-grow: 1;">
          <div style="font-weight: 600;">${expense.title}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            <span style="background: #F3F4F6; padding: 2px 6px; border-radius: 4px; border: 1px solid #E5E7EB;">${displayCategory || 'General'}</span>
            • ${dateStr}
          </div>
        </div>
        <div class="amount" style="margin-right: 1rem; font-weight: 600; font-size: 1.1rem;">
          ${parseFloat(expense.amount).toFixed(2)} €
        </div>
        <button class="btn-delete" data-id="${expense.id}" style="background: rgba(239, 68, 68, 0.1); border: none; cursor: pointer; color: #EF4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: background 0.2s;">
          ✕
        </button>
      `;
            expensesList.appendChild(item);
        });

        totalAmountEl.textContent = `${total.toFixed(2)} €`;

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                deleteExpense(id);
            });
        });
    }

    function addExpense() {
        const title = titleInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;

        if (!title || isNaN(amount)) {
            alert('Por favor, introduce concepto y cantidad.');
            return;
        }

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

        titleInput.value = '';
        amountInput.value = '';
        renderExpenses();
    }

    function deleteExpense(id) {
        if (confirm('¿Eliminar este gasto?')) {
            let expenses = StorageService.getExpenses();
            expenses = expenses.filter(e => e.id !== id);
            StorageService.saveExpenses(expenses);
            renderExpenses();
        }
    }

    addBtn.addEventListener('click', addExpense);

    amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addExpense();
    });

    renderExpenses();
});

// Auto-refresh when sync finishes
window.addEventListener('storage-updated', () => {
    location.reload();
});

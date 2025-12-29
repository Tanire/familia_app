document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const typeInput = document.getElementById('expense-type');
    const titleInput = document.getElementById('expense-title');
    const categoryInput = document.getElementById('expense-category');
    const amountInput = document.getElementById('expense-amount');

    // Recurring Inputs
    const isRecurringCheck = document.getElementById('is-recurring');
    const recurringOptions = document.getElementById('recurring-options');
    const recurringDayInput = document.getElementById('recurring-day');

    const addBtn = document.getElementById('add-expense-btn');

    // Header Stats
    const prevMonthBtn = document.getElementById('prev-month-stats');
    const nextMonthBtn = document.getElementById('next-month-stats');
    const statsLabel = document.getElementById('stats-month-year');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');
    const totalBalanceEl = document.getElementById('total-balance');

    // Lists & Views
    const expensesList = document.getElementById('expenses-list');
    const recurringList = document.getElementById('recurring-list');

    const viewExpensesBtn = document.getElementById('view-expenses-btn');
    const viewRecurringBtn = document.getElementById('view-recurring-btn');

    // Navigation State
    let currentDate = new Date();

    // Constants
    const CATEGORY_ICONS = {
        'supermarket': '🛒', 'home': '🏠', 'transport': '🚗',
        'leisure': '🎉', 'health': '💊', 'clothing': '👕', 'other': '📦', 'salary': '💰', 'gift': '🎁'
    };
    const CATEGORY_NAMES = {
        'supermarket': 'Supermercado', 'home': 'Casa', 'transport': 'Transporte',
        'leisure': 'Ocio', 'health': 'Salud', 'clothing': 'Ropa', 'other': 'Otros', 'salary': 'Nómina', 'gift': 'Regalo'
    };

    // --- UI Toggles ---

    isRecurringCheck.addEventListener('change', () => {
        if (isRecurringCheck.checked) {
            recurringOptions.classList.remove('hidden');
        } else {
            recurringOptions.classList.add('hidden');
        }
    });

    const viewChartsBtn = document.getElementById('view-charts-btn');
    const chartsView = document.getElementById('charts-view');

    viewExpensesBtn.addEventListener('click', () => {
        expensesList.classList.remove('hidden');
        recurringList.classList.add('hidden');
        chartsView.classList.add('hidden');

        viewExpensesBtn.className = 'btn btn-sm btn-primary';
        viewRecurringBtn.className = 'btn btn-sm btn-secondary';
        viewChartsBtn.className = 'btn btn-sm btn-secondary';

        renderExpenses();
    });

    viewRecurringBtn.addEventListener('click', () => {
        expensesList.classList.add('hidden');
        recurringList.classList.remove('hidden');
        chartsView.classList.add('hidden');

        viewExpensesBtn.className = 'btn btn-sm btn-secondary';
        viewRecurringBtn.className = 'btn btn-sm btn-primary';
        viewChartsBtn.className = 'btn btn-sm btn-secondary';

        renderRecurring();
    });

    viewChartsBtn.addEventListener('click', () => {
        expensesList.classList.add('hidden');
        recurringList.classList.add('hidden');
        chartsView.classList.remove('hidden');

        viewExpensesBtn.className = 'btn btn-sm btn-secondary';
        viewRecurringBtn.className = 'btn btn-sm btn-secondary';
        viewChartsBtn.className = 'btn btn-sm btn-primary';

        if (window.renderCharts) {
            window.renderCharts(currentDate);
        }
    });

    // --- Logic ---

    function addExpense() {
        const title = titleInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;
        const isRecurring = isRecurringCheck.checked;
        const type = typeInput ? typeInput.value : 'expense';

        if (!title || isNaN(amount)) {
            alert('Por favor, introduce concepto y cantidad.');
            return;
        }

        if (isRecurring && type === 'expense') {
            // Recurring Bill (Only Expenses supported for now as Recurring in this logic, but easy to expand)
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
            StorageService.triggerAutoSync(); // MANUAL SYNC

            alert('Gasto Fijo añadido.');
            viewRecurringBtn.click();
        } else {
            // Normal Movement (Income or Expense)
            const newMov = {
                id: Date.now().toString(),
                title,
                amount,
                category,
                type: type, // 'income' or 'expense'
                date: new Date().toISOString(),
                createdBy: localStorage.getItem('user_profile') || ''
            };

            const expenses = StorageService.getExpenses();
            expenses.push(newMov);
            StorageService.saveExpenses(expenses);
            StorageService.triggerAutoSync(); // MANUAL SYNC

            // Reset Date View to NOW to see the new item
            currentDate = new Date();

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
    }

    // --- OCR Logic ---
    const scanBtn = document.getElementById('scan-btn');
    const cameraInput = document.getElementById('camera-input');
    const scanStatus = document.getElementById('scan-status');
    const scanProgress = document.getElementById('scan-progress');

    scanBtn.addEventListener('click', () => {
        cameraInput.click();
    });

    cameraInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            scanStatus.classList.remove('hidden');
            scanBtn.disabled = true;
            scanBtn.textContent = "⏳ Analizando...";

            try {
                const text = await OCRService.scanImage(file, (m) => {
                    if (m.status === 'recognizing text') {
                        scanProgress.textContent = Math.round(m.progress * 100) + '%';
                    } else {
                        scanProgress.textContent = m.status;
                    }
                });

                if (text) {
                    console.log("OCR Result:", text);
                    const result = OCRService.parseReceiptText(text);

                    if (result.total) {
                        amountInput.value = result.total.toFixed(2);
                        alert(`¡Detectado! Importe: ${result.total}€\n(Revisa si es correcto)`);

                        // Try to suggest a title? Not easy without AI.
                        // titleInput.value = "Ticket Escaneado";
                    } else {
                        alert("No he encontrado el precio total claro. Por favor, escríbelo tú.");
                    }

                    // Put raw text in title as hint? No, messy.
                }

            } catch (error) {
                console.error(error);
                alert("Error al escanear.");
            } finally {
                scanStatus.classList.add('hidden');
                scanBtn.disabled = false;
                scanBtn.textContent = "📸 Escanear Ticket (Beta)";
                cameraInput.value = ''; // Reset
            }
        }
    });

    // --- Renders ---

    function renderExpenses() {
        const viewMonth = currentDate.getMonth();
        const viewYear = currentDate.getFullYear();

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        if (statsLabel) statsLabel.textContent = `${monthNames[viewMonth]} ${viewYear}`;

        let allMovements = StorageService.getExpenses();
        // Filter Soft Deleted
        allMovements = allMovements.filter(e => !e._deleted);

        // Filter by View Date
        const currentMovements = allMovements.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
        });

        // Sort descending
        currentMovements.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Stats Calculation
        let income = 0;
        let expense = 0;

        expensesList.innerHTML = '';

        if (currentMovements.length === 0) {
            expensesList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay movimientos este mes.</div>';
        }

        currentMovements.forEach((mov) => {
            const val = parseFloat(mov.amount);
            const isIncome = mov.type === 'income';

            if (isIncome) income += val;
            else expense += val;

            const item = document.createElement('div');
            item.className = 'expense-item';
            if (isIncome) item.classList.add('item-income');
            else item.classList.add('item-expense');

            const dateOpts = { day: 'numeric', month: 'short' };
            const dateStr = new Date(mov.date).toLocaleDateString('es-ES', dateOpts);
            const categoryIcon = CATEGORY_ICONS[mov.category] || (isIncome ? '💰' : '📦');
            const categoryName = CATEGORY_NAMES[mov.category] || (isIncome ? 'Ingreso' : 'Otros');

            item.innerHTML = `
                <div style="font-size: 1.5rem; margin-right: 1rem;">${categoryIcon}</div>
                <div style="flex-grow: 1;">
                <div style="font-weight: 600;">${mov.title}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    <span style="background: var(--bg-body); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--text-light);">${categoryName}</span>
                    • ${dateStr}
                    ${mov.createdBy ? `• <small>${mov.createdBy}</small>` : ''}
                </div>
                </div>
                <div class="amount" style="margin-right: 1rem; font-weight: 600; font-size: 1.1rem; color: ${isIncome ? 'var(--secondary)' : 'inherit'}">
                ${isIncome ? '+' : '-'}${val.toFixed(2)} €
                </div>
                <button class="btn-delete" data-id="${mov.id}" data-type="normal">✕</button>
            `;
            expensesList.appendChild(item);
        });

        // Update Header Stats
        if (totalIncomeEl) totalIncomeEl.textContent = `${income.toFixed(2)} €`;
        if (totalExpenseEl) totalExpenseEl.textContent = `${expense.toFixed(2)} €`;

        const balance = income - expense;
        if (totalBalanceEl) {
            totalBalanceEl.textContent = `${balance.toFixed(2)} €`;
            totalBalanceEl.style.color = balance >= 0 ? 'var(--secondary)' : 'var(--danger)';
        }

        setupDeleteListeners();
    }

    function renderRecurring() {
        let bills = StorageService.getRecurringBills();
        bills = bills.filter(b => !b._deleted);
        recurringList.innerHTML = '';

        if (bills.length === 0) {
            recurringList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay gastos fijos configurados.</div>';
            return;
        }

        bills.sort((a, b) => a.day - b.day);

        bills.forEach(bill => {
            const item = document.createElement('div');
            item.className = 'expense-item';
            item.style.borderLeft = '4px solid #F59E0B';

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
        if (confirm('¿Eliminar este movimiento?')) {
            let expenses = StorageService.getExpenses();
            const idx = expenses.findIndex(e => e.id === id);
            if (idx !== -1) {
                expenses[idx]._deleted = true;
                StorageService.saveExpenses(expenses);
                StorageService.triggerAutoSync(); // MANUAL SYNC
                renderExpenses();
            }
        }
    }

    function deleteRecurring(id) {
        if (confirm('¿Eliminar este gasto fijo?')) {
            let bills = StorageService.getRecurringBills();
            const idx = bills.findIndex(b => b.id === id);
            if (idx !== -1) {
                bills[idx]._deleted = true;
                StorageService.saveRecurringBills(bills);
                StorageService.triggerAutoSync(); // MANUAL SYNC
                renderRecurring();
            }
        }
    }

    // Navigation Listeners
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderExpenses();
        if (!chartsView.classList.contains('hidden') && window.renderCharts) window.renderCharts(currentDate);
    });

    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderExpenses();
        if (!chartsView.classList.contains('hidden') && window.renderCharts) window.renderCharts(currentDate);
    });

    addBtn.addEventListener('click', addExpense);
    amountInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addExpense();
    });

    // Init
    renderExpenses();

    window.addEventListener('storage-updated', () => {
        renderExpenses();
        renderRecurring();
    });
});


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

    // Store scanned items temporarily
    let currentScannedItems = [];

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

    // --- Dynamic Categories ---
    let customCategories = StorageService.getCustomCategories();
    
    // Populate Select HTML
    if (categoryInput) {
        categoryInput.innerHTML = '';
        customCategories.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.icon} ${c.name}`;
            categoryInput.appendChild(opt);
        });
        // Default 'other' if not in list
        if (!customCategories.find(c => c.id === 'other')) {
             const opt = document.createElement('option');
             opt.value = 'other';
             opt.textContent = '📦 Otros';
             categoryInput.appendChild(opt);
        }
    }

    function getCategoryInfo(id, fallbackName = 'Otros', fallbackIcon = '📦') {
        const cat = customCategories.find(c => c.id === id);
        return cat ? { name: cat.name, icon: cat.icon } : { name: fallbackName, icon: fallbackIcon };
    }

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

    const dateInput = document.getElementById('expense-date');

    // On load, set date input to today
    if (dateInput) {
         const now = new Date();
         const localISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
         dateInput.value = localISO;
    }

    function addExpense() {
        const title = titleInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput.value;
        const isRecurring = isRecurringCheck.checked;
        const type = typeInput ? typeInput.value : 'expense';
        let movementDate = new Date().toISOString(); // Fallback

        if (dateInput && dateInput.value) {
            // Need to create a Date object that represents the SELECTED day, but maybe keep current time
            // to avoid all items overlapping at 00:00:00 if sorted by exact time.
            const d = new Date(dateInput.value);
            const now = new Date();
            d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
            movementDate = d.toISOString();
        }

        if (!title || isNaN(amount)) {
            alert('Por favor, introduce concepto y cantidad.');
            return;
        }

        if (isRecurring && type === 'expense') {
            // Recurring Bill
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
                date: movementDate,
                createdBy: localStorage.getItem('user_profile') || '',
                items: currentScannedItems || [] // Store scanned items
            };

            // Clear temp storage
            currentScannedItems = [];

            const expenses = StorageService.getExpenses();
            expenses.push(newMov);
            StorageService.saveExpenses(expenses);
            StorageService.triggerAutoSync(); // MANUAL SYNC

            // Reset Date View to the month of the ADDED item to see it clearly
            if (dateInput && dateInput.value) {
                currentDate = new Date(dateInput.value);
            } else {
                currentDate = new Date();
            }

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
        if (dateInput) {
             const now = new Date();
             const localISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
             dateInput.value = localISO;
        }
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

                        if (result.items && result.items.length > 0) {
                            currentScannedItems = result.items;
                            alert(`¡Detectado! Importe: ${result.total}€\nProductos encontrados: ${result.items.length}`);
                        } else {
                            currentScannedItems = [];
                            alert(`¡Detectado! Importe: ${result.total}€\n(Revisa si es correcto)`);
                        }

                        // Try to suggest a title? Not easy without AI.
                        // titleInput.value = "Ticket Escaneado";
                    } else {
                        alert("No he encontrado el precio total claro. Por favor, escríbelo tú.");
                    }
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
            const catInfo = getCategoryInfo(mov.category, isIncome ? 'Ingreso' : 'Otros', isIncome ? '💰' : '📦');

            item.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div style="font-size: 1.5rem; margin-right: 1rem;">${catInfo.icon}</div>
                    <div style="flex-grow: 1;">
                    <div style="font-weight: 600;">${mov.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        <span style="background: var(--bg-body); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--text-light); color: var(--text-main);">${catInfo.name}</span>
                        • ${dateStr}
                        ${mov.createdBy ? `• <small>${mov.createdBy}</small>` : ''}
                        ${mov.items && mov.items.length > 0 ? `• <small style="color:var(--primary);">📄 Ver Ticket (${mov.items.length})</small>` : ''}
                    </div>
                    </div>
                    <div class="amount" style="margin-right: 1rem; font-weight: 600; font-size: 1.1rem; color: ${isIncome ? 'var(--secondary)' : 'inherit'}">
                    ${isIncome ? '+' : '-'}${val.toFixed(2)} €
                    </div>
                    <button class="btn-delete" data-id="${mov.id}" data-type="normal">✕</button>
                </div>
                ${renderExpenseDetails(mov)}
            `;

            // Toggle Details Click (always active now for share button)
            item.style.cursor = 'pointer';
            item.onclick = (e) => {
                // Don't trigger if clicked delete or a link
                if (e.target.classList.contains('btn-delete') || e.target.closest('a')) return;

                const details = item.querySelector('.expense-details');
                if (details) {
                    if (details.style.display === 'none') {
                        details.style.display = 'flex';
                    } else {
                        details.style.display = 'none';
                    }
                }
            };
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

        // --- Budget Progress Bar ---
        const budgetContainer = document.getElementById('budget-container');
        const budgetText = document.getElementById('budget-text');
        const budgetBar = document.getElementById('budget-bar');
        const monthlyBudget = StorageService.getMonthlyBudget();

        if (budgetContainer && monthlyBudget > 0) {
            budgetContainer.style.display = 'block';
            let percentage = (expense / monthlyBudget) * 100;
            if (percentage > 100) percentage = 100;
            
            budgetText.textContent = `${expense.toFixed(2)} / ${monthlyBudget.toFixed(2)} €`;
            budgetBar.style.width = `${percentage}%`;
            
            if (percentage < 75) {
                budgetBar.style.backgroundColor = 'var(--secondary)';
            } else if (percentage < 90) {
                budgetBar.style.backgroundColor = 'var(--accent)';
            } else {
                budgetBar.style.backgroundColor = 'var(--danger)';
            }
        } else if (budgetContainer) {
            budgetContainer.style.display = 'none';
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

            const catInfo = getCategoryInfo(bill.category);

            item.innerHTML = `
                <div style="font-size: 1.5rem; margin-right: 1rem;">${catInfo.icon}</div>
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

    function renderExpenseDetails(mov) {
        let html = `<div class="expense-details" style="display:none; margin-top: 0.75rem; border-top: 1px dashed #E5E7EB; padding-top: 0.5rem; flex-direction: column;">`;
        
        if (mov.items && mov.items.length > 0) {
            html += `<div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight:600;">ARTÍCULOS DEL TICKET:</div>`;
            mov.items.forEach(item => {
                html += `
                <div class="item-row" style="display:flex; justify-content:space-between; font-size: 0.85rem; margin-bottom: 2px;">
                    <span>${item.name}</span>
                    <span style="font-family:monospace;">${item.price.toFixed(2)}</span>
                </div>`;
            });
        }
        
        // Share Button (always present in details)
        const isIncome = mov.type === 'income';
        const typeWord = isIncome ? 'Ingreso' : 'Gasto';
        const val = parseFloat(mov.amount).toFixed(2);
        const shareText = encodeURIComponent(`Hola, apunto un ${typeWord} de la casa:\n*Concepto:* ${mov.title}\n*Importe:* ${val}€`);
        const whatsappLink = `https://wa.me/?text=${shareText}`;
        
        html += `
            <div style="margin-top: 1rem; display: flex; justify-content: flex-end;">
                 <a href="${whatsappLink}" target="_blank" class="btn btn-sm btn-secondary" style="border-color: #25D366; color: #25D366;">
                    WhatsApp
                 </a>
            </div>
        `;

        html += `</div>`;
        return html;
    }
});


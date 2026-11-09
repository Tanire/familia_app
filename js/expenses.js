document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const typeInput = document.getElementById('expense-type');
    const titleInput = document.getElementById('expense-title');
    const categoryInput = document.getElementById('expense-category');
    const amountInput = document.getElementById('expense-amount');
    const dateInput = document.getElementById('expense-date');

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

    // Person Inputs & Elements
    const paidByInput = document.getElementById('expense-paid-by');
    const addPersonQuickBtn = document.getElementById('btn-add-person-quick');
    const personBreakdownCard = document.getElementById('person-breakdown-card');
    const personStatsList = document.getElementById('person-stats-list');
    const activePersonBadge = document.getElementById('active-person-filter-badge');
    const activePersonName = document.getElementById('active-person-filter-name');

    // Lists & Views
    const expensesList = document.getElementById('expenses-list');
    const recurringList = document.getElementById('recurring-list');
    const chartsView = document.getElementById('charts-view');

    const viewExpensesBtn = document.getElementById('view-expenses-btn');
    const viewRecurringBtn = document.getElementById('view-recurring-btn');
    const viewChartsBtn = document.getElementById('view-charts-btn');
    const expenseFiltersContainer = document.getElementById('expense-filters-container');
    const shareMonthlyWhatsAppBtn = document.getElementById('share-monthly-whatsapp-btn');

    // Navigation State
    let currentDate = new Date();
    let currentCategoryFilter = 'all';
    let currentPersonFilter = 'all';

    // --- Dynamic Categories & Family Members ---
    let customCategories = StorageService.getCustomCategories();
    
    function populatePaidBySelect() {
        if (!paidByInput) return;
        const members = StorageService.getFamilyMembers();
        const activeUser = localStorage.getItem('user_profile') || '';
        const prevValue = paidByInput.value;

        paidByInput.innerHTML = '';
        members.forEach(member => {
            const opt = document.createElement('option');
            opt.value = member;
            opt.textContent = `👤 ${member}`;
            paidByInput.appendChild(opt);
        });

        if (prevValue && members.includes(prevValue)) {
            paidByInput.value = prevValue;
        } else if (activeUser && members.includes(activeUser)) {
            paidByInput.value = activeUser;
        } else if (members.length > 0) {
            paidByInput.value = members[0];
        }
    }

    if (addPersonQuickBtn) {
        addPersonQuickBtn.addEventListener('click', () => {
            const name = prompt('Nombre del nuevo miembro de la familia:');
            if (name && name.trim()) {
                const trimmed = name.trim();
                let members = StorageService.getFamilyMembers();
                if (!members.includes(trimmed)) {
                    members.push(trimmed);
                    StorageService.saveFamilyMembers(members);
                    StorageService.triggerAutoSync();
                }
                populatePaidBySelect();
                if (paidByInput) paidByInput.value = trimmed;
                renderExpenses();
            }
        });
    }

    if (activePersonBadge) {
        activePersonBadge.addEventListener('click', () => {
            currentPersonFilter = 'all';
            updatePersonFilterBadge();
            renderExpenses();
        });
    }

    function updatePersonFilterBadge() {
        if (!activePersonBadge) return;
        if (currentPersonFilter !== 'all') {
            activePersonBadge.style.display = 'inline-block';
            if (activePersonName) activePersonName.textContent = currentPersonFilter;
        } else {
            activePersonBadge.style.display = 'none';
        }
    }
    
    function populateCategorySelect() {
        customCategories = StorageService.getCustomCategories();
        if (categoryInput) {
            categoryInput.innerHTML = '';
            customCategories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = `${c.icon} ${c.name}`;
                categoryInput.appendChild(opt);
            });
            if (!customCategories.find(c => c.id === 'other')) {
                const opt = document.createElement('option');
                opt.value = 'other';
                opt.textContent = '📦 Otros';
                categoryInput.appendChild(opt);
            }
        }
        renderCategoryFilterPills();
    }

    function renderCategoryFilterPills() {
        if (!expenseFiltersContainer) return;
        expenseFiltersContainer.innerHTML = '';

        const allPill = document.createElement('button');
        allPill.className = `filter-pill ${currentCategoryFilter === 'all' ? 'active' : ''}`;
        allPill.dataset.cat = 'all';
        allPill.textContent = 'Todas';
        allPill.onclick = () => {
            currentCategoryFilter = 'all';
            updateActiveFilterPills();
            renderExpenses();
        };
        expenseFiltersContainer.appendChild(allPill);

        customCategories.forEach(cat => {
            const pill = document.createElement('button');
            pill.className = `filter-pill ${currentCategoryFilter === cat.id ? 'active' : ''}`;
            pill.dataset.cat = cat.id;
            pill.textContent = `${cat.icon} ${cat.name}`;
            pill.onclick = () => {
                currentCategoryFilter = cat.id;
                updateActiveFilterPills();
                renderExpenses();
            };
            expenseFiltersContainer.appendChild(pill);
        });
    }

    function updateActiveFilterPills() {
        if (!expenseFiltersContainer) return;
        expenseFiltersContainer.querySelectorAll('.filter-pill').forEach(p => {
            if (p.dataset.cat === currentCategoryFilter) p.classList.add('active');
            else p.classList.remove('active');
        });
    }

    function getCategoryInfo(id, fallbackName = 'Otros', fallbackIcon = '📦') {
        const cat = customCategories.find(c => c.id === id);
        return cat ? { name: cat.name, icon: cat.icon } : { name: fallbackName, icon: fallbackIcon };
    }

    populateCategorySelect();
    populatePaidBySelect();

    // --- UI Toggles ---
    if (isRecurringCheck) {
        isRecurringCheck.addEventListener('change', () => {
            if (isRecurringCheck.checked) {
                recurringOptions.classList.remove('hidden');
            } else {
                recurringOptions.classList.add('hidden');
            }
        });
    }

    viewExpensesBtn.addEventListener('click', () => {
        expensesList.classList.remove('hidden');
        recurringList.classList.add('hidden');
        chartsView.classList.add('hidden');
        if (expenseFiltersContainer) expenseFiltersContainer.classList.remove('hidden');

        viewExpensesBtn.className = 'btn btn-sm btn-primary';
        viewRecurringBtn.className = 'btn btn-sm btn-secondary';
        viewChartsBtn.className = 'btn btn-sm btn-secondary';

        renderExpenses();
    });

    viewRecurringBtn.addEventListener('click', () => {
        expensesList.classList.add('hidden');
        recurringList.classList.remove('hidden');
        chartsView.classList.add('hidden');
        if (expenseFiltersContainer) expenseFiltersContainer.classList.add('hidden');

        viewExpensesBtn.className = 'btn btn-sm btn-secondary';
        viewRecurringBtn.className = 'btn btn-sm btn-primary';
        viewChartsBtn.className = 'btn btn-sm btn-secondary';

        renderRecurring();
    });

    viewChartsBtn.addEventListener('click', () => {
        expensesList.classList.add('hidden');
        recurringList.classList.add('hidden');
        chartsView.classList.remove('hidden');
        if (expenseFiltersContainer) expenseFiltersContainer.classList.add('hidden');

        viewExpensesBtn.className = 'btn btn-sm btn-secondary';
        viewRecurringBtn.className = 'btn btn-sm btn-secondary';
        viewChartsBtn.className = 'btn btn-sm btn-primary';

        if (window.renderCharts) {
            window.renderCharts(currentDate);
        }
    });

    // Default Date to Today
    if (dateInput) {
        const now = new Date();
        const localISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        dateInput.value = localISO;
    }

    function addExpense() {
        const title = titleInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const category = categoryInput ? categoryInput.value : 'other';
        const isRecurring = isRecurringCheck ? isRecurringCheck.checked : false;
        const type = typeInput ? typeInput.value : 'expense';
        const paidBy = (paidByInput && paidByInput.value.trim()) ? paidByInput.value.trim() : (localStorage.getItem('user_profile') || 'Familia');
        let movementDate = new Date().toISOString();

        if (dateInput && dateInput.value) {
            const d = new Date(dateInput.value);
            const now = new Date();
            d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
            movementDate = d.toISOString();
        }

        if (!title || isNaN(amount) || amount <= 0) {
            alert('Por favor, introduce concepto y un importe válido.');
            return;
        }

        if (isRecurring && type === 'expense') {
            const day = parseInt(recurringDayInput.value);
            if (!day || day < 1 || day > 31) {
                alert('Por favor, introduce un día de cobro válido (1-31).');
                return;
            }

            const bills = StorageService.getRecurringBills();
            bills.push({
                id: Date.now().toString(),
                title,
                amount,
                category,
                day,
                createdBy: paidBy,
                _deleted: false,
                updatedAt: new Date().toISOString()
            });
            StorageService.saveRecurringBills(bills);
            StorageService.triggerAutoSync();

            alert('Gasto Fijo Mensual añadido.');
            viewRecurringBtn.click();
        } else {
            const newMov = {
                id: Date.now().toString() + Math.floor(Math.random() * 1000),
                title,
                amount,
                category,
                type: type,
                date: movementDate,
                createdBy: paidBy,
                items: currentScannedItems || [],
                _deleted: false,
                updatedAt: new Date().toISOString()
            };

            currentScannedItems = [];

            const expenses = StorageService.getExpenses();
            expenses.push(newMov);
            StorageService.saveExpenses(expenses);
            StorageService.triggerAutoSync();

            if (dateInput && dateInput.value) {
                currentDate = new Date(dateInput.value);
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
        if (isRecurringCheck) isRecurringCheck.checked = false;
        if (recurringOptions) recurringOptions.classList.add('hidden');
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

    if (scanBtn && cameraInput) {
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
                        const result = OCRService.parseReceiptText(text);
                        if (result.total) {
                            amountInput.value = result.total.toFixed(2);
                            if (result.items && result.items.length > 0) {
                                currentScannedItems = result.items;
                                alert(`¡Detectado! Total: ${result.total.toFixed(2)}€ (${result.items.length} artículos encontrados)`);
                            } else {
                                currentScannedItems = [];
                                alert(`¡Detectado! Total: ${result.total.toFixed(2)}€`);
                            }
                        } else {
                            alert("No he encontrado el precio total claro. Por favor, introduce el importe manualmente.");
                        }
                    }
                } catch (error) {
                    console.error(error);
                    alert("Error al procesar el ticket.");
                } finally {
                    scanStatus.classList.add('hidden');
                    scanBtn.disabled = false;
                    scanBtn.textContent = "📸 Escanear Ticket (OCR)";
                    cameraInput.value = '';
                }
            }
        });
    }

    // --- Renders ---
    function renderExpenses() {
        const viewMonth = currentDate.getMonth();
        const viewYear = currentDate.getFullYear();

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        if (statsLabel) statsLabel.textContent = `${monthNames[viewMonth]} ${viewYear}`;

        let allMovements = StorageService.getExpenses().filter(e => !e._deleted);

        // Filter by View Date
        const currentMonthMovements = allMovements.filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
        });

        // Stats Calculation on ALL movements of the month + per-person breakdown
        let income = 0;
        let expense = 0;
        const personExpenseMap = {};

        currentMonthMovements.forEach(mov => {
            const val = parseFloat(mov.amount) || 0;
            const person = (mov.createdBy && mov.createdBy.trim()) ? mov.createdBy.trim() : 'Familia';
            if (mov.type === 'income') {
                income += val;
            } else {
                expense += val;
                personExpenseMap[person] = (personExpenseMap[person] || 0) + val;
            }
        });

        // Render Person Breakdown Card
        if (personStatsList) {
            personStatsList.innerHTML = '';
            const allConfiguredMembers = StorageService.getFamilyMembers();
            const allPeopleSet = new Set([...allConfiguredMembers, ...Object.keys(personExpenseMap)]);
            const peopleArray = Array.from(allPeopleSet);

            const personColors = ['#4F46E5', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#3B82F6', '#14B8A6'];

            if (peopleArray.length === 0) {
                personStatsList.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 0.5rem;">Sin personas configuradas.</div>';
            } else {
                peopleArray.forEach((name, idx) => {
                    const spent = personExpenseMap[name] || 0;
                    const pct = expense > 0 ? Math.round((spent / expense) * 100) : 0;
                    const color = personColors[idx % personColors.length];
                    const isSelected = currentPersonFilter === name;

                    const row = document.createElement('div');
                    row.style.background = isSelected ? 'rgba(79, 70, 229, 0.12)' : 'var(--bg-body)';
                    row.style.border = isSelected ? '2px solid var(--primary)' : '1px solid var(--btn-secondary-border, #E5E7EB)';
                    row.style.padding = '0.6rem 0.75rem';
                    row.style.borderRadius = 'var(--radius-md)';
                    row.style.cursor = 'pointer';
                    row.style.transition = 'all 0.2s';
                    row.title = `Clic para filtrar los gastos de ${name}`;

                    row.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 0.9rem; color: var(--text-main);">
                                <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: ${color}; color: white; font-size: 0.75rem; font-weight: 700;">
                                    ${name.charAt(0).toUpperCase()}
                                </span>
                                <span>${escapeHtml(name)}</span>
                                ${isSelected ? '<span style="font-size: 0.75rem; color: var(--primary); font-weight: 700;">(Filtrado)</span>' : ''}
                            </div>
                            <div style="text-align: right;">
                                <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${spent.toFixed(2)} €</span>
                                <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 4px;">(${pct}%)</span>
                            </div>
                        </div>
                        <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${pct}%; height: 100%; background: ${color}; border-radius: 3px; transition: width 0.4s ease;"></div>
                        </div>
                    `;

                    row.onclick = () => {
                        if (currentPersonFilter === name) {
                            currentPersonFilter = 'all';
                        } else {
                            currentPersonFilter = name;
                        }
                        updatePersonFilterBadge();
                        renderExpenses();
                    };

                    personStatsList.appendChild(row);
                });
            }
        }
        updatePersonFilterBadge();

        // Filter for display by Category & Person
        let displayMovements = currentMonthMovements;
        if (currentCategoryFilter !== 'all') {
            displayMovements = displayMovements.filter(e => (e.category || 'other') === currentCategoryFilter);
        }
        if (currentPersonFilter !== 'all') {
            displayMovements = displayMovements.filter(e => (e.createdBy || 'Familia') === currentPersonFilter);
        }

        // Sort descending
        displayMovements.sort((a, b) => new Date(b.date) - new Date(a.date));

        expensesList.innerHTML = '';

        if (displayMovements.length === 0) {
            expensesList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay movimientos registrados para este filtro.</div>';
        } else {
            const fragment = document.createDocumentFragment();
            displayMovements.forEach((mov) => {
                const val = parseFloat(mov.amount);
                const isIncome = mov.type === 'income';

                const item = document.createElement('div');
                item.className = 'expense-item';
                if (isIncome) item.classList.add('item-income');
                else item.classList.add('item-expense');

                const dateOpts = { day: 'numeric', month: 'short' };
                const dateStr = new Date(mov.date).toLocaleDateString('es-ES', dateOpts);
                const catInfo = getCategoryInfo(mov.category, isIncome ? 'Ingreso' : 'Otros', isIncome ? '💰' : '📦');

                item.innerHTML = `
                    <div style="display:flex; align-items:center; width: 100%;">
                        <div style="font-size: 1.5rem; margin-right: 0.75rem;">${catInfo.icon}</div>
                        <div style="flex-grow: 1; overflow: hidden;">
                            <div style="font-weight: 600; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${escapeHtml(mov.title)}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-top: 2px;">
                                <span style="background: var(--bg-body); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--btn-secondary-border, #E5E7EB); color: var(--text-main);">${catInfo.name}</span>
                                • <span>${dateStr}</span>
                                <span style="background: rgba(79, 70, 229, 0.1); color: var(--primary); padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 0.75rem;">👤 ${escapeHtml(mov.createdBy || 'Familia')}</span>
                                ${mov.items && mov.items.length > 0 ? `<small style="color:var(--primary);">📄 Ticket (${mov.items.length})</small>` : ''}
                            </div>
                        </div>
                        <div class="amount" style="margin-right: 0.75rem; font-weight: 700; font-size: 1.05rem; white-space: nowrap; color: ${isIncome ? 'var(--secondary)' : 'inherit'}">
                            ${isIncome ? '+' : '-'}${val.toFixed(2)} €
                        </div>
                        <button class="btn-delete" data-id="${mov.id}" data-type="normal" title="Eliminar">✕</button>
                    </div>
                    ${renderExpenseDetails(mov)}
                `;

                item.style.cursor = 'pointer';
                fragment.appendChild(item);
            });
            expensesList.appendChild(fragment);
        }

        // Update Header Stats
        if (totalIncomeEl) totalIncomeEl.textContent = `${income.toFixed(2)} €`;
        if (totalExpenseEl) totalExpenseEl.textContent = `${expense.toFixed(2)} €`;

        const balance = income - expense;
        if (totalBalanceEl) {
            totalBalanceEl.textContent = `${balance.toFixed(2)} €`;
            totalBalanceEl.style.color = balance >= 0 ? 'var(--secondary)' : 'var(--danger)';
        }

        // Budget Bar
        const budgetContainer = document.getElementById('budget-container');
        const budgetText = document.getElementById('budget-text');
        const budgetBar = document.getElementById('budget-bar');
        const monthlyBudget = StorageService.getMonthlyBudget();

        if (budgetContainer && monthlyBudget > 0) {
            budgetContainer.style.display = 'block';
            let percentage = (expense / monthlyBudget) * 100;
            if (percentage > 100) percentage = 100;
            
            budgetText.textContent = `${expense.toFixed(2)} / ${monthlyBudget.toFixed(2)} € (${Math.round((expense / monthlyBudget) * 100)}%)`;
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
    }

    // Event delegation on expensesList
    if (expensesList) {
        expensesList.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.btn-delete');
            if (delBtn) {
                e.stopPropagation();
                deleteExpense(delBtn.dataset.id);
                return;
            }
            const item = e.target.closest('.expense-item');
            if (item) {
                const details = item.querySelector('.expense-details');
                if (details) {
                    details.style.display = (details.style.display === 'none') ? 'flex' : 'none';
                }
            }
        });
    }

    function renderRecurring() {
        let bills = StorageService.getRecurringBills().filter(b => !b._deleted);
        recurringList.innerHTML = '';

        if (bills.length === 0) {
            recurringList.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay gastos fijos mensuales configurados.</div>';
            return;
        }

        bills.sort((a, b) => a.day - b.day);

        const fragment = document.createDocumentFragment();
        bills.forEach(bill => {
            const item = document.createElement('div');
            item.className = 'expense-item';
            item.style.borderLeft = '4px solid #F59E0B';

            const catInfo = getCategoryInfo(bill.category);

            item.innerHTML = `
                <div style="font-size: 1.5rem; margin-right: 0.75rem;">${catInfo.icon}</div>
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600;">${escapeHtml(bill.title)}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        🔄 Cargo el día ${bill.day} de cada mes
                    </div>
                </div>
                <div class="amount" style="margin-right: 0.75rem; font-weight: 700; font-size: 1.05rem;">
                    ${parseFloat(bill.amount).toFixed(2)} €
                </div>
                <button class="btn-delete" data-id="${bill.id}" data-type="recurring" title="Eliminar">✕</button>
            `;
            fragment.appendChild(item);
        });
        recurringList.appendChild(fragment);
    }

    // Event delegation on recurringList
    if (recurringList) {
        recurringList.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.btn-delete');
            if (delBtn) {
                e.stopPropagation();
                deleteRecurring(delBtn.dataset.id);
            }
        });
    }

    function deleteExpense(id) {
        if (confirm('¿Eliminar este movimiento?')) {
            let expenses = StorageService.getExpenses();
            const idx = expenses.findIndex(e => String(e.id) === String(id));
            if (idx !== -1) {
                expenses[idx]._deleted = true;
                expenses[idx].updatedAt = new Date().toISOString();
                StorageService.saveExpenses(expenses);
                StorageService.triggerAutoSync();
                renderExpenses();
            }
        }
    }

    function deleteRecurring(id) {
        if (confirm('¿Eliminar este gasto fijo?')) {
            let bills = StorageService.getRecurringBills();
            const idx = bills.findIndex(b => String(b.id) === String(id));
            if (idx !== -1) {
                bills[idx]._deleted = true;
                bills[idx].updatedAt = new Date().toISOString();
                StorageService.saveRecurringBills(bills);
                StorageService.triggerAutoSync();
                renderRecurring();
            }
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function renderExpenseDetails(mov) {
        let html = `<div class="expense-details" style="display:none; margin-top: 0.75rem; border-top: 1px dashed var(--btn-secondary-border, #E5E7EB); padding-top: 0.5rem; flex-direction: column;">`;
        
        if (mov.items && mov.items.length > 0) {
            html += `<div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight:700;">ARTÍCULOS DEL TICKET:</div>`;
            mov.items.forEach(item => {
                html += `
                <div class="item-row" style="display:flex; justify-content:space-between; font-size: 0.85rem; margin-bottom: 3px;">
                    <span style="flex-grow:1;">${escapeHtml(item.name)} ${item.qty && item.qty > 1 ? `<span style="color:var(--text-muted); font-size:0.75rem;">(${item.qty} x ${item.unitPrice ? item.unitPrice.toFixed(2) : ''}€)</span>` : ''}</span>
                    <span style="font-family:monospace; margin-left: 10px; font-weight:600;">${item.price.toFixed(2)}€</span>
                </div>`;
            });
        }
        
        const isIncome = mov.type === 'income';
        const typeWord = isIncome ? 'Ingreso' : 'Gasto';
        const val = parseFloat(mov.amount).toFixed(2);
        const shareText = encodeURIComponent(`Hola, apunto un ${typeWord} de la casa:\n*Concepto:* ${mov.title}\n*Importe:* ${val}€\n*Fecha:* ${new Date(mov.date).toLocaleDateString('es-ES')}`);
        const whatsappLink = `https://wa.me/?text=${shareText}`;
        
        html += `
            <div style="margin-top: 0.75rem; display: flex; justify-content: flex-end;">
                 <a href="${whatsappLink}" target="_blank" class="btn btn-sm btn-whatsapp">
                    📲 Enviar detalle por WhatsApp
                 </a>
            </div>
        `;

        html += `</div>`;
        return html;
    }

    // Share Monthly WhatsApp Summary
    if (shareMonthlyWhatsAppBtn) {
        shareMonthlyWhatsAppBtn.addEventListener('click', () => {
            const viewMonth = currentDate.getMonth();
            const viewYear = currentDate.getFullYear();
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            const monthMovements = StorageService.getExpenses().filter(e => {
                if (e._deleted) return false;
                const d = new Date(e.date);
                return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
            });

            let inc = 0, exp = 0;
            const catMap = {};
            const personMap = {};

            monthMovements.forEach(m => {
                const val = parseFloat(m.amount) || 0;
                if (m.type === 'income') {
                    inc += val;
                } else {
                    exp += val;
                    catMap[m.category] = (catMap[m.category] || 0) + val;
                    const p = (m.createdBy && m.createdBy.trim()) ? m.createdBy.trim() : 'Familia';
                    personMap[p] = (personMap[p] || 0) + val;
                }
            });

            let msg = `📊 *Resumen de Gastos Familiares - ${monthNames[viewMonth]} ${viewYear}*\n\n`;
            msg += `📈 *Ingresos:* +${inc.toFixed(2)}€\n`;
            msg += `📉 *Gastos:* -${exp.toFixed(2)}€\n`;
            msg += `💶 *Balance:* ${(inc - exp).toFixed(2)}€\n\n`;

            if (Object.keys(personMap).length > 0) {
                msg += `👥 *Gastos por persona:*\n`;
                Object.entries(personMap).sort((a, b) => b[1] - a[1]).forEach(([pName, amount]) => {
                    const pct = exp > 0 ? Math.round((amount / exp) * 100) : 0;
                    msg += `• ${pName}: ${amount.toFixed(2)}€ (${pct}%)\n`;
                });
                msg += `\n`;
            }

            if (Object.keys(catMap).length > 0) {
                msg += `🏷️ *Principales categorías de gasto:*\n`;
                Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([catId, amount]) => {
                    const catInfo = getCategoryInfo(catId);
                    msg += `• ${catInfo.icon} ${catInfo.name}: ${amount.toFixed(2)}€\n`;
                });
            }
            msg += `\n_Enviado desde App Familia_`;

            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        });
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
        populateCategorySelect();
        populatePaidBySelect();
        renderExpenses();
        renderRecurring();
    });
});

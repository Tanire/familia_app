document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const pendingView = document.getElementById('pending-tasks-view');
    const allView = document.getElementById('all-tasks-view');
    const pendingList = document.getElementById('pending-list');
    const allList = document.getElementById('all-list');
    const emptyPending = document.getElementById('empty-pending');

    const viewPendingBtn = document.getElementById('view-pending-btn');
    const viewAllBtn = document.getElementById('view-all-btn');

    const addTaskBtn = document.getElementById('add-task-btn');
    const modal = document.getElementById('task-modal');
    const modalTitle = document.getElementById('modal-title');
    const titleInput = document.getElementById('task-title');
    const assignedInput = document.getElementById('task-assigned');
    const freqInput = document.getElementById('task-frequency');
    const intervalInput = document.getElementById('task-interval');
    const intervalGroup = document.getElementById('interval-group');
    const saveBtn = document.getElementById('save-task-btn');
    const cancelBtn = document.getElementById('cancel-task-btn');
    const editIdInput = document.getElementById('edit-task-id');

    const historyModal = document.getElementById('history-modal');
    const historyList = document.getElementById('history-list');
    const closeHistoryBtn = document.getElementById('close-history-btn');

    // Navigation
    viewPendingBtn.addEventListener('click', () => {
        pendingView.classList.remove('hidden');
        allView.classList.add('hidden');
        viewPendingBtn.className = 'btn btn-sm btn-primary';
        viewAllBtn.className = 'btn btn-sm btn-secondary';
        renderPending();
    });

    viewAllBtn.addEventListener('click', () => {
        pendingView.classList.add('hidden');
        allView.classList.remove('hidden');
        viewPendingBtn.className = 'btn btn-sm btn-secondary';
        viewAllBtn.className = 'btn btn-sm btn-primary';
        renderAll();
    });

    // Modal Logic
    addTaskBtn.addEventListener('click', () => {
        openModal();
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    freqInput.addEventListener('change', () => {
        if (freqInput.value === 'interval') {
            intervalGroup.classList.remove('hidden');
        } else {
            intervalGroup.classList.add('hidden');
        }
    });

    function openModal(task = null) {
        modal.classList.remove('hidden');
        if (task) {
            modalTitle.textContent = 'Editar Tarea';
            titleInput.value = task.title;
            assignedInput.value = task.assignedTo || '';
            freqInput.value = task.frequency;
            if (task.frequency === 'interval') {
                intervalGroup.classList.remove('hidden');
                intervalInput.value = task.intervalDays || 3;
            } else {
                intervalGroup.classList.add('hidden');
            }
            editIdInput.value = task.id;
        } else {
            modalTitle.textContent = 'Nueva Tarea';
            titleInput.value = '';
            assignedInput.value = '';
            freqInput.value = 'weekly';
            intervalGroup.classList.add('hidden');
            editIdInput.value = '';
        }
    }

    saveBtn.addEventListener('click', () => {
        const title = titleInput.value.trim();
        if (!title) {
            alert('El título es obligatorio');
            return;
        }

        const tasks = StorageService.getTasks();
        const id = editIdInput.value;

        const newTask = {
            id: id || Date.now().toString(),
            title,
            assignedTo: assignedInput.value.trim(),
            frequency: freqInput.value,
            intervalDays: freqInput.value === 'interval' ? parseInt(intervalInput.value) : null,
            created: id ? tasks.find(t => t.id === id).created : new Date().toISOString(),
            lastCompleted: id ? tasks.find(t => t.id === id).lastCompleted : null,
            nextDue: id ? tasks.find(t => t.id === id).nextDue : new Date().toISOString(), // Due now by default if new
            history: id ? tasks.find(t => t.id === id).history || [] : [],
            updatedAt: new Date().toISOString()
        };

        if (id) {
            const idx = tasks.findIndex(t => t.id === id);
            tasks[idx] = newTask;
        } else {
            tasks.push(newTask);
        }

        StorageService.saveTasks(tasks);
        StorageService.triggerAutoSync();
        modal.classList.add('hidden');

        if (!allView.classList.contains('hidden')) renderAll();
        else renderPending();
    });

    // Core Logic
    function calculateNextDue(task) {
        const last = new Date(task.lastCompleted || Date.now()); // If never completed, base on "now" effectively resetting
        let next = new Date(last);

        switch (task.frequency) {
            case 'daily':
                next.setDate(next.getDate() + 1);
                break;
            case 'weekly':
                next.setDate(next.getDate() + 7);
                break;
            case 'monthly':
                next.setMonth(next.getMonth() + 1);
                break;
            case 'annual':
                next.setFullYear(next.getFullYear() + 1);
                break;
            case 'interval':
                next.setDate(next.getDate() + (task.intervalDays || 1));
                break;
        }
        return next.toISOString();
    }

    window.completeTask = function (id) {
        const tasks = StorageService.getTasks();
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;

        const task = tasks[idx];
        const now = new Date();
        const user = localStorage.getItem('user_profile') || 'Alguien';

        task.lastCompleted = now.toISOString();
        task.completedBy = user;

        // Push History
        if (!task.history) task.history = [];
        task.history.unshift({ date: now.toISOString(), user });
        if (task.history.length > 10) task.history.pop();

        // Calc Next Due
        task.nextDue = calculateNextDue(task);
        task.updatedAt = new Date().toISOString();

        StorageService.saveTasks(tasks);
        StorageService.triggerAutoSync();

        renderPending();
        renderAll(); // If visible
    };

    window.deleteTask = function (id) {
        if (!confirm('¿Borrar esta tarea para siempre?')) return;
        const tasks = StorageService.getTasks();
        const idx = tasks.findIndex(t => t.id === id);
        if (idx !== -1) {
            tasks[idx]._deleted = true;
            tasks[idx].updatedAt = new Date().toISOString();
        }
        StorageService.saveTasks(tasks);
        StorageService.triggerAutoSync();
        renderAll();
    };

    window.editTask = function (id) {
        const tasks = StorageService.getTasks();
        const task = tasks.find(t => t.id === id);
        if (task) openModal(task);
    };

    window.showHistory = function (id) {
        const tasks = StorageService.getTasks();
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        historyList.innerHTML = '';
        if (!task.history || task.history.length === 0) {
            historyList.innerHTML = '<p style="color:var(--text-muted); text-align:center;">Sin historial reciente.</p>';
        } else {
            task.history.forEach(h => {
                const d = new Date(h.date);
                const dateStr = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const div = document.createElement('div');
                div.style.padding = '0.5rem';
                div.style.borderBottom = '1px solid #eee';
                div.innerHTML = `<div>✅ <b>${h.user}</b></div><div style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</div>`;
                historyList.appendChild(div);
            });
        }
        historyModal.classList.remove('hidden');
    };

    closeHistoryBtn.onclick = () => historyModal.classList.add('hidden');

    function getStatus(task) {
        const now = new Date();
        const due = new Date(task.nextDue);
        const diffHours = (due - now) / (1000 * 60 * 60);

        if (diffHours < 0) return 'overdue'; // Vencida
        if (diffHours < 24) return 'due-soon'; // Hoy
        return 'future';
    }

    // Render Lists
    function renderPending() {
        const tasks = StorageService.getTasks().filter(t => !t._deleted);
        tasks.sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));

        pendingList.innerHTML = '';

        if (tasks.length === 0) {
            emptyPending.classList.remove('hidden');
            return;
        } else {
            emptyPending.classList.add('hidden');
        }

        tasks.forEach(task => {
            // Only show relevant tasks in "Pending" view? 
            // Maybe show tasks due in the next 3 days + overdue.
            const status = getStatus(task);
            const due = new Date(task.nextDue);
            const diffDays = (due - new Date()) / (1000 * 60 * 60 * 24);

            if (diffDays > 3) return; // Skip far future tasks in pending view? Or show all? User said "Pendientes y Todas". 

            const div = document.createElement('div');
            div.className = 'task-card ' + status;

            let statusText = '';
            let statusColor = '';
            if (status === 'overdue') { statusText = '¡Vencida!'; statusColor = 'var(--danger)'; }
            else if (status === 'due-soon') { statusText = 'Para hoy'; statusColor = '#F59E0B'; }
            else { statusText = 'Pronto'; statusColor = 'var(--success)'; } // success var not def, use inline

            const dateStr = due.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

            div.innerHTML = `
                <div style="flex-grow:1;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <h3 class="task-title">${task.title}</h3>
                        <span style="font-size:0.7rem; font-weight:bold; color:${statusColor}; background:#fff; padding:2px 6px; border-radius:4px; box-shadow:0 1px 2px rgba(0,0,0,0.1);">${statusText}</span>
                    </div>
                    <div class="task-meta">
                        📅 Vence: ${dateStr}
                    </div>
                    ${task.assignedTo ? `<div class="task-meta">👤 ${task.assignedTo}</div>` : ''}
                </div>
                <button onclick="window.completeTask('${task.id}')" class="btn btn-primary" style="margin-left:0.5rem; border-radius:8px; padding: 0.5rem 1rem; font-weight:600; font-size: 0.9rem; box-shadow: var(--shadow-sm);">
                    ✔️ Completar
                </button>
            `;
            pendingList.appendChild(div);
        });

        if (pendingList.children.length === 0) {
            emptyPending.innerHTML = "Todo limpio por hoy ✅ (Próximas tareas en muchos días)";
            emptyPending.classList.remove('hidden');
        }
    }

    function renderAll() {
        const tasks = StorageService.getTasks().filter(t => !t._deleted);
        tasks.sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue)); // Sort by due date

        allList.innerHTML = '';

        tasks.forEach(task => {
            const due = new Date(task.nextDue);
            const dateStr = due.toLocaleDateString('es-ES');

            const div = document.createElement('div');
            div.className = 'task-row';
            div.innerHTML = `
                <div style="flex-grow:1;">
                    <div style="font-weight:600;">${task.title}</div>
                    <div style="font-size:0.8rem; color:var(--text-muted);">
                        ${getFreqLabel(task)} • Próx: ${dateStr}
                    </div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button onclick="window.showHistory('${task.id}')" class="btn btn-sm btn-secondary">🕒</button>
                    <button onclick="window.editTask('${task.id}')" class="btn btn-sm btn-secondary">✏️</button>
                    <button onclick="window.deleteTask('${task.id}')" class="btn btn-sm btn-danger">✕</button>
                </div>
            `;
            allList.appendChild(div);
        });
    }

    function getFreqLabel(task) {
        if (task.frequency === 'daily') return 'Diaria';
        if (task.frequency === 'weekly') return 'Semanal';
        if (task.frequency === 'monthly') return 'Mensual';
        if (task.frequency === 'annual') return 'Anual';
        if (task.frequency === 'interval') return `Cada ${task.intervalDays} días`;
        return '';
    }

    // Init Logic
    renderPending();

    window.addEventListener('storage-updated', () => {
        if (!allView.classList.contains('hidden')) renderAll();
        renderPending();
    });
});

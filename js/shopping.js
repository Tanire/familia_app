document.addEventListener('DOMContentLoaded', () => {
    const itemInput = document.getElementById('item-input');
    const itemCategory = document.getElementById('item-category');
    const addBtn = document.getElementById('add-item-btn');
    const shoppingList = document.getElementById('shopping-list');
    const clearBtn = document.getElementById('clear-completed-btn');
    const shareWhatsAppBtn = document.getElementById('share-whatsapp-btn');
    const summaryText = document.getElementById('shopping-summary-text');
    const filterPills = document.querySelectorAll('#shopping-filter-pills .filter-pill');

    let currentCategoryFilter = 'all';

    const CATEGORY_MAP = {
        'supermarket': { name: 'Super', icon: '🛒' },
        'fresh': { name: 'Frescos', icon: '🍎' },
        'health': { name: 'Farmacia', icon: '💊' },
        'home': { name: 'Hogar', icon: '🏠' },
        'other': { name: 'Otros', icon: '📦' }
    };

    function renderList() {
        let items = StorageService.getShoppingList().filter(i => !i._deleted);

        // Update overall summary count
        const pendingCount = items.filter(i => !i.completed).length;
        if (summaryText) {
            if (pendingCount === 0 && items.length > 0) {
                summaryText.textContent = '¡Todo comprado! 🎉';
            } else if (pendingCount === 0) {
                summaryText.textContent = 'Lista vacía. ¿Qué falta en casa?';
            } else {
                summaryText.textContent = `${pendingCount} producto${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''}`;
            }
        }

        // Apply category filter
        if (currentCategoryFilter !== 'all') {
            items = items.filter(i => (i.category || 'supermarket') === currentCategoryFilter);
        }

        shoppingList.innerHTML = '';

        if (items.length === 0) {
            shoppingList.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    No hay productos en esta vista.<br>
                    <small>Usa el campo superior para añadir lo que necesites.</small>
                </div>`;
            return;
        }

        // Sort: pending first, completed at the bottom
        items.sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1));

        items.forEach((item) => {
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP['other'];
            const div = document.createElement('div');
            div.className = `shopping-item ${item.completed ? 'completed' : ''}`;

            div.innerHTML = `
                <div class="checkbox-container" data-id="${item.id}">
                    <div class="custom-checkbox ${item.completed ? 'checked' : ''}"></div>
                    <span class="item-name">
                        <span style="font-size: 0.9em; margin-right: 4px;">${cat.icon}</span>
                        ${escapeHtml(item.name)}
                        ${item.createdBy ? `<small style="font-size:0.75em; color:var(--text-muted); margin-left:6px;">(${escapeHtml(item.createdBy)})</small>` : ''}
                    </span>
                </div>
                <button class="delete-btn" data-id="${item.id}" title="Eliminar">×</button>
            `;
            shoppingList.appendChild(div);
        });

        // Event listeners for items
        shoppingList.querySelectorAll('.checkbox-container').forEach(el => {
            el.addEventListener('click', () => toggleItem(el.dataset.id));
        });

        shoppingList.querySelectorAll('.delete-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteItem(el.dataset.id);
            });
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function addItem() {
        const text = itemInput.value.trim();
        if (!text) return;

        const category = itemCategory ? itemCategory.value : 'supermarket';
        const items = StorageService.getShoppingList();
        const currentUser = localStorage.getItem('user_profile') || '';

        items.push({
            id: Date.now().toString() + Math.floor(Math.random() * 1000),
            name: text,
            category: category,
            completed: false,
            createdBy: currentUser,
            _deleted: false,
            updatedAt: new Date().toISOString()
        });

        StorageService.saveShoppingList(items);
        StorageService.triggerAutoSync();

        itemInput.value = '';
        renderList();
    }

    function toggleItem(id) {
        const items = StorageService.getShoppingList();
        const idx = items.findIndex(i => String(i.id) === String(id));
        if (idx !== -1) {
            items[idx].completed = !items[idx].completed;
            items[idx].updatedAt = new Date().toISOString();
            StorageService.saveShoppingList(items);
            StorageService.triggerAutoSync();
            renderList();
        }
    }

    function deleteItem(id) {
        let items = StorageService.getShoppingList();
        const idx = items.findIndex(i => String(i.id) === String(id));
        if (idx !== -1) {
            items[idx]._deleted = true;
            items[idx].updatedAt = new Date().toISOString();
            StorageService.saveShoppingList(items);
            StorageService.triggerAutoSync();
            renderList();
        }
    }

    // Filter Pills Click
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategoryFilter = pill.dataset.cat || 'all';
            renderList();
        });
    });

    // Clear Completed
    clearBtn.addEventListener('click', () => {
        let items = StorageService.getShoppingList();
        const completedItems = items.filter(i => i.completed && !i._deleted);
        if (completedItems.length === 0) {
            alert('No hay productos completados para borrar.');
            return;
        }

        if (confirm(`¿Borrar los ${completedItems.length} productos marcados como comprados?`)) {
            items.forEach(i => {
                if (i.completed) {
                    i._deleted = true;
                    i.updatedAt = new Date().toISOString();
                }
            });
            StorageService.saveShoppingList(items);
            StorageService.triggerAutoSync();
            renderList();
        }
    });

    // Share via WhatsApp
    shareWhatsAppBtn.addEventListener('click', () => {
        const items = StorageService.getShoppingList().filter(i => !i._deleted && !i.completed);
        if (items.length === 0) {
            alert('No hay productos pendientes en la lista de la compra para enviar.');
            return;
        }

        let message = `🛒 *Lista de la Compra Familiar* (${new Date().toLocaleDateString('es-ES')}):\n\n`;
        items.forEach((item, idx) => {
            const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP['other'];
            message += `${idx + 1}. ${cat.icon} ${item.name}\n`;
        });
        message += `\n_Enviado desde App Familia_`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    });

    addBtn.addEventListener('click', addItem);
    itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });

    renderList();

    window.addEventListener('storage-updated', () => {
        renderList();
    });
});

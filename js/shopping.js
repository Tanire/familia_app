document.addEventListener('DOMContentLoaded', () => {
    const itemInput = document.getElementById('item-input');
    const addBtn = document.getElementById('add-item-btn');
    const shoppingList = document.getElementById('shopping-list');
    const clearBtn = document.getElementById('clear-completed-btn');

    function renderList() {
        let items = StorageService.get('shopping_list', []);

        // Filter Soft Deleted
        items = items.filter(i => !i._deleted);

        shoppingList.innerHTML = '';

        if (items.length === 0) {
            shoppingList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Lista vacía.<br>¡Añade cosas que falten!</div>';
            return;
        }

        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `shopping-item ${item.completed ? 'completed' : ''}`;

            div.innerHTML = `
        <div class="checkbox-container" data-id="${item.id}">
           <div class="custom-checkbox ${item.completed ? 'checked' : ''}"></div>
           <span class="item-name">${item.name}</span>
        </div>
        <button class="delete-btn" data-id="${item.id}">×</button>
      `;
            shoppingList.appendChild(div);
        });

        // Listeners
        document.querySelectorAll('.checkbox-container').forEach(el => {
            el.addEventListener('click', () => toggleItem(el.dataset.id));
        });

        document.querySelectorAll('.delete-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteItem(el.dataset.id);
            });
        });
    }

    function addItem() {
        const text = itemInput.value.trim();
        if (!text) return;

        const items = StorageService.get('shopping_list', []);
        items.push({
            name: text,
            completed: false,
            id: Date.now().toString()
        });
        StorageService.set('shopping_list', items);

        itemInput.value = '';
        renderList();
    }

    function toggleItem(id) {
        const items = StorageService.get('shopping_list', []);
        const idx = items.findIndex(i => i.id === id);
        if (idx !== -1) {
            items[idx].completed = !items[idx].completed;
            StorageService.set('shopping_list', items);
            renderList();
        }
    }

    function deleteItem(id) {
        const items = StorageService.get('shopping_list', []);
        // SOFT DELETE
        const idx = items.findIndex(i => i.id === id);
        if (idx !== -1) {
            items[idx]._deleted = true;
            StorageService.set('shopping_list', items);
            renderList();
        }
    }

    clearBtn.addEventListener('click', () => {
        if (confirm('¿Borrar todos los elementos marcados?')) {
            let items = StorageService.get('shopping_list', []);
            items.forEach(i => {
                if (i.completed) i._deleted = true;
            });
            StorageService.set('shopping_list', items);
            renderList();
        }
    });

    addBtn.addEventListener('click', addItem);
    itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });

    renderList();

    // Auto-refresh logic without reload (INSIDE THE SCOPE)
    window.addEventListener('storage-updated', () => {
        renderList();
    });
});

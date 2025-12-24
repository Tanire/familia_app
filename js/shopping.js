document.addEventListener('DOMContentLoaded', () => {
    const itemInput = document.getElementById('item-input');
    const addBtn = document.getElementById('add-item-btn');
    const shoppingList = document.getElementById('shopping-list');
    const clearBtn = document.getElementById('clear-completed-btn');

    function renderList() {
        const items = StorageService.get('shopping_list', []);
        shoppingList.innerHTML = '';

        if (items.length === 0) {
            shoppingList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">Lista vacía.<br>¡Añade cosas que falten!</div>';
            return;
        }

        items.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `shopping-item ${item.completed ? 'completed' : ''}`;

            div.innerHTML = `
        <div class="checkbox-container" data-index="${index}">
           <div class="custom-checkbox ${item.completed ? 'checked' : ''}"></div>
           <span class="item-name">${item.name}</span>
        </div>
        <button class="delete-btn" data-index="${index}">×</button>
      `;
            shoppingList.appendChild(div);
        });

        // Listeners
        document.querySelectorAll('.checkbox-container').forEach(el => {
            el.addEventListener('click', () => toggleItem(el.dataset.index));
        });

        document.querySelectorAll('.delete-btn').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteItem(el.dataset.index);
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

    function toggleItem(index) {
        const items = StorageService.get('shopping_list', []);
        items[index].completed = !items[index].completed;
        StorageService.set('shopping_list', items);
        renderList();
    }

    function deleteItem(index) {
        const items = StorageService.get('shopping_list', []);
        items.splice(index, 1);
        StorageService.set('shopping_list', items);
        renderList();
    }

    clearBtn.addEventListener('click', () => {
        if (confirm('¿Borrar todos los elementos marcados?')) {
            let items = StorageService.get('shopping_list', []);
            items = items.filter(i => !i.completed);
            StorageService.set('shopping_list', items);
            renderList();
        }
    });

    addBtn.addEventListener('click', addItem);
    itemInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addItem();
    });

    renderList();
});

// Auto-refresh when sync finishes
window.addEventListener('storage-updated', () => {
    location.reload();
});

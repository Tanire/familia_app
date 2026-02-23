document.addEventListener('DOMContentLoaded', () => {

    // Views
    const viewRecipesBtn = document.getElementById('view-recipes-btn');
    const viewMenuBtn = document.getElementById('view-menu-btn');
    const recipesView = document.getElementById('recipes-view');
    const menuView = document.getElementById('menu-view');

    // Recipes Elements
    const recipesList = document.getElementById('recipes-list');
    const btnAddRecipe = document.getElementById('btn-add-recipe');
    const recipeModal = document.getElementById('recipe-modal');
    const btnCancelRecipe = document.getElementById('cancel-recipe-btn');
    const btnSaveRecipe = document.getElementById('save-recipe-btn');
    
    // Recipe Form
    const rIcon = document.getElementById('recipe-icon');
    const rTitle = document.getElementById('recipe-title');
    const rIngredients = document.getElementById('recipe-ingredients');
    const rSteps = document.getElementById('recipe-steps');
    let editingRecipeId = null;

    // Menu Elements
    const menuWeekGrid = document.getElementById('menu-week-grid');
    const btnSendShopping = document.getElementById('btn-send-to-shopping');
    
    // Menu Select Modal
    const selectModal = document.getElementById('select-recipe-modal');
    const selectDayTitle = document.getElementById('select-day-title');
    const selectDropdown = document.getElementById('select-recipe-dropdown');
    const btnCancelSelect = document.getElementById('cancel-select-btn');
    const btnSaveSelect = document.getElementById('save-select-btn');
    let editingDayIndex = null;

    const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // --- State Management ---
    function getRecipes() {
        return StorageService.get('recipes', []);
    }
    function saveRecipes(recipes) {
        StorageService.set('recipes', recipes);
        // Sync triggers handled on save button
    }

    function getWeeklyMenu() {
        // Simple array of 7 elements (0 = Lunes, 6 = Domingo) storing recipe IDs
        return StorageService.get('weekly_menu', [null, null, null, null, null, null, null]);
    }
    function saveWeeklyMenu(menu) {
        StorageService.set('weekly_menu', menu);
    }

    // --- Events ---
    viewRecipesBtn.addEventListener('click', () => {
        recipesView.classList.remove('hidden');
        menuView.classList.add('hidden');
        viewRecipesBtn.className = 'btn btn-primary';
        viewMenuBtn.className = 'btn btn-secondary';
        renderRecipes();
    });

    viewMenuBtn.addEventListener('click', () => {
        recipesView.classList.add('hidden');
        menuView.classList.remove('hidden');
        viewRecipesBtn.className = 'btn btn-secondary';
        viewMenuBtn.className = 'btn btn-primary';
        renderMenu();
    });

    // --- Recipe CRUD ---
    btnAddRecipe.addEventListener('click', () => {
        editingRecipeId = null;
        rIcon.value = '🍲';
        rTitle.value = '';
        rIngredients.value = '';
        rSteps.value = '';
        recipeModal.querySelector('h2').textContent = 'Nueva Receta';
        recipeModal.classList.remove('hidden');
    });

    btnCancelRecipe.addEventListener('click', () => {
        recipeModal.classList.add('hidden');
    });

    btnSaveRecipe.addEventListener('click', () => {
        const title = rTitle.value.trim();
        if (!title) { alert('El nombre es obligatorio.'); return; }
        
        const recipes = getRecipes();
        const newRecipe = {
            id: editingRecipeId || Date.now().toString(),
            icon: rIcon.value.trim() || '🍲',
            title: title,
            ingredients: rIngredients.value.trim(),
            steps: rSteps.value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (editingRecipeId) {
            const idx = recipes.findIndex(r => r.id === editingRecipeId);
            if (idx !== -1) recipes[idx] = newRecipe;
        } else {
            recipes.push(newRecipe);
        }

        saveRecipes(recipes);
        StorageService.triggerAutoSync();
        recipeModal.classList.add('hidden');
        renderRecipes();
    });

    function deleteRecipe(id) {
        if (!confirm('¿Borrar esta receta? Se quitará también del menú si estaba asignada.')) return;
        
        let recipes = getRecipes();
        recipes = recipes.filter(r => r.id !== id);
        saveRecipes(recipes);

        // Clean up menu
        let menu = getWeeklyMenu();
        let changed = false;
        menu = menu.map(m => {
            if (m === id) { changed = true; return null; }
            return m;
        });
        if (changed) saveWeeklyMenu(menu);

        StorageService.triggerAutoSync();
        renderRecipes();
        renderMenu();
    }

    function editRecipe(id) {
        const recipe = getRecipes().find(r => r.id === id);
        if (!recipe) return;

        editingRecipeId = id;
        rIcon.value = recipe.icon || '🍲';
        rTitle.value = recipe.title;
        rIngredients.value = recipe.ingredients || '';
        rSteps.value = recipe.steps || '';
        recipeModal.querySelector('h2').textContent = 'Editar Receta';
        recipeModal.classList.remove('hidden');
    }

    // --- Renderers ---
    function renderRecipes() {
        const recipes = getRecipes();
        recipesList.innerHTML = '';

        if (recipes.length === 0) {
            recipesList.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--text-muted);">Aún no hay recetas. ¡Añade tu primera receta!</div>';
            return;
        }

        recipes.forEach(r => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            
            const ingCount = r.ingredients ? r.ingredients.split('\n').filter(l => l.trim()).length : 0;

            card.innerHTML = `
                <div class="recipe-header" onclick="window.editRecipeFallback('${r.id}')">
                    <div class="recipe-icon">${r.icon}</div>
                    <div class="recipe-info">
                        <h3>${r.title}</h3>
                        <p>${ingCount} Ingredientes</p>
                    </div>
                </div>
                <div class="recipe-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.editRecipeFallback('${r.id}')">✏️ Editar</button>
                    <button class="btn btn-sm" style="color: var(--danger); background: none; border: none; box-shadow: none;" onclick="window.deleteRecipeFallback('${r.id}')">✕</button>
                </div>
            `;
            recipesList.appendChild(card);
        });
    }

    // Global expose for onclick
    window.editRecipeFallback = editRecipe;
    window.deleteRecipeFallback = deleteRecipe;

    // --- Menu Logic ---
    function renderMenu() {
        const menu = getWeeklyMenu();
        const recipes = getRecipes();
        menuWeekGrid.innerHTML = '';

        DAYS_OF_WEEK.forEach((day, index) => {
            const rId = menu[index];
            const recipe = recipes.find(r => r.id === rId);

            const card = document.createElement('div');
            card.className = 'menu-day-card';
            
            let contentHtml = '<div style="color: var(--text-muted); font-size: 0.9rem; font-style: italic;">Sin asignar</div>';
            if (recipe) {
                contentHtml = `
                    <div style="display:flex; align-items:center; gap: 0.5rem;">
                        <span style="font-size: 1.5rem;">${recipe.icon}</span>
                        <strong style="color: var(--text-main);">${recipe.title}</strong>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="menu-day-title">${day}</div>
                <div style="margin-bottom: 1rem; min-height: 40px; cursor: pointer;" onclick="window.openMenuSelect(${index})">
                    ${contentHtml}
                </div>
                <button class="btn btn-sm btn-secondary" style="width: 100%;" onclick="window.openMenuSelect(${index})">
                    ${recipe ? 'Cambiar' : 'Asignar'}
                </button>
            `;
            menuWeekGrid.appendChild(card);
        });
    }

    window.openMenuSelect = (dayIndex) => {
        editingDayIndex = dayIndex;
        selectDayTitle.textContent = `Menú para el ${DAYS_OF_WEEK[dayIndex]}`;
        
        const recipes = getRecipes();
        selectDropdown.innerHTML = '<option value="">-- Comer fuera / Ninguna --</option>';
        recipes.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = `${r.icon} ${r.title}`;
            selectDropdown.appendChild(opt);
        });

        // Set current if exists
        const currentId = getWeeklyMenu()[dayIndex];
        if (currentId) selectDropdown.value = currentId;

        selectModal.classList.remove('hidden');
    };

    btnCancelSelect.addEventListener('click', () => selectModal.classList.add('hidden'));

    btnSaveSelect.addEventListener('click', () => {
        const menu = getWeeklyMenu();
        menu[editingDayIndex] = selectDropdown.value || null;
        saveWeeklyMenu(menu);
        StorageService.triggerAutoSync();
        selectModal.classList.add('hidden');
        renderMenu();
    });

    // --- Shopping List Integration ---
    btnSendShopping.addEventListener('click', () => {
        if (!confirm('Esto copiará todos los ingredientes de las recetas asignadas en esta semana a tu Lista de la Compra. ¿Continuar?')) return;

        const menu = getWeeklyMenu();
        const recipes = getRecipes();
        let shopList = StorageService.getShoppingList(); // from storage.js helper? We don't have one strictly named, let's use get()
        if (!shopList || !Array.isArray(shopList)) shopList = StorageService.get('shopping_list', []);

        let addedCount = 0;

        menu.forEach(rId => {
            if (!rId) return;
            const r = recipes.find(x => x.id === rId);
            if (r && r.ingredients) {
                const lines = r.ingredients.split('\n');
                lines.forEach(line => {
                    const txt = line.trim();
                    if (txt) {
                        shopList.push({
                            id: Date.now().toString() + Math.random(),
                            name: txt,
                            checked: false,
                            category: 'supermarket',
                            createdBy: 'Sistema (Menú Semanal)',
                            _deleted: false,
                            updatedAt: new Date().toISOString()
                        });
                        addedCount++;
                    }
                });
            }
        });

        if (addedCount > 0) {
            StorageService.set('shopping_list', shopList);
            StorageService.triggerAutoSync();
            alert(`¡${addedCount} ingredientes añadidos a la Lista de Compra!`);
        } else {
            alert('No hay ingredientes para añadir (revisa que el menú tenga recetas con ingredientes anotados).');
        }
    });

    // Init
    renderRecipes();
});

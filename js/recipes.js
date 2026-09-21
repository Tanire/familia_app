document.addEventListener('DOMContentLoaded', () => {

    // Views
    const viewRecipesBtn = document.getElementById('view-recipes-btn');
    const viewMenuBtn = document.getElementById('view-menu-btn');
    const recipesView = document.getElementById('recipes-view');
    const menuView = document.getElementById('menu-view');

    // Recipes Elements
    const recipesList = document.getElementById('recipes-list');
    const searchInput = document.getElementById('recipe-search-input');
    const btnSearchWeb = document.getElementById('btn-search-web');
    const btnAddRecipe = document.getElementById('btn-add-recipe');

    // Recipe Form Modal
    const recipeModal = document.getElementById('recipe-modal');
    const recipeModalTitle = document.getElementById('recipe-modal-title');
    const btnCancelRecipe = document.getElementById('cancel-recipe-btn');
    const btnSaveRecipe = document.getElementById('save-recipe-btn');
    const rIcon = document.getElementById('recipe-icon');
    const rTitle = document.getElementById('recipe-title');
    const rIngredients = document.getElementById('recipe-ingredients');
    const rSteps = document.getElementById('recipe-steps');
    let editingRecipeId = null;

    // Recipe Preview Modal
    const previewModal = document.getElementById('recipe-preview-modal');
    const previewIcon = document.getElementById('preview-recipe-icon');
    const previewTitle = document.getElementById('preview-recipe-title');
    const previewIngredients = document.getElementById('preview-recipe-ingredients');
    const previewStepsContainer = document.getElementById('preview-steps-container');
    const previewSteps = document.getElementById('preview-recipe-steps');
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const previewEditBtn = document.getElementById('preview-edit-btn');
    const previewAddShoppingBtn = document.getElementById('preview-add-shopping-btn');
    let activePreviewRecipe = null;

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
        return StorageService.getRecipes();
    }
    function saveRecipes(recipes) {
        StorageService.saveRecipes(recipes);
    }

    function getWeeklyMenu() {
        return StorageService.getWeeklyMenu();
    }
    function saveWeeklyMenu(menu) {
        StorageService.saveWeeklyMenu(menu);
    }

    // --- View Toggles ---
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
        if (recipeModalTitle) recipeModalTitle.textContent = 'Nueva Receta';
        recipeModal.classList.remove('hidden');
    });

    btnCancelRecipe.addEventListener('click', () => {
        recipeModal.classList.add('hidden');
    });

    btnSaveRecipe.addEventListener('click', () => {
        const title = rTitle.value.trim();
        if (!title) { alert('El nombre de la receta es obligatorio.'); return; }
        
        const recipes = getRecipes();
        const newRecipe = {
            id: editingRecipeId || Date.now().toString() + Math.floor(Math.random() * 1000),
            icon: rIcon.value.trim() || '🍲',
            title: title,
            ingredients: rIngredients.value.trim(),
            steps: rSteps.value.trim(),
            updatedAt: new Date().toISOString()
        };

        if (editingRecipeId) {
            const idx = recipes.findIndex(r => String(r.id) === String(editingRecipeId));
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
        recipes = recipes.filter(r => String(r.id) !== String(id));
        saveRecipes(recipes);

        // Clean up menu
        let menu = getWeeklyMenu();
        let changed = false;
        menu = menu.map(m => {
            if (String(m) === String(id)) { changed = true; return null; }
            return m;
        });
        if (changed) saveWeeklyMenu(menu);

        StorageService.triggerAutoSync();
        if (previewModal) previewModal.classList.add('hidden');
        renderRecipes();
        renderMenu();
    }

    function editRecipe(id) {
        const recipe = getRecipes().find(r => String(r.id) === String(id));
        if (!recipe) return;

        if (previewModal) previewModal.classList.add('hidden');

        editingRecipeId = id;
        rIcon.value = recipe.icon || '🍲';
        rTitle.value = recipe.title;
        rIngredients.value = recipe.ingredients || '';
        rSteps.value = recipe.steps || '';
        if (recipeModalTitle) recipeModalTitle.textContent = 'Editar Receta';
        recipeModal.classList.remove('hidden');
    }

    // --- Recipe Preview ---
    function openRecipePreview(id) {
        const recipe = getRecipes().find(r => String(r.id) === String(id));
        if (!recipe) return;

        activePreviewRecipe = recipe;
        previewIcon.textContent = recipe.icon || '🍲';
        previewTitle.textContent = recipe.title;

        // Format ingredients
        if (recipe.ingredients && recipe.ingredients.trim()) {
            const lines = recipe.ingredients.split('\n').filter(l => l.trim());
            previewIngredients.innerHTML = lines.map(line => `• ${escapeHtml(line)}`).join('<br>');
        } else {
            previewIngredients.innerHTML = '<span style="color:var(--text-muted); font-style:italic;">No hay ingredientes especificados.</span>';
        }

        // Format steps
        if (recipe.steps && recipe.steps.trim()) {
            previewStepsContainer.style.display = 'block';
            previewSteps.textContent = recipe.steps;
        } else {
            previewStepsContainer.style.display = 'none';
        }

        previewModal.classList.remove('hidden');
    }

    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', () => {
            previewModal.classList.add('hidden');
        });
    }

    if (previewEditBtn) {
        previewEditBtn.addEventListener('click', () => {
            if (activePreviewRecipe) editRecipe(activePreviewRecipe.id);
        });
    }

    if (previewAddShoppingBtn) {
        previewAddShoppingBtn.addEventListener('click', () => {
            if (!activePreviewRecipe || !activePreviewRecipe.ingredients) {
                alert('Esta receta no tiene ingredientes anotados.');
                return;
            }
            addRecipeIngredientsToShopping([activePreviewRecipe]);
        });
    }

    // --- Renderers ---
    function renderRecipes() {
        const recipes = getRecipes();
        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
        recipesList.innerHTML = '';

        let filteredRecipes = recipes;
        if (searchTerm) {
            const terms = searchTerm.split(/[\s,]+/).filter(t => t);
            filteredRecipes = recipes.filter(r => {
                const combinedText = ((r.title || '') + ' ' + (r.ingredients || '')).toLowerCase();
                return terms.every(term => combinedText.includes(term));
            });
        }

        if (filteredRecipes.length === 0) {
            if (searchTerm) {
                recipesList.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2.5rem; color: var(--text-muted);">No hay recetas que coincidan con: <strong>${escapeHtml(searchTerm)}</strong></div>`;
            } else {
                recipesList.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 2.5rem; color: var(--text-muted);">Aún no tienes recetas guardadas.<br><small>Pulsa "+ Nueva Receta" para crear la primera.</small></div>`;
            }
            return;
        }

        const fragment = document.createDocumentFragment();

        filteredRecipes.forEach(r => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            const ingCount = r.ingredients ? r.ingredients.split('\n').filter(l => l.trim()).length : 0;

            card.innerHTML = `
                <div class="recipe-header" onclick="window.previewRecipeGlobal('${r.id}')">
                    <div class="recipe-icon">${r.icon || '🍲'}</div>
                    <div class="recipe-info">
                        <h3>${escapeHtml(r.title)}</h3>
                        <p>${ingCount} Ingrediente${ingCount === 1 ? '' : 's'}</p>
                    </div>
                </div>
                <div class="recipe-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.previewRecipeGlobal('${r.id}')">👀 Ver</button>
                    <button class="btn btn-sm btn-secondary" onclick="window.editRecipeFallback('${r.id}')">✏️ Editar</button>
                    <button class="btn btn-sm" style="color: var(--danger); background: none; border: none; font-size: 1.2rem; padding: 0 0.5rem;" onclick="window.deleteRecipeFallback('${r.id}')" title="Eliminar">✕</button>
                </div>
            `;
            fragment.appendChild(card);
        });
        recipesList.appendChild(fragment);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Global expose
    window.previewRecipeGlobal = openRecipePreview;
    window.editRecipeFallback = editRecipe;
    window.deleteRecipeFallback = deleteRecipe;

    // Search event
    let searchTimeout = null;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderRecipes();
            }, 250);
        });
    }

    if (btnSearchWeb) {
        btnSearchWeb.addEventListener('click', () => {
            const searchTerm = searchInput ? searchInput.value.trim() : '';
            if (!searchTerm) {
                alert('Escribe algún ingrediente en el buscador para buscar recetas online.');
                return;
            }
            const query = encodeURIComponent(`recetas faciles con ${searchTerm}`);
            window.open(`https://www.google.com/search?q=${query}`, '_blank');
        });
    }

    // --- Menu Logic ---
    function renderMenu() {
        const menu = getWeeklyMenu();
        const recipes = getRecipes();
        menuWeekGrid.innerHTML = '';
        
        const fragment = document.createDocumentFragment();

        DAYS_OF_WEEK.forEach((day, index) => {
            const rId = menu[index];
            const recipe = recipes.find(r => String(r.id) === String(rId));

            const card = document.createElement('div');
            card.className = 'menu-day-card';
            
            let contentHtml = '<div style="color: var(--text-muted); font-size: 0.9rem; font-style: italic; min-height: 40px; display: flex; align-items: center;">Sin comida asignada</div>';
            if (recipe) {
                contentHtml = `
                    <div style="display:flex; align-items:center; gap: 0.75rem; min-height: 40px;">
                        <span style="font-size: 1.6rem;">${recipe.icon || '🍲'}</span>
                        <strong style="color: var(--text-main); font-size: 0.95rem;">${escapeHtml(recipe.title)}</strong>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="menu-day-title">${day}</div>
                <div style="margin-bottom: 0.75rem; cursor: pointer;" onclick="window.openMenuSelect(${index})">
                    ${contentHtml}
                </div>
                <button class="btn btn-sm btn-secondary" style="width: 100%;" onclick="window.openMenuSelect(${index})">
                    ${recipe ? '🔄 Cambiar' : '+ Asignar'}
                </button>
            `;
            fragment.appendChild(card);
        });
        menuWeekGrid.appendChild(fragment);
    }

    window.openMenuSelect = (dayIndex) => {
        editingDayIndex = dayIndex;
        selectDayTitle.textContent = `Menú para el ${DAYS_OF_WEEK[dayIndex]}`;
        
        const recipes = getRecipes();
        selectDropdown.innerHTML = '<option value="">-- Sin asignar / Comer fuera --</option>';
        recipes.forEach(r => {
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = `${r.icon || '🍲'} ${r.title}`;
            selectDropdown.appendChild(opt);
        });

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

    // Helper to send ingredients to shopping
    function addRecipeIngredientsToShopping(recipeList) {
        let shopList = StorageService.getShoppingList();
        let addedCount = 0;

        recipeList.forEach(r => {
            if (r && r.ingredients) {
                const lines = r.ingredients.split('\n');
                lines.forEach(line => {
                    const txt = line.trim();
                    if (txt) {
                        shopList.push({
                            id: Date.now().toString() + Math.floor(Math.random() * 10000),
                            name: txt,
                            completed: false,
                            category: 'supermarket',
                            createdBy: `${r.title}`,
                            _deleted: false,
                            updatedAt: new Date().toISOString()
                        });
                        addedCount++;
                    }
                });
            }
        });

        if (addedCount > 0) {
            StorageService.saveShoppingList(shopList);
            StorageService.triggerAutoSync();
            alert(`¡${addedCount} ingrediente(s) añadidos a la Lista de la Compra!`);
        } else {
            alert('No hay ingredientes para añadir.');
        }
    }

    // --- Shopping List Integration for whole week ---
    btnSendShopping.addEventListener('click', () => {
        const menu = getWeeklyMenu();
        const recipes = getRecipes();
        const activeRecipes = menu.map(rId => recipes.find(x => String(x.id) === String(rId))).filter(Boolean);

        if (activeRecipes.length === 0) {
            alert('No hay recetas asignadas en el menú de esta semana.');
            return;
        }

        if (confirm(`¿Copiar todos los ingredientes de las ${activeRecipes.length} recetas de esta semana a tu Lista de Compra?`)) {
            addRecipeIngredientsToShopping(activeRecipes);
        }
    });

    // Modal background close
    [recipeModal, previewModal, selectModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }
    });

    // Init
    renderRecipes();

    window.addEventListener('storage-updated', () => {
        renderRecipes();
        renderMenu();
    });
});

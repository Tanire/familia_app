/**
 * StorageService - Manejo centralizado de localStorage con Auto-Sync (SMART MERGE)
 * Versión 1.22.4
 */
const StorageService = {
  syncTimeout: null,

  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from storage`, e);
      return defaultValue;
    }
  },

  set(key, value, suppressAutoSync = false) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error saving ${key} to storage`, e);
    }
  },

  triggerAutoSync() {
    const token = localStorage.getItem('gh_token');
    const gistId = localStorage.getItem('gh_gist_id');
    if (!token || !gistId) return;

    // Debounce: Esperar 2 segundos tras el último cambio
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
      indicator.innerHTML = '<span style="color: #F59E0B;">●</span> Guardando...';
      indicator.style.opacity = '1';
    }

    this.syncTimeout = setTimeout(async () => {
      if (typeof SyncService !== 'undefined' && window.SyncService && window.SyncService.syncWithCloud) {
        try {
          const result = await window.SyncService.syncWithCloud(token, gistId);
          const success = (typeof result === 'boolean') ? result : (result && result.success);

          if (indicator) {
            if (success) {
              indicator.innerHTML = '<span style="color: #10B981;">●</span> En línea';
              setTimeout(() => { indicator.style.opacity = '0.7'; }, 2000);
            } else {
              indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error al guardar';
            }
          }

          if (success) {
            window.dispatchEvent(new Event('storage-updated'));
          }
        } catch (err) {
          console.error('Error en triggerAutoSync:', err);
          if (indicator) indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error Sync';
        }
      }
    }, 2000);
  },

  // --- Calendar Helpers ---
  getEvents() { return this.get('calendar_events', []); },
  saveEvents(events, suppress = false) { this.set('calendar_events', events, suppress); },

  // --- Expenses Helpers ---
  getExpenses() { return this.get('expenses', []); },
  saveExpenses(expenses, suppress = false) { this.set('expenses', expenses, suppress); },

  getRecurringBills() { return this.get('recurring_bills', []); },
  saveRecurringBills(bills, suppress = false) { this.set('recurring_bills', bills, suppress); },

  getMainImage() { return this.get('app_main_image', null); },
  saveMainImage(b64, suppress = false) { this.set('app_main_image', b64, suppress); },

  getCustomCategories() { 
    const defaults = [
      { id: 'supermarket', name: 'Supermercado', icon: '🛒' },
      { id: 'home', name: 'Casa', icon: '🏠' },
      { id: 'transport', name: 'Transporte', icon: '🚗' },
      { id: 'leisure', name: 'Ocio', icon: '🎉' },
      { id: 'health', name: 'Salud', icon: '💊' },
      { id: 'clothing', name: 'Ropa', icon: '👕' },
      { id: 'salary', name: 'Nómina', icon: '💰' },
      { id: 'gift', name: 'Regalo', icon: '🎁' },
      { id: 'other', name: 'Otros', icon: '📦' }
    ];
    return this.get('expense_categories', defaults); 
  },
  saveCustomCategories(cats, suppress = false) { this.set('expense_categories', cats, suppress); },

  getMonthlyBudget() { return this.get('monthly_budget', 0); },
  saveMonthlyBudget(budget, suppress = false) { this.set('monthly_budget', budget, suppress); },

  // --- Family Members Helpers ---
  getFamilyMembers() {
    let members = this.get('family_members', null);
    if (!members || !Array.isArray(members) || members.length === 0) {
      const activeUser = localStorage.getItem('user_profile');
      members = activeUser ? [activeUser] : ['Papá', 'Mamá'];
      // Also collect any createdBy found in existing expenses
      const expenses = this.getExpenses();
      expenses.forEach(e => {
        if (e.createdBy && !members.includes(e.createdBy)) {
          members.push(e.createdBy);
        }
      });
      this.saveFamilyMembers(members, true);
    }
    return members;
  },
  saveFamilyMembers(members, suppress = false) {
    this.set('family_members', members, suppress);
  },

  // --- Shopping List Helpers (Normalizado: completed / checked) ---
  getShoppingList() { 
    const items = this.get('shopping_list', []);
    return items.map(item => ({
      ...item,
      completed: !!(item.completed || item.checked)
    }));
  },
  saveShoppingList(items, suppress = false) { 
    this.set('shopping_list', items, suppress); 
  },

  // --- Recipes & Weekly Menu Helpers ---
  getRecipes() { return this.get('recipes', []); },
  saveRecipes(recipes, suppress = false) { this.set('recipes', recipes, suppress); },

  getWeeklyMenu() { return this.get('weekly_menu', [null, null, null, null, null, null, null]); },
  saveWeeklyMenu(menu, suppress = false) { this.set('weekly_menu', menu, suppress); },

  // --- Backup & Restore ---
  exportBackup() {
    const backupData = {
      version: '1.22.4',
      exportedAt: new Date().toISOString(),
      user_profile: localStorage.getItem('user_profile') || '',
      calendar_events: this.getEvents(),
      expenses: this.getExpenses(),
      recurring_bills: this.getRecurringBills(),
      shopping_list: this.getShoppingList(),
      recipes: this.getRecipes(),
      weekly_menu: this.getWeeklyMenu(),
      expense_categories: this.getCustomCategories(),
      monthly_budget: this.getMonthlyBudget(),
      family_members: this.getFamilyMembers(),
      app_main_image: this.getMainImage()
    };
    return JSON.stringify(backupData, null, 2);
  },

  importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') throw new Error('Formato no válido');

      if (data.calendar_events) this.saveEvents(data.calendar_events, true);
      if (data.expenses) this.saveExpenses(data.expenses, true);
      if (data.recurring_bills) this.saveRecurringBills(data.recurring_bills, true);
      if (data.shopping_list) this.saveShoppingList(data.shopping_list, true);
      if (data.recipes) this.saveRecipes(data.recipes, true);
      if (data.weekly_menu) this.saveWeeklyMenu(data.weekly_menu, true);
      if (data.expense_categories) this.saveCustomCategories(data.expense_categories, true);
      if (data.family_members) this.saveFamilyMembers(data.family_members, true);
      if (data.monthly_budget !== undefined) this.saveMonthlyBudget(data.monthly_budget, true);
      if (data.app_main_image) this.saveMainImage(data.app_main_image, true);
      if (data.user_profile) localStorage.setItem('user_profile', data.user_profile);

      this.triggerAutoSync();
      return { success: true };
    } catch (e) {
      console.error('Error importando copia:', e);
      return { success: false, error: e.message };
    }
  }
};

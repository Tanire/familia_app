const SyncService = {
    // ---- GitHub Gist API Wrappers ----

    async createGist(token) {
        const data = {
            description: "Casa Mocholí Data - Sync",
            public: false,
            files: {
                "family_data.json": {
                    content: JSON.stringify(this.getAllLocalData())
                }
            }
        };

        try {
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Error creando Gist');
            const json = await response.json();
            return json.id;
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async updateGist(token, gistId, dataContent) {
        // If dataContent is provided, use it, otherwise use local data (legacy mode)
        const content = dataContent ? JSON.stringify(dataContent) : JSON.stringify(this.getAllLocalData());

        const data = {
            files: {
                "family_data.json": { content: content }
            }
        };

        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
    },

    async getGist(token, gistId) {
        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            const json = await response.json();
            
            if (!json.files["family_data.json"]) return null; // Or throw?

            const content = json.files["family_data.json"].content;
            return JSON.parse(content);
        } catch (e) {
            console.error("getGist Error:", e);
            throw e; // Propagate error to syncWithCloud
        }
    },

    // ... (Data Management & Merge Logic Omitted for Brevity - kept same) ...
    getAllLocalData() {
        return {
            calendar_events: StorageService.getEvents(),
            expenses: StorageService.getExpenses(),
            shopping_list: StorageService.get('shopping_list', []),
            recurring_bills: StorageService.getRecurringBills(),
            household_tasks: StorageService.getTasks(),
            // Phase 2
            expense_categories: StorageService.getCustomCategories(),
            monthly_budget: { amount: StorageService.getMonthlyBudget(), updatedAt: localStorage.getItem('budget_updatedAt') || new Date().toISOString() },
            // Phase 3
            recipes: StorageService.get('recipes', []),
            weekly_menu: StorageService.get('weekly_menu', [null, null, null, null, null, null, null])
        };
    },
    restoreData(data) {
        if (data.calendar_events) StorageService.saveEvents(data.calendar_events, true);
        if (data.expenses) StorageService.saveExpenses(data.expenses, true);
        if (data.shopping_list) StorageService.set('shopping_list', data.shopping_list, true);
        if (data.recurring_bills) StorageService.saveRecurringBills(data.recurring_bills, true);
        if (data.household_tasks) StorageService.saveTasks(data.household_tasks, true);
        
        if (data.expense_categories) StorageService.saveCustomCategories(data.expense_categories, true);
        if (data.monthly_budget && data.monthly_budget.amount !== undefined) {
             StorageService.saveMonthlyBudget(data.monthly_budget.amount, true);
             localStorage.setItem('budget_updatedAt', data.monthly_budget.updatedAt);
        }

        // Phase 3
        if (data.recipes) StorageService.set('recipes', data.recipes, true);
        if (data.weekly_menu) StorageService.set('weekly_menu', data.weekly_menu, true);
    },
    mergeArrays(localArr, cloudArr) {
        // Map by ID to merge. "Last Write Wins" Strategy.
        const mergedMap = new Map();
        if (Array.isArray(cloudArr)) {
            cloudArr.forEach(item => { if (item && item.id) mergedMap.set(item.id, item); });
        }
        if (Array.isArray(localArr)) {
            localArr.forEach(localItem => {
                if (localItem && localItem.id) {
                    const cloudItem = mergedMap.get(localItem.id);
                    if (cloudItem) {
                        const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
                        const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
                        if (localTime >= cloudTime) mergedMap.set(localItem.id, localItem);
                    } else {
                        mergedMap.set(localItem.id, localItem);
                    }
                }
            });
        }
        return Array.from(mergedMap.values());
    },

    async syncWithCloud(token, gistId) {
        try {
            // 1. Get Cloud Data
            let cloudData = null;
            try {
                cloudData = await this.getGist(token, gistId);
            } catch (e) {
                // If 404, maybe we want to initialize? 
                // But for now, let's treat it as error unless we specifically handle init.
                // If it's 401, definitely error.
                if (e.message.includes('404')) {
                    // This implies Gist ID is wrong OR we need to init? 
                    // UpdateGist might fail too if ID is wrong.
                    // Let's try updateGist anyway?
                    console.warn("Gist not found (404), attempting to overwrite/create if possible...");
                } else {
                    return { success: false, error: e.message };
                }
            }

            if (!cloudData) {
                // No cloud data (or 404 handled)? Try upload local.
                return await this.updateGist(token, gistId);
            }

            // 2. Get Local Data
            const localData = this.getAllLocalData();

            // 3. Merge
            const localBudget = localData.monthly_budget;
            const cloudBudget = cloudData.monthly_budget || { amount: 0, updatedAt: '1970-01-01' };
            const mergedBudget = (new Date(localBudget.updatedAt).getTime() > new Date(cloudBudget.updatedAt).getTime()) ? localBudget : cloudBudget;

            // Simple categories merge (assume local wins if it has changes, but mergeArrays with IDs is better if we add IDs/timestamps to categories)
            // For categories, we will use mergeArrays and ensure categories have 'id' and 'updatedAt'.
            const mergedCategories = this.mergeArrays(localData.expense_categories, cloudData.expense_categories || []);

            const mergedData = {
                calendar_events: this.mergeArrays(localData.calendar_events, cloudData.calendar_events),
                expenses: this.mergeArrays(localData.expenses, cloudData.expenses),
                shopping_list: this.mergeArrays(localData.shopping_list, cloudData.shopping_list),
                recurring_bills: this.mergeArrays(localData.recurring_bills, cloudData.recurring_bills),
                household_tasks: this.mergeArrays(localData.household_tasks, cloudData.household_tasks),
                expense_categories: mergedCategories.length > 0 ? mergedCategories : localData.expense_categories,
                monthly_budget: mergedBudget,
                // Phase 3 Arrays
                recipes: this.mergeArrays(localData.recipes, cloudData.recipes),
                // Menu is a simple array of IDs, prefer local if it exists and changed, but it doesn't have updatedAt. 
                // For simplicity, local wins just like categories.
                weekly_menu: (!cloudData.weekly_menu || localData.weekly_menu.some(x => x !== null)) ? localData.weekly_menu : cloudData.weekly_menu
            };

            // 4. Update Local
            const oldShoppingList = localData.shopping_list; 
            this.restoreData(mergedData);

            // 5. Notifications (Skipped)

            // 6. Update Cloud
            return await this.updateGist(token, gistId, mergedData);

        } catch (e) {
            return { success: false, error: e.message || 'Unknown Sync Error' };
        }
    }
};


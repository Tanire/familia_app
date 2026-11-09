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
            
            if (!json.files || !json.files["family_data.json"]) return null;

            const content = json.files["family_data.json"].content;
            return JSON.parse(content);
        } catch (e) {
            console.error("getGist Error:", e);
            throw e;
        }
    },

    getAllLocalData() {
        return {
            version: '1.22.4',
            calendar_events: StorageService.getEvents(),
            expenses: StorageService.getExpenses(),
            shopping_list: StorageService.getShoppingList(),
            recurring_bills: StorageService.getRecurringBills(),
            main_image: StorageService.getMainImage(),
            expense_categories: StorageService.getCustomCategories(),
            monthly_budget: { 
                amount: StorageService.getMonthlyBudget(), 
                updatedAt: localStorage.getItem('budget_updatedAt') || new Date().toISOString() 
            },
            recipes: StorageService.getRecipes(),
            weekly_menu: StorageService.getWeeklyMenu()
        };
    },

    restoreData(data) {
        if (data.calendar_events) StorageService.saveEvents(data.calendar_events, true);
        if (data.expenses) StorageService.saveExpenses(data.expenses, true);
        if (data.shopping_list) StorageService.saveShoppingList(data.shopping_list, true);
        if (data.recurring_bills) StorageService.saveRecurringBills(data.recurring_bills, true);
        if (data.main_image) StorageService.saveMainImage(data.main_image, true);
        if (data.expense_categories) StorageService.saveCustomCategories(data.expense_categories, true);
        if (data.monthly_budget && data.monthly_budget.amount !== undefined) {
             StorageService.saveMonthlyBudget(data.monthly_budget.amount, true);
             if (data.monthly_budget.updatedAt) localStorage.setItem('budget_updatedAt', data.monthly_budget.updatedAt);
        }
        if (data.recipes) StorageService.saveRecipes(data.recipes, true);
        if (data.weekly_menu) StorageService.saveWeeklyMenu(data.weekly_menu, true);
    },

    mergeArrays(localArr, cloudArr) {
        // Map by ID to merge. "Last Write Wins" Strategy.
        const mergedMap = new Map();
        if (Array.isArray(cloudArr)) {
            cloudArr.forEach(item => { if (item && item.id) mergedMap.set(String(item.id), item); });
        }
        if (Array.isArray(localArr)) {
            localArr.forEach(localItem => {
                if (localItem && localItem.id) {
                    const idStr = String(localItem.id);
                    const cloudItem = mergedMap.get(idStr);
                    if (cloudItem) {
                        const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
                        const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
                        if (localTime >= cloudTime) {
                            mergedMap.set(idStr, localItem);
                        }
                    } else {
                        mergedMap.set(idStr, localItem);
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
                if (e.message && e.message.includes('404')) {
                    console.warn("Gist not found (404), intentando subir estado actual...");
                } else {
                    return { success: false, error: e.message };
                }
            }

            if (!cloudData) {
                return await this.updateGist(token, gistId);
            }

            // 2. Get Local Data
            const localData = this.getAllLocalData();

            // 3. Merge
            const localBudget = localData.monthly_budget;
            const cloudBudget = cloudData.monthly_budget || { amount: 0, updatedAt: '1970-01-01' };
            const mergedBudget = (new Date(localBudget.updatedAt).getTime() > new Date(cloudBudget.updatedAt).getTime()) ? localBudget : cloudBudget;

            const mergedCategories = this.mergeArrays(localData.expense_categories, cloudData.expense_categories || []);

            const mergedData = {
                version: '1.22.4',
                calendar_events: this.mergeArrays(localData.calendar_events, cloudData.calendar_events),
                expenses: this.mergeArrays(localData.expenses, cloudData.expenses),
                shopping_list: this.mergeArrays(localData.shopping_list, cloudData.shopping_list),
                recurring_bills: this.mergeArrays(localData.recurring_bills, cloudData.recurring_bills),
                main_image: localData.main_image || cloudData.main_image,
                expense_categories: mergedCategories.length > 0 ? mergedCategories : localData.expense_categories,
                monthly_budget: mergedBudget,
                recipes: this.mergeArrays(localData.recipes, cloudData.recipes),
                weekly_menu: (!cloudData.weekly_menu || localData.weekly_menu.some(x => x !== null)) ? localData.weekly_menu : cloudData.weekly_menu
            };

            // 4. Update Local
            this.restoreData(mergedData);

            // 5. Update Cloud
            return await this.updateGist(token, gistId, mergedData);

        } catch (e) {
            return { success: false, error: e.message || 'Unknown Sync Error' };
        }
    }
};

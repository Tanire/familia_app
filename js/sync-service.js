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
            return response.ok;
        } catch (e) {
            console.error(e);
            return false;
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
            if (!response.ok) throw new Error('Error leyendo Gist');
            const json = await response.json();
            // Handle case where file might not exist or be named differently? No, we control it.
            if (!json.files["family_data.json"]) return null;

            const content = json.files["family_data.json"].content;
            return JSON.parse(content);
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    // ---- Data Management ----

    getAllLocalData() {
        return {
            calendar_events: StorageService.getEvents(),
            expenses: StorageService.getExpenses(),
            shopping_list: StorageService.get('shopping_list', []),
            recurring_bills: StorageService.getRecurringBills()
        };
    },

    restoreData(data) {
        if (data.calendar_events) StorageService.saveEvents(data.calendar_events);
        if (data.expenses) StorageService.saveExpenses(data.expenses);
        if (data.shopping_list) StorageService.set('shopping_list', data.shopping_list);
        if (data.recurring_bills) StorageService.saveRecurringBills(data.recurring_bills);
    },

    // ---- Smart Merge Logic ----

    mergeArrays(localArr, cloudArr) {
        // Map by ID to merge. Local wins if conflict (assumed latest edit by active user).
        const mergedMap = new Map();

        // 1. Add Cloud items first
        if (Array.isArray(cloudArr)) {
            cloudArr.forEach(item => {
                if (item && item.id) mergedMap.set(item.id, item);
            });
        }

        // 2. Add/Overwrite with Local items
        if (Array.isArray(localArr)) {
            localArr.forEach(item => {
                if (item && item.id) mergedMap.set(item.id, item);
            });
        }

        return Array.from(mergedMap.values());
    },

    async syncWithCloud(token, gistId) {
        // 1. Get Cloud Data
        const cloudData = await this.getGist(token, gistId);

        if (!cloudData) {
            // No cloud data? Just upload local.
            return await this.updateGist(token, gistId);
        }

        // 2. Get Local Data
        const localData = this.getAllLocalData();

        // 3. Merge
        const mergedData = {
            calendar_events: this.mergeArrays(localData.calendar_events, cloudData.calendar_events),
            expenses: this.mergeArrays(localData.expenses, cloudData.expenses),
            shopping_list: this.mergeArrays(localData.shopping_list, cloudData.shopping_list),
            recurring_bills: this.mergeArrays(localData.recurring_bills, cloudData.recurring_bills)
        };

        // 4. Update Local
        this.restoreData(mergedData);

        // 5. Update Cloud
        return await this.updateGist(token, gistId, mergedData);
    }
};

// UI Logic (kept same as before, just update file content to include new SyncService logic)
// To keep main file small, I am reusing the previous UI portion for settings (it's in settings.html inline or using the same file).
// Wait, sync-service.js DOES have UI logic at the bottom. I need to preserve it.
// I will include the UI logic block from previous version.

document.addEventListener('DOMContentLoaded', () => {
    // Only run if elements exist (we are on settings page)
    const tokenInput = document.getElementById('gh-token');
    const gistIdInput = document.getElementById('gh-gist-id');
    const saveBtn = document.getElementById('save-config-btn');
    const uploadBtn = document.getElementById('sync-upload-btn');
    const downloadBtn = document.getElementById('sync-download-btn');
    const statusDiv = document.getElementById('sync-status');

    // Config Local
    const exportBtn = document.getElementById('export-json-btn');
    const importBtn = document.getElementById('import-json-btn');
    const importFile = document.getElementById('import-json-file');

    if (!tokenInput) return; // Not on settings page

    // Load saved config
    tokenInput.value = localStorage.getItem('gh_token') || '';
    gistIdInput.value = localStorage.getItem('gh_gist_id') || '';

    function showStatus(msg, color = 'var(--text-main)') {
        statusDiv.textContent = msg;
        statusDiv.style.color = color;
        setTimeout(() => { statusDiv.textContent = ''; }, 3000);
    }

    saveBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        const gistId = gistIdInput.value.trim();

        if (token) localStorage.setItem('gh_token', token);
        if (gistId) localStorage.setItem('gh_gist_id', gistId);

        showStatus('Configuración guardada', 'var(--secondary)');
    });

    uploadBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('gh_token');
        let gistId = localStorage.getItem('gh_gist_id');

        if (!token) {
            alert('Falta el Token de GitHub');
            return;
        }

        statusDiv.textContent = 'Sincronizando...';

        if (!gistId) {
            // First time: Create
            const newId = await SyncService.createGist(token);
            if (newId) {
                localStorage.setItem('gh_gist_id', newId);
                gistIdInput.value = newId;
                showStatus('¡Sync Creado y Subido!', 'var(--secondary)');
            } else {
                showStatus('Error creando Gist', 'var(--danger)');
            }
        } else {
            // Smart Sync (Merge + Upload)
            const success = await SyncService.syncWithCloud(token, gistId);
            if (success) showStatus('Sincronizado (Fusionado)', 'var(--secondary)');
            else showStatus('Error sincronizando', 'var(--danger)');
        }
    });

    downloadBtn.addEventListener('click', async () => {
        // Manual Force Download (Overwrite local)
        const token = localStorage.getItem('gh_token');
        const gistId = localStorage.getItem('gh_gist_id');

        if (!token || !gistId) return;

        statusDiv.textContent = 'Descargando...';
        const data = await SyncService.getGist(token, gistId);

        if (data) {
            SyncService.restoreData(data);
            showStatus('Datos restaurados (Sobrescritos)', 'var(--secondary)');
        } else {
            showStatus('Error descargando', 'var(--danger)');
        }
    });

    // Local Export/Import logic
    exportBtn.addEventListener('click', () => {
        const data = SyncService.getAllLocalData();
        const str = JSON.stringify(data, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_familia_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    });

    importBtn.addEventListener('click', () => importFile.click());

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                SyncService.restoreData(data);
                alert('Copia de seguridad restaurada');
            } catch (err) { alert('Archivo JSON inválido'); }
        };
        reader.readAsText(file);
    });
});

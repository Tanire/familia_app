/**
 * StorageService - Manejo centralizado de localStorage con Auto-Sync
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

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.triggerAutoSync();
    } catch (e) {
      console.error(`Error saving ${key} to storage`, e);
    }
  },

  triggerAutoSync() {
    // Only if configuring is done
    const token = localStorage.getItem('gh_token');
    const gistId = localStorage.getItem('gh_gist_id');
    if (!token || !gistId) return;

    // Debounce: Wait 3 seconds after last change
    if (this.syncTimeout) clearTimeout(this.syncTimeout);

    // Show "Saving..." indicator if exists (in UI)
    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
      indicator.textContent = '☁️ Guardando...';
      indicator.className = 'sync-saving';
    }

    this.syncTimeout = setTimeout(async () => {
      // Dynamic import to avoid circular dependency if possible, or just expect SyncService globally
      if (typeof SyncService !== 'undefined' && window.SyncService && window.SyncService.updateGist) {
        const success = await window.SyncService.updateGist(token, gistId);
        if (indicator) {
          indicator.textContent = success ? '☁️ Guardado' : '☁️ Error';
          indicator.className = success ? 'sync-success' : 'sync-error';
          setTimeout(() => { indicator.textContent = '☁️'; indicator.className = ''; }, 3000);
        }
      }
    }, 3000);
  },

  // Helpers específicos
  getEvents() {
    return this.get('calendar_events', []);
  },

  saveEvents(events) {
    this.set('calendar_events', events);
  },

  getExpenses() {
    return this.get('expenses', []);
  },

  saveExpenses(expenses) {
    this.set('expenses', expenses);
  }
};

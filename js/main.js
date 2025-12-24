async function checkAutoSync() {
  const token = localStorage.getItem('gh_token');
  const gistId = localStorage.getItem('gh_gist_id');

  if (!token || !gistId || typeof SyncService === 'undefined') return;

  const indicator = document.getElementById('sync-indicator');
  if (indicator) {
    indicator.textContent = '☁️ Sincronizando...';
    indicator.className = 'sync-loading';
  }

  // Attempt download
  const data = await SyncService.getGist(token, gistId);
  if (data) {
    // Compare? For now, simple overwrite strategies on load are safest for this complexity
    SyncService.restoreData(data);
    console.log('Auto-download completed');
    if (indicator) {
      indicator.textContent = '☁️ Actualizado';
      indicator.className = 'sync-success';
    }
    // If we are on calendar/expenses page, we might need to refresh view. 
    // Simplest is reload if data changed, but that's jarring.
    // Better: Functions like renderCalendar() should act on data change.
    // For this version (V2), let's just update storage. The user might need to refresh 
    // if they had the page open, but if they just opened it, it will render with new data
    // IF this runs before render. 
    // Ideally this runs ASAP.

    // Dispatch event for current page to re-render if needed
    window.dispatchEvent(new Event('storage-updated'));
  } else {
    if (indicator) indicator.textContent = '☁️ Offline';
  }
}

function navigateTo(page) {
  window.location.href = page;
}

document.addEventListener('DOMContentLoaded', () => {
  // Inject Indicator if not exists
  if (!document.getElementById('sync-indicator')) {
    const div = document.createElement('div');
    div.id = 'sync-indicator';
    div.style.cssText = "position: fixed; top: 1rem; right: 1rem; background: rgba(255,255,255,0.8); padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; pointer-events: none; z-index: 1000; transition: all 0.3s;";
    div.textContent = '☁️';
    document.body.appendChild(div);
  }

  // Wait a bit to ensure SyncService is loaded
  setTimeout(checkAutoSync, 500);
});

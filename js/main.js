async function checkAutoSync() {
  const token = localStorage.getItem('gh_token');
  const gistId = localStorage.getItem('gh_gist_id');

  const indicator = document.getElementById('sync-indicator');

  if (!token || !gistId || typeof SyncService === 'undefined') {
    if (indicator) {
      indicator.innerHTML = '<span style="color: #9CA3AF;">●</span> Desconectado';
    }
    return;
  }

  if (indicator) {
    indicator.innerHTML = '<span style="color: #F59E0B;">●</span> Conectando...';
  }

  // Update Gist ID display in settings if present
  const gistDisplay = document.getElementById('gist-id-display');
  if (gistDisplay) gistDisplay.textContent = gistId.substring(0, 8) + '...';

  // Smart Sync on Load
  try {
    const result = await SyncService.syncWithCloud(token, gistId);
    // Support both old boolean return and new object return
    const success = (typeof result === 'boolean') ? result : result.success;
    const errorMsg = result.error || 'Error desconocido';

    if (indicator) {
      if (success) {
        indicator.innerHTML = '<span style="color: #10B981;">●</span> En línea';
        setTimeout(() => { indicator.style.opacity = '0.7'; }, 2000);
        
        const statusDisplay = document.getElementById('sync-status-display');
        if (statusDisplay) {
             statusDisplay.innerHTML = `
                <div style="font-weight: 600; font-size: 1.1rem; color: var(--success);">¡Sincronizado!</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">Última vez: ${new Date().toLocaleTimeString()}</div>
             `;
        }
      } else {
        indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error Sync';
        const statusDisplay = document.getElementById('sync-status-display');
        if (statusDisplay) statusDisplay.innerHTML = `<div style="color: var(--danger);">Error: ${errorMsg}</div>`;
      }
    }

    if (success) {
      window.dispatchEvent(new Event('storage-updated'));
    }
  } catch (e) {
    console.error("AutoSync Error:", e);
    if (indicator) indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error FATAL';
  }
}

function navigateTo(page) {
  window.location.href = page;
}

document.addEventListener('DOMContentLoaded', () => {

  // Check User Profile
  const user = localStorage.getItem('user_profile');
  if (!user) {
    setTimeout(() => {
      const name = prompt("¡Bienvenido! ¿Cómo te llamas? (Para saber quién apunta las cosas)");
      if (name && name.trim()) {
        localStorage.setItem('user_profile', name.trim());
        location.reload();
      }
    }, 500);
  }

  // Inject PROMINENT Indicator if not exists
  if (!document.getElementById('sync-indicator')) {
    const div = document.createElement('div');
    div.id = 'sync-indicator';
    div.className = 'sync-indicator';
    div.innerHTML = '<span style="color: #9CA3AF;">●</span> Iniciando...';

    // Add click listener to go to settings if disconnected
    div.addEventListener('click', () => {
      navigateTo('settings.html');
    });

    document.body.appendChild(div);
  }

  // ---- Settings Page Logic (v1.20 Clean) ----
  const tokenInput = document.getElementById('gh-token');
  const gistIdInput = document.getElementById('gh-gist-id');
  const saveConfigBtn = document.getElementById('save-config-btn');
  const manualSyncBtn = document.getElementById('manual-sync-btn');
  const syncFeedback = document.getElementById('sync-feedback');

  if (tokenInput && gistIdInput) {
    // Load saved
    tokenInput.value = localStorage.getItem('gh_token') || '';
    gistIdInput.value = localStorage.getItem('gh_gist_id') || '';

    saveConfigBtn.addEventListener('click', () => {
      const token = tokenInput.value.trim();
      const gistId = gistIdInput.value.trim();
      if (token) localStorage.setItem('gh_token', token);
      if (gistId) localStorage.setItem('gh_gist_id', gistId);
      alert('Credenciales guardadas. Recargando...');
      window.location.reload();
    });
  }

  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', async () => {
      manualSyncBtn.disabled = true;
      manualSyncBtn.textContent = 'Sincronizando...';
      syncFeedback.textContent = '';

      await checkAutoSync();

      manualSyncBtn.disabled = false;
      manualSyncBtn.textContent = '🔄 Sincronizar Ahora';
      syncFeedback.textContent = 'Proceso finalizado.';
      syncFeedback.style.color = 'var(--text-muted)';
    });
  }

  // Wait a bit to ensure SyncService is loaded
  setTimeout(checkAutoSync, 1000);
});

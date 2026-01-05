async function checkAutoSync() {
  const token = localStorage.getItem('gh_token');
  const gistId = localStorage.getItem('gh_gist_id');

  const indicator = document.getElementById('sync-indicator');

  if (!token || !gistId || typeof SyncService === 'undefined') {
    if (indicator) {
      indicator.innerHTML = '<span style="color: #9CA3AF;">●</span> Desconectado';
      // Optional: Make it clickable or just informative
    }
    return;
  }

  if (indicator) {
    indicator.innerHTML = '<span style="color: #F59E0B;">●</span> Sincronizando...';
  }

  // Smart Sync on Load
  try {
    const success = await SyncService.syncWithCloud(token, gistId);

    if (indicator) {
      if (success) {
        indicator.innerHTML = '<span style="color: #10B981;">●</span> En línea';
        setTimeout(() => { indicator.style.opacity = '0.7'; }, 2000);
      } else {
        indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error Sync';
      }
    }

    if (success) {
      window.dispatchEvent(new Event('storage-updated'));
    }
  } catch (e) {
    console.error("AutoSync Error:", e);
    if (indicator) indicator.innerHTML = '<span style="color: #EF4444;">●</span> Error';
  }
}

function navigateTo(page) {
  window.location.href = page;
}



document.addEventListener('DOMContentLoaded', () => {


  // Check for Daily Bills
  if (typeof NotificationSystem !== 'undefined' && typeof StorageService !== 'undefined') {
    NotificationSystem.checkDailyBills(StorageService.getRecurringBills());
  }

  // Check User Profile
  const user = localStorage.getItem('user_profile');
  if (!user) {
    setTimeout(() => {
      const name = prompt("¡Bienvenido! ¿Cómo te llamas? (Para saber quién apunta las cosas)");
      if (name && name.trim()) {
        localStorage.setItem('user_profile', name.trim());
        location.reload(); // Reload to apply changes if any (or just proceed)
      }
    }, 500);
  }

  // Inject PROMINENT Indicator if not exists
  if (!document.getElementById('sync-indicator')) {
    const div = document.createElement('div');
    div.id = 'sync-indicator';
    // Bottom center pill styling
    div.className = 'sync-indicator';
    // Default text 
    div.innerHTML = '<span style="color: #9CA3AF;">●</span> Iniciando...';

    // Add click listener to go to settings if disconnected
    div.addEventListener('click', () => {
      const txt = div.innerText;
      if (txt.includes('Desconectado') || txt.includes('Error')) {
        navigateTo('settings.html');
      }
    });

    document.body.appendChild(div);
  }

  // Wait a bit to ensure SyncService is loaded
  setTimeout(checkAutoSync, 1000);
});

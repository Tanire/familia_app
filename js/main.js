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

function checkTheme() {
  const now = new Date();
  const hour = now.getHours();
  // Dark mode from 20:00 (8 PM) to 09:00 (9 AM)
  if (hour >= 20 || hour < 9) {
    document.body.classList.add('dark-mode');
    // Update theme-color meta tag for browser UI
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#111827');
  } else {
    document.body.classList.remove('dark-mode');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#4F46E5');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkTheme(); // Run on load
  // Optional: Check every minute to switch automatically while open
  setInterval(checkTheme, 60000);

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
    div.style.cssText = "position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: white; padding: 8px 20px; border-radius: 30px; font-size: 0.9rem; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.15); z-index: 9999; display: flex; align-items: center; gap: 8px; border: 1px solid #E5E7EB; white-space: nowrap;";
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

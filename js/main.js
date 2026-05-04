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

function loadDashboardStats() {
    // Only run on index.html
    if (!document.getElementById('home-user-name')) return;

    // 1. Set Date
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('es-ES', dateOpts);
    document.getElementById('date-display').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

    // 2. Set Name
    const userName = localStorage.getItem('user_profile') || 'Familia';
    document.getElementById('home-user-name').textContent = userName.split(' ')[0]; // First name only

    // 3. Calculate Stats
    // Events Today
    const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const allEvents = StorageService.getEvents().filter(e => !e._deleted);
    let todayEventsCount = 0;
    
    // Quick recurring check (Simplified for widget)
    allEvents.forEach(event => {
        if (!event.recurrence || event.recurrence === 'none') {
            if (event.date === todayStr) todayEventsCount++;
        } else {
            // Very simplified check, real logic is in calendar.js
            todayEventsCount++; // Just count it as potential for now to keep it lightweight, or copy full logic
        }
    });
    
    // Exact logic for recurring
    const viewDate = new Date();
    viewDate.setHours(0,0,0,0);
    todayEventsCount = allEvents.filter(event => {
        const eventStart = new Date(event.date);
        eventStart.setHours(0,0,0,0);
        if (!event.recurrence || event.recurrence === 'none') return event.date === todayStr;
        if (viewDate < eventStart) return false;
        if (event.recurrence === 'weekly') return viewDate.getDay() === eventStart.getDay();
        if (event.recurrence === 'monthly') return viewDate.getDate() === eventStart.getDate();
        if (event.recurrence === 'yearly') return viewDate.getMonth() === eventStart.getMonth() && viewDate.getDate() === eventStart.getDate();
        return false;
    }).length;

    // Shopping List items
    const shopListCount = StorageService.getShoppingList().filter(i => !i.checked && !i._deleted).length;

    // Update DOM
    document.getElementById('summary-events').textContent = todayEventsCount;
    document.getElementById('summary-list').textContent = shopListCount;
}

document.addEventListener('DOMContentLoaded', () => {

  // Theme Init
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
  }

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

  // Load Main Image if exists
  const familyPhotoEl = document.querySelector('.family-photo');
  if (familyPhotoEl) {
      const savedImage = StorageService.getMainImage();
      if (savedImage) {
          familyPhotoEl.src = savedImage;
      }
  }

  // ---- Settings Page Logic (v1.20 Clean) ----
  const tokenInput = document.getElementById('gh-token');
  const gistIdInput = document.getElementById('gh-gist-id');
  const saveConfigBtn = document.getElementById('save-config-btn');
  const manualSyncBtn = document.getElementById('manual-sync-btn');
  const syncFeedback = document.getElementById('sync-feedback');
  const themeToggle = document.getElementById('theme-toggle');

  if (themeToggle) {
      themeToggle.checked = document.documentElement.getAttribute('data-theme') === 'dark';
      
      themeToggle.addEventListener('change', () => {
          if (themeToggle.checked) {
              document.documentElement.setAttribute('data-theme', 'dark');
              localStorage.setItem('theme', 'dark');
          } else {
              document.documentElement.removeAttribute('data-theme');
              localStorage.setItem('theme', 'light');
          }
      });


    // --- Phase 2: Expenses Config Logic ---
    const budgetInput = document.getElementById('monthly-budget');
    const catList = document.getElementById('categories-list');
    const newCatIcon = document.getElementById('new-cat-icon');
    const newCatName = document.getElementById('new-cat-name');
    const addCatBtn = document.getElementById('add-cat-btn');
    const saveExpConfigBtn = document.getElementById('save-expenses-config-btn');

    if (budgetInput && catList) {
        budgetInput.value = StorageService.getMonthlyBudget();
        let categories = StorageService.getCustomCategories();

        function renderCategories() {
            catList.innerHTML = '';
            const fragment = document.createDocumentFragment();
            categories.forEach(cat => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.justifyContent = 'space-between';
                div.style.alignItems = 'center';
                div.style.padding = '0.5rem';
                div.style.borderBottom = '1px solid var(--btn-secondary-border)';
                div.innerHTML = `
                    <span><span style="font-size: 1.2rem; margin-right: 0.5rem;">${cat.icon}</span> ${cat.name}</span>
                    <button class="btn-del-cat" data-id="${cat.id}" style="background: none; border: none; color: var(--danger); cursor: pointer;">✕</button>
                `;
                fragment.appendChild(div);
            });
            catList.appendChild(fragment);

            document.querySelectorAll('.btn-del-cat').forEach(btn => {
                btn.onclick = (e) => {
                    const idToDelete = e.target.dataset.id;
                    if (['supermarket', 'home', 'transport', 'leisure', 'health', 'clothing', 'salary', 'gift', 'other'].includes(idToDelete)) {
                        if (!confirm('Esta es una categoría por defecto. ¿Seguro que quieres borrarla? (Si eliminas una categoría y tienes gastos con ella, aparecerán como "Otros")')) return;
                    }
                    categories = categories.filter(c => c.id !== idToDelete);
                    renderCategories();
                };
            });
        }

        renderCategories();

        addCatBtn.onclick = () => {
            const icon = newCatIcon.value.trim() || '📦';
            const name = newCatName.value.trim();
            if (!name) return;

            const newId = 'cat_' + Date.now();
            categories.push({ id: newId, name: name, icon: icon, updatedAt: new Date().toISOString() });
            newCatIcon.value = '';
            newCatName.value = '';
            renderCategories();
        };

        saveExpConfigBtn.onclick = () => {
            const budget = parseFloat(budgetInput.value) || 0;
            StorageService.saveMonthlyBudget(budget);
            localStorage.setItem('budget_updatedAt', new Date().toISOString());

            // Add updatedAt to all categories modified
            StorageService.saveCustomCategories(categories);
            
            StorageService.triggerAutoSync();
            alert('Ajustes de gastos guardados');
        };
    }

    // --- Phase 4: Main Screen Image Change ---
    const mainImageInput = document.getElementById('main-image-input');
    if (mainImageInput) {
        mainImageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Comprimir a max 800px
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convertir a JPEG con 0.7 de calidad
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    
                    StorageService.saveMainImage(dataUrl);
                    StorageService.triggerAutoSync();
                    
                    alert('Imagen de inicio actualizada y sincronizada');
                }
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }
  }

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

  // Load Dashboard Stats if on index
  setTimeout(loadDashboardStats, 100);
  window.addEventListener('storage-updated', loadDashboardStats);
});

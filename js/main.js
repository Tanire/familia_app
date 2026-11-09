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
    const success = (typeof result === 'boolean') ? result : (result && result.success);
    const errorMsg = (result && result.error) ? result.error : 'Error desconocido';

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
        if (statusDisplay) statusDisplay.innerHTML = `<div style="color: var(--danger); font-size: 0.9rem;">Error: ${errorMsg}</div>`;
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
    if (!document.getElementById('home-user-name')) return;

    // 1. Set Date
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('es-ES', dateOpts);
    const dateDisplay = document.getElementById('date-display');
    if (dateDisplay) {
        dateDisplay.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }

    // 2. Set Name
    const userName = localStorage.getItem('user_profile') || 'Familia';
    const userNameEl = document.getElementById('home-user-name');
    if (userNameEl) {
        userNameEl.textContent = userName.split(' ')[0];
    }

    // 3. Today's Events Calculation
    const now = new Date();
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const viewDate = new Date(now);
    viewDate.setHours(0, 0, 0, 0);

    const allEvents = StorageService.getEvents().filter(e => !e._deleted);
    const todayEventsCount = allEvents.filter(event => {
        const eventStart = new Date(event.date);
        eventStart.setHours(0, 0, 0, 0);

        if (!event.recurrence || event.recurrence === 'none') return event.date === todayStr;
        if (viewDate < eventStart) return false;
        if (event.recurrence === 'weekly') return viewDate.getDay() === eventStart.getDay();
        if (event.recurrence === 'monthly') return viewDate.getDate() === eventStart.getDate();
        if (event.recurrence === 'yearly') {
            return viewDate.getMonth() === eventStart.getMonth() && viewDate.getDate() === eventStart.getDate();
        }
        return false;
    }).length;

    const summaryEventsEl = document.getElementById('summary-events');
    if (summaryEventsEl) summaryEventsEl.textContent = todayEventsCount;

    // 4. Shopping List items pending
    const shopListCount = StorageService.getShoppingList().filter(i => !i.completed && !i._deleted).length;
    const summaryListEl = document.getElementById('summary-list');
    if (summaryListEl) summaryListEl.textContent = shopListCount;

    // 5. Monthly Expenses Balance
    const viewMonth = now.getMonth();
    const viewYear = now.getFullYear();
    const allExpenses = StorageService.getExpenses().filter(e => !e._deleted);
    let monthExpenseTotal = 0;
    allExpenses.forEach(e => {
        const d = new Date(e.date);
        if (d.getMonth() === viewMonth && d.getFullYear() === viewYear && e.type !== 'income') {
            monthExpenseTotal += parseFloat(e.amount) || 0;
        }
    });

    const summaryBalanceEl = document.getElementById('summary-balance');
    if (summaryBalanceEl) summaryBalanceEl.textContent = `${monthExpenseTotal.toFixed(0)}€`;

    // 6. Today's Menu
    const homeMenuTodayEl = document.getElementById('home-menu-today');
    if (homeMenuTodayEl) {
        // Monday = 0 ... Sunday = 6
        let dayOfWeek = now.getDay() - 1;
        if (dayOfWeek === -1) dayOfWeek = 6; // Sunday

        const menu = StorageService.getWeeklyMenu();
        const recipes = StorageService.getRecipes();
        const todayRecipeId = menu[dayOfWeek];
        const recipe = recipes.find(r => String(r.id) === String(todayRecipeId));

        if (recipe) {
            homeMenuTodayEl.textContent = `${recipe.icon || '🍲'} ${recipe.title}`;
        } else {
            homeMenuTodayEl.textContent = '🍲 Menú: Sin asignar';
        }
    }
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
      const name = prompt("¡Bienvenido! ¿Cómo te llamas? (Para saber quién añade o edita elementos)");
      if (name && name.trim()) {
        localStorage.setItem('user_profile', name.trim());
        location.reload();
      }
    }, 500);
  }

  // Inject Sync Indicator if not exists
  if (!document.getElementById('sync-indicator')) {
    const div = document.createElement('div');
    div.id = 'sync-indicator';
    div.className = 'sync-indicator';
    div.innerHTML = '<span style="color: #9CA3AF;">●</span> Iniciando...';
    div.title = 'Estado de sincronización (clic para ir a Ajustes)';
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

  // ---- Settings Page Logic ----
  const tokenInput = document.getElementById('gh-token');
  const gistIdInput = document.getElementById('gh-gist-id');
  const saveConfigBtn = document.getElementById('save-config-btn');
  const manualSyncBtn = document.getElementById('manual-sync-btn');
  const syncFeedback = document.getElementById('sync-feedback');
  const themeToggle = document.getElementById('theme-toggle');
  const profileNameInput = document.getElementById('user-profile-name');
  const saveProfileBtn = document.getElementById('save-profile-btn');

  // Theme switch
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
  }

  // Profile Name
  if (profileNameInput) {
      profileNameInput.value = localStorage.getItem('user_profile') || '';
      if (saveProfileBtn) {
          saveProfileBtn.addEventListener('click', () => {
              const name = profileNameInput.value.trim();
              if (name) {
                  localStorage.setItem('user_profile', name);
                  let members = StorageService.getFamilyMembers();
                  if (!members.includes(name)) {
                      members.push(name);
                      StorageService.saveFamilyMembers(members);
                  }
                  alert('Nombre de usuario actualizado.');
              }
          });
      }
  }

  // Family Members Management in Settings
  const membersListEl = document.getElementById('family-members-list');
  const newMemberInput = document.getElementById('new-member-name');
  const addMemberBtn = document.getElementById('add-member-btn');

  if (membersListEl && typeof StorageService !== 'undefined') {
      let members = StorageService.getFamilyMembers();

      function escapeHtml(str) {
          if (!str) return '';
          return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function renderFamilyMembers() {
          membersListEl.innerHTML = '';
          if (members.length === 0) {
              membersListEl.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 0.5rem;">No hay miembros registrados.</div>';
              return;
          }
          const fragment = document.createDocumentFragment();
          members.forEach((m, idx) => {
              const div = document.createElement('div');
              div.style.display = 'flex';
              div.style.justifyContent = 'space-between';
              div.style.alignItems = 'center';
              div.style.padding = '0.4rem 0.5rem';
              div.style.borderBottom = '1px solid var(--btn-secondary-border, #E5E7EB)';
              div.innerHTML = `
                  <span style="font-weight: 500; font-size: 0.9rem;">👤 ${escapeHtml(m)}</span>
                  <button class="btn-del-member" data-index="${idx}" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1rem; padding: 0 0.5rem;" title="Eliminar">✕</button>
              `;
              fragment.appendChild(div);
          });
          membersListEl.appendChild(fragment);
      }

      membersListEl.addEventListener('click', (e) => {
          const btn = e.target.closest('.btn-del-member');
          if (btn) {
              const idx = parseInt(btn.dataset.index);
              const nameToDelete = members[idx];
              if (members.length <= 1) {
                  alert('Debe haber al menos 1 miembro en la familia.');
                  return;
              }
              if (confirm(`¿Eliminar a "${nameToDelete}" de la lista de miembros?`)) {
                  members.splice(idx, 1);
                  StorageService.saveFamilyMembers(members);
                  StorageService.triggerAutoSync();
                  renderFamilyMembers();
              }
          }
      });

      if (addMemberBtn && newMemberInput) {
          addMemberBtn.addEventListener('click', () => {
              const name = newMemberInput.value.trim();
              if (!name) return;
              if (members.includes(name)) {
                  alert('Este miembro ya está en la lista.');
                  return;
              }
              members.push(name);
              StorageService.saveFamilyMembers(members);
              StorageService.triggerAutoSync();
              newMemberInput.value = '';
              renderFamilyMembers();
          });
          newMemberInput.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') addMemberBtn.click();
          });
      }

      renderFamilyMembers();
  }

  // Notifications Enable Button
  const enableNotifBtn = document.getElementById('enable-notif-btn');
  const notifStatusText = document.getElementById('notif-status-text');
  if (enableNotifBtn && typeof NotificationService !== 'undefined') {
      const perm = NotificationService.getPermission();
      if (perm === 'granted') {
          if (notifStatusText) notifStatusText.textContent = '✅ Notificaciones activadas';
          enableNotifBtn.disabled = true;
          enableNotifBtn.textContent = 'Activadas';
      } else if (perm === 'denied') {
          if (notifStatusText) notifStatusText.textContent = '❌ Bloqueadas en los ajustes del navegador';
      }

      enableNotifBtn.addEventListener('click', async () => {
          const ok = await NotificationService.requestPermission();
          if (ok) {
              if (notifStatusText) notifStatusText.textContent = '✅ Notificaciones activadas';
              enableNotifBtn.disabled = true;
              enableNotifBtn.textContent = 'Activadas';
              NotificationService.show('¡Notificaciones Activadas!', {
                  body: 'Recibirás avisos de eventos y recordatorios de la casa.'
              });
          } else {
              alert('No se otorgaron permisos de notificación.');
          }
      });
  }

  // Expenses Config Logic
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
              div.style.borderBottom = '1px solid var(--btn-secondary-border, #E5E7EB)';
              div.innerHTML = `
                  <span><span style="font-size: 1.2rem; margin-right: 0.5rem;">${cat.icon}</span> ${cat.name}</span>
                  <button class="btn-del-cat" data-id="${cat.id}" style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem; padding: 0 0.5rem;">✕</button>
              `;
              fragment.appendChild(div);
          });
          catList.appendChild(fragment);

          catList.querySelectorAll('.btn-del-cat').forEach(btn => {
              btn.onclick = (e) => {
                  const idToDelete = e.target.dataset.id;
                  if (['supermarket', 'home', 'transport', 'leisure', 'health', 'clothing', 'salary', 'gift', 'other'].includes(idToDelete)) {
                      if (!confirm('Esta es una categoría básica. ¿Seguro que quieres eliminarla?')) return;
                  }
                  categories = categories.filter(c => c.id !== idToDelete);
                  renderCategories();
              };
          });
      }

      renderCategories();

      if (addCatBtn) {
          addCatBtn.onclick = () => {
              const icon = (newCatIcon && newCatIcon.value.trim()) ? newCatIcon.value.trim() : '📦';
              const name = (newCatName && newCatName.value.trim()) ? newCatName.value.trim() : '';
              if (!name) return;

              const newId = 'cat_' + Date.now();
              categories.push({ id: newId, name: name, icon: icon, updatedAt: new Date().toISOString() });
              if (newCatIcon) newCatIcon.value = '';
              if (newCatName) newCatName.value = '';
              renderCategories();
          };
      }

      if (saveExpConfigBtn) {
          saveExpConfigBtn.onclick = () => {
              const budget = parseFloat(budgetInput.value) || 0;
              StorageService.saveMonthlyBudget(budget);
              localStorage.setItem('budget_updatedAt', new Date().toISOString());
              StorageService.saveCustomCategories(categories);
              StorageService.triggerAutoSync();
              alert('Ajustes de presupuesto y categorías guardados con éxito.');
          };
      }
  }

  // Main Screen Image Change
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

                  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                  StorageService.saveMainImage(dataUrl);
                  StorageService.triggerAutoSync();
                  
                  alert('Foto principal actualizada y sincronizada.');
                  if (familyPhotoEl) familyPhotoEl.src = dataUrl;
              };
              img.src = event.target.result;
          };
          reader.readAsDataURL(file);
      });
  }

  // Backup JSON Export & Import
  const exportBackupBtn = document.getElementById('export-backup-btn');
  const importBackupInput = document.getElementById('import-backup-input');
  const importBackupBtn = document.getElementById('import-backup-btn');

  if (exportBackupBtn) {
      exportBackupBtn.addEventListener('click', () => {
          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(StorageService.exportBackup());
          const downloadAnchor = document.createElement('a');
          downloadAnchor.setAttribute("href", dataStr);
          downloadAnchor.setAttribute("download", `copia_seguridad_familia_${new Date().toISOString().split('T')[0]}.json`);
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
      });
  }

  if (importBackupBtn && importBackupInput) {
      importBackupBtn.addEventListener('click', () => {
          importBackupInput.click();
      });

      importBackupInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (event) => {
              const res = StorageService.importBackup(event.target.result);
              if (res.success) {
                  alert('¡Copia de seguridad restaurada correctamente! Recargando...');
                  window.location.reload();
              } else {
                  alert('Error al restaurar copia: ' + (res.error || 'Archivo inválido'));
              }
          };
          reader.readAsText(file);
      });
  }

  // GitHub Credentials
  if (tokenInput && gistIdInput) {
    tokenInput.value = localStorage.getItem('gh_token') || '';
    gistIdInput.value = localStorage.getItem('gh_gist_id') || '';

    if (saveConfigBtn) {
        saveConfigBtn.addEventListener('click', () => {
          const token = tokenInput.value.trim();
          const gistId = gistIdInput.value.trim();
          if (token) localStorage.setItem('gh_token', token);
          if (gistId) localStorage.setItem('gh_gist_id', gistId);
          alert('Credenciales guardadas con éxito.');
          window.location.reload();
        });
    }
  }

  if (manualSyncBtn) {
    manualSyncBtn.addEventListener('click', async () => {
      manualSyncBtn.disabled = true;
      manualSyncBtn.textContent = 'Sincronizando...';
      if (syncFeedback) syncFeedback.textContent = '';

      await checkAutoSync();

      manualSyncBtn.disabled = false;
      manualSyncBtn.textContent = '🔄 Sincronizar Ahora';
      if (syncFeedback) {
          syncFeedback.textContent = 'Sincronización completada.';
          syncFeedback.style.color = 'var(--text-muted)';
      }
    });
  }

  setTimeout(checkAutoSync, 800);
  setTimeout(loadDashboardStats, 100);
  window.addEventListener('storage-updated', loadDashboardStats);
});

// Centralized Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW registration fail:', err));
  });
}

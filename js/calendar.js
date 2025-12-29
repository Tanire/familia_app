

document.addEventListener('DOMContentLoaded', () => {
  const calendarGrid = document.getElementById('calendar-grid');
  const monthYear = document.getElementById('month-year');
  const addEventBtn = document.getElementById('add-event-btn');
  const addEventTodayBtn = document.getElementById('add-event-today-btn');
  const eventModal = document.getElementById('event-modal');
  const cancelEventBtn = document.getElementById('cancel-event');
  const saveEventBtn = document.getElementById('save-event');

  // Details Panel
  const detailsPanel = document.getElementById('details-panel');
  const detailsDate = document.getElementById('details-date');
  const detailsList = document.getElementById('details-list');

  // Modal Inputs
  const eventTitle = document.getElementById('event-title');
  const eventDate = document.getElementById('event-date');
  const eventTime = document.getElementById('event-time');
  const eventColor = document.getElementById('event-color');
  const eventNote = document.getElementById('event-note');
  const eventRecurrence = document.getElementById('event-recurrence');

  let currentDate = new Date();
  let selectedDate = null;

  function renderCalendar() {
    calendarGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
      "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    monthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6;

    // --- Optimization: Pre-process Events ---
    const allEvents = StorageService.getEvents().filter(e => !e._deleted);
    const recurringBills = StorageService.getRecurringBills().filter(b => !b._deleted);

    // split into recurring and single-time
    const singleEventsMap = new Map(); // "YYYY-MM-DD" -> [events]
    const recurringEvents = [];

    allEvents.forEach(e => {
      if (e.recurrence && e.recurrence !== 'none') {
        recurringEvents.push(e);
      } else {
        if (!singleEventsMap.has(e.date)) {
          singleEventsMap.set(e.date, []);
        }
        singleEventsMap.get(e.date).push(e);
      }
    });

    for (let i = 0; i < startDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.classList.add('day');
      emptyCell.style.opacity = '0.3';
      calendarGrid.appendChild(emptyCell);
    }

    // Timezone Fix: Use local ISO string
    const nowLocal = new Date();
    const todayStr = new Date(nowLocal.getTime() - (nowLocal.getTimezoneOffset() * 60000))
      .toISOString().split('T')[0];

    for (let i = 1; i <= daysInMonth; i++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'day';

      // Current Day Object
      const dayDate = new Date(year, month, i); // Local time 00:00:00
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

      if (dateString === todayStr) dayCell.classList.add('today');
      if (selectedDate === dateString) dayCell.classList.add('selected');

      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = i;
      dayCell.appendChild(dayNumber);

      // 1. Render Single Events (O(1) Lookup)
      if (singleEventsMap.has(dateString)) {
        singleEventsMap.get(dateString).forEach(event => {
          renderEventChip(dayCell, event);
        });
      }

      // 2. Render Recurring Events (Optimized Filter)
      recurringEvents.forEach(event => {
        const eventStart = new Date(event.date);
        if (dayDate < eventStart) return; // Not started yet

        let shouldRender = false;
        if (event.recurrence === 'weekly') {
          if (dayDate.getDay() === eventStart.getDay()) shouldRender = true;
        } else if (event.recurrence === 'monthly') {
          if (dayDate.getDate() === eventStart.getDate()) shouldRender = true;
        } else if (event.recurrence === 'yearly') {
          if (dayDate.getMonth() === eventStart.getMonth() &&
            dayDate.getDate() === eventStart.getDate()) shouldRender = true;
        }

        if (shouldRender) {
          renderEventChip(dayCell, event);
        }
      });

      // 3. Render Recurring Bills
      recurringBills.forEach(bill => {
        if (bill.day === i) {
          const chip = document.createElement('div');
          chip.className = 'event-chip';
          chip.style.backgroundColor = '#F59E0B'; // Orange
          chip.textContent = `💶 ${bill.title}`;
          chip.dataset.isBill = 'true';
          dayCell.appendChild(chip);
        }
      });

      dayCell.addEventListener('click', () => {
        document.querySelectorAll('.day.selected').forEach(el => el.classList.remove('selected'));
        dayCell.classList.add('selected');
        selectedDate = dateString;
        showDayDetails(dateString);
      });

      calendarGrid.appendChild(dayCell);
    }
  }

  function renderEventChip(container, event) {
    const chip = document.createElement('div');
    chip.className = 'event-chip';
    chip.style.backgroundColor = event.color || '#4F46E5';
    const isRecur = event.recurrence && event.recurrence !== 'none';
    chip.textContent = event.title + (isRecur ? ' 🔄' : '');
    container.appendChild(chip);
  }

  function showDayDetails(dateStr) {
    detailsPanel.classList.add('active');

    // We need to use the RECURRENCE logic again to find what events are on this specific day
    // Reuse logic? Or copy-paste for safety/simplicity now.

    const [y, m, d] = dateStr.split('-').map(Number);
    const viewDate = new Date(y, m - 1, d);

    // Filter Soft Deleted
    const allEvents = StorageService.getEvents().filter(e => !e._deleted);

    const eventsOnDay = allEvents.filter(event => {
      const eventStart = new Date(event.date);
      if (!event.recurrence || event.recurrence === 'none') {
        return event.date === dateStr;
      }

      // Recurring Check
      if (viewDate < eventStart) return false;

      if (event.recurrence === 'weekly') {
        return viewDate.getDay() === eventStart.getDay();
      }
      if (event.recurrence === 'monthly') {
        return viewDate.getDate() === eventStart.getDate();
      }
      if (event.recurrence === 'yearly') {
        return viewDate.getMonth() === eventStart.getMonth() && viewDate.getDate() === eventStart.getDate();
      }
      return false;
    });


    // Filter bills for this day
    const bills = StorageService.getRecurringBills().filter(b => b.day === d && !b._deleted);

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    detailsDate.textContent = viewDate.toLocaleDateString('es-ES', options);

    detailsList.innerHTML = '';

    if (eventsOnDay.length === 0 && bills.length === 0) {
      detailsList.innerHTML = '<p class="text-muted">No hay eventos.</p>';
    }

    // Render Bills First
    bills.forEach(bill => {
      const item = document.createElement('div');
      item.className = 'detail-item';
      item.style.borderLeftColor = '#F59E0B';
      item.style.background = '#FFFBEB'; // Light orange bg

      item.innerHTML = `
            <div class="detail-title">💶 ${bill.title}</div>
            <span class="detail-time">Gasto Recurrente</span>
            <div class="detail-note">Importe: ${bill.amount}€</div>
            <button class="btn-pay-bill" data-id="${bill.id}" style="margin-top:0.5rem; width:100%; border:none; background:#F59E0B; color:white; padding:4px; border-radius:4px; cursor:pointer;">
                💸 Pagar ahora
            </button>
          `;
      detailsList.appendChild(item);
    });

    // Render Events
    eventsOnDay.forEach(event => {
      const item = document.createElement('div');
      item.className = 'detail-item';
      item.style.borderLeftColor = event.color || '#4F46E5';

      const isRecurring = event.recurrence && event.recurrence !== 'none';
      const recurrenceText = isRecurring ? `(Repite: ${event.recurrence})` : '';

      item.innerHTML = `
            <div class="detail-title">${event.title} ${isRecurring ? '🔄' : ''}</div>
            <span class="detail-time">${event.time || 'Todo el día'} <small>${recurrenceText}</small></span>
            ${event.note ? `<div class="detail-note">${event.note}</div>` : ''}
            <button class="btn-delete-event" data-id="${event.id}" style="float:right; margin-top: -30px; border:none; background:none; color:#EF4444; cursor:pointer;">Eliminar</button>
          `;
      detailsList.appendChild(item);
    });

    // Listeners
    document.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteEvent(e.target.dataset.id);
      });
    });

    document.querySelectorAll('.btn-pay-bill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        payBill(e.target.dataset.id, dateStr);
      });
    });

    addEventTodayBtn.onclick = () => openModal(dateStr);
  }

  function payBill(billId, dateStr) {
    if (!confirm('¿Confirmar pago de este recibo? Se añadirá a tus gastos.')) return;

    const bills = StorageService.getRecurringBills();
    const bill = bills.find(b => b.id === billId);

    if (bill) {
      // Add to Expenses
      const newExpense = {
        id: Date.now().toString(),
        title: bill.title, // Maybe append Month name?
        amount: bill.amount,
        category: bill.category,
        date: new Date().toISOString(), // Or use the bill date? dateStr is better?
        // expense date field is ISO. Let's use current time but on that date? Or just NOW.
        // Logic: user confirms payment NOW. 
        createdBy: localStorage.getItem('user_profile') || ''
      };

      const expenses = StorageService.getExpenses();
      expenses.push(newExpense);
      StorageService.saveExpenses(expenses);
      StorageService.triggerAutoSync(); // MANUAL SYNC
      alert('¡Gasto añadido y guardado!');
    }
  }

  function deleteEvent(id) {
    if (confirm('¿Borrar este evento? (Si es recurrente, desaparecerá de todos los días)')) {
      let events = StorageService.getEvents();
      // SOFT DELETE
      const idx = events.findIndex(e => e.id === id);
      if (idx !== -1) {
        events[idx]._deleted = true;
        StorageService.saveEvents(events);
        StorageService.triggerAutoSync(); // MANUAL SYNC
        renderCalendar();
        if (selectedDate) showDayDetails(selectedDate);
      }
    }
  }

  function openModal(prefillDate = null) {
    if (!eventModal) return;
    eventModal.classList.remove('hidden');

    // Reset fields
    if (eventTitle) eventTitle.value = '';
    if (eventTime) eventTime.value = '';
    if (eventNote) eventNote.value = '';
    if (eventColor) eventColor.value = '#4F46E5';
    if (eventRecurrence) eventRecurrence.value = 'none';

    if (prefillDate && eventDate) {
      eventDate.value = prefillDate;
    } else if (eventDate) {
      // Use local date for default
      const now = new Date();
      const localISO = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      eventDate.value = localISO;
    }
  }

  function closeModal() {
    if (eventModal) eventModal.classList.add('hidden');
  }

  function saveEvent() {
    // Robust checks
    if (!eventTitle || !eventDate) {
      console.error("Missing input elements");
      return;
    }

    const title = eventTitle.value.trim();
    const date = eventDate.value;
    const time = eventTime ? eventTime.value : '';
    const color = eventColor ? eventColor.value : '#4F46E5';
    const note = eventNote ? eventNote.value.trim() : '';
    const recurrence = eventRecurrence ? eventRecurrence.value : 'none';

    if (!title) {
      alert('Por favor, escribe un título para el evento.');
      return;
    }
    if (!date) {
      alert('Por favor, selecciona una fecha.');
      return;
    }

    try {
      const newEvent = {
        id: Date.now().toString(),
        title,
        date,
        time,
        color,
        note,
        recurrence,
        createdBy: localStorage.getItem('user_profile') || 'Anónimo',
        _deleted: false
      };

      const events = StorageService.getEvents();
      events.push(newEvent);
      StorageService.saveEvents(events);

      // Manual Sync trigger
      if (typeof StorageService.triggerAutoSync === 'function') {
        StorageService.triggerAutoSync();
      }

      closeModal();
      renderCalendar();

      selectedDate = date;
      setTimeout(() => {
        showDayDetails(date);
      }, 50);

    } catch (err) {
      console.error("Error saving event:", err);
      alert("Hubo un error al guardar el evento. Inténtalo de nuevo.");
    }
  }

  document.getElementById('prev-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('next-month').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  addEventBtn.addEventListener('click', () => openModal());
  cancelEventBtn.addEventListener('click', closeModal);
  saveEventBtn.addEventListener('click', saveEvent);

  eventModal.addEventListener('click', (e) => {
    if (e.target === eventModal) closeModal();
  });

  renderCalendar();

  // Auto-refresh logic without reload (INSIDE SCOPE)
  window.addEventListener('storage-updated', () => {
    renderCalendar();
    if (selectedDate) showDayDetails(selectedDate);
  });
});

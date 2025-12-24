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

    const events = StorageService.getEvents();
    const recurringBills = StorageService.getRecurringBills();

    // Check which bills are already paid in this month
    // We assume a bill is paid if an expense exists with linked recurrence_id (ideal) or just matching title logic?
    // Let's rely on manual interaction for now. 
    // Optimization: fetch expenses for this month to check for payments?
    // Let's do simple visualization first.

    for (let i = 0; i < startDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.classList.add('day');
      emptyCell.style.opacity = '0.3';
      calendarGrid.appendChild(emptyCell);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i <= daysInMonth; i++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'day';

      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

      if (dateString === todayStr) dayCell.classList.add('today');
      if (selectedDate === dateString) dayCell.classList.add('selected');

      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = i;
      dayCell.appendChild(dayNumber);

      // 1. Render Normal Events
      const dayEvents = events.filter(e => e.date === dateString);
      dayEvents.forEach(event => {
        const chip = document.createElement('div');
        chip.className = 'event-chip';
        chip.style.backgroundColor = event.color || '#4F46E5';
        chip.textContent = event.title;
        dayCell.appendChild(chip);
      });

      // 2. Render Recurring Bills (Virtual Events)
      // Check if any bill falls on day 'i'
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

  function showDayDetails(dateStr) {
    detailsPanel.classList.add('active');
    const events = StorageService.getEvents().filter(e => e.date === dateStr);

    // Filter bills for this day
    const [y, m, d] = dateStr.split('-');
    const dayNum = parseInt(d);
    const bills = StorageService.getRecurringBills().filter(b => b.day === dayNum);

    const dateObj = new Date(y, m - 1, d);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    detailsDate.textContent = dateObj.toLocaleDateString('es-ES', options);

    detailsList.innerHTML = '';

    if (events.length === 0 && bills.length === 0) {
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

    // Render Normal Events
    events.forEach(event => {
      const item = document.createElement('div');
      item.className = 'detail-item';
      item.style.borderLeftColor = event.color || '#4F46E5';

      item.innerHTML = `
            <div class="detail-title">${event.title}</div>
            <span class="detail-time">${event.time || 'Todo el día'}</span>
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
      };

      const expenses = StorageService.getExpenses();
      expenses.push(newExpense);
      StorageService.saveExpenses(expenses);
      alert('¡Gasto añadido y guardado!');
    }
  }

  function deleteEvent(id) {
    if (confirm('¿Borrar este evento?')) {
      let events = StorageService.getEvents();
      events = events.filter(e => e.id !== id);
      StorageService.saveEvents(events);
      renderCalendar();
      if (selectedDate) showDayDetails(selectedDate);
    }
  }

  function openModal(prefillDate = null) {
    eventModal.classList.remove('hidden');

    // Reset fields
    eventTitle.value = '';
    eventTime.value = '';
    eventNote.value = '';
    eventColor.value = '#4F46E5';

    if (prefillDate) {
      eventDate.value = prefillDate;
    } else {
      eventDate.value = new Date().toISOString().split('T')[0];
    }
  }

  function closeModal() {
    eventModal.classList.add('hidden');
  }

  function saveEvent() {
    const title = eventTitle.value.trim();
    const date = eventDate.value;
    const time = eventTime.value;
    const color = eventColor.value;
    const note = eventNote.value.trim();

    if (!title || !date) {
      alert('Por favor, rellena título y fecha.');
      return;
    }

    const newEvent = {
      id: Date.now().toString(),
      title,
      date,
      time,
      color,
      note
    };

    const events = StorageService.getEvents();
    events.push(newEvent);
    StorageService.saveEvents(events);

    closeModal();
    renderCalendar();

    selectedDate = date;
    setTimeout(() => {
      showDayDetails(date);
    }, 50);
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
});

window.addEventListener('storage-updated', () => {
  location.reload();
});

document.addEventListener('DOMContentLoaded', () => {
  const calendarGrid = document.getElementById('calendar-grid');
  const monthYear = document.getElementById('month-year');
  const addEventBtn = document.getElementById('add-event-btn');
  const addEventTodayBtn = document.getElementById('add-event-today-btn');
  const eventModal = document.getElementById('event-modal'); // Using ID directly
  const cancelEventBtn = document.getElementById('cancel-event');
  const saveEventBtn = document.getElementById('save-event');

  // Details Panel Elements
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

    // Calculate start day (Monday = 1, Sunday = 0, but we want Monday start)
    // getDay(): Sun=0, Mon=1...Sat=6
    // Shift: Mon=0...Sun=6
    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6;

    const events = StorageService.getEvents();

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.classList.add('day');
      emptyCell.style.opacity = '0.3'; // Visual placeholder
      calendarGrid.appendChild(emptyCell);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 1; i <= daysInMonth; i++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'day';

      const dayDate = new Date(year, month, i);
      // Fix timezone offset issue for string comparison by using local info
      // Simple format YYYY-MM-DD manually to avoid timezone shifts
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

      if (dateString === todayStr) {
        dayCell.classList.add('today');
      }

      if (selectedDate === dateString) {
        dayCell.classList.add('selected');
      }

      // Day Number
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = i;
      dayCell.appendChild(dayNumber);

      // Events for this day
      const dayEvents = events.filter(e => e.date === dateString);

      // Render Chips
      dayEvents.forEach(event => {
        const chip = document.createElement('div');
        chip.className = 'event-chip';
        chip.style.backgroundColor = event.color || '#4F46E5';
        chip.textContent = event.title;
        dayCell.appendChild(chip);
      });

      // Click event for selection
      dayCell.addEventListener('click', () => {
        // Remove previous selection
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

    // Format date nicely
    const [y, m, d] = dateStr.split('-');
    const dateObj = new Date(y, m - 1, d);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    detailsDate.textContent = dateObj.toLocaleDateString('es-ES', options);

    detailsList.innerHTML = ''; // Clear prev

    if (events.length === 0) {
      detailsList.innerHTML = '<p class="text-muted">No hay eventos. ¡Añade uno!</p>';
    } else {
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

      // Add delete listeners
      document.querySelectorAll('.btn-delete-event').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation(); // Avoid re-triggering day click? No, but good practice
          deleteEvent(e.target.dataset.id);
        });
      });
    }

    // Update "Add" button context
    addEventTodayBtn.onclick = () => openModal(dateStr);
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

    // Auto-select the date we just added to
    selectedDate = date;
    setTimeout(() => {
      // Trigger click simulation or just update UI
      // Creating logic to find cell is complex, simpler to just render details
      showDayDetails(date);
      // We need to re-highlight the cell manually since renderCalendar clears classes
      // RenderCalendar was called above, so cells are fresh. 
      // We find the cell by matching date/index logic? 
      // Easier: Just let user proceed or rely on selectedDate logic inside renderCalendar loop?
      // Ah, inside renderCalendar loop I added `if (selectedDate == dateString) classList.add('selected')`.
      // So just calling renderCalendar() with updated selectedDate global var is enough!
      // Yes, renderCalendar() uses global selectedDate.
    }, 50);
  }

  // Navigation
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

  // Close modal on outside click
  eventModal.addEventListener('click', (e) => {
    if (e.target === eventModal) closeModal();
  });

  renderCalendar();
});

// Auto-refresh when sync finishes
window.addEventListener('storage-updated', () => {
  // Re-run the main render function if available
  // Since renderCalendar is scoped inside DOMContentLoaded, we might need to expose it or reload page.
  // RELOAD APPROACH: Simplest and robust
  // window.location.reload(); 

  // NON-RELOAD APPROACH: 
  // Dispatch a custom event was the plan, but listeners need to be reachable. 
  // The listener is outside the scope here.
  // Let's just reload the page for V2 simplicity to ensure data consistency.
  // OR, move logic to global scope? Too much refactor.
  // Actually, I can just dispatch a click on "Today" or re-trigger logic?
  // Let's use reload() for safety in V2.
  location.reload();
});

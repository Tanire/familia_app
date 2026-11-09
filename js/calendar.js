document.addEventListener("DOMContentLoaded", () => {
  const calendarGrid = document.getElementById("calendar-grid");
  const monthYear = document.getElementById("month-year");
  const todayBtn = document.getElementById("today-btn");
  const addEventBtn = document.getElementById("add-event-btn");
  const addEventTodayBtn = document.getElementById("add-event-today-btn");
  const eventModal = document.getElementById("event-modal");
  const cancelEventBtn = document.getElementById("cancel-event");
  const saveEventBtn = document.getElementById("save-event");

  // Details Panel
  const detailsPanel = document.getElementById("details-panel");
  const detailsDate = document.getElementById("details-date");
  const detailsList = document.getElementById("details-list");

  // Modal Inputs
  const eventTitle = document.getElementById("event-title");
  const eventDate = document.getElementById("event-date");
  const eventTime = document.getElementById("event-time");
  const eventColor = document.getElementById("event-color");
  const eventNote = document.getElementById("event-note");
  const eventRecurrence = document.getElementById("event-recurrence");
  const presetTags = document.querySelectorAll(".preset-tag");

  let currentDate = new Date();
  let selectedDate = null;
  let editingEventId = null;

  // Preset click handler
  presetTags.forEach(tag => {
    tag.addEventListener("click", () => {
      const emoji = tag.dataset.emoji || "";
      const color = tag.dataset.color || "#4F46E5";
      if (eventColor) eventColor.value = color;
      if (eventTitle) {
        let currentVal = eventTitle.value.trim();
        // Avoid duplicating leading emoji
        if (!currentVal.startsWith(emoji)) {
          eventTitle.value = `${emoji} ${currentVal}`.trim();
        }
        eventTitle.focus();
      }
    });
  });

  function renderCalendar() {
    calendarGrid.innerHTML = "";
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    monthYear.textContent = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDay = firstDay.getDay() - 1;
    if (startDay === -1) startDay = 6; // Sunday -> 6

    const allEvents = StorageService.getEvents().filter((e) => !e._deleted);
    const recurringBills = StorageService.getRecurringBills().filter((b) => !b._deleted);

    // Split events
    const singleEventsMap = new Map();
    const recurringEvents = [];

    allEvents.forEach((e) => {
      if (e.recurrence && e.recurrence !== "none") {
        recurringEvents.push(e);
      } else {
        if (!singleEventsMap.has(e.date)) {
          singleEventsMap.set(e.date, []);
        }
        singleEventsMap.get(e.date).push(e);
      }
    });

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < startDay; i++) {
      const emptyCell = document.createElement("div");
      emptyCell.classList.add("day");
      emptyCell.style.opacity = "0.2";
      fragment.appendChild(emptyCell);
    }

    const nowLocal = new Date();
    const todayStr = new Date(nowLocal.getTime() - nowLocal.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];

    for (let i = 1; i <= daysInMonth; i++) {
      const dayCell = document.createElement("div");
      dayCell.className = "day";

      const dayDate = new Date(year, month, i);
      const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

      if (dateString === todayStr) dayCell.classList.add("today");
      if (selectedDate === dateString) dayCell.classList.add("selected");

      const dayNumber = document.createElement("div");
      dayNumber.className = "day-number";
      dayNumber.textContent = i;
      dayCell.appendChild(dayNumber);

      // Single Events
      if (singleEventsMap.has(dateString)) {
        singleEventsMap.get(dateString).forEach((event) => {
          renderEventChip(dayCell, event);
        });
      }

      // Recurring Events
      recurringEvents.forEach((event) => {
        const eventStart = new Date(event.date);
        eventStart.setHours(0, 0, 0, 0);
        dayDate.setHours(0, 0, 0, 0);

        if (dayDate < eventStart) return;

        let shouldRender = false;
        if (event.recurrence === "weekly") {
          if (dayDate.getDay() === eventStart.getDay()) shouldRender = true;
        } else if (event.recurrence === "monthly") {
          if (dayDate.getDate() === eventStart.getDate()) shouldRender = true;
        } else if (event.recurrence === "yearly") {
          if (
            dayDate.getMonth() === eventStart.getMonth() &&
            dayDate.getDate() === eventStart.getDate()
          ) {
            shouldRender = true;
          }
        }

        if (shouldRender) {
          renderEventChip(dayCell, event);
        }
      });

      // Recurring Bills
      recurringBills.forEach((bill) => {
        if (bill.day === i) {
          const chip = document.createElement("div");
          chip.className = "event-chip";
          chip.style.backgroundColor = "#F59E0B";
          chip.textContent = `💶 ${bill.title}`;
          chip.dataset.isBill = "true";
          dayCell.appendChild(chip);
        }
      });

      dayCell.addEventListener("click", () => {
        document
          .querySelectorAll(".day.selected")
          .forEach((el) => el.classList.remove("selected"));
        dayCell.classList.add("selected");
        selectedDate = dateString;
        showDayDetails(dateString);
      });

      fragment.appendChild(dayCell);
    }
    calendarGrid.appendChild(fragment);
  }

  function renderEventChip(container, event) {
    const chip = document.createElement("div");
    chip.className = "event-chip";
    chip.style.backgroundColor = event.color || "#4F46E5";
    const isRecur = event.recurrence && event.recurrence !== "none";
    chip.textContent = event.title + (isRecur ? " 🔄" : "");
    container.appendChild(chip);
  }

  function showDayDetails(dateStr) {
    detailsPanel.classList.add("active");

    const [y, m, d] = dateStr.split("-").map(Number);
    const viewDate = new Date(y, m - 1, d);
    viewDate.setHours(0, 0, 0, 0);

    const allEvents = StorageService.getEvents().filter((e) => !e._deleted);

    const eventsOnDay = allEvents.filter((event) => {
      const eventStart = new Date(event.date);
      eventStart.setHours(0, 0, 0, 0);

      if (!event.recurrence || event.recurrence === "none") {
        return event.date === dateStr;
      }
      if (viewDate < eventStart) return false;

      if (event.recurrence === "weekly") {
        return viewDate.getDay() === eventStart.getDay();
      }
      if (event.recurrence === "monthly") {
        return viewDate.getDate() === eventStart.getDate();
      }
      if (event.recurrence === "yearly") {
        return (
          viewDate.getMonth() === eventStart.getMonth() &&
          viewDate.getDate() === eventStart.getDate()
        );
      }
      return false;
    });

    const bills = StorageService.getRecurringBills().filter(
      (b) => b.day === d && !b._deleted,
    );

    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    detailsDate.textContent = viewDate.toLocaleDateString("es-ES", options);
    detailsList.dataset.date = dateStr;
    detailsList.innerHTML = "";

    if (eventsOnDay.length === 0 && bills.length === 0) {
      detailsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No hay eventos ni notas para este día.</p>';
      addEventTodayBtn.onclick = () => openModal(dateStr);
      return;
    }

    const fragment = document.createDocumentFragment();

    // Render Bills
    bills.forEach((bill) => {
      const item = document.createElement("div");
      item.className = "detail-item";
      item.style.borderLeftColor = "#F59E0B";
      item.style.background = "var(--bg-body)";

      item.innerHTML = `
        <div class="detail-title">💶 ${escapeHtml(bill.title)}</div>
        <span class="detail-time" style="color: #F59E0B; font-weight: 600;">Gasto Fijo Mensual</span>
        <div class="detail-note" style="color: var(--text-main); font-weight: 600;">Importe: ${parseFloat(bill.amount).toFixed(2)}€</div>
        <button class="btn-pay-bill" data-id="${bill.id}" style="margin-top:0.5rem; width:100%; border:none; background:#F59E0B; color:white; padding:6px; border-radius:6px; cursor:pointer; font-weight:600;">
            💸 Apuntar en Gastos
        </button>
      `;
      fragment.appendChild(item);
    });

    // Render Events
    eventsOnDay.forEach((event) => {
      const item = document.createElement("div");
      item.className = "detail-item";
      item.style.borderLeftColor = event.color || "#4F46E5";

      const isRecurring = event.recurrence && event.recurrence !== "none";
      const recurrenceLabels = {
        weekly: "Semanal",
        monthly: "Mensual",
        yearly: "Anual"
      };
      const recurrenceText = isRecurring ? `(Repite: ${recurrenceLabels[event.recurrence] || event.recurrence})` : "";

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <div class="detail-title">${escapeHtml(event.title)} ${isRecurring ? "🔄" : ""}</div>
                <span class="detail-time" style="color: var(--text-muted);">${event.time ? '⏰ ' + event.time : "Todo el día"} <small>${recurrenceText}</small></span>
            </div>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn-edit-event" data-id="${event.id}" style="border:none; background:none; color:var(--primary); cursor:pointer; font-size:0.9rem;" title="Editar">✏️</button>
                <button class="btn-delete-event" data-id="${event.id}" style="border:none; background:none; color:#EF4444; cursor:pointer; font-size:0.9rem;" title="Eliminar">🗑</button>
            </div>
        </div>
        ${event.note ? `<div class="detail-note" style="margin-top: 0.5rem; color: var(--text-muted);">${escapeHtml(event.note)}</div>` : ""}
      `;
      fragment.appendChild(item);
    });

    detailsList.appendChild(fragment);
    addEventTodayBtn.onclick = () => openModal(dateStr);
  }

  // Delegated event listener on detailsList
  if (detailsList) {
    detailsList.addEventListener("click", (e) => {
      const delBtn = e.target.closest(".btn-delete-event");
      if (delBtn) {
        e.stopPropagation();
        deleteEvent(delBtn.dataset.id);
        return;
      }
      const editBtn = e.target.closest(".btn-edit-event");
      if (editBtn) {
        e.stopPropagation();
        editEvent(editBtn.dataset.id);
        return;
      }
      const payBtn = e.target.closest(".btn-pay-bill");
      if (payBtn) {
        e.stopPropagation();
        payBill(payBtn.dataset.id, detailsList.dataset.date);
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function payBill(billId, dateStr) {
    const bills = StorageService.getRecurringBills();
    const bill = bills.find((b) => String(b.id) === String(billId));

    if (!bill) return;
    if (!confirm(`¿Confirmar pago de "${bill.title}" (${bill.amount}€)? Se registrará en tus gastos.`)) return;

    const newExpense = {
      id: Date.now().toString(),
      title: bill.title,
      amount: bill.amount,
      category: bill.category || "home",
      type: "expense",
      date: new Date().toISOString(),
      createdBy: localStorage.getItem("user_profile") || "",
      _deleted: false,
      updatedAt: new Date().toISOString()
    };

    const expenses = StorageService.getExpenses();
    expenses.push(newExpense);
    StorageService.saveExpenses(expenses);
    StorageService.triggerAutoSync();
    alert("¡Gasto registrado y sincronizado!");
  }

  function deleteEvent(id) {
    if (confirm("¿Borrar este evento? (Si es recurrente, desaparecerá de todas las fechas)")) {
      let events = StorageService.getEvents();
      const idx = events.findIndex((e) => String(e.id) === String(id));
      if (idx !== -1) {
        events[idx]._deleted = true;
        events[idx].updatedAt = new Date().toISOString();
        StorageService.saveEvents(events);
        StorageService.triggerAutoSync();
        renderCalendar();
        if (selectedDate) showDayDetails(selectedDate);
      }
    }
  }

  function editEvent(id) {
    const events = StorageService.getEvents();
    const event = events.find((e) => String(e.id) === String(id));
    if (!event) return;

    editingEventId = id;
    openModal();

    if (eventTitle) eventTitle.value = event.title;
    if (eventDate) eventDate.value = event.date;
    if (eventTime) eventTime.value = event.time || "";
    if (eventColor) eventColor.value = event.color || "#4F46E5";
    if (eventNote) eventNote.value = event.note || "";
    if (eventRecurrence) eventRecurrence.value = event.recurrence || "none";

    const modalTitle = eventModal.querySelector("h2");
    if (modalTitle) modalTitle.textContent = "Editar Evento";
  }

  function openModal(prefillDate = null) {
    if (!eventModal) return;
    eventModal.classList.remove("hidden");

    const modalTitle = eventModal.querySelector("h2");
    if (modalTitle) modalTitle.textContent = "Nuevo Evento";

    if (!editingEventId) {
      if (eventTitle) eventTitle.value = "";
      if (eventTime) eventTime.value = "";
      if (eventNote) eventNote.value = "";
      if (eventColor) eventColor.value = "#4F46E5";
      if (eventRecurrence) eventRecurrence.value = "none";

      if (prefillDate && eventDate) {
        eventDate.value = prefillDate;
      } else if (eventDate) {
        const now = new Date();
        const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString()
          .split("T")[0];
        eventDate.value = localISO;
      }
    }
  }

  function closeModal() {
    if (eventModal) eventModal.classList.add("hidden");
    editingEventId = null;
  }

  function saveEvent() {
    if (!eventTitle || !eventDate) return;

    const title = eventTitle.value.trim();
    const date = eventDate.value;
    const time = eventTime ? eventTime.value : "";
    const color = eventColor ? eventColor.value : "#4F46E5";
    const note = eventNote ? eventNote.value.trim() : "";
    const recurrence = eventRecurrence ? eventRecurrence.value : "none";

    if (!title) {
      alert("Por favor, escribe un título para el evento.");
      return;
    }
    if (!date) {
      alert("Por favor, selecciona una fecha.");
      return;
    }

    try {
      const events = StorageService.getEvents();

      if (editingEventId) {
        const idx = events.findIndex((e) => String(e.id) === String(editingEventId));
        if (idx !== -1) {
          events[idx].title = title;
          events[idx].date = date;
          events[idx].time = time;
          events[idx].color = color;
          events[idx].note = note;
          events[idx].recurrence = recurrence;
          events[idx].updatedAt = new Date().toISOString();
        }
      } else {
        const newEvent = {
          id: Date.now().toString() + Math.floor(Math.random() * 1000),
          title,
          date,
          time,
          color,
          note,
          recurrence,
          createdBy: localStorage.getItem("user_profile") || "Familia",
          _deleted: false,
          updatedAt: new Date().toISOString(),
        };
        events.push(newEvent);
      }

      StorageService.saveEvents(events);
      StorageService.triggerAutoSync();

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

  document.getElementById("prev-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("next-month").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      currentDate = new Date();
      const nowLocal = new Date();
      selectedDate = new Date(nowLocal.getTime() - nowLocal.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
      renderCalendar();
      showDayDetails(selectedDate);
    });
  }

  addEventBtn.addEventListener("click", () => openModal());
  cancelEventBtn.addEventListener("click", closeModal);
  saveEventBtn.addEventListener("click", saveEvent);

  eventModal.addEventListener("click", (e) => {
    if (e.target === eventModal) closeModal();
  });

  // Select Today by default
  const now = new Date();
  selectedDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];

  renderCalendar();
  showDayDetails(selectedDate);

  window.addEventListener("storage-updated", () => {
    renderCalendar();
    if (selectedDate) showDayDetails(selectedDate);
  });
});

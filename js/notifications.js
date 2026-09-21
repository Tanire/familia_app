/**
 * NotificationService - Manejo de notificaciones locales del navegador para eventos y avisos
 */
const NotificationService = {
  isSupported() {
    return 'Notification' in window;
  },

  getPermission() {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  },

  async requestPermission() {
    if (!this.isSupported()) {
      alert('Tu navegador o dispositivo no soporta notificaciones web directas.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error('Error solicitando permisos de notificación', e);
      return false;
    }
  },

  show(title, options = {}) {
    if (!this.isSupported() || Notification.permission !== 'granted') return null;

    const defaultOptions = {
      icon: 'assets/icon-192.png',
      badge: 'assets/icon-192.png',
      vibrate: [200, 100, 200]
    };

    try {
      return new Notification(title, { ...defaultOptions, ...options });
    } catch (e) {
      console.error('Error al mostrar notificación', e);
      return null;
    }
  },

  checkTodayEventsNotification() {
    if (this.getPermission() !== 'granted') return;

    const lastNotifDate = localStorage.getItem('last_daily_notification');
    const todayStr = new Date().toISOString().split('T')[0];

    // Solo notificar una vez al día automáticamente al abrir
    if (lastNotifDate === todayStr) return;

    if (typeof StorageService === 'undefined') return;

    const events = StorageService.getEvents().filter(e => !e._deleted);
    const recurringBills = StorageService.getRecurringBills().filter(b => !b._deleted);
    const today = new Date();
    const dayOfMonth = today.getDate();

    // Eventos de hoy
    const todayEvents = events.filter(event => {
      const eventStart = new Date(event.date);
      eventStart.setHours(0, 0, 0, 0);
      const viewDate = new Date(today);
      viewDate.setHours(0, 0, 0, 0);

      if (!event.recurrence || event.recurrence === 'none') {
        return event.date === todayStr;
      }
      if (viewDate < eventStart) return false;
      if (event.recurrence === 'weekly') return viewDate.getDay() === eventStart.getDay();
      if (event.recurrence === 'monthly') return viewDate.getDate() === eventStart.getDate();
      if (event.recurrence === 'yearly') {
        return viewDate.getMonth() === eventStart.getMonth() && viewDate.getDate() === eventStart.getDate();
      }
      return false;
    });

    // Recibos de hoy
    const todayBills = recurringBills.filter(b => b.day === dayOfMonth);

    const totalCount = todayEvents.length + todayBills.length;
    if (totalCount > 0) {
      let bodyText = '';
      if (todayEvents.length > 0) {
        bodyText += `📅 ${todayEvents.length} evento(s): ` + todayEvents.map(e => e.title).join(', ');
      }
      if (todayBills.length > 0) {
        if (bodyText) bodyText += ' | ';
        bodyText += `💶 ${todayBills.length} recibo(s) hoy.`;
      }

      this.show('📋 Agenda Familiar de Hoy', {
        body: bodyText,
        tag: 'today-agenda'
      });

      localStorage.setItem('last_daily_notification', todayStr);
    }
  }
};

// Intentar comprobar avisos tras la carga
if (typeof window !== 'undefined') {
  window.NotificationService = NotificationService;
  window.addEventListener('load', () => {
    setTimeout(() => {
      NotificationService.checkTodayEventsNotification();
    }, 2000);
  });
}

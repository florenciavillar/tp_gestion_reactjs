import { apiGet, apiPost } from './api.js'

// HU-20: bandeja del socio, la más reciente primero. El total viene en el cuerpo, no en X-Total-Count.
// Devuelve { items, total, unread_count, limit, offset }; cada ítem trae { id, type, title, message,
// created_at, state, read_at, reference }. `title` y `message` vienen listos: se muestran tal cual.
export function getNotifications({ limit, offset }) {
  return apiGet(`/member/notifications?limit=${limit}&offset=${offset}`)
}

// HU-20: contador del menú. Devuelve { unread_count }.
export function getUnreadCount() {
  return apiGet('/member/notifications/unread-count')
}

// HU-20: marca una como leída. Es idempotente: si ya estaba leída, conserva el read_at original.
export function markRead(id) {
  return apiPost(`/member/notifications/${encodeURIComponent(id)}/read`)
}

// HU-20: "Marcar todas como leídas". Devuelve { marked, unread_count }.
export function markAllRead() {
  return apiPost('/member/notifications/read-all')
}

// Destino de cada tipo (notificaciones §3). Los correos de HU-19 usan las mismas rutas: si cambian, avisar al backend.
// Un tipo desconocido no navega: solo se marca como leído.
export function notificationTarget(notification) {
  const eventId = notification.reference?.event_id
  switch (notification.type) {
    case 'event_published':
    case 'event_rescheduled': // Inactivo hasta HU-23.
      return eventId ? `/events?highlight=${encodeURIComponent(eventId)}` : null
    case 'wave_opened':
      return eventId ? `/member/events/${encodeURIComponent(eventId)}/slot` : null
    case 'ranking_completed':
      return '/ranking'
    default:
      return null
  }
}

// Número del menú: nada con 0, "99+" por encima de 99.
export function formatUnreadCount(count) {
  if (!count || count <= 0) return null
  return count > 99 ? '99+' : String(count)
}

import { apiGet, apiGetPage, apiPost } from './api.js'

// HU-17: próximos eventos publicados del club del socio, el más cercano primero.
// Devuelve { total, eventos, mensaje }; `mensaje` trae el texto del spec cuando no hay eventos.
export function getUpcomingEvents() {
  return apiGet('/events/upcoming')
}

// HU-39: turno propio del socio para un evento.
export function getEventSlot(eventId) {
  return apiGet(`/member/events/${encodeURIComponent(eventId)}/slot`)
}

// HU-22: eventos recibidos del club pendientes de publicar, el deadline más cercano primero.
// Devuelve { items, total }.
export function getPendingEvents({ limit, offset }) {
  return apiGetPage(`/admin/events/pending?limit=${limit}&offset=${offset}`)
}

// HU-22: clases A, B y C con su demanda, factor y descripción.
export function getEventClasses() {
  return apiGet('/admin/events/classes')
}

// HU-22: `choice` es { clase } para un Partido o { puntos } para un evento institucional.
// Siempre por id_interno: el id_externo es único solo dentro de cada club.
export function publishEvent(idInterno, choice) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/publish`, choice)
}

// ==============================================================================
// HU-23: REPROGRAMACIÓN, RETIRO Y RESTAURACIÓN DE EVENTOS
// ==============================================================================

// Lista de eventos publicados (visibles para administración).
export function getPublishedEvents(clubId) {
  const query = clubId ? `?club_id=${encodeURIComponent(clubId)}` : ''
  return apiGet(`/admin/events/published${query}`)
}

// HU-23 US1: Lista de solicitudes de cambio enviadas por el club pendientes de revisión.
export function getPendingEventChanges(clubId) {
  const query = clubId ? `?club_id=${encodeURIComponent(clubId)}` : ''
  return apiGet(`/admin/events/changes${query}`)
}

// HU-23 US1: Aprobar reprogramación de evento.
export function approveEventChange(idCambio) {
  return apiPost(`/admin/events/changes/${encodeURIComponent(idCambio)}/approve`, {})
}

// HU-23 US1: Rechazar reprogramación de evento.
export function rejectEventChange(idCambio, motivo) {
  return apiPost(`/admin/events/changes/${encodeURIComponent(idCambio)}/reject`, { motivo })
}

// HU-23 US2: Retirar evento publicado.
export function withdrawEvent(idInterno, motivo) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/withdraw`, { motivo })
}

// HU-23 US2: Restaurar evento retirado.
export function restoreEvent(idInterno) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/restore`, {})
}

// HU-23 US1 (Esc. 8): Ajustar clase o puntos en la ventana de 24h tras reprogramación.
export function adjustEventClass(idInterno, { clase, puntos }) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/adjust-class`, { clase, puntos })
}

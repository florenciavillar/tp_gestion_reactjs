import { apiGet, apiGetPage, apiPost } from './api.js'

// HU-17: próximos eventos publicados del club del socio, el más cercano primero.
// Devuelve { total, eventos, mensaje }; `mensaje` trae el texto del spec cuando no hay eventos.
export function getUpcomingEvents() {
  return apiGet('/events/upcoming')
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

// HU-39: turno del socio para un evento. Siempre por id_interno, el mismo del `slot_url` de HU-17.
// Devuelve { event, status, message, wave, starts_at, closing_at, seconds_until_start,
// seconds_until_closing, now }; `status` es no_turns, no_schedule, no_wave, pending, open o closed.
export function getOwnSlot(idInterno) {
  return apiGet(`/member/events/${encodeURIComponent(idInterno)}/slot`)
}

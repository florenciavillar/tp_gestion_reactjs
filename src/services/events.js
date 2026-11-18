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

// HU-39: turno del socio para un evento. Siempre por id_interno, el mismo del `slot_url` de HU-17.
// Devuelve { event, status, message, wave, starts_at, closing_at, seconds_until_start,
// seconds_until_closing, now }; `status` es no_turns, no_schedule, no_wave, pending, open, closed o withdrawn
// (HU-23B US5: el evento se retiró y `message` dice "Este evento fue suspendido.").
export function getOwnSlot(idInterno) {
  return apiGet(`/member/events/${encodeURIComponent(idInterno)}/slot`)
}

// ==============================================================================
// HU-23B: REPROGRAMACIÓN Y RETIRO DE EVENTOS PUBLICADOS; DESCARTE DE PENDIENTES (HU-21)
// ==============================================================================

// HU-23B US1: eventos publicados del club que todavía no empezaron, el más cercano primero. El club sale
// de la sesión del Admin (no se manda club_id). Cada item trae { id_interno, id_externo, titulo, tipo,
// fecha_hora, lugar, descripcion, clase, puntos, cancelado_por_el_club, version, schedule }, con `schedule`
// en { status, opening_at, closing_at, merged_into_order, adjusted } o null (`closing_at` es el cierre
// vigente, ya ajustado si una reprogramación lo movió). Los retirados ya no vienen en esta lista.
export function getPublishedEvents() {
  return apiGet('/admin/events/published')
}

// HU-23B US2 escenario 7: qué le pasaría al cronograma de olas con la nueva fecha y hora, sin cambiar
// nada. Valida igual que la reprogramación. Devuelve { previous_fecha_hora, new_fecha_hora,
// schedule_effect ('no_schedule' | 'none' | 'closing_adjusted' | 'waves_merged' | 'invalidated'),
// previous_closing_at, new_closing_at, merged_into_order, moved_waves: [{ order, socios }],
// target_wave_starts_at, target_wave_open, notifications: { event_rescheduled, wave_rescheduled, wave_opened } }
// (US4: los dos últimos cuentan los socios de las olas sumadas; uno de los dos es siempre 0).
export function previewReschedule(idInterno, { fechaHora }) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/reschedule/preview`, { fecha_hora: fechaHora })
}

// HU-23B US2: nueva fecha y hora de un evento publicado; lo único editable. `fechaHora` va sin zona
// horaria ("2026-11-21T17:00:00") y el back la lee en hora de Buenos Aires. `expectedVersion` es la
// `version` del listado y `impact` la vista previa que vio el Admin: si el evento o el efecto cambiaron,
// falla con EVENT_CHANGED (409). Devuelve el evento como en getPublishedEvents más `id_reprogramacion` e
// `impact`. Otros errores (detail.code): NO_CHANGES, START_NOT_IN_FUTURE, INVALID_DATETIME,
// FIELD_NOT_EDITABLE (422), EVENT_ALREADY_STARTED (409), EVENT_NOT_FOUND (404).
export function rescheduleEvent(idInterno, { fechaHora, expectedVersion, impact }) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/reschedule`, {
    fecha_hora: fechaHora,
    expected_version: expectedVersion,
    ...(impact && {
      expected_schedule_effect: impact.schedule_effect,
      expected_merged_into_order: impact.merged_into_order,
    }),
  })
}

// HU-23B US5: retiro definitivo de un evento publicado, después de la confirmación explícita. Manda la
// `version` del listado: si otro Admin lo cambió, el back responde 409 EVENT_CHANGED. Devuelve
// { id_interno, estado: 'withdrawn', segmentation_deleted, schedule_deleted }.
export function withdrawEvent(idInterno, expectedVersion) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/withdraw`, {
    confirmed: true,
    expected_version: expectedVersion,
  })
}

// HU-21 sc. 10: descartar un evento pendiente; no se publica ni lo ven los socios. El motivo es opcional
// (solo va a la auditoría). Un publicado se retira con withdrawEvent. 404 si ya no está pendiente,
// 409 si ya estaba descartado.
export function discardEvent(idInterno, motivo) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/discard`, motivo ? { motivo } : {})
}

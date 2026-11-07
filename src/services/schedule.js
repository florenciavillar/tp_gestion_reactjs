import { apiGet, apiPost } from './api.js'

// HU-37: cronograma de habilitación de las olas de un partido. El club sale de la cuenta del Admin.

// Cronograma de un partido: { event, status: 'draft' | 'confirmed' | 'invalidated', opening_at, closing_at,
// step_seconds, min_step_minutes, locked, generated_at, generated_by, confirmed_at, confirmed_by,
// waves: [{ order, percentile_from, percentile_to, position_from, position_to, socios, starts_at, state }] }.
// `state`: 'pending' | 'open' | 'closed'. 404 SCHEDULE_NOT_FOUND si todavía no tiene.
export function getSchedule(idInterno) {
  return apiGet(`/admin/events/${encodeURIComponent(idInterno)}/schedule`)
}

// Genera (o regenera) el cronograma en borrador. `openingAt` y `closingAt` en ISO-8601 con offset.
// Si ya hay uno vigente, el backend exige `confirmed: true` (si no, 422 CONFIRMATION_REQUIRED).
export function generateSchedule(idInterno, { openingAt, closingAt, confirmed = false }) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/schedule`, {
    opening_at: openingAt,
    closing_at: closingAt,
    confirmed,
  })
}

// Confirma el borrador: desde ahí lo ven los socios (HU-39).
export function confirmSchedule(idInterno) {
  return apiPost(`/admin/events/${encodeURIComponent(idInterno)}/schedule/confirm`)
}

export function isNoScheduleError(err) {
  return err.status === 404 && err.code === 'SCHEDULE_NOT_FOUND'
}

const ERRORS = {
  FORBIDDEN: 'Solo los admins pueden armar el cronograma.',
  ADMIN_WITHOUT_CLUB: 'Tu cuenta no tiene un club asignado.',
  GENERIC: 'Algo salió mal. Probá de nuevo.',
}

// El backend manda el motivo en español en `message` (por ejemplo, qué regla del período no se cumple).
export function scheduleErrorMessage(err) {
  if (ERRORS[err.code]) return ERRORS[err.code]
  return err.reason && err.reason !== err.code ? err.reason : ERRORS.GENERIC
}
